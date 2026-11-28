// A Team member's Email Signature (#354), as their Team page edits and previews it (Justin, 2026-11-28: "I want to
// include the email signature into the main edit page of the team member"): the signature the server makes for
// them, its photo and banners as they are being changed, what is on its way and why a change was refused, and the
// photo editor open on one of them. One per Team page; its Edit (signature-edit.svelte) and its Preview
// (signature-canvas.svelte) read the same one. The server is the one place that says who may see and change whose
// (`checkSignature`): a person their own, an Admin anyone's.
import { toFittedSize } from '#lib/files/files.utils.js';
import { MAX_BANNERS, SIGNATURE_API, UPLOAD_SIDE } from '#lib/signature/signature.constants.js';
import type {
	SignatureAnswerType,
	SignaturePartsType,
	SignatureSaveType
} from '#lib/signature/signature.types.js';
import { toLink } from '#lib/signature/signature.utils.js';
import type { EditType } from './attachments';
import type { GroupType, PhotoType } from './look.data';
import type { LookState } from './look.state.svelte';
import type { PopupModeType } from './photo-popup.svelte';

export type SignaturePartType = 'photo' | 'banners';
type PartsType = Pick<SignaturePartsType, 'photo' | 'banners'>;

/** The photo editor open on the signature's photo or one of its banners, with the others beside it. */
export type SignatureEditingType = {
	what: SignaturePartType;
	group: GroupType;
	id: string;
	mode: PopupModeType;
};

const BANNERS = 'signature-banners';

// The photo and banners of an answer, copied so the screen can change them at once.
function draftOf(parts: PartsType): PartsType {
	return { photo: { ...parts.photo }, banners: parts.banners.map((banner) => ({ ...banner })) };
}

// The photo editor's group for the signature's photo or its banners: whole, in its own shape, or square.
function toGroup(id: string, photos: PhotoType[], ratio: GroupType['ratio']): GroupType {
	return { id, title: '', description: '', layout: 1, isEnabled: true, photos, fit: 'fit', ratio };
}

/** A tile's picture for a part: the small one, with its edit drawn over it. */
export function tileOf(id: string, part: { preview: string; edit?: EditType }): PhotoType {
	return { id, src: part.preview, description: '', edit: part.edit };
}

// A picture shrunk on the device before it goes, its long side at most `UPLOAD_SIDE`: a JPEG, or a PNG for a banner
// that came as one. One the browser cannot draw goes as it is, for the server to try.
async function shrink(file: File, kind: 'photo' | 'banner'): Promise<Blob> {
	try {
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const { width, height } = toFittedSize(bitmap.width, bitmap.height, UPLOAD_SIDE);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
		bitmap.close();
		const type = kind === 'banner' && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
		const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, type, 0.9));
		if (blob) return blob;
	} catch {
		// Sent as it is below.
	}
	return file;
}

export class SignatureState {
	/** Whose: their Team record's id, or '' for no one's. */
	readonly #person: () => string;
	readonly #look: LookState;
	// The answer for the person asked for; none when it could not load.
	#loaded = $state<{ person: string; answer?: SignatureAnswerType }>();
	// The answer after a save or an upload, for the person it was made for.
	#changed = $state<{ person: string; answer: SignatureAnswerType }>();
	// Only the last thing sent is shown when it answers, so a change made while another was on its way is never lost.
	#sent = 0;
	#moved: ReturnType<typeof setTimeout> | undefined;

	/** What is on its way to the server: the photo or the banners. */
	busy = $state<SignaturePartType | ''>('');
	/** Why the last change did not save. */
	problem = $state('');
	/** The photo and banners as they are being edited: the last answer's, changed here at once. */
	draft = $state<PartsType>();
	/** The photo editor, open on the photo or a banner. */
	editing = $state<SignatureEditingType>();
	/** The library Email drawn out of sight, which writes the signature's HTML. */
	email = $state<{ getHTML: () => string }>();

	readonly isLoading = $derived(this.#loaded?.person !== this.#asked());
	readonly found = $derived.by(() => {
		const person = this.#asked();
		if (this.isLoading || !this.#loaded?.answer) return undefined;
		return this.#changed?.person === person ? this.#changed.answer : this.#loaded.answer;
	});
	readonly allowed = $derived(this.found?.isAllowed ? this.found : undefined);
	readonly signature = $derived(this.allowed?.signature);
	readonly parts = $derived(this.allowed?.parts);
	/** The signature's HTML, for the Preview to show and copy. */
	readonly html = $derived(this.signature && this.email ? this.email.getHTML() : '');

	constructor(look: LookState, person: () => string) {
		this.#look = look;
		this.#person = person;
		$effect(() => {
			const asked = this.#asked();
			// No one's: not a Team member whose signature may be shown.
			if (!asked) return;
			let isAsked = true;
			this.#load(asked).then(
				(answer) => isAsked && (this.#loaded = { person: asked, answer }),
				() => isAsked && (this.#loaded = { person: asked })
			);
			return () => (isAsked = false);
		});
		$effect(() => {
			const parts = this.parts;
			this.draft = parts ? draftOf(parts) : undefined;
		});
	}

	#asked() {
		return this.#person();
	}

	async #load(person: string): Promise<SignatureAnswerType> {
		const query = new URLSearchParams(person ? { person } : {});
		const response = await fetch(`${SIGNATURE_API}?${query}`, { cache: 'no-store' });
		const found = (await response.json().catch(() => undefined)) as SignatureAnswerType | undefined;
		if (!found) throw new Error(`The signature answered ${response.status}.`);
		return found;
	}

	async #send(body: BodyInit, query: string, type: string) {
		const person = this.#asked();
		const at = ++this.#sent;
		this.problem = '';
		let reason = '';
		let answer: SignatureAnswerType | undefined;
		try {
			const response = await fetch(`${SIGNATURE_API}${query}`, {
				method: 'POST',
				body,
				headers: { 'content-type': type }
			});
			answer = (await response.json().catch(() => undefined)) as SignatureAnswerType | undefined;
			if (!answer) reason = `The signature answered ${response.status}.`;
			else if (!answer.isAllowed) reason = answer.reason;
		} catch {
			reason = 'That did not save. Check the connection and try again.';
		}
		if (at !== this.#sent) return;
		this.busy = '';
		if (answer?.isAllowed) this.#changed = { person, answer };
		else {
			this.problem = reason || 'That did not save. Try again.';
			// What the server keeps comes back, the change undone.
			if (this.parts) this.draft = draftOf(this.parts);
		}
	}

	/** Saves the photo or the banners as they are now, for the signature shown. */
	save(what: SignaturePartType) {
		const draft = this.draft;
		const person = this.signature?.id;
		if (!draft || !person) return;
		this.busy = what;
		const body: SignatureSaveType = { person };
		if (what === 'photo') {
			const { source, edit, link } = draft.photo;
			body.photo = { source, ...(edit ? { edit } : {}), link };
		} else
			body.banners = draft.banners.map(({ id, source, edit, link }) => ({
				id,
				source,
				...(edit ? { edit } : {}),
				link
			}));
		void this.#send(JSON.stringify(body), '', 'application/json');
	}

	/** Back to the photo the Sheet and the defaults give. */
	resetPhoto() {
		const person = this.signature?.id;
		if (!person) return;
		this.busy = 'photo';
		void this.#send(JSON.stringify({ person, photo: null }), '', 'application/json');
	}

	pickPhoto(source: string) {
		const draft = this.draft;
		if (!draft || source === draft.photo.source) return;
		const choice = this.parts?.photos.find((each) => each.source === source);
		draft.photo = {
			...draft.photo,
			source,
			edit: undefined,
			label: choice?.label ?? draft.photo.label,
			preview: choice?.preview || draft.photo.preview,
			original: choice?.preview || draft.photo.original
		};
		this.save('photo');
	}

	/** A company banner tapped goes under the signature's banners, or comes off them when it is already there. */
	toggleBanner(source: string) {
		const draft = this.draft;
		if (!draft) return;
		const at = draft.banners.findIndex((each) => each.source === source);
		if (at >= 0) {
			draft.banners.splice(at, 1);
			return this.save('banners');
		}
		if (draft.banners.length >= MAX_BANNERS) {
			this.problem = `A signature takes ${MAX_BANNERS} banners at most. Delete one first.`;
			return;
		}
		const choice = this.parts?.companyBanners.find((each) => each.source === source);
		if (!choice) return;
		draft.banners.push({
			id: crypto.randomUUID(),
			source,
			link: choice.link ?? '',
			label: choice.label,
			preview: choice.preview,
			original: choice.preview
		});
		this.save('banners');
	}

	/** A banner dragged gives way as it goes; the order is saved once it has been let go a moment. */
	moveBanner(from: number, to: number) {
		const draft = this.draft;
		if (!draft) return false;
		const [banner] = draft.banners.splice(from, 1);
		draft.banners.splice(to, 0, banner);
		clearTimeout(this.#moved);
		this.#moved = setTimeout(() => this.save('banners'), 700);
	}

	deleteBanner(id: string) {
		this.#look.confirm({
			title: 'Delete banner?',
			note: 'It leaves the signature.',
			onyes: () => {
				if (!this.draft) return;
				this.draft.banners = this.draft.banners.filter((each) => each.id !== id);
				this.save('banners');
			}
		});
	}

	/** A link is kept as it is left: an address as typed, an email as a mail link, anything else on the web. */
	setLink(what: SignaturePartType, typed: string, apply: (link: string) => void) {
		const link = toLink(typed);
		if (link === undefined) {
			this.problem = 'That link is not an address. Check it and try again.';
			return;
		}
		apply(link);
		this.save(what);
	}

	/** Photos and banners from the device, one after the other: a photo takes the photo's place, a banner goes under. */
	async upload(kind: 'photo' | 'banner', files: File[]) {
		const person = this.signature?.id;
		const pictures = files.filter((file) => file.type.startsWith('image/'));
		if (!person || !pictures.length) return;
		for (const file of kind === 'photo' ? pictures.slice(0, 1) : pictures) {
			this.busy = kind === 'photo' ? 'photo' : 'banners';
			const blob = await shrink(file, kind);
			const query = `?${new URLSearchParams({ kind, person })}`;
			await this.#send(blob, query, blob.type || file.type);
			if (this.problem) break;
		}
	}

	/** The photo editor on the photo: kept square, its circle drawn over it. */
	openPhoto(mode: PopupModeType = 'crop') {
		if (!this.draft) return;
		const { original, edit } = this.draft.photo;
		const photo = { id: 'photo', src: original, description: '', edit };
		this.editing = {
			what: 'photo',
			id: 'photo',
			mode,
			group: toGroup('signature-photo', [photo], '1:1')
		};
	}

	/** The photo editor on a banner, the others beside it: each starts whole, in its own shape. */
	openBanner(id: string, mode: PopupModeType = 'crop') {
		if (!this.draft) return;
		const photos = this.draft.banners.map((banner) => ({
			id: banner.id,
			src: banner.original,
			description: '',
			edit: banner.edit
		}));
		this.editing = { what: 'banners', id, mode, group: toGroup(BANNERS, photos, 'free') };
	}

	/** The editor's ✓, or a delete in it: the edits go to the photo or the banners and are saved. */
	saveEditing() {
		const editing = this.editing;
		const draft = this.draft;
		if (!editing || !draft) return;
		const kept = editing.group.photos;
		if (editing.what === 'photo') {
			if (!kept.length) return this.resetPhoto();
			draft.photo.edit = kept[0].edit;
			return this.save('photo');
		}
		draft.banners = kept.flatMap((photo) => {
			const banner = draft.banners.find((each) => each.id === photo.id);
			return banner ? [{ ...banner, edit: photo.edit }] : [];
		});
		this.save('banners');
	}
}

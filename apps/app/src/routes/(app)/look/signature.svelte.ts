// A Team member's Email Signature (#354), as their Team page edits and previews it (Justin, 2026-11-28: "I want to
// include the email signature into the main edit page of the team member"): the signature the server makes for
// them, its photo, its one banner and its group emails as they are being changed, what is on its way and why a change
// was refused. One per Team page; its Edit (signature-edit.svelte) and its Preview (signature-canvas.svelte) read the
// same one. The server is the one place that says who may see and change whose (`checkSignature`): a person their
// own, an Admin anyone's.
// Round 8 (Justin, 2026-11-28): the photo and the banner are each picked from a photo panel (photo-panel.svelte), the
// project's own, holding the built-in pictures and the person's uploads: dragged to reorder, held to select several,
// tapped to crop in the photo editor. Each panel is kept here as the editor's group, its pictures named by their
// source, and saved whole with the one picked from it.
import { toFittedSize } from '#lib/files/files.utils.js';
import { SIGNATURE_API, UPLOAD_SIDE } from '#lib/signature/signature.constants.js';
import type {
	PanelShownType,
	SignatureAnswerType,
	SignaturePartsType,
	SignatureSaveType
} from '#lib/signature/signature.types.js';
import { toLink } from '#lib/signature/signature.utils.js';
import type { GroupType } from './look.data';
import type { SelectionSourceType } from './selection.svelte';

export type SignaturePartType = 'photo' | 'banner' | 'groups';
type PanelKindType = 'photo' | 'banner';

/** The signature's parts as the screen changes them: the photo and banner picked, their panels, the group emails. */
type DraftType = {
	photo: SignaturePartsType['photo'];
	banner?: SignaturePartsType['banner'];
	photos: GroupType;
	banners: GroupType;
	groupEmails: string[];
};

// A panel as the photo editor's group: square for the photo, whose circle is drawn over it, each banner in its own
// shape.
function toPanelGroup(id: string, list: PanelShownType[], ratio: GroupType['ratio']): GroupType {
	return {
		id,
		title: '',
		description: '',
		layout: 1,
		isEnabled: true,
		fit: 'fit',
		ratio,
		photos: list.map((each) => ({
			id: each.source,
			src: each.preview,
			description: each.label,
			edit: each.edit
		}))
	};
}

// The parts of an answer, copied so the screen can change them at once.
function draftOf(parts: SignaturePartsType): DraftType {
	return {
		photo: { ...parts.photo },
		banner: parts.banner && { ...parts.banner },
		photos: toPanelGroup('signature-photos', parts.photos, '1:1'),
		banners: toPanelGroup('signature-banners', parts.banners, 'free'),
		groupEmails: [...parts.groupEmails]
	};
}

// A panel's pictures as they are saved: each by its source, with its edit.
function toList(group: GroupType) {
	return group.photos.map((photo) =>
		photo.edit ? { source: photo.id, edit: photo.edit } : { source: photo.id }
	);
}

// A picture shrunk on the device before it goes, its long side at most `UPLOAD_SIDE`: a JPEG, or a PNG for a banner
// that came as one. One the browser cannot draw goes as it is, for the server to try.
async function shrink(file: File, kind: PanelKindType): Promise<Blob> {
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
	// The answer for the person asked for; none when it could not load.
	#loaded = $state<{ person: string; answer?: SignatureAnswerType }>();
	// The answer after a save or an upload, for the person it was made for.
	#changed = $state<{ person: string; answer: SignatureAnswerType }>();
	// Only the last thing sent is shown when it answers, so a change made while another was on its way is never lost.
	#sent = 0;

	/** What is on its way to the server: the photo, the banner or the group emails. */
	busy = $state<SignaturePartType | ''>('');
	/** Uploads on their way to a panel. */
	uploading = $state<PanelKindType | ''>('');
	/** Why the last change did not save. */
	problem = $state('');
	/** The parts as they are being edited: the last answer's, changed here at once. */
	draft = $state<DraftType>();
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

	constructor(person: () => string) {
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

	/** What a panel's picture is: its name, and whether it is the person's upload, theirs to delete. */
	shownOf(kind: PanelKindType, source: string) {
		return (kind === 'photo' ? this.parts?.photos : this.parts?.banners)?.find(
			(each) => each.source === source
		);
	}

	/** Saves a part as it is now, for the signature shown: the photo or the banner with its panel, or the group emails. */
	save(what: SignaturePartType, extra: Partial<SignatureSaveType> = {}) {
		const draft = this.draft;
		const person = this.signature?.id;
		if (!draft || !person) return;
		this.busy = what;
		const body: SignatureSaveType = { person };
		if (what === 'photo') {
			const { source, edit, link } = draft.photo;
			body.photo = { source, ...(edit ? { edit } : {}), link };
			body.photos = toList(draft.photos);
		} else if (what === 'banner') {
			const banner = draft.banner;
			body.banner = banner
				? {
						id: banner.id,
						source: banner.source,
						...(banner.edit ? { edit: banner.edit } : {}),
						link: banner.link
					}
				: null;
			body.banners = toList(draft.banners);
		} else body.groupEmails = draft.groupEmails;
		void this.#send(JSON.stringify({ ...body, ...extra }), '', 'application/json');
	}

	/** The photo picked from its panel, with the edit its tile has. */
	pickPhoto(source: string) {
		const draft = this.draft;
		if (!draft || source === draft.photo.source) return;
		const tile = draft.photos.photos.find((each) => each.id === source);
		const shown = this.shownOf('photo', source);
		if (!tile || !shown) return;
		draft.photo = {
			...draft.photo,
			source,
			edit: tile.edit,
			label: shown.label,
			preview: shown.preview,
			original: shown.original
		};
		this.save('photo');
	}

	/** The one banner picked from its panel, with the edit its tile has and the link it starts with. */
	pickBanner(source: string) {
		const draft = this.draft;
		if (!draft || source === draft.banner?.source) return;
		const tile = draft.banners.photos.find((each) => each.id === source);
		const shown = this.shownOf('banner', source);
		if (!tile || !shown) return;
		draft.banner = {
			id: crypto.randomUUID(),
			source,
			edit: tile.edit,
			link: shown.link ?? '',
			label: shown.label,
			preview: shown.preview,
			original: shown.original
		};
		this.save('banner');
	}

	/**
	 * A panel changed in place (a move, a delete, an edit in the photo editor): the picture in use takes its tile's
	 * edit, or, deleted, the signature goes back to the one it starts with; then the panel is saved with it.
	 */
	savePanel(kind: PanelKindType) {
		const draft = this.draft;
		if (!draft) return;
		if (kind === 'photo') {
			const tile = draft.photos.photos.find((each) => each.id === draft.photo.source);
			if (!tile) return this.save('photo', { photo: null });
			draft.photo.edit = tile.edit;
			return this.save('photo');
		}
		const banner = draft.banner;
		const tile = banner && draft.banners.photos.find((each) => each.id === banner.source);
		if (banner && !tile) {
			draft.banner = undefined;
			return this.save('banner', { banner: null });
		}
		if (banner && tile) banner.edit = tile.edit;
		this.save('banner');
	}

	/** What a panel's selection is (#402): its pictures, Delete for the uploads, and a drag to a new place. */
	sourceOf(kind: PanelKindType): SelectionSourceType {
		const group = () => (kind === 'photo' ? this.draft?.photos : this.draft?.banners);
		return {
			photos: () => group()?.photos ?? [],
			noun: kind,
			word: 'signature',
			canDelete: (photo) => Boolean(this.shownOf(kind, photo.id)?.isOwn),
			ondelete: (ids) => {
				const shown = group();
				if (!shown) return;
				shown.photos = shown.photos.filter((photo) => !ids.includes(photo.id));
				this.savePanel(kind);
			},
			onmove: (ids, to) => {
				const shown = group();
				if (!shown) return;
				const moving = shown.photos.filter((photo) => ids.includes(photo.id));
				const at = to ?? shown.photos.length;
				const before = shown.photos.slice(0, at).filter((photo) => !ids.includes(photo.id));
				const after = shown.photos.slice(at).filter((photo) => !ids.includes(photo.id));
				shown.photos = [...before, ...moving, ...after];
				this.savePanel(kind);
			}
		};
	}

	/** The group emails under the signature, picked or taken off. */
	setGroups(emails: string[]) {
		if (!this.draft) return;
		this.draft.groupEmails = emails;
		this.save('groups');
	}

	/** An Admin's new group email: offered to everyone from now on, and under this signature at once. */
	addGroup(email: string, name: string) {
		if (!this.draft) return;
		const typed = email.trim();
		if (!this.draft.groupEmails.includes(typed)) this.draft.groupEmails.push(typed);
		this.save('groups', { addGroup: { email: typed, name: name.trim() } });
	}

	/** A link is kept as it is left: an address as typed, an email as a mail link, anything else on the web. */
	setLink(what: PanelKindType, typed: string) {
		const link = toLink(typed);
		if (link === undefined) {
			this.problem = 'That link is not an address. Check it and try again.';
			return;
		}
		const draft = this.draft;
		if (!draft) return;
		if (what === 'photo') draft.photo.link = link;
		else if (draft.banner) draft.banner.link = link;
		this.save(what);
	}

	/** Photos or banners from the device, one after the other: each joins its panel and is the one in use. */
	async upload(kind: PanelKindType, files: File[]) {
		const person = this.signature?.id;
		const pictures = files.filter((file) => file.type.startsWith('image/'));
		if (!person || !pictures.length) return;
		this.uploading = kind;
		for (const file of pictures) {
			const blob = await shrink(file, kind);
			const query = `?${new URLSearchParams({ kind, person })}`;
			await this.#send(blob, query, blob.type || file.type);
			if (this.problem) break;
		}
		this.uploading = '';
	}
}

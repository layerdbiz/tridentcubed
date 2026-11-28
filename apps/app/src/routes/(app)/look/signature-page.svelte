<script lang="ts">
	// Email Signature (#354; Justin, 2026-11-26: "a way for team members to log in to the app and copy and paste their
	// email signatures into their Microsoft Outlook"). Anyone opens their own from the menu on their profile picture;
	// an Admin picks anyone on the Team page or a shared mailbox. It is the website's signature (`/company/emails`,
	// #62) moved into the app: the library's Email writes it, and the server copies every picture to the app's public
	// signature address (#lib/server/signature.ts), since a pasted signature's pictures are loaded by every reader's
	// mail app, signed out. Round 3 (Justin, 2026-11-27): built like the Organization and a project, with Page, Edit
	// and Preview on the bottom bar; Preview is the signature alone on the report's canvas (signature-canvas.svelte),
	// with Copy in the zoom bar where Download is.
	// Round 4 (Justin, 2026-11-27: "So really all we need here is a drop down for it to select the person ... this
	// photo panel here, it should be the same thing that we have in the project edit panels"): Edit is the Team
	// member picker, as a project's Team Lead is picked, the details coming from the Team page; then Photo and
	// Banners, each the Project panel's photo tiles (photo-tile.svelte, photo-add.svelte) opening the same photo
	// editor (photo-popup.svelte). The photo is the signature's own, never the profile picture, always a circle, and a
	// tap on it in an email goes to its link. Banners show at their own shape, as the email draws them, are dragged to
	// reorder, edited and deleted, and each opens its own link in a new window.
	// Round 5 (Justin, 2026-11-28): a page of a Team member's, opened from their Team page, its bar reading Team ›
	// Email (look.openSignature); every company banner shows under the signature's own for anyone to pick ("We need
	// to have those available for everyone to choose from"); both are photo grids (photo-grid.svelte) at each banner's
	// own shape ("the original"); and beside Edit on a desktop the signature is centred in the room, not at its left.
	import { Avatar, Button, Email, Input, Menu, Select, type SelectOptionType } from '@layerd/ui';
	import { toFittedSize } from '#lib/files/files.utils.js';
	import {
		MAX_BANNERS,
		SHEET_EDIT_URL,
		SIGNATURE_API,
		UPLOAD_SIDE
	} from '#lib/signature/signature.constants.js';
	import type {
		SignatureAnswerType,
		SignatureAskType,
		SignaturePartsType,
		SignatureSaveType
	} from '#lib/signature/signature.types.js';
	import { toLink } from '#lib/signature/signature.utils.js';
	import { croppedAspect, keptAspectOf, type EditType } from './attachments';
	import Group from './group.svelte';
	import type { GroupType, PhotoType } from './look.data';
	import { PROJECT_TABS, type LookState } from './look.state.svelte';
	import { faceOf } from './marks';
	import PageHeader from './page-header.svelte';
	import PhotoAdd, { ADD_TILE } from './photo-add.svelte';
	import PhotoGrid from './photo-grid.svelte';
	import PhotoPopup, { type PopupModeType } from './photo-popup.svelte';
	import PhotoTile from './photo-tile.svelte';
	import { pictureAspectOf } from './shapes';
	import SignatureCanvas from './signature-canvas.svelte';
	import { sortable } from './sortable';

	let { look, isWide }: { look: LookState; isWide: boolean } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';
	const MAILBOX = 'mailbox:';
	const BANNERS = 'signature-banners';
	const COMPANY = 'signature-company-banners';

	// Whose signature: the one opened (a Team member's page, or an Admin's pick), else the User's own.
	const picked = $derived(look.signatureFor);
	const ask = $derived<SignatureAskType>(
		picked.startsWith(MAILBOX)
			? { mailbox: picked.slice(MAILBOX.length) }
			: picked
				? { person: picked }
				: {}
	);
	const askKey = $derived(JSON.stringify(ask));

	async function load(asked: SignatureAskType): Promise<SignatureAnswerType> {
		const query = new URLSearchParams();
		if (asked.person) query.set('person', asked.person);
		if (asked.mailbox) query.set('mailbox', asked.mailbox);
		const response = await fetch(`${SIGNATURE_API}?${query}`, { cache: 'no-store' });
		const found = (await response.json().catch(() => undefined)) as SignatureAnswerType | undefined;
		if (!found) throw new Error(`The signature answered ${response.status}.`);
		return found;
	}

	// The answer for the signature asked for; no `answer` when it could not load.
	let loaded = $state<{ key: string; answer?: SignatureAnswerType }>();
	$effect(() => {
		const key = askKey;
		let isAsked = true;
		load(ask).then(
			(answer) => isAsked && (loaded = { key, answer }),
			() => isAsked && (loaded = { key })
		);
		return () => (isAsked = false);
	});
	const isLoading = $derived(loaded?.key !== askKey);

	// The answer after a save or an upload, for the signature it was made for; a save that was refused says why.
	let changed = $state<{ key: string; answer: SignatureAnswerType }>();
	let busy = $state('');
	let problem = $state('');

	const found = $derived(
		isLoading || !loaded?.answer
			? undefined
			: changed?.key === askKey
				? changed.answer
				: loaded.answer
	);
	const allowed = $derived(found?.isAllowed ? found : undefined);
	const signature = $derived(allowed?.signature);

	// The photo and banners as they are being edited: the last answer's, changed here at once while the server makes
	// their pictures again.
	type PartsType = Pick<SignaturePartsType, 'photo' | 'banners'>;
	let draft = $state<PartsType>();
	$effect(() => {
		const parts = allowed?.parts;
		draft = parts
			? { photo: { ...parts.photo }, banners: parts.banners.map((banner) => ({ ...banner })) }
			: undefined;
	});

	// The library Email writes the signature's HTML once drawn; the canvas shows and copies it.
	let email = $state<{ getHTML: () => string }>();
	const html = $derived(signature && email ? email.getHTML() : '');

	// Only the last thing sent is shown when it answers, so a change made while another was on its way is never lost.
	let sent = 0;

	async function send(body: BodyInit, query: string, type: string) {
		const key = askKey;
		const at = ++sent;
		problem = '';
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
		if (at !== sent) return;
		busy = '';
		if (answer?.isAllowed) changed = { key, answer };
		else {
			problem = reason || 'That did not save. Try again.';
			// What the server keeps comes back, the change undone.
			const parts = allowed?.parts;
			if (parts)
				draft = { photo: { ...parts.photo }, banners: parts.banners.map((each) => ({ ...each })) };
		}
	}

	// Saves the photo and banners as they are now (only what changed), for the signature shown.
	function save(what: 'photo' | 'banners') {
		if (!draft || !signature) return;
		busy = what;
		const body: SignatureSaveType = { person: signature.id };
		if (what === 'photo') {
			const { source, edit, link } = draft.photo;
			body.photo = { source, ...(edit ? { edit } : {}), link };
		} else {
			body.banners = draft.banners.map(({ id, source, edit, link }) => ({
				id,
				source,
				...(edit ? { edit } : {}),
				link
			}));
		}
		void send(JSON.stringify(body), '', 'application/json');
	}

	// Back to the photo the Sheet and the defaults give.
	function resetPhoto() {
		if (!signature) return;
		busy = 'photo';
		void send(JSON.stringify({ person: signature.id, photo: null }), '', 'application/json');
	}

	function pickPhoto(source: string) {
		if (!draft || source === draft.photo.source) return;
		const choice = allowed?.parts?.photos.find((each) => each.source === source);
		draft.photo = {
			...draft.photo,
			source,
			edit: undefined,
			label: choice?.label ?? draft.photo.label,
			preview: choice?.preview || draft.photo.preview,
			original: choice?.preview || draft.photo.original
		};
		save('photo');
	}

	function addBanner(source: string) {
		const choice = allowed?.parts?.companyBanners.find((each) => each.source === source);
		if (!draft || !choice) return;
		draft.banners.push({
			id: crypto.randomUUID(),
			source,
			link: choice.link ?? '',
			label: choice.label,
			preview: choice.preview,
			original: choice.preview
		});
		save('banners');
	}

	// A company banner tapped goes under the signature's banners, or comes off them when it is already there.
	function toggleBanner(source: string) {
		if (!draft) return;
		const at = draft.banners.findIndex((each) => each.source === source);
		if (at >= 0) {
			draft.banners.splice(at, 1);
			return save('banners');
		}
		if (draft.banners.length >= MAX_BANNERS) {
			problem = `A signature takes ${MAX_BANNERS} banners at most. Delete one first.`;
			return;
		}
		addBanner(source);
	}

	// A banner dragged gives way as it goes; the order is saved once it has been let go a moment.
	let moved: ReturnType<typeof setTimeout> | undefined;
	function moveBanner(from: number, to: number) {
		if (!draft) return false;
		const [banner] = draft.banners.splice(from, 1);
		draft.banners.splice(to, 0, banner);
		clearTimeout(moved);
		moved = setTimeout(() => save('banners'), 700);
	}

	function deleteBanner(id: string) {
		look.confirm({
			title: 'Delete banner?',
			note: 'It leaves the signature.',
			onyes: () => {
				if (!draft) return;
				draft.banners = draft.banners.filter((each) => each.id !== id);
				save('banners');
			}
		});
	}

	// A link is kept as it is left: an address as typed, an email as a mail link, anything else on the web.
	function setLink(what: 'photo' | 'banners', typed: string, apply: (link: string) => void) {
		const link = toLink(typed);
		if (link === undefined) {
			problem = 'That link is not an address. Check it and try again.';
			return;
		}
		apply(link);
		save(what);
	}

	// A picture shrunk on the device before it goes, its long side at most `UPLOAD_SIDE`: a JPEG, or a PNG for a
	// banner that came as one. One the browser cannot draw goes as it is, for the server to try.
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

	// Photos and banners from the device or dropped on their section, one after the other: a photo takes the photo's
	// place, a banner goes under the others.
	async function upload(kind: 'photo' | 'banner', files: File[]) {
		const person = signature?.id;
		const pictures = files.filter((file) => file.type.startsWith('image/'));
		if (!person || !pictures.length) return;
		for (const file of kind === 'photo' ? pictures.slice(0, 1) : pictures) {
			busy = kind === 'photo' ? 'photo' : 'banners';
			const blob = await shrink(file, kind);
			const query = `?${new URLSearchParams({ kind, person })}`;
			await send(blob, query, blob.type || file.type);
			if (problem) break;
		}
	}

	function pickFiles(kind: 'photo' | 'banner', event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		void upload(kind, files);
	}

	// Files dragged in from the desktop land in the section they are dropped on, as in a project's photo groups.
	let dropping = $state('');
	function overFiles(event: DragEvent, kind: string) {
		if (!event.dataTransfer?.types.includes('Files')) return;
		event.preventDefault();
		dropping = kind;
	}

	function dropFiles(event: DragEvent, kind: 'photo' | 'banner') {
		if (!event.dataTransfer?.files.length) return;
		event.preventDefault();
		dropping = '';
		void upload(kind, [...event.dataTransfer.files]);
	}

	// The photo editor, open on the photo or on a banner with the others beside it, as on a project's photos. A photo
	// is kept square, its circle drawn over it; a banner starts whole, in its own shape.
	let editing = $state<{
		what: 'photo' | 'banners';
		group: GroupType;
		id: string;
		mode: PopupModeType;
	}>();

	function toGroup(id: string, photos: PhotoType[], ratio: GroupType['ratio']): GroupType {
		return {
			id,
			title: '',
			description: '',
			layout: 1,
			isEnabled: true,
			photos,
			fit: 'fit',
			ratio
		};
	}

	function openPhoto(mode: PopupModeType = 'crop') {
		if (!draft) return;
		const { original, edit } = draft.photo;
		editing = {
			what: 'photo',
			id: 'photo',
			mode,
			group: toGroup(
				'signature-photo',
				[{ id: 'photo', src: original, description: '', edit }],
				'1:1'
			)
		};
	}

	function openBanner(id: string, mode: PopupModeType = 'crop') {
		if (!draft) return;
		const photos = draft.banners.map((banner) => ({
			id: banner.id,
			src: banner.original,
			description: '',
			edit: banner.edit
		}));
		editing = { what: 'banners', id, mode, group: toGroup(BANNERS, photos, 'free') };
	}

	// The editor's ✓, or a delete in it: the edits go to the photo or the banners and are saved.
	function saveEditing() {
		if (!editing || !draft) return;
		const kept = editing.group.photos;
		if (editing.what === 'photo') {
			if (!kept.length) resetPhoto();
			else {
				draft.photo.edit = kept[0].edit;
				save('photo');
			}
			return;
		}
		draft.banners = kept.flatMap((photo) => {
			const banner = draft?.banners.find((each) => each.id === photo.id);
			return banner ? [{ ...banner, edit: photo.edit }] : [];
		});
		save('banners');
	}

	// A tile's picture: the small one, with its edit drawn over it.
	function tileOf(id: string, part: { preview: string; edit?: EditType }): PhotoType {
		return { id, src: part.preview, description: '', edit: part.edit };
	}

	// A banner's tile has the banner's shape once edited, as the email shows it.
	function shapeOf(part: { preview: string; edit?: EditType }) {
		const edit = part.edit ?? {};
		const aspect = pictureAspectOf(tileOf('', part));
		return croppedAspect(edit, aspect, keptAspectOf(edit, aspect));
	}

	// The shared mailboxes the last answer named, for an Admin's picker.
	let mailboxes = $state<{ slug: string; name: string }[]>([]);
	$effect(() => {
		if (allowed?.mailboxes.length) mailboxes = allowed.mailboxes;
	});

	// The Team member picker, as a project's Team Lead: everyone on the Team page in its order for an Admin, then the
	// shared mailboxes; anyone else has only their own.
	const people = $derived(
		look.members
			.filter((each) => each.id && (look.isAdmin || each.id === look.me?.id))
			.toSorted((left, right) => left.rank - right.rank || left.name.localeCompare(right.name))
	);
	const options = $derived<SelectOptionType[]>([
		...people.map((each) => ({
			value: each.id ?? '',
			label: each.name,
			note: each.title || undefined
		})),
		...(look.isAdmin
			? mailboxes.map((mailbox) => ({
					value: `${MAILBOX}${mailbox.slug}`,
					label: mailbox.name,
					note: 'Shared mailbox'
				}))
			: [])
	]);
	const shownId = $derived(picked || signature?.id || look.me?.id || '');
	const member = $derived(
		signature?.type === 'person' ? look.members.find((each) => each.id === signature.id) : undefined
	);
	const whose = $derived(
		signature?.name || options.find((option) => option.value === shownId)?.label || ''
	);

	// Edit's sections, as a Project panel's open and close; both start open, there being only these.
	let open = $state<string[]>(['photo', 'banners']);
	function toggle(id: string) {
		open = open.includes(id) ? open.filter((item) => item !== id) : [...open, id];
	}

	const STEPS = [
		{
			app: 'New Outlook and Outlook on the web',
			how: 'Settings, then Account, then Signatures. Make a new signature, paste into the box and Save. Choose it for new messages and replies.'
		},
		{
			app: 'Classic Outlook for Windows',
			how: 'File, then Options, then Mail, then Signatures. Press New, paste into the box, press OK.'
		},
		{
			app: 'Outlook for Mac',
			how: 'Outlook, then Settings, then Signatures. Press +, paste into the box and close it to save.'
		}
	];

	// The phone's three panes, swiped between or picked on the bottom bar, as a project's are.
	let swiper: HTMLDivElement | undefined = $state();
	let top = $state(0);
	let isLanded = false;

	function onscroll() {
		if (!swiper?.clientWidth) return;
		look.tabProgress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = PROJECT_TABS[Math.round(look.tabProgress)] ?? 'page';
	}

	$effect(() => {
		if (!swiper) return;
		const left = Math.max(0, PROJECT_TABS.indexOf(look.tab)) * swiper.clientWidth;
		if (!isLanded) {
			isLanded = true;
			swiper.scrollLeft = left;
			look.tabProgress = Math.max(0, PROJECT_TABS.indexOf(look.tab));
		} else if (Math.abs(swiper.scrollLeft - left) > swiper.clientWidth / 2)
			swiper.scrollTo({ left, behavior: 'smooth' });
	});

	// On Preview the canvas takes every drag, so a strip on the left edge swipes back to Edit, as on a project.
	let edge: { x: number; left: number } | undefined;

	function edgeDown(event: PointerEvent) {
		if (!swiper) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		edge = { x: event.clientX, left: swiper.scrollLeft };
		swiper.style.scrollSnapType = 'none';
	}

	function edgeMove(event: PointerEvent) {
		if (!edge || !swiper) return;
		swiper.scrollLeft = edge.left - Math.max(0, event.clientX - edge.x);
	}

	function edgeUp(event: PointerEvent) {
		if (!edge || !swiper) return;
		const isBack = event.clientX - edge.x > swiper.clientWidth * 0.2;
		edge = undefined;
		swiper.style.scrollSnapType = '';
		look.tab = isBack ? 'edit' : 'preview';
		swiper.scrollTo({
			left: PROJECT_TABS.indexOf(look.tab) * swiper.clientWidth,
			behavior: 'smooth'
		});
	}
</script>

<!-- Drawn out of sight: the library Email writes the HTML the canvas shows. -->
{#if signature}
	<div class="hidden">
		<Email
			data={signature}
			onMount={(instance) => (email = instance)}
		/>
	</div>
{/if}

<!-- Loading, or why there is nothing to show. -->
{#snippet status()}
	{#if isLoading}
		<div
			class="flex justify-center py-16"
			role="status"
		>
			<span class="icon-[svg-spinners--ring-resize] size-8 text-slate-400"></span>
			<span class="sr-only">Loading</span>
		</div>
	{:else if found && !found.isAllowed}
		<p class="px-1 py-10 text-center text-sm text-slate-500">{found.reason}</p>
	{:else if !found}
		<p class="px-1 py-10 text-center text-sm text-slate-500">
			The signature could not load. Check the connection and open it again.
		</p>
	{/if}
{/snippet}

<!-- A Team member's face, or a shared mailbox's icon, for the picker. -->
{#snippet whoMark(value: string, size: number)}
	{@const person = look.members.find((each) => each.id === value)}
	{#if person}
		<Avatar
			{...faceOf(person.name, { hasPresence: false })}
			{size}
			ring="ring-2 ring-white"
		/>
	{:else}
		<Avatar
			alt="Shared mailbox"
			fallback="icon-[mdi--email-multiple-outline]"
			{size}
		/>
	{/if}
{/snippet}

<!-- Edit: whose signature, then its Photo and Banners as a Project panel's photo groups. -->
{#snippet form()}
	<div class="space-y-3">
		<div class="space-y-2">
			<Select
				label="Team member"
				mark={whoMark}
				icon="icon-[mdi--account-outline]"
				{options}
				value={shownId}
				required
				onpick={(id) => (look.signatureFor = id)}
			/>
			{#if signature}
				<div class="flex items-center justify-between gap-3 px-1">
					<p class="text-xs text-slate-500">
						{member
							? 'The name, title, phone and email are the Team page’s.'
							: 'A shared mailbox’s details, photo and banner are the website’s signature Sheet’s.'}
					</p>
					{#if member}
						<Button
							primary
							lite
							xs
							icon="icon-[mdi--account-edit-outline]"
							label="Team page"
							onclick={() => look.openRecord('team', member.name, 'edit')}
						/>
					{:else}
						<Button
							primary
							lite
							xs
							icon="icon-[mdi--open-in-new]"
							label="Sheet"
							href={SHEET_EDIT_URL}
							target="_blank"
							rel="noopener"
						/>
					{/if}
				</div>
			{/if}
		</div>
		{#if !allowed || !signature}
			{@render status()}
		{:else if draft && allowed.parts}
			{@const parts = allowed.parts}
			<div
				class="rounded-2xl transition {dropping === 'photo' ? 'ring-2 ring-primary' : ''}"
				role="group"
				aria-label="Photo"
				ondragover={(event) => overFiles(event, 'photo')}
				ondragleave={() => (dropping = '')}
				ondrop={(event) => dropFiles(event, 'photo')}
			>
				<Group
					title="Photo"
					meta={draft.photo.label}
					image={draft.photo.preview || undefined}
					icon="icon-[mdi--account-circle-outline]"
					isOpen={open.includes('photo')}
					ontoggle={() => toggle('photo')}
				>
					<p class="px-1 text-xs text-slate-500">
						The signature’s own, not the profile picture, and always a circle.
					</p>
					<PhotoGrid
						photos={[tileOf('photo', draft.photo)]}
						sortKey="signature-photo"
					>
						{#snippet tile(photo)}
							<PhotoTile
								{photo}
								index={0}
								sortKey="signature-photo"
								isRound
								hasBadge={false}
								isBusy={busy === 'photo'}
								align="left"
								options={[
									{ id: 'crop', label: 'Crop', icon: 'icon-[mdi--crop]' },
									...(draft?.photo.isPicked
										? [
												{
													id: 'delete',
													label: 'Delete',
													note: 'Back to the starting photo',
													icon: 'icon-[mdi--trash-can-outline]',
													isDanger: true
												}
											]
										: [])
								]}
								onopen={() => openPhoto()}
								onpick={(id) => (id === 'delete' ? resetPhoto() : openPhoto())}
							/>
						{/snippet}
						{#snippet adds(shape)}
							<PhotoAdd
								icon="icon-[mdi--image-plus-outline]"
								label="Upload"
								accept="image/*"
								class={shape}
								onchange={(event) => pickFiles('photo', event)}
							/>
							<Menu
								class="block"
								isWide
								label="Pick a photo"
								value={draft?.photo.source ?? ''}
								options={parts.photos.map((choice) => ({
									id: choice.source,
									label: choice.label,
									image: choice.preview || undefined,
									icon: choice.preview ? undefined : 'icon-[mdi--image-outline]'
								}))}
								align="right"
								onpick={pickPhoto}
							>
								{#snippet trigger()}
									<span class="{ADD_TILE} {shape} w-full">
										<span class="icon-[mdi--image-multiple-outline] size-6"></span>
										<span class="text-[11px] font-medium">Pick</span>
									</span>
								{/snippet}
							</Menu>
						{/snippet}
					</PhotoGrid>
					<Input
						label="Photo link"
						type="url"
						inputmode="url"
						autocomplete="off"
						autocapitalize="off"
						spellcheck={false}
						placeholder="Where a tap on the photo goes"
						value={draft.photo.link}
						onchange={(event: Event) =>
							setLink('photo', (event.target as HTMLInputElement).value, (link) => {
								if (draft) draft.photo.link = link;
							})}
					/>
				</Group>
			</div>
			<div
				class="rounded-2xl transition {dropping === 'banner' ? 'ring-2 ring-primary' : ''}"
				role="group"
				aria-label="Banners"
				ondragover={(event) => overFiles(event, 'banner')}
				ondragleave={() => (dropping = '')}
				ondrop={(event) => dropFiles(event, 'banner')}
			>
				<Group
					title="Banners"
					meta={draft.banners.length
						? `${draft.banners.length} ${draft.banners.length === 1 ? 'banner' : 'banners'}`
						: 'None'}
					image={draft.banners[0]?.preview || undefined}
					icon="icon-[mdi--image-outline]"
					isOpen={open.includes('banners')}
					ontoggle={() => toggle('banners')}
				>
					<p class="px-1 text-xs text-slate-500">
						Under the signature in this order, each its own shape, as wide as the email at most.
						Drag one to move it.
					</p>
					{#if !draft.banners.length}
						<div
							class="flex flex-col items-center gap-1 rounded-2xl bg-slate-900/[0.03] py-6 text-slate-400"
						>
							<span class="icon-[mdi--image-filter-hdr] size-8"></span>
							<p class="text-sm">No banners.</p>
						</div>
					{/if}
					<PhotoGrid
						photos={draft.banners.map((banner) => tileOf(banner.id, banner))}
						sortKey={BANNERS}
						ratio="original"
						columns={1}
						{@attach sortable(BANNERS, moveBanner)}
					>
						{#snippet tile(photo, index)}
							<PhotoTile
								{photo}
								{index}
								sortKey={BANNERS}
								hasBadge={false}
								isBusy={busy === 'banners'}
								options={[
									{ id: 'crop', label: 'Crop', icon: 'icon-[mdi--crop]' },
									{
										id: 'delete',
										label: 'Delete',
										icon: 'icon-[mdi--trash-can-outline]',
										isDanger: true
									}
								]}
								onopen={() => openBanner(photo.id)}
								onpick={(id) => (id === 'delete' ? deleteBanner(photo.id) : openBanner(photo.id))}
							/>
						{/snippet}
						{#snippet below(photo)}
							{@const banner = draft?.banners.find((each) => each.id === photo.id)}
							{#if banner}
								<Input
									label="Link"
									type="url"
									inputmode="url"
									autocomplete="off"
									autocapitalize="off"
									spellcheck={false}
									placeholder="Opens in a new window"
									value={banner.link}
									onchange={(event: Event) =>
										setLink('banners', (event.target as HTMLInputElement).value, (link) => {
											banner.link = link;
										})}
								/>
							{/if}
						{/snippet}
						{#snippet adds(shape)}
							{#if draft && draft.banners.length < MAX_BANNERS}
								<PhotoAdd
									icon="icon-[mdi--image-plus-outline]"
									label="Upload banners"
									accept="image/*"
									multiple
									class={shape}
									onchange={(event) => pickFiles('banner', event)}
								/>
							{/if}
						{/snippet}
					</PhotoGrid>
					<!-- Every company banner, for anyone to pick (Justin, 2026-11-28): a tap puts one under the
					     signature's banners, or takes it off them; those on the signature wear the selection's blue. -->
					<div class="space-y-2 pt-2">
						<h4 class="px-1 text-sm font-semibold text-slate-900">Company banners</h4>
						<p class="px-1 text-xs text-slate-500">
							Tap one to add it to the signature, or tap it again to take it off.
						</p>
						<PhotoGrid
							photos={parts.companyBanners.map((choice) => ({
								id: choice.source,
								src: choice.preview,
								description: ''
							}))}
							sortKey={COMPANY}
							ratio="original"
							columns={2}
						>
							{#snippet tile(photo, index)}
								<PhotoTile
									{photo}
									{index}
									sortKey={COMPANY}
									hasBadge={false}
									isSelecting
									isPicked={draft?.banners.some((each) => each.source === photo.id)}
									options={[]}
									onopen={() => toggleBanner(photo.id)}
									onpick={() => toggleBanner(photo.id)}
								/>
							{/snippet}
							{#snippet below(photo)}
								{@const isOn = draft?.banners.some((each) => each.source === photo.id)}
								{@const choice = parts.companyBanners.find((each) => each.source === photo.id)}
								<p
									class="flex items-center gap-1 px-1 text-xs {isOn
										? 'font-medium text-primary'
										: 'text-slate-600'}"
								>
									{#if isOn}<span class="icon-[mdi--check-circle] size-3.5 shrink-0"></span>{/if}
									<span class="truncate">{choice?.label}</span>
								</p>
							{/snippet}
						</PhotoGrid>
					</div>
				</Group>
			</div>
		{/if}
		{#if problem}
			<p
				class="px-1 text-sm text-red-600"
				role="alert"
			>
				{problem}
			</p>
		{/if}
	</div>
{/snippet}

<!-- Page: what the signature is and how it goes into Outlook, on a dark top with a white sheet under it. -->
{#snippet page()}
	<div class="h-full overflow-y-auto overscroll-y-contain bg-white">
		<div
			class="flex flex-col items-center bg-linear-to-br from-slate-700 to-slate-950 px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-16 text-center text-white"
		>
			{#if signature?.src}
				<Avatar
					src={signature.src}
					alt={signature.name}
					size={96}
					ring="ring-4 ring-white/15"
				/>
			{:else}
				<span class="flex size-24 items-center justify-center rounded-full bg-white/10"
					><span class="icon-[mdi--card-account-mail-outline] size-11"></span></span
				>
			{/if}
			<h1 class="mt-4 text-2xl leading-tight font-semibold">Email Signature</h1>
			{#if whose}<p class="mt-1 text-sm font-medium text-white/85">{whose}</p>{/if}
			<p class="mt-2 max-w-md text-sm text-white/70">
				Edit picks whose it is and changes its photo and banners. Preview shows it: press Copy
				there, then paste it into Outlook’s signature settings on a computer.
			</p>
		</div>
		<div
			class="-mt-8 rounded-t-[40px] bg-white px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+96px)]"
		>
			<section class="mx-auto max-w-2xl">
				<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">Add It to Outlook</h3>
				<ol class="divide-y divide-slate-900/[0.05] overflow-hidden {CARD}">
					{#each STEPS as step, index (step.app)}
						<li class="flex gap-3 px-4 py-3">
							<span
								class="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.06] text-xs font-semibold text-slate-600"
								>{index + 1}</span
							>
							<span class="min-w-0 text-sm">
								<span class="block font-medium text-slate-900">{step.app}</span>
								<span class="block text-slate-500">{step.how}</span>
							</span>
						</li>
					{/each}
				</ol>
				<p class="mt-2 px-1 text-xs text-slate-500">
					Outlook keeps the signature with your mailbox, so pasting it once on a computer brings it
					to Outlook on the web too. Outlook on a phone cannot use it.
				</p>
			</section>
		</div>
	</div>
{/snippet}

<!-- Preview: the signature on the canvas, or why there is none yet. -->
{#snippet preview(room: { left?: number; top?: number; isLeft?: boolean })}
	{#if html}
		<SignatureCanvas
			{look}
			{html}
			{...room}
		/>
	{:else}
		<div
			class="flex h-full items-center justify-center bg-slate-100"
			style:padding-left="{room.left ?? 0}px"
		>
			{@render status()}
		</div>
	{/if}
{/snippet}

{#if isWide && look.tab === 'page'}
	<!-- A desktop's Page: what it is, alone (Page, Edit and Preview are three views), its back arrow over the top. -->
	<div class="fixed inset-0 bg-slate-100">
		<PageHeader
			{look}
			title="Email Signature"
			kind={whose}
			reveal={0}
			isLight
			hasChevron={look.variant('header') === 'C'}
		/>
		{@render page()}
	</div>
{:else if isWide && look.tab === 'preview'}
	<div class="fixed inset-0">{@render preview({})}</div>
{:else if isWide}
	<!-- Centred in the room beside the Edit column (Justin, 2026-11-28: "it should be centered instead"). -->
	<div class="fixed inset-0">{@render preview({ left: 444 })}</div>
	<aside class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}">
		<div class="relative h-[72px] shrink-0">
			<PageHeader
				{look}
				title="Email Signature"
				kind={whose}
				hasCloud
				hasChevron={look.variant('header') === 'C'}
			/>
		</div>
		<div class="flex-1 overflow-y-auto px-4 pb-4">{@render form()}</div>
	</aside>
{:else}
	<!-- Clipped, not hidden: a clipped box can never be slid sideways by the browser. -->
	<div class="relative h-dvh overflow-clip bg-slate-100">
		<PageHeader
			{look}
			title="Email Signature"
			kind={whose}
			reveal={look.tabProgress}
			isLight
			hasCloud
			hasChevron={look.variant('header') === 'C'}
			bind:height={top}
		/>
		<div
			bind:this={swiper}
			class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
			{onscroll}
		>
			<div class="h-full w-full shrink-0 snap-start">{@render page()}</div>
			<div
				class="h-full w-full shrink-0 snap-start overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]"
				style:padding-top="{top + 12}px"
			>
				{@render form()}
			</div>
			<div class="relative h-full w-full shrink-0 snap-start">
				{@render preview({ top })}
				<div
					class="absolute bottom-0 left-0 z-10 w-6 touch-none"
					style="top: {top}px"
					aria-hidden="true"
					onpointerdown={edgeDown}
					onpointermove={edgeMove}
					onpointerup={edgeUp}
					onpointercancel={edgeUp}
				></div>
			</div>
		</div>
	</div>
{/if}

{#if editing}
	<PhotoPopup
		{look}
		group={editing.group}
		id={editing.id}
		mode={editing.mode}
		word={editing.what === 'photo' ? 'photo' : 'banner'}
		noun={editing.what === 'photo' ? 'photo' : 'banner'}
		deleteNote={editing.what === 'photo'
			? 'The signature shows its starting photo again.'
			: 'It leaves the signature.'}
		isPictureOnly
		isRound={editing.what === 'photo'}
		onsave={saveEditing}
		onclose={() => (editing = undefined)}
	/>
{/if}

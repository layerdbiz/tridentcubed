<script lang="ts">
	// A Team member's Email Signature on their Edit (#354): the Signature, Photos and Banners sections of the Email
	// Signature panel (team-edit.svelte), as a Project panel's sections are.
	// Round 9 (Justin, 2026-11-28): the Signature section holds everything the signature shows, picked from drop-downs:
	// its Photo and Photo link, its ONE Banner and Banner link ("That's the only way that you should be able to select
	// a company banner"), and the group emails printed under it, from the Sheet's shared mailboxes and the ones an
	// Admin adds here. Under it, the Photos and the Banners, each the photo panel a Project panel's photo groups use
	// (photo-panel.svelte): tapped to crop in the photo editor, dragged to reorder, held to select several, with Upload
	// at the end. The Photos hold the built-in photos, always there (the Trident logos, the profile picture, the email
	// photo, the Profile Images photos), each round in a grey square frame, and the person's uploads; the Banners every
	// company banner and theirs. The one in use wears a green border. Every input has its help ? (Justin: "Every input
	// that we have ... there has to be a help icon next to it"). The photo is the signature's own, always a circle in
	// the email, and a tap on it there goes to its link.
	import { Button, Dialog, Input, Select } from '@layerd/ui';
	import Group from './group.svelte';
	import type { LookState } from './look.state.svelte';
	import type { GroupType, PhotoType } from './look.data';
	import PhotoPanel, { type PanelSelectingType } from './photo-panel.svelte';
	import { toCountLabel } from './look.utils';
	import type { SignatureState } from './signature.svelte';
	import { valuesOf, type SectionType } from './tally';

	let {
		look,
		signature,
		sections,
		open,
		ontoggle
	}: {
		look: LookState;
		signature: SignatureState;
		/** What its sections hold, for the lines under their names (tally.ts, `teamPanelsOf`). */
		sections: SectionType[];
		/** The sections open, which the empty-inputs list opens too (team-edit.svelte). */
		open: string[];
		ontoggle: (id: string) => void;
	} = $props();

	type KindType = 'photo' | 'banner';
	const PANELS: Record<KindType, string> = {
		photo: 'signature-photos',
		banner: 'signature-banners'
	};
	const LINK = {
		type: 'url',
		inputmode: 'url',
		autocomplete: 'off',
		autocapitalize: 'off',
		spellcheck: false
	} as const;

	let root = $state<HTMLDivElement>();
	const selection = $derived(look.selection);

	// Selecting several of a panel's pictures (#402), as a Project panel's photos are: a hold starts it, taps add, the
	// Selection bar deletes the uploads among them, and a drag takes them all to a new place.
	function selectingOf(kind: KindType, photos: PhotoType[]): PanelSelectingType {
		const id = PANELS[kind];
		const source = signature.sourceOf(kind);
		const isOn = selection.isIn(id);
		return {
			isOn,
			has: (photoId) => selection.has(photoId),
			tap: (photo, event) => selection.tap({ id, groups: [{ photos }] }, photo.id, event, source),
			pick: {
				isPicked: (index) => isOn && selection.has(photos[index]?.id),
				tiles: () =>
					[...(root?.querySelectorAll<HTMLElement>(`[data-photo-panel="${id}"]`) ?? [])].filter(
						(tile) => selection.has(tile.dataset.photoId)
					),
				onhold: (index) => {
					const photo = photos[index];
					if (photo) selection.hold(id, photo.id, source);
				},
				ondropmany: (_, to) => {
					source.onmove([...selection.ids], to);
					selection.end();
				},
				onopen: () => {},
				onend: (until) => (selection.quietUntil = until)
			}
		};
	}

	// A selection goes with the panel it was made in.
	$effect(() => () => {
		if (Object.values(PANELS).includes(selection.panelId)) selection.end();
	});

	function isUsed(kind: KindType, photo: PhotoType) {
		const draft = signature.draft;
		return kind === 'photo' ? photo.id === draft?.photo.source : photo.id === draft?.banner?.source;
	}

	function canDelete(kind: KindType, photo: PhotoType) {
		return Boolean(signature.shownOf(kind, photo.id)?.isOwn);
	}

	function optionsOf(kind: KindType, photos: PhotoType[]) {
		return photos.map((photo) => ({
			value: photo.id,
			label: signature.shownOf(kind, photo.id)?.label ?? 'Picture',
			image: photo.src
		}));
	}

	// An Admin's new group email, typed in its window.
	let adding = $state<{ email: string; name: string }>();
	function addGroup() {
		if (!adding?.email.trim()) return;
		signature.addGroup(adding.email, adding.name);
		adding = undefined;
	}

	function toggleGroup(email: string) {
		const draft = signature.draft;
		if (!draft) return;
		signature.setGroups(
			draft.groupEmails.includes(email)
				? draft.groupEmails.filter((each) => each !== email)
				: [...draft.groupEmails, email]
		);
	}
</script>

{#snippet panel(kind: KindType, group: GroupType)}
	<PhotoPanel
		{look}
		{group}
		sortKey={PANELS[kind]}
		word="signature"
		noun={kind}
		deleteNote="It leaves the signature’s {kind === 'photo' ? 'photos' : 'banners'}."
		isRound={kind === 'photo'}
		isFramed={kind === 'photo'}
		isPictureOnly
		hasBadge={false}
		tapMode="crop"
		accept="image/*"
		multiple={kind === 'banner'}
		uploadLabel="Upload"
		onfiles={(files) => signature.upload(kind, files)}
		canDelete={(photo) => canDelete(kind, photo)}
		isChosen={(photo) => isUsed(kind, photo)}
		isBusy={(photo) => signature.busy === kind && isUsed(kind, photo)}
		isUploading={signature.uploading === kind}
		cell={(photo) => ({ 'data-photo-panel': PANELS[kind], 'data-photo-id': photo.id })}
		zones={{ name: PANELS[kind], items: PANELS[kind], ondrop: () => {} }}
		selecting={selectingOf(kind, group.photos)}
		data-zone={PANELS[kind]}
		data-zone-id={PANELS[kind]}
		onsave={() => signature.savePanel(kind)}
	/>
{/snippet}

{#if signature.isLoading}
	<div
		class="flex justify-center py-8"
		role="status"
	>
		<span class="icon-[svg-spinners--ring-resize] size-6 text-slate-400"></span>
		<span class="sr-only">Loading the email signature</span>
	</div>
{:else if signature.found && !signature.found.isAllowed}
	<p class="px-1 py-4 text-center text-sm text-slate-500">{signature.found.reason}</p>
{:else if !signature.found}
	<p class="px-1 py-4 text-center text-sm text-slate-500">
		The email signature could not load. Check the connection and open it again.
	</p>
{:else if signature.draft && signature.parts}
	{@const draft = signature.draft}
	{@const parts = signature.parts}
	<div
		class="space-y-3"
		bind:this={root}
	>
		<Group
			title="Signature"
			section="signature-details"
			values={valuesOf(sections, 'signature-details')}
			icon="icon-[mdi--signature-freehand]"
			isOpen={open.includes('signature-details')}
			ontoggle={() => ontoggle('signature-details')}
		>
			<div class="space-y-4">
				<Select
					label="Photo"
					icon="icon-[mdi--account-circle-outline]"
					options={optionsOf('photo', draft.photos.photos)}
					value={draft.photo.source}
					help={look.helpOf('signature.photo')}
					onpick={(source) => signature.pickPhoto(source)}
				/>
				<Input
					label="Photo link"
					{...LINK}
					value={draft.photo.link}
					help={look.helpOf('signature.photoLink')}
					onchange={(event: Event) =>
						signature.setLink('photo', (event.target as HTMLInputElement).value)}
				/>
				<Select
					label="Banner"
					icon="icon-[mdi--image-outline]"
					options={optionsOf('banner', draft.banners.photos)}
					value={draft.banner?.source ?? ''}
					help={look.helpOf('signature.banner')}
					onpick={(source) => signature.pickBanner(source)}
				/>
				{#if draft.banner}
					<Input
						label="Banner link"
						{...LINK}
						value={draft.banner.link}
						help={look.helpOf('signature.bannerLink')}
						onchange={(event: Event) =>
							signature.setLink('banner', (event.target as HTMLInputElement).value)}
					/>
				{/if}
				<Select
					label="Group email"
					icon="icon-[mdi--email-multiple-outline]"
					options={parts.groups.map((group) => ({
						value: group.email,
						label: group.name,
						note: group.email
					}))}
					multiple
					many="group emails"
					value={draft.groupEmails}
					help={look.helpOf('signature.groupEmails')}
					addLabel="Group email"
					onadd={look.isAdmin ? () => (adding = { email: '', name: '' }) : undefined}
					onpick={toggleGroup}
				/>
			</div>
		</Group>
		<Group
			title="Photos"
			section="signature-photos"
			meta={toCountLabel(draft.photos.photos.length, 'photo')}
			icon="icon-[mdi--account-circle-outline]"
			isOpen={open.includes('signature-photos')}
			ontoggle={() => ontoggle('signature-photos')}
		>
			{@render panel('photo', draft.photos)}
		</Group>
		<Group
			title="Banners"
			section="signature-banners"
			meta={toCountLabel(draft.banners.photos.length, 'banner')}
			icon="icon-[mdi--image-outline]"
			isOpen={open.includes('signature-banners')}
			ontoggle={() => ontoggle('signature-banners')}
		>
			{@render panel('banner', draft.banners)}
		</Group>
	</div>
{/if}
{#if signature.problem}
	<p
		class="px-1 text-sm text-red-600"
		role="alert"
	>
		{signature.problem}
	</p>
{/if}

{#if adding}
	<Dialog
		label="Add a Group Email"
		onclose={() => (adding = undefined)}
	>
		<form
			class="space-y-4"
			onsubmit={(event) => {
				event.preventDefault();
				addGroup();
			}}
		>
			<p>
				<b class="block text-lg text-slate-900">Add a Group Email</b>
				<span class="text-sm text-slate-500">Everyone can show it under their signature.</span>
			</p>
			<div {@attach (node) => node.querySelector('input')?.focus()}>
				<Input
					label="Email"
					type="email"
					inputmode="email"
					autocomplete="off"
					autocapitalize="off"
					spellcheck={false}
					required
					bind:value={adding.email}
					help={look.helpOf('signature.groupEmail')}
				/>
			</div>
			<Input
				label="Name"
				autocapitalize="words"
				bind:value={adding.name}
				help={look.helpOf('signature.groupName')}
			/>
			<Button
				primary
				heavy
				sm
				width="full"
				type="submit"
				label="Add"
			/>
		</form>
	</Dialog>
{/if}

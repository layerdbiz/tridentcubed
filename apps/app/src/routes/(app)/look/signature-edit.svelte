<script lang="ts">
	// A Team member's Email Signature on their Edit (#354; Justin, 2026-11-28: "I want to include the email signature
	// into the main edit page of the team member"): its photo and its banners, the two sections of the Email Signature
	// panel (team-edit.svelte), as a Project panel's photo groups, each saying how much of it is filled in. The photo is the signature's own, never the profile picture above it, always a circle,
	// and a tap on it in an email goes to its link; it opens in the project's photo editor. Banners show whole, in
	// their own shape (photo-grid.svelte's `original`), as the email draws them: dragged to reorder, edited, deleted,
	// each with the link it opens in a new window. Every company banner shows under them for anyone to tap on or off.
	// Files dragged in from the desktop land in the section they are dropped on. The Preview shows the signature.
	import { Input, Menu } from '@layerd/ui';
	import { MAX_BANNERS } from '#lib/signature/signature.constants.js';
	import Group from './group.svelte';
	import type { LookState } from './look.state.svelte';
	import PhotoAdd, { ADD_TILE } from './photo-add.svelte';
	import PhotoGrid from './photo-grid.svelte';
	import PhotoPopup from './photo-popup.svelte';
	import PhotoTile from './photo-tile.svelte';
	import { tileOf, type SignaturePartType, type SignatureState } from './signature.svelte';
	import { sortable } from './sortable';
	import { valuesOf, type SectionType } from './tally';

	let {
		look,
		signature,
		sections
	}: {
		look: LookState;
		signature: SignatureState;
		/** What its Photo and Banners hold, for the lines under their names (tally.ts, `teamPanelsOf`). */
		sections: SectionType[];
	} = $props();

	const BANNERS = 'signature-banners';
	const COMPANY = 'signature-company-banners';
	const LINK = {
		type: 'url',
		inputmode: 'url',
		autocomplete: 'off',
		autocapitalize: 'off',
		spellcheck: false
	} as const;

	// Only the first starts open, as a Project panel's sections do (Justin, 2026-11-16).
	let open = $state<SignaturePartType[]>(['photo']);
	function toggle(id: SignaturePartType) {
		open = open.includes(id) ? open.filter((item) => item !== id) : [...open, id];
	}

	function pickFiles(kind: 'photo' | 'banner', event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		void signature.upload(kind, files);
	}

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
		void signature.upload(kind, [...event.dataTransfer.files]);
	}

	function isOn(source: string) {
		return Boolean(signature.draft?.banners.some((each) => each.source === source));
	}
</script>

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
		class="rounded-2xl transition {dropping === 'photo' ? 'ring-2 ring-primary' : ''}"
		role="group"
		aria-label="Signature Photo"
		ondragover={(event) => overFiles(event, 'photo')}
		ondragleave={() => (dropping = '')}
		ondrop={(event) => dropFiles(event, 'photo')}
	>
		<Group
			title="Photo"
			section="signature-photo"
			values={valuesOf(sections, 'signature-photo')}
			image={draft.photo.preview || undefined}
			icon="icon-[mdi--account-circle-outline]"
			isOpen={open.includes('photo')}
			ontoggle={() => toggle('photo')}
		>
			<p class="px-1 text-xs text-slate-500">
				The email signature’s own, not the profile picture, and always a circle.
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
						isBusy={signature.busy === 'photo'}
						align="left"
						options={[
							{ id: 'crop', label: 'Crop', icon: 'icon-[mdi--crop]' },
							...(draft.photo.isPicked
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
						onopen={() => signature.openPhoto()}
						onpick={(id) => (id === 'delete' ? signature.resetPhoto() : signature.openPhoto())}
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
						value={draft.photo.source}
						options={parts.photos.map((choice) => ({
							id: choice.source,
							label: choice.label,
							image: choice.preview || undefined,
							icon: choice.preview ? undefined : 'icon-[mdi--image-outline]'
						}))}
						align="right"
						onpick={(source) => signature.pickPhoto(source)}
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
				{...LINK}
				placeholder="Where a tap on the photo goes"
				value={draft.photo.link}
				onchange={(event: Event) =>
					signature.setLink('photo', (event.target as HTMLInputElement).value, (link) => {
						draft.photo.link = link;
					})}
			/>
		</Group>
	</div>
	<div
		class="rounded-2xl transition {dropping === 'banner' ? 'ring-2 ring-primary' : ''}"
		role="group"
		aria-label="Signature Banners"
		ondragover={(event) => overFiles(event, 'banner')}
		ondragleave={() => (dropping = '')}
		ondrop={(event) => dropFiles(event, 'banner')}
	>
		<Group
			title="Banners"
			section="signature-banners"
			values={valuesOf(sections, 'signature-banners')}
			meta={draft.banners.length
				? `${draft.banners.length} ${draft.banners.length === 1 ? 'banner' : 'banners'}`
				: 'None'}
			image={draft.banners[0]?.preview || undefined}
			icon="icon-[mdi--image-outline]"
			isOpen={open.includes('banners')}
			ontoggle={() => toggle('banners')}
		>
			<p class="px-1 text-xs text-slate-500">
				Under the signature in this order, each its own shape, as wide as the email at most. Drag
				one to move it.
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
				{@attach sortable(BANNERS, (from, to) => signature.moveBanner(from, to))}
			>
				{#snippet tile(photo, index)}
					<PhotoTile
						{photo}
						{index}
						sortKey={BANNERS}
						hasBadge={false}
						isBusy={signature.busy === 'banners'}
						options={[
							{ id: 'crop', label: 'Crop', icon: 'icon-[mdi--crop]' },
							{
								id: 'delete',
								label: 'Delete',
								icon: 'icon-[mdi--trash-can-outline]',
								isDanger: true
							}
						]}
						onopen={() => signature.openBanner(photo.id)}
						onpick={(id) =>
							id === 'delete' ? signature.deleteBanner(photo.id) : signature.openBanner(photo.id)}
					/>
				{/snippet}
				{#snippet below(photo)}
					{@const banner = draft.banners.find((each) => each.id === photo.id)}
					{#if banner}
						<Input
							label="Link"
							{...LINK}
							placeholder="Opens in a new window"
							value={banner.link}
							onchange={(event: Event) =>
								signature.setLink('banners', (event.target as HTMLInputElement).value, (link) => {
									banner.link = link;
								})}
						/>
					{/if}
				{/snippet}
				{#snippet adds(shape)}
					{#if draft.banners.length < MAX_BANNERS}
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
			<!-- Every company banner, for anyone to pick (Justin, 2026-11-28): a tap puts one under the signature's
			     banners, or takes it off them; those on the signature wear the selection's blue. -->
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
							isPicked={isOn(photo.id)}
							options={[]}
							onopen={() => signature.toggleBanner(photo.id)}
							onpick={() => signature.toggleBanner(photo.id)}
						/>
					{/snippet}
					{#snippet below(photo)}
						{@const choice = parts.companyBanners.find((each) => each.source === photo.id)}
						<p
							class="flex items-center gap-1 px-1 text-xs {isOn(photo.id)
								? 'font-medium text-primary'
								: 'text-slate-600'}"
						>
							{#if isOn(photo.id)}<span class="icon-[mdi--check-circle] size-3.5 shrink-0"
								></span>{/if}
							<span class="truncate">{choice?.label}</span>
						</p>
					{/snippet}
				</PhotoGrid>
			</div>
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

{#if signature.editing}
	{@const editing = signature.editing}
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
		onsave={() => signature.saveEditing()}
		onclose={() => (signature.editing = undefined)}
	/>
{/if}

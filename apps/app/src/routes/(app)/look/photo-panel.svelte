<script
	lang="ts"
	module
>
	import type { PickType } from './sortable';
	import type { PhotoType } from './look.data';

	/** What a photo panel needs from its caller to select several of its photos (#402). */
	export type PanelSelectingType = {
		/** Whether this panel is selecting: a tap selects, and the ⋮ goes. */
		isOn: boolean;
		has: (id: string) => boolean;
		/** A click on a photo: true when it was taken as selecting, so the photo does not open. */
		tap: (photo: PhotoType, event: MouseEvent) => boolean;
		/** What the drag knows of the selection (sortable.ts). */
		pick: PickType;
	};
</script>

<script lang="ts">
	// The photo panel (Justin, 2026-11-28: "It needs to be universal, that the photo editor that we've been creating
	// here in the project edit panel. It should be able to be applied anywhere we want"): a group's pictures as tiles
	// in a grid (photo-grid.svelte) in the shape `ratio` gives, square unless told, each a photo tile
	// (photo-tile.svelte) that a tap opens in the photo editor (photo-popup.svelte) and whose ⋮ holds Crop, Edit
	// description and Delete; dragged to reorder, held still to start selecting several (#402); then the add tiles,
	// Upload and, where it is offered, Camera. A Project panel's photo groups (panel-body.svelte) and an Email
	// Signature's photos and banners (signature-edit.svelte) are each one.
	//
	// It changes the group's photos in place (a move, a delete, an edit in the editor) and calls `onsave`. What comes
	// in through Upload or Camera is the caller's (`onfiles`), since where files go differs, and so is what selecting
	// several does (`selecting`). A picture that is always there (a signature's built-in photos) has no Delete
	// (`canDelete`); the one a signature uses wears a green check (`isChosen`).
	import type { HTMLAttributes } from 'svelte/elements';
	import type { MenuOptionType } from '@layerd/ui';
	import type { GroupType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import PhotoAdd from './photo-add.svelte';
	import PhotoGrid, { type TileRatioType } from './photo-grid.svelte';
	import PhotoPopup, { type PopupModeType } from './photo-popup.svelte';
	import PhotoTile from './photo-tile.svelte';
	import type { uploadOf } from './photos';
	import { sortable, type ZonesType } from './sortable';

	type CellType = { class?: string } & Record<`data-${string}`, string | undefined>;

	let {
		look,
		group,
		sortKey,
		word,
		noun = undefined,
		deleteNote = undefined,
		ratio = '1:1',
		columns = 3,
		isRound = false,
		isPictureOnly = false,
		hasBadge = true,
		tapMode = 'view',
		accept,
		multiple = true,
		hasCamera = false,
		uploadLabel = 'Upload',
		uploadInput = undefined,
		isUploading = false,
		onfiles,
		canDelete = () => true,
		canOpen = () => true,
		isChosen = undefined,
		isBusy = undefined,
		cell = undefined,
		zones = undefined,
		selecting = undefined,
		upload = undefined,
		onmove = undefined,
		ondelete = undefined,
		onsave,
		class: className = '',
		...rest
	}: {
		look: LookState;
		/** Its pictures, in order; the editor opens on them. */
		group: GroupType;
		/** The list its tiles drag in (sortable.ts). */
		sortKey: string;
		/** "group", "stage", or what the pictures are part of, for the editor's questions. */
		word: string;
		/** What one is called, in place of its kind ("banner"). */
		noun?: string;
		/** What the question before a delete says happens. */
		deleteNote?: string;
		ratio?: TileRatioType;
		columns?: number;
		/** Each shows in a circle: a signature's photo. */
		isRound?: boolean;
		/** Only the picture is edited: no description, no pop-out and no Details. */
		isPictureOnly?: boolean;
		/** What kind of attachment each is, in its corner. */
		hasBadge?: boolean;
		/** How the editor opens on a tap: looking, or cropping. */
		tapMode?: PopupModeType;
		/** What Upload takes. */
		accept: string;
		multiple?: boolean;
		/** A Camera tile beside Upload. */
		hasCamera?: boolean;
		uploadLabel?: string;
		/** The empty-inputs list's mark on Upload, where an entry for this panel lands. */
		uploadInput?: string;
		/** Files from Upload are on their way, with no tile of their own to show it yet. */
		isUploading?: boolean;
		/** Files from Upload or Camera. */
		onfiles: (files: File[]) => void;
		/** Whether a picture can be deleted: one that is always there cannot. */
		canDelete?: (photo: PhotoType) => boolean;
		/** Whether a tap opens it yet: an upload with nothing to show waits. */
		canOpen?: (photo: PhotoType) => boolean;
		/** The picture in use, where one of them is: a green check on it. */
		isChosen?: (photo: PhotoType) => boolean;
		/** Being made, with no upload of its own to show it. */
		isBusy?: (photo: PhotoType) => boolean;
		/** A tile's own class and data. */
		cell?: (photo: PhotoType, index: number) => CellType;
		/** Other lists a picture can be dragged into. */
		zones?: ZonesType;
		selecting?: PanelSelectingType;
		/** A picture's upload on its way (#189). */
		upload?: (photo: PhotoType) => ReturnType<typeof uploadOf>;
		/** A picture dragged to another place. Left out, it moves in the group and is saved. */
		onmove?: (from: number, to: number) => void;
		/** Delete in a picture's ⋮. Left out, it asks first, leaves the group and is saved. */
		ondelete?: (photo: PhotoType) => void;
		/** A change made here: a move, a delete or an edit. */
		onsave: () => void;
	} & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

	// The picture open in the editor, and whether it opened looking, cropping or typing.
	let opened = $state<{ id: string; mode: PopupModeType }>();

	function move(from: number, to: number) {
		if (onmove) return onmove(from, to);
		const [photo] = group.photos.splice(from, 1);
		group.photos.splice(to, 0, photo);
		onsave();
	}

	function remove(photo: PhotoType) {
		if (ondelete) return ondelete(photo);
		look.confirm({
			title: `Delete ${noun ?? 'photo'}?`,
			note: deleteNote ?? `It leaves the ${word}.`,
			onyes: () => {
				const at = group.photos.indexOf(photo);
				if (at >= 0) group.photos.splice(at, 1);
				onsave();
			}
		});
	}

	function optionsOf(photo: PhotoType): MenuOptionType[] {
		return [
			// #295: every attachment is edited the same way, a PDF's pages and a video's picture too.
			{ id: 'crop', label: 'Crop', icon: 'icon-[mdi--crop]' },
			...(isPictureOnly
				? []
				: [{ id: 'describe', label: 'Edit description', icon: 'icon-[mdi--pencil-outline]' }]),
			...(canDelete(photo)
				? [
						{
							id: 'delete',
							label: 'Delete',
							icon: 'icon-[mdi--trash-can-outline]',
							isDanger: true
						}
					]
				: [])
		];
	}

	function pickFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (files.length) onfiles(files);
	}
</script>

<PhotoGrid
	photos={group.photos}
	{sortKey}
	{ratio}
	{columns}
	{cell}
	class={className}
	{...rest}
	{@attach sortable(sortKey, move, zones, selecting?.pick)}
>
	{#snippet tile(photo, index)}
		{@const isSelecting = Boolean(selecting?.isOn)}
		<PhotoTile
			{photo}
			{index}
			{sortKey}
			upload={upload?.(photo)}
			isBusy={isBusy?.(photo)}
			{isSelecting}
			isPicked={isSelecting && Boolean(selecting?.has(photo.id))}
			{isRound}
			{hasBadge}
			hasNote={!isPictureOnly}
			align={index % columns === 0 ? 'left' : 'right'}
			options={optionsOf(photo)}
			onopen={(event) => {
				// #402: while selecting, or with Ctrl, Cmd or Shift, a click selects instead of opening.
				if (selecting?.tap(photo, event)) return;
				if (canOpen(photo)) opened = { id: photo.id, mode: tapMode };
			}}
			onpick={(id) =>
				id === 'delete'
					? remove(photo)
					: (opened = { id: photo.id, mode: id === 'crop' ? 'crop' : 'text' })}
		/>
		{#if isChosen?.(photo)}
			<!-- The one in use: a green check over its corner, and a green ring round it. -->
			<span
				class="pointer-events-none absolute inset-0 {isRound
					? 'rounded-full'
					: 'rounded-xl'} inset-ring-3 inset-ring-success"
			></span>
			<span
				class="pointer-events-none absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-white shadow"
				title="In use"
				><span class="icon-[mdi--check-circle] size-6 text-success"></span><span class="sr-only"
					>In use</span
				></span
			>
		{/if}
	{/snippet}
	{#snippet adds(shape)}
		<!-- Lit while its file input has the focus: where an entry of the empty-inputs list lands. -->
		<PhotoAdd
			icon="icon-[mdi--image-plus-outline]"
			label={uploadLabel}
			{accept}
			{multiple}
			isBusy={isUploading}
			class={shape}
			data-input={uploadInput}
			onchange={pickFiles}
		/>
		{#if hasCamera}
			<PhotoAdd
				icon="icon-[mdi--camera-outline]"
				label="Camera"
				accept="image/*,video/*"
				capture="environment"
				class={shape}
				onchange={pickFiles}
			/>
		{/if}
	{/snippet}
</PhotoGrid>

{#if opened}
	<PhotoPopup
		{look}
		{group}
		id={opened.id}
		mode={opened.mode}
		{word}
		{noun}
		{deleteNote}
		{isPictureOnly}
		{isRound}
		{canDelete}
		{onsave}
		onclose={() => (opened = undefined)}
	/>
{/if}

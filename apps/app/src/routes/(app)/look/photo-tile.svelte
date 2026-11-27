<script lang="ts">
	// A photo's tile in an edit panel (#312, #327, #402), moved out of the Project panel's photo groups so every place
	// that edits a photo shows the same one (Justin, 2026-11-27, of the Email Signature: "this photo panel here, it
	// should be the same thing that we have in the project edit panels"). A tap opens it in the photo editor; its ⋮
	// holds what can be done to it. It shows its edit (turned, flipped, straightened and cropped), what kind of
	// attachment it is, its description's icon, whether it is selected, and an upload on its way, converting or failed.
	// The caller's box round it gives its place in a sortable list and its shape: square in a photo group, a circle
	// (`isRound`) for a signature's photo, a banner's own shape.
	import { Menu, type MenuOptionType } from '@layerd/ui';
	import Picture from '#lib/components/photo/picture.svelte';
	import {
		ATTACHMENT_ICONS,
		ATTACHMENT_NAMES,
		toPictureType,
		toTypeLabel
	} from '#lib/files/files.schema.js';
	import { fileDetailsOf } from '#lib/files/files.state.svelte.js';
	import { toLengthLabel } from '#lib/video/video.utils.js';
	import { editOf } from './attachments';
	import type { PhotoType } from './look.data';
	import type { uploadOf } from './photos';

	let {
		photo,
		index,
		sortKey,
		upload = undefined,
		isBusy = false,
		isSelecting = false,
		isPicked = false,
		isRound = false,
		hasBadge = true,
		options,
		align = 'right',
		onopen,
		onpick
	}: {
		photo: PhotoType;
		/** Its place in its list, from 0, for what it is called. */
		index: number;
		/** The list it drags in (sortable.ts). */
		sortKey: string;
		/** On its way to storage (#189), or being converted (#294). */
		upload?: ReturnType<typeof uploadOf>;
		/** Being made, with no upload of its own to show it. */
		isBusy?: boolean;
		/** #402: its panel is selecting: a tap selects, and the ⋮ goes. */
		isSelecting?: boolean;
		isPicked?: boolean;
		isRound?: boolean;
		/** What kind of attachment it is, in its corner. */
		hasBadge?: boolean;
		/** Its ⋮. */
		options: MenuOptionType[];
		align?: 'left' | 'right';
		onopen: (event: MouseEvent) => void;
		onpick: (id: string) => void;
	} = $props();

	const shape = $derived(isRound ? 'rounded-full' : 'rounded-xl');
</script>

<button
	type="button"
	class="relative block size-full overflow-hidden {shape} bg-slate-100 select-none [-webkit-touch-callout:none]"
	aria-label="{isSelecting ? 'Select' : 'Open'} photo {index + 1}"
	aria-pressed={isSelecting ? isPicked : undefined}
	data-grip={sortKey}
	onclick={onopen}
>
	<!-- #294: a photo the device cannot draw (a HEIC in Chrome) shows its name, never a broken picture.
	     #327: so does a PDF or a video until its picture is made. -->
	{#if upload && (!upload.hasPreview || !photo.src)}
		<span
			class="pointer-events-none flex size-full flex-col items-center justify-center gap-1 p-2 pb-8 text-center"
		>
			<span class="{ATTACHMENT_ICONS[photo.kind ?? 'photo']} size-6 shrink-0 text-slate-400"></span>
			<span class="line-clamp-2 text-[11px] font-medium break-all text-slate-600"
				>{upload.name}</span
			>
		</span>
	{:else}
		<!-- #295: the tile as it is edited: turned, flipped, straightened and cropped. -->
		<Picture
			src={photo.src}
			alt={photo.description}
			edit={editOf(photo)}
			class="pointer-events-none size-full {upload || isBusy ? 'opacity-60' : ''}"
			onerror={() => {
				if (upload) upload.hasPreview = false;
			}}
		/>
	{/if}
	<!-- A soft shade in the corner, so the white ⋮ reads on a pale photo too (run 19). -->
	<span
		class="pointer-events-none absolute top-0 right-0 size-12 bg-[radial-gradient(circle_at_top_right,rgb(0_0_0/0.45),transparent_70%)]"
	></span>
	{#if photo.description}
		<span
			class="absolute bottom-1 left-1 icon-[mdi--text-box] size-5 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]"
			title="Has a description"
		></span>
	{/if}
	<!-- #327: what kind of attachment it is, on every tile (Justin, 2026-11-25): a photo by its icon, a PDF
	     with its pages, a video with its length. #349: a photo by the type it arrived as (HEIC, JPEG,
	     PNG), read from its name while it is on its way. -->
	{#if photo.src && hasBadge}
		{@const kind = photo.kind ?? 'photo'}
		{@const arrived =
			kind === 'photo'
				? toTypeLabel(
						fileDetailsOf(photo.src)?.original.type ??
							(upload ? toPictureType({ name: upload.name, type: '' }) : '')
					)
				: ''}
		{@const label = arrived ? `${arrived} photo` : ATTACHMENT_NAMES[kind]}
		<span
			class="pointer-events-none absolute right-1 bottom-1 flex items-center gap-0.5 rounded-md bg-black/65 py-0.5 text-[10px] leading-none font-semibold text-white tabular-nums {kind ===
				'photo' && !arrived
				? 'px-0.5'
				: 'pr-1.5 pl-1'}"
			title={label}
			aria-label={label}
			><span class="{ATTACHMENT_ICONS[kind]} size-3.5 {kind === 'pdf' ? 'text-red-400' : ''}"
			></span>{kind === 'pdf'
				? `${photo.pageCount ?? 1} ${photo.pageCount === 1 ? 'page' : 'pages'}`
				: kind === 'video'
					? toLengthLabel(photo.duration) || 'Video'
					: arrived}</span
		>
	{/if}
	<!-- #402: a selected photo wears a blue border (UI glossary "Selection bar"). -->
	{#if isPicked}
		<span
			class="pointer-events-none absolute inset-0 {shape} inset-ring-3 inset-ring-primary"
			data-picked
		></span>
	{/if}
</button>
<!-- #189: on its way to storage, a small mark; a failed upload says so and retries in place. #294: while
     the server converts it, the mark says so. -->
{#if upload?.isConverting}
	<span
		class="pointer-events-none absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700 shadow"
		role="status"
		aria-label="Converting photo {index + 1}"
		><span class="icon-[svg-spinners--ring-resize] size-3.5 shrink-0 text-primary"
		></span>Converting</span
	>
{:else if upload?.isUploading || isBusy}
	<span
		class="pointer-events-none absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-white shadow"
		role="status"
		aria-label="Uploading photo {index + 1}"
		><span class="icon-[svg-spinners--ring-resize] size-4 text-primary"></span></span
	>
{:else if upload?.isFailed}
	<button
		type="button"
		class="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-danger px-1.5 py-1 text-[11px] font-semibold text-white shadow"
		aria-label="Not uploaded. Retry photo {index + 1}"
		title={upload.reason}
		data-no-drag
		onclick={() => upload.retry()}><span class="icon-[mdi--alert] size-3.5"></span>Retry</button
	>
{/if}
<!-- #402: while its panel is selecting, a photo's ⋮ goes: the Selection bar acts on them all. -->
<div
	class="absolute {isRound ? 'top-0 right-0' : 'top-1 right-1'} {isSelecting ? 'hidden' : ''}"
	data-no-drag
>
	<Menu
		label="More for photo {index + 1}"
		value=""
		{align}
		{options}
		{onpick}
	>
		{#snippet trigger()}
			<!-- A circle leaves the corner empty, so its ⋮ sits on a dark dot of its own. -->
			<span
				class="flex size-7 items-center justify-center text-white {isRound
					? 'rounded-full bg-black/55 shadow'
					: ''}"
				><span
					class="icon-[mdi--dots-vertical] {isRound
						? 'size-5'
						: 'size-6 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]'}"
				></span></span
			>
		{/snippet}
	</Menu>
</div>

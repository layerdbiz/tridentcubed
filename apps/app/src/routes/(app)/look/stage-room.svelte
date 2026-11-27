<script lang="ts">
	// #295: one report page of a stage's attachments, laid out in the room the page leaves for them (attachments.ts):
	// under Fill the spots fill it from margin to margin and down to the footer, under Fit they keep the stage's
	// Ratio. Each photo or video is drawn as its edit makes it (lib/components/photo/picture.svelte), a PDF's page
	// whole (pdf-page.svelte), a video as its Thumbnail with a play button and its length, linking to the video in the
	// app. Every spot wears what kind of attachment it holds on the Preview only (#327); a description prints over the
	// foot of its photo's first spot. Spots are placed in the page's own pixels, so the download prints them the same.
	import PdfPage from '#lib/components/attachment/pdf-page.svelte';
	import Picture from '#lib/components/photo/picture.svelte';
	import {
		ATTACHMENT_ICONS,
		ATTACHMENT_NAMES,
		toCrossOrigin,
		toTypeLabel
	} from '#lib/files/files.schema.js';
	import { fileDetailsOf } from '#lib/files/files.state.svelte.js';
	import { toLengthLabel, toVideoLink } from '#lib/video/video.utils.js';
	import { placeOf, type AttachmentPageType } from './attachments';
	import type { GroupType, PhotoType } from './look.data';
	import { drawnOf, spotAspectOf } from './shapes';

	let {
		group,
		page,
		class: className = ''
	}: {
		group: GroupType;
		page: AttachmentPageType<PhotoType>;
		class?: string;
	} = $props();

	let width = $state(0);
	let height = $state(0);
	const placed = $derived(placeOf(page, group, (spot) => spotAspectOf(group, spot), width, height));

	// What a video's thumbnail opens (#327): the video played in the app this report was made in.
	function videoLinkOf(source: string | undefined) {
		return toVideoLink(document.location.origin, source ?? '') || undefined;
	}
</script>

<div
	class="relative {className}"
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	{#each placed as { spot, x, y, w, h } (spot.key)}
		{@const photo = spot.photo}
		{@const kind = photo.kind ?? 'photo'}
		{@const drawn = drawnOf(group, photo, spot.page)}
		{@const isBig = Math.min(w, h) >= 200}
		{@const hasDescription = Boolean(photo.description) && spot.page === 1}
		{@const arrived =
			kind === 'photo' ? toTypeLabel(fileDetailsOf(photo.src)?.original.type ?? '') : ''}
		<figure
			class="absolute m-0 overflow-hidden rounded"
			style="left: {x}px; top: {y}px; width: {w}px; height: {h}px"
		>
			{#if kind === 'pdf'}
				<PdfPage
					source={photo.source ?? ''}
					page={spot.page}
					picture={photo.src}
					edit={drawn.edit}
					frame={drawn.frame}
					class="size-full"
				/>
			{:else if kind === 'video'}
				<a
					href={videoLinkOf(photo.source)}
					target="_blank"
					rel="noopener"
					class="relative block size-full"
					aria-label="Play the video{photo.description ? `: ${photo.description}` : ''}"
				>
					<Picture
						src={photo.src}
						crossorigin={toCrossOrigin(photo.src)}
						edit={drawn.edit}
						frame={drawn.frame}
						aspect={drawn.aspect}
						class="size-full bg-slate-100"
					/>
					<span class="absolute inset-0 flex items-center justify-center">
						<span
							class="flex items-center justify-center rounded-full bg-black/55 text-white {isBig
								? 'size-14'
								: 'size-9'}"
							><span class="icon-[mdi--play] {isBig ? 'size-9' : 'size-6'}"></span></span
						>
					</span>
					{#if toLengthLabel(photo.duration)}
						<span
							class="absolute right-1.5 bottom-1.5 z-[1] rounded bg-black/70 px-1 py-px text-[8px] leading-tight font-semibold text-white tabular-nums"
							>{toLengthLabel(photo.duration)}</span
						>
					{/if}
				</a>
			{:else}
				<Picture
					src={photo.src}
					crossorigin={toCrossOrigin(photo.src)}
					edit={drawn.edit}
					frame={drawn.frame}
					aspect={drawn.aspect}
					class="size-full bg-slate-100"
				/>
			{/if}
			<!-- #327: what kind of attachment each spot holds, at a glance (Justin, 2026-11-25): a mark on the Preview
			     only, left out of the download, so the report the client reads stays clean. #349: a photo by the type it
			     arrived as. -->
			<span
				class="pointer-events-none absolute top-1 left-1 z-[1] flex items-center gap-0.5 rounded bg-black/65 p-0.5 text-[8px] leading-none font-semibold text-white tabular-nums {kind ===
					'photo' && !arrived
					? ''
					: 'pr-1'}"
				title={arrived ? `${arrived} photo` : ATTACHMENT_NAMES[kind]}
				data-screen-only
				><span class="{ATTACHMENT_ICONS[kind]} size-3 {kind === 'pdf' ? 'text-red-400' : ''}"
				></span>{kind === 'pdf'
					? (photo.pageCount ?? 1) > 1
						? `PDF · ${spot.page} of ${photo.pageCount}`
						: 'PDF'
					: kind === 'video'
						? 'Video'
						: arrived}</span
			>
			{#if hasDescription}
				<figcaption
					class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/40 to-transparent px-2 pt-5 pb-1.5 font-medium text-white {isBig
						? 'text-[10px]'
						: 'truncate text-[8px]'} {kind === 'video' ? 'pr-10' : ''}"
				>
					{photo.description}
				</figcaption>
			{/if}
		</figure>
	{:else}
		<p class="text-[11px] text-slate-300 italic">No photos yet</p>
	{/each}
</div>

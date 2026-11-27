<script lang="ts">
	// One page of a stored PDF in its spot on a report page (#327; Justin, 2026-11-24): the whole page shown, never
	// cropped, on white, drawn as a picture on this device (pdf.utils.ts) sharp enough for the spot's width. Its box
	// carries the PDF's address and the page's number, so the download can put the PDF's own page in its place
	// (the Preview's download.ts); the picture itself is never sent. Until the page is drawn, the first page shows
	// the picture kept for the PDF, and any other a quiet placeholder.
	//
	// #295: a page edited in the photo pop-up (turned, mirrored, straightened, cropped) is drawn as its edit makes it,
	// and prints as that picture: the download puts the PDF's own page only where the page is as it came.
	import Picture from '#lib/components/photo/picture.svelte';
	import { hasEdit, type EditType, type FrameType } from '#lib/components/photo/edit.js';
	import { pageShapeOf } from '#lib/pdf/pdf.state.svelte.js';
	import { pageOf, toDrawnWidth } from '#lib/pdf/pdf.utils.js';

	let {
		source,
		page,
		picture = '',
		edit = undefined,
		frame = undefined,
		class: className = '',
		style = ''
	}: {
		/** The PDF's file address (`/files/<id>`); none while it is still on its way. */
		source: string;
		/** Which page, from 1. */
		page: number;
		/** The picture kept for the PDF, of its first page. */
		picture?: string;
		/** How the page is edited for the report; none shows it as it came. */
		edit?: EditType;
		/** The frame that prints, when the stage keeps it to a shape. */
		frame?: FrameType;
		class?: string;
		style?: string;
	} = $props();

	const isEdited = $derived(hasEdit(edit));
	const pageShape = $derived(source ? pageShapeOf(source, page) : undefined);

	let width = $state(0);
	let drawn = $state('');
	let isFailed = $state(false);

	$effect(() => {
		if (!width || !source) return;
		const wide = toDrawnWidth(width);
		let isLive = true;
		pageOf(source, page, wide)
			.then((address) => {
				if (isLive) drawn = address;
			})
			.catch(() => {
				if (isLive) isFailed = true;
			});
		return () => {
			isLive = false;
		};
	});

	const shown = $derived(drawn || (page === 1 ? picture : ''));
</script>

<div
	class="relative overflow-hidden bg-slate-100 {className}"
	{style}
	data-pdf={(!isEdited && source) || undefined}
	data-pdf-page={page}
	bind:clientWidth={width}
>
	{#if shown && isEdited && edit}
		<Picture
			src={shown}
			alt="Page {page}"
			{edit}
			{frame}
			fit="fit"
			aspect={pageShape ? pageShape.width / pageShape.height : undefined}
			class="absolute inset-0 bg-white"
		/>
	{:else if shown}
		<img
			src={shown}
			alt="Page {page}"
			draggable="false"
			class="absolute inset-0 size-full object-contain"
			data-pdf-picture
		/>
	{:else}
		<span
			class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[9px] text-slate-400"
		>
			<span
				class="{isFailed
					? 'icon-[mdi--file-alert-outline]'
					: 'icon-[mdi--file-pdf-box]'} size-6 text-slate-300"
			></span>{isFailed ? 'Page could not be shown' : `Page ${page}`}
		</span>
	{/if}
</div>

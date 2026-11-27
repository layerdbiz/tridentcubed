<script lang="ts">
	// #295: a picture in its box as its edit makes it (edit.ts): turned, mirrored, straightened about its frame's
	// middle and cut to its frame, then covering the box (Fill) or shown whole in it (Fit). It draws a report spot, a
	// tile in an edit panel and the editor's strip alike, so what prints is what was edited. With no edit it is the
	// whole picture. The box's size is given, or measured.
	import type { Snippet } from 'svelte';
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { drawingOf, frameOf, type EditType, type FrameType } from './edit';
	import { keepShape, shapeOf } from './shape.svelte';

	let {
		src,
		alt = '',
		crossorigin = undefined,
		edit = {},
		frame = undefined,
		fit = 'fill',
		aspect = undefined,
		width = undefined,
		height = undefined,
		class: className = '',
		style = '',
		onerror = undefined,
		children = undefined
	}: {
		src: string;
		alt?: string;
		/** Passed to the img, so a canvas may read it (the PDF slims big pictures). */
		crossorigin?: HTMLImgAttributes['crossorigin'];
		edit?: EditType;
		/** The frame that prints, when the stage keeps it to a shape; none is the edit's own. */
		frame?: FrameType;
		fit?: 'fill' | 'fit';
		/** The picture's own width over its height, when known elsewhere (a PDF's page); none reads it from the picture. */
		aspect?: number;
		width?: number;
		height?: number;
		class?: string;
		style?: string;
		onerror?: () => void;
		/** Drawn over the picture, such as its description. */
		children?: Snippet;
	} = $props();

	let measuredWidth = $state(0);
	let measuredHeight = $state(0);
	const boxWidth = $derived(width ?? measuredWidth);
	const boxHeight = $derived(height ?? measuredHeight);
	const shape = $derived(shapeOf(src));
	const own = $derived(aspect ?? (shape ? shape.width / shape.height : undefined));
	const drawn = $derived.by(() => {
		if (!own || boxWidth <= 0 || boxHeight <= 0) return undefined;
		return drawingOf(boxWidth, boxHeight, own, edit, frame ?? frameOf(edit, own), fit);
	});
</script>

<div
	class="relative overflow-hidden {className}"
	style="{width ? `width: ${width}px; ` : ''}{height ? `height: ${height}px; ` : ''}{style}"
	bind:clientWidth={measuredWidth}
	bind:clientHeight={measuredHeight}
>
	{#if drawn}
		<div
			class="absolute overflow-hidden"
			style="left: {drawn.clip.left}px; top: {drawn.clip.top}px; width: {drawn.clip
				.width}px; height: {drawn.clip.height}px"
		>
			<div
				class="absolute"
				style="left: {drawn.picture.left}px; top: {drawn.picture.top}px; width: {drawn.picture
					.width}px; height: {drawn.picture.height}px; transform-origin: {drawn.middle.x}px {drawn
					.middle.y}px; transform: rotate({edit.tilt ?? 0}deg) scale({drawn.grow})"
			>
				<img
					{src}
					{alt}
					{crossorigin}
					draggable="false"
					class="pointer-events-none absolute block max-w-none select-none"
					style="left: {drawn.image.left}px; top: {drawn.image.top}px; width: {drawn.image
						.width}px; height: {drawn.image.height}px; transform: scaleX({edit.isFlipped
						? -1
						: 1}) rotate({-(edit.turns ?? 0) * 90}deg)"
					{onerror}
				/>
			</div>
		</div>
	{:else}
		<!-- Until its own shape is known the picture covers the box, as a photo always did. -->
		<img
			{src}
			{alt}
			{crossorigin}
			draggable="false"
			class="pointer-events-none absolute inset-0 size-full object-cover select-none"
			onload={(event) => {
				const image = event.currentTarget as HTMLImageElement;
				keepShape(src, { width: image.naturalWidth, height: image.naturalHeight });
			}}
			{onerror}
		/>
	{/if}
	{@render children?.()}
</div>

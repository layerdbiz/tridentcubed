<script lang="ts">
	// PROTOTYPE (#161): the preview's controls, standing up in one black bar (Justin's note 28): a zoom slider in blue
	// (its knob grows and shows the percent while you hold it), fit and page-layout buttons, and Download at the bottom.
	// No + and − buttons: the slider, pinch and scroll do that.
	import { ZOOM_MAX, ZOOM_MIN, type Viewport } from './viewport.svelte';

	let {
		viewport,
		layout,
		onfit,
		onlayout,
		ondownload
	}: {
		viewport: Viewport;
		layout: 'column' | 'spread';
		onfit: () => void;
		onlayout: () => void;
		ondownload: () => void;
	} = $props();

	let track: HTMLDivElement | undefined = $state();
	let isHeld = $state(false);
	let isHover = $state(false);

	const SPAN = Math.log(ZOOM_MAX / ZOOM_MIN);
	const position = $derived(Math.log(viewport.zoom / ZOOM_MIN) / SPAN);
	const percent = $derived(Math.round(viewport.zoom * 100));

	function zoomAt(clientY: number) {
		if (!track) return;
		const box = track.getBoundingClientRect();
		const at = Math.min(1, Math.max(0, (box.bottom - clientY) / box.height));
		viewport.zoomTo(ZOOM_MIN * Math.exp(at * SPAN), undefined, undefined, false);
	}

	function down(event: PointerEvent) {
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		isHeld = true;
		zoomAt(event.clientY);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp' || event.key === 'ArrowRight') viewport.zoomBy(1.1);
		else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') viewport.zoomBy(1 / 1.1);
		else return;
		event.preventDefault();
	}

	const hover = 'hover:bg-white/10';
</script>

<div
	class="flex w-12 flex-col items-center gap-1 rounded-full bg-black py-2 text-white shadow-xl shadow-black/25"
	data-no-pan
>
	<div
		bind:this={track}
		class="relative my-2 h-32 w-9 cursor-pointer touch-none md:h-40"
		role="slider"
		tabindex="0"
		aria-label="Zoom"
		aria-orientation="vertical"
		aria-valuemin={Math.round(ZOOM_MIN * 100)}
		aria-valuemax={Math.round(ZOOM_MAX * 100)}
		aria-valuenow={percent}
		aria-valuetext="{percent}%"
		onpointerdown={down}
		onpointermove={(event) => isHeld && zoomAt(event.clientY)}
		onpointerup={() => (isHeld = false)}
		onpointercancel={() => (isHeld = false)}
		onpointerenter={() => (isHover = true)}
		onpointerleave={() => (isHover = false)}
		{onkeydown}
	>
		<span class="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-white/20"
		></span>
		<span
			class="absolute bottom-0 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-primary"
			style="height: {position * 100}%"
		></span>
		<span
			class="absolute left-1/2 -translate-x-1/2 translate-y-1/2"
			style="bottom: {position * 100}%"
		>
			<span
				class="block size-4 rounded-full bg-primary shadow-md ring-2 ring-white transition-transform duration-150 {isHeld
					? 'scale-[1.7]'
					: isHover
						? 'scale-125'
						: ''}"
			></span>
			{#if isHeld || isHover}
				<span
					class="pointer-events-none absolute top-1/2 right-full mr-4 -translate-y-1/2 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white tabular-nums shadow-lg transition {isHeld
						? 'scale-110'
						: ''}">{percent}%</span
				>
			{/if}
		</span>
	</div>

	<button
		type="button"
		class="flex size-9 items-center justify-center rounded-full {hover}"
		aria-label="Fit to the screen"
		title="Fit to the screen"
		onclick={onfit}><span class="icon-[mdi--fit-to-screen-outline] size-5"></span></button
	>
	<button
		type="button"
		class="flex size-9 items-center justify-center rounded-full {hover}"
		aria-label={layout === 'column' ? 'Spread the pages out' : 'Stack the pages'}
		title={layout === 'column' ? 'Spread the pages out' : 'Stack the pages'}
		onclick={onlayout}
		><span
			class="{layout === 'column'
				? 'icon-[mdi--view-grid-outline]'
				: 'icon-[mdi--view-sequential-outline]'} size-5"
		></span></button
	>
	<button
		type="button"
		class="mt-1 flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30 hover:brightness-110"
		aria-label="Download PDF"
		title="Download PDF"
		onclick={ondownload}><span class="icon-[mdi--tray-arrow-down] size-5"></span></button
	>
</div>

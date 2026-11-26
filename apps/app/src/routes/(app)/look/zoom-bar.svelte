<script lang="ts">
	// PROTOTYPE (#161): the preview's controls, standing up in one black bar (Justin's note 28): a zoom slider in blue
	// (its knob grows and shows the percent while you hold it), the fit button, the mode menu, and Download at the
	// bottom. No + and − buttons: the slider, pinch and scroll do that. #324 (Justin, 2026-11-25): one button for how
	// the pages lie, its icon the mode they are in, and a menu that pops out beside it with Stack, Spread and Present
	// (a play button: the pages one at a time).
	import { Button } from '@layerd/ui';
	import type { LayoutType } from './presentation.svelte';
	import { ZOOM_MAX, ZOOM_MIN, type Viewport } from './viewport.svelte';

	let {
		viewport,
		layout,
		onfit,
		onmode,
		ondownload
	}: {
		viewport: Viewport;
		layout: LayoutType;
		onfit: () => void;
		onmode: (mode: LayoutType) => void;
		ondownload: () => void;
	} = $props();

	const MODES: { id: LayoutType; name: string; hint: string; label: string; icon: string }[] = [
		{
			id: 'column',
			name: 'Stack',
			hint: 'One under another',
			label: 'Stack the pages',
			icon: 'icon-[mdi--view-sequential-outline]'
		},
		{
			id: 'spread',
			name: 'Spread',
			hint: 'Every page at once',
			label: 'Spread the pages out',
			icon: 'icon-[mdi--view-grid-outline]'
		},
		{
			id: 'present',
			name: 'Present',
			hint: 'One page at a time',
			label: 'Present the pages',
			icon: 'icon-[mdi--play-circle-outline]'
		}
	];
	const now = $derived(MODES.find((mode) => mode.id === layout) ?? MODES[0]);
	let isOpen = $state(false);
	let menu: HTMLDivElement | undefined = $state();

	function pick(mode: LayoutType) {
		isOpen = false;
		if (mode !== layout) onmode(mode);
	}

	// Anywhere else shuts the menu, and so does Escape.
	function onpointerdown(event: PointerEvent) {
		if (isOpen && !menu?.contains(event.target as Node)) isOpen = false;
	}

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
</script>

<svelte:document
	onpointerdowncapture={onpointerdown}
	onkeydown={(event) => isOpen && event.key === 'Escape' && (isOpen = false)}
/>

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

	<Button
		ghost
		invert
		sm
		icon="icon-[mdi--fit-to-screen-outline]"
		aria-label="Fit to the screen"
		title="Fit to the screen"
		onclick={onfit}
	/>
	<div
		bind:this={menu}
		class="relative"
	>
		<!-- A small notch at its left shows that the menu comes out that way. -->
		<button
			type="button"
			class="relative flex size-9 items-center justify-center rounded-full before:absolute before:top-1/2 before:left-px before:-translate-y-1/2 before:border-y-4 before:border-r-4 before:border-l-0 before:border-y-transparent before:border-r-white/55 before:transition-opacity {isOpen
				? 'bg-white text-black before:opacity-0'
				: 'bg-white/10 hover:bg-white/15'}"
			aria-haspopup="menu"
			aria-expanded={isOpen}
			aria-label="{now.name}: choose how the pages lie"
			title="{now.name}: choose how the pages lie"
			onclick={() => (isOpen = !isOpen)}><span class="{now.icon} size-5"></span></button
		>
		<div
			class="absolute right-[calc(100%+16px)] -bottom-2 grid origin-bottom-right gap-0.5 rounded-[18px] bg-black p-1.5 shadow-xl shadow-black/30 transition-[opacity,translate,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:top-1/2 md:bottom-auto md:origin-right md:-translate-y-1/2 {isOpen
				? ''
				: 'pointer-events-none translate-x-2 scale-[0.92] opacity-0'}"
			role="menu"
			aria-label="How the pages lie"
		>
			{#each MODES as mode (mode.id)}
				<button
					type="button"
					class="grid grid-cols-[20px_auto] items-center justify-items-start gap-x-3 rounded-xl py-2 pr-4 pl-3 text-left {mode.id ===
					layout
						? 'bg-white text-black'
						: 'text-white hover:bg-white/10'}"
					role="menuitemradio"
					aria-checked={mode.id === layout}
					tabindex={isOpen ? 0 : -1}
					title={mode.label}
					onclick={() => pick(mode.id)}
				>
					<span class="{mode.icon} row-span-2 size-5"></span>
					<span class="text-[13px] font-semibold whitespace-nowrap">{mode.name}</span>
					<span class="text-[11px] font-medium whitespace-nowrap opacity-60">{mode.hint}</span>
				</button>
			{/each}
		</div>
	</div>
	<Button
		primary
		heavy
		md
		icon="icon-[mdi--tray-arrow-down]"
		aria-label="Download PDF"
		title="Download PDF"
		class="mt-1"
		onclick={ondownload}
	/>
</div>

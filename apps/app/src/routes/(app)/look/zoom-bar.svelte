<script lang="ts">
	// PROTOTYPE (#161): the preview's controls, standing up in one black bar (Justin's note 28): a zoom slider in blue
	// (its knob grows and shows the percent while you hold it), the fit button, the mode menu, and Download at the
	// bottom. No + and − buttons: the slider, pinch and scroll do that. #324 (Justin, 2026-11-25): one button for how
	// the pages lie, its icon the mode they are in, and a menu that pops out beside it with Stack, Spread and Present
	// (a play button: the pages one at a time). #390: that menu is the library Menu, opening beside its button in
	// the dark look (the theme's base, heavy), a hint line under each mode; its button is the library Button.
	import { MediaQuery } from 'svelte/reactivity';
	import { Button, Menu } from '@layerd/ui';
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

	const MODES: { id: LayoutType; name: string; hint: string; icon: string }[] = [
		{
			id: 'column',
			name: 'Stack',
			hint: 'One under another',
			icon: 'icon-[mdi--view-sequential-outline]'
		},
		{
			id: 'spread',
			name: 'Spread',
			hint: 'Every page at once',
			icon: 'icon-[mdi--view-grid-outline]'
		},
		{
			id: 'present',
			name: 'Present',
			hint: 'One page at a time',
			icon: 'icon-[mdi--play-circle-outline]'
		}
	];
	const now = $derived(MODES.find((mode) => mode.id === layout) ?? MODES[0]);
	const OPTIONS = MODES.map((mode) => ({
		id: mode.id,
		label: mode.name,
		note: mode.hint,
		icon: mode.icon
	}));
	// The bar stands at the right, in the middle on a desktop, where the menu centres on its button; low on a phone,
	// where the menu's foot lines up with its button's so it stays over the bar at the bottom.
	const wide = new MediaQuery('min-width: 48rem');
	// The mode button: a faint round on the bar, white while its menu is open, with the notch at its left (drawn
	// after it: the library Button keeps its own before for its hover).
	const MODE_BUTTON =
		'relative bg-white/10 filter-none hover:bg-white/15 aria-expanded:bg-white aria-expanded:text-black after:absolute after:top-1/2 after:left-px after:-translate-y-1/2 after:border-y-4 after:border-r-4 after:border-l-0 after:border-y-transparent after:border-r-white/55 after:transition-opacity aria-expanded:after:opacity-0';

	function pick(mode: string) {
		if (mode !== layout) onmode(mode as LayoutType);
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
	<!-- A small notch at its button's left shows that the menu comes out that way. -->
	<Menu
		label="How the pages lie"
		value={layout}
		options={OPTIONS}
		onpick={pick}
		opens="left"
		align={wide.current ? 'center' : 'bottom'}
		offset={16}
		color="base"
		appearance="heavy"
		button={{
			ghost: true,
			invert: true,
			sm: true,
			icon: now.icon,
			'aria-label': `${now.name}: choose how the pages lie`,
			title: `${now.name}: choose how the pages lie`,
			class: MODE_BUTTON
		}}
	/>
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

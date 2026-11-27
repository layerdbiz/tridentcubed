<script lang="ts">
	// PROTOTYPE (#161): the preview's controls, standing up in one black bar (Justin's note 28): a zoom slider in blue
	// (its knob grows and shows the percent while you hold it), the fit button, the mode menu, and Download at the
	// bottom. No + and − buttons: the slider, pinch and scroll do that. #324 (Justin, 2026-11-25): one button for how
	// the pages lie, its icon the mode they are in, and Stack, Spread and Present (a play button: the pages one at a
	// time) sliding out of it in a row (Justin, 2026-11-26: the prototype's Slide-out Row, in place of the menu), the
	// library Menu's row (#390). #354 (Justin, 2026-11-27): the Email Signature's preview has the same bar, with Copy
	// in Download's place, its Code beside it and no modes, since a signature is one page.
	import type { Snippet } from 'svelte';
	import { Button, Menu } from '@layerd/ui';
	import type { LayoutType } from './presentation.svelte';
	import { ZOOM_MAX, ZOOM_MIN, type Viewport } from './viewport.svelte';

	let {
		viewport,
		layout = 'column',
		onfit,
		onmode,
		action,
		children
	}: {
		viewport: Viewport;
		layout?: LayoutType;
		onfit: () => void;
		// How the pages lie; with no `onmode` there is no mode button.
		onmode?: (mode: LayoutType) => void;
		// The last button, in the theme's blue: Download PDF on a report, Copy on a signature.
		action: { label: string; icon: string; onclick: () => void };
		// The caller's own buttons, between the mode and the last one.
		children?: Snippet;
	} = $props();

	const MODES: { id: LayoutType; name: string; label: string; icon: string }[] = [
		{
			id: 'column',
			name: 'Stack',
			label: 'Stack the pages',
			icon: 'icon-[mdi--view-sequential-outline]'
		},
		{
			id: 'spread',
			name: 'Spread',
			label: 'Spread the pages out',
			icon: 'icon-[mdi--view-grid-outline]'
		},
		{
			id: 'present',
			name: 'Present',
			label: 'Present the pages',
			icon: 'icon-[mdi--play-circle-outline]'
		}
	];
	const now = $derived(MODES.find((mode) => mode.id === layout) ?? MODES[0]);
	// A small notch at the left of the mode button shows that the row comes out that way; it goes while the row is out.
	const NOTCH =
		'after:pointer-events-none after:absolute after:top-1/2 after:left-px after:-translate-y-1/2 after:border-y-4 after:border-r-4 after:border-l-0 after:border-y-transparent after:border-r-current after:transition-opacity';

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
	<!-- The mode the pages are in. Stack, Spread and Present slide out of it in a row to its left, the mode the pages
	     are in lit; a tap anywhere else or Escape puts the row back. -->
	{#if onmode}
		<Menu
			isRow
			opens="left"
			offset={10}
			label="How the pages lie"
			options={MODES}
			value={layout}
			onpick={(id) => id !== layout && onmode(id as LayoutType)}
			class="bg-black"
			button={(_, isOpen) => ({
				appearance: isOpen ? 'heavy' : 'ghost',
				invert: true,
				sm: true,
				icon: now.icon,
				class: `${NOTCH} ${isOpen ? 'after:opacity-0' : 'bg-current/10 after:opacity-55'}`,
				'aria-label': `${now.name}: choose how the pages lie`,
				title: `${now.name}: choose how the pages lie`
			})}
			choiceButton={{ invert: true, sm: true }}
		/>
	{/if}
	{@render children?.()}
	<Button
		primary
		heavy
		md
		icon={action.icon}
		aria-label={action.label}
		title={action.label}
		class="mt-1"
		onclick={action.onclick}
	/>
</div>

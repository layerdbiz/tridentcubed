<script lang="ts">
	// PROTOTYPE (#161): the preview's controls, standing up in one black bar (Justin's note 28): a zoom slider in blue
	// (its knob grows and shows the percent while you hold it), the fit button, the mode menu, and Download at the
	// bottom. No + and − buttons: the slider, pinch and scroll do that. #324 (Justin, 2026-11-25): one button for how
	// the pages lie, its icon the mode they are in, and Stack, Spread and Present (a play button: the pages one at a
	// time) sliding out of it in a row (Justin, 2026-11-26: the prototype's Slide-out Row, in place of the menu).
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
	let isOpen = $state(false);
	let menu: HTMLDivElement | undefined = $state();

	function pick(mode: LayoutType) {
		isOpen = false;
		if (mode !== layout) onmode(mode);
	}

	// Anywhere else shuts the row, and so does Escape.
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
		<!-- The mode the pages are in. A small notch at its left shows that the row comes out that way. -->
		<Button
			heavy={isOpen}
			ghost={!isOpen}
			invert
			sm
			icon={now.icon}
			class={isOpen ? '' : 'bg-current/10'}
			aria-haspopup="menu"
			aria-expanded={isOpen}
			aria-label="{now.name}: choose how the pages lie"
			title="{now.name}: choose how the pages lie"
			onclick={() => (isOpen = !isOpen)}
		/>
		<span
			class="pointer-events-none absolute top-1/2 left-px -translate-y-1/2 border-y-4 border-r-4 border-l-0 border-y-transparent border-r-current transition-opacity {isOpen
				? 'opacity-0'
				: 'opacity-55'}"
			aria-hidden="true"
		></span>
		<!-- Slide-out Row (Justin, 2026-11-26): the three modes slide out of the button in a row to its left, the
		     mode the pages are in lit. -->
		<div
			class="absolute top-1/2 right-[calc(100%+10px)] flex -translate-y-1/2 gap-0.5 rounded-full bg-black p-1 shadow-xl shadow-black/30 transition-[clip-path] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] {isOpen
				? '[clip-path:inset(0_0_0_0_round_999px)]'
				: 'pointer-events-none [clip-path:inset(0_0_0_100%_round_999px)]'}"
			role="menu"
			aria-label="How the pages lie"
		>
			{#each MODES as mode, index (mode.id)}
				<Button
					heavy={mode.id === layout}
					ghost={mode.id !== layout}
					invert
					sm
					icon={mode.icon}
					class="transition-[translate,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] {isOpen
						? ''
						: 'translate-x-6 opacity-0'}"
					style="transition-delay: {isOpen ? (MODES.length - 1 - index) * 30 : 0}ms"
					role="menuitemradio"
					aria-checked={mode.id === layout}
					aria-label={mode.label}
					title={mode.label}
					tabindex={isOpen ? 0 : -1}
					onclick={() => pick(mode.id)}
				/>
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

<script lang="ts">
	// PROTOTYPE (#161) run 8: inside a project on the phone. A white header floats over the content with a backdrop
	// blur and no border, so the panels (and the pages) show scrolling under it (Justin's note 3): back, the title, and
	// the project's percent and state over its bar (note 2). Panels / Preview is a black bar floating at the bottom
	// centre, like the preview's zoom bar, with the save cloud at its start (note 1). Swipe between the two; on Preview
	// the pages take every drag, so a hidden strip on the left edge swipes back. Run 9: the bar is words only, with no
	// line after the cloud (note 19); on Panels the left edge swipes the whole project away, back to the dashboard
	// (note 21). Run 11 (2026-10-26 19:22): Panels and Preview moved into the one floating bar (nav-bar.svelte), which
	// sets look.tab; the panes follow it, and their scroll drives the bar's highlight through look.tabProgress.
	import type { ComponentProps } from 'svelte';
	import type { LookState } from './look.state.svelte';
	import PanelList from './panel-list.svelte';
	import ProjectBar from './project-bar.svelte';
	import ReportPreview from './report-preview.svelte';

	let {
		look,
		panels = 'soft',
		preview,
		surface = 'bg-slate-100'
	}: {
		look: LookState;
		panels?: 'soft' | 'flat' | 'ring';
		preview: Omit<ComponentProps<typeof ReportPreview>, 'look'>;
		surface?: string;
	} = $props();

	let swiper: HTMLDivElement | undefined = $state();
	let top = $state(0);
	let isLanded = false;

	function show(tab: 'edit' | 'preview') {
		look.tab = tab;
		swiper?.scrollTo({ left: tab === 'edit' ? 0 : swiper.clientWidth, behavior: 'smooth' });
	}

	function onscroll() {
		if (!swiper?.clientWidth) return;
		look.tabProgress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = look.tabProgress > 0.5 ? 'preview' : 'edit';
	}

	// The bar's Panels and Preview: the panes slide to the one picked. The first time, as the project opens (on
	// Preview when the URL asks for it), they are simply there.
	$effect(() => {
		if (!swiper) return;
		const left = look.tab === 'edit' ? 0 : swiper.clientWidth;
		if (!isLanded) {
			isLanded = true;
			swiper.scrollLeft = left;
			look.tabProgress = look.tab === 'edit' ? 0 : 1;
		} else if (Math.abs(swiper.scrollLeft - left) > swiper.clientWidth / 2)
			swiper.scrollTo({ left, behavior: 'smooth' });
	});

	// The left-edge strip on Preview: the panes follow the finger, and past a fifth of the screen it lets go to Panels.
	let edge: { x: number; left: number } | undefined;

	function edgeDown(event: PointerEvent) {
		if (!swiper) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		edge = { x: event.clientX, left: swiper.scrollLeft };
		swiper.style.scrollSnapType = 'none';
	}

	function edgeMove(event: PointerEvent) {
		if (!edge || !swiper) return;
		swiper.scrollLeft = edge.left - Math.max(0, event.clientX - edge.x);
	}

	function edgeUp(event: PointerEvent) {
		if (!edge || !swiper) return;
		const isBack = event.clientX - edge.x > swiper.clientWidth * 0.2;
		edge = undefined;
		swiper.style.scrollSnapType = '';
		show(isBack ? 'edit' : 'preview');
	}

	// The left-edge strip on Panels: the project follows the finger, showing the dashboard under it, and goes home past
	// a third of the screen or on a quick flick; otherwise it springs back.
	let pull = $state(0);
	let isPulling = $state(false);
	let pullStart = { x: 0, t: 0 };

	function pullDown(event: PointerEvent) {
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		isPulling = true;
		pullStart = { x: event.clientX, t: event.timeStamp };
	}

	function pullMove(event: PointerEvent) {
		if (isPulling) pull = Math.max(0, event.clientX - pullStart.x);
	}

	function pullUp(event: PointerEvent) {
		if (!isPulling) return;
		isPulling = false;
		const speed = pull / Math.max(1, event.timeStamp - pullStart.t);
		if (pull > window.innerWidth / 3 || (pull > 40 && speed > 0.5)) look.home();
		else pull = 0;
	}
</script>

<div
	class="relative h-dvh overflow-hidden md:hidden {surface} {isPulling
		? ''
		: 'transition-transform duration-300 ease-out'} {pull
		? 'shadow-[-16px_0_40px_rgb(15_23_42/0.18)]'
		: ''}"
	style:transform={pull ? `translateX(${pull}px)` : undefined}
>
	<header
		class="absolute inset-x-0 top-0 z-20 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
		bind:clientHeight={top}
	>
		<div class="py-2 pr-1.5 pl-1.5">
			<ProjectBar {look} />
		</div>
	</header>

	<div
		bind:this={swiper}
		class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
		{onscroll}
	>
		<div
			class="w-full shrink-0 snap-start overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+76px)]"
			style="padding-top: {top + 12}px"
		>
			<PanelList
				{look}
				style={panels}
			/>
		</div>
		<div class="relative w-full shrink-0 snap-start">
			<ReportPreview
				{look}
				highlight={look.panelId}
				{top}
				{...preview}
			/>
			<div
				class="absolute bottom-0 left-0 z-10 w-6 touch-none"
				style="top: {top}px"
				aria-hidden="true"
				onpointerdown={edgeDown}
				onpointermove={edgeMove}
				onpointerup={edgeUp}
				onpointercancel={edgeUp}
			></div>
		</div>
	</div>
	{#if look.tab === 'edit'}
		<div
			class="absolute bottom-0 left-0 z-10 w-4 touch-none"
			style="top: {top}px"
			aria-hidden="true"
			onpointerdown={pullDown}
			onpointermove={pullMove}
			onpointerup={pullUp}
			onpointercancel={pullUp}
		></div>
	{/if}
</div>

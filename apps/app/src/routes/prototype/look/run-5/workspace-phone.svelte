<script lang="ts">
	// PROTOTYPE (#161) run 8: inside a project on the phone. A white header floats over the content with a backdrop
	// blur and no border, so the panels (and the pages) show scrolling under it (Justin's note 3): back, the title, and
	// the project's percent and state over its bar (note 2). Panels / Preview is a black bar floating at the bottom
	// centre, like the preview's zoom bar, with the save cloud at its start (note 1). Swipe between the two; on Preview
	// the pages take every drag, so a hidden strip on the left edge swipes back. Run 9: the bar is words only, with no
	// line after the cloud (note 19); on Panels the left edge swipes the whole project away, back to the dashboard
	// (note 21).
	import type { ComponentProps } from 'svelte';
	import type { LookState } from './look.state.svelte';
	import PanelList from './panel-list.svelte';
	import ProjectBar from './project-bar.svelte';
	import ReportPreview from './report-preview.svelte';
	import SaveCloud from './save-cloud.svelte';

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
	let progress = $state(0);
	let top = $state(0);

	function show(tab: 'edit' | 'preview') {
		look.tab = tab;
		swiper?.scrollTo({ left: tab === 'edit' ? 0 : swiper.clientWidth, behavior: 'smooth' });
	}

	function onscroll() {
		if (!swiper?.clientWidth) return;
		progress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = progress > 0.5 ? 'preview' : 'edit';
	}

	// Land on the Preview pane when the URL asks for it.
	$effect(() => {
		if (swiper && look.tab === 'preview' && swiper.scrollLeft === 0) {
			swiper.scrollLeft = swiper.clientWidth;
			progress = 1;
		}
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

{#snippet tabs()}
	<nav
		class="absolute bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black p-1.5 text-white shadow-xl shadow-black/25"
		aria-label="Panels or preview"
	>
		<span class="flex size-9 items-center justify-center"><SaveCloud {look} /></span>
		<div
			class="relative grid grid-cols-[1fr_1fr]"
			role="tablist"
		>
			<span
				class="absolute inset-y-0 left-0 w-1/2 rounded-full bg-primary shadow-md shadow-primary/30"
				style="transform: translateX({progress * 100}%)"
			></span>
			{#each [['edit', 'Panels'], ['preview', 'Preview']] as const as [tab, label] (tab)}
				<button
					class="relative flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-medium transition-colors {look.tab ===
					tab
						? 'text-white'
						: 'text-white/60 hover:text-white'}"
					role="tab"
					aria-selected={look.tab === tab}
					onclick={() => show(tab)}>{label}</button
				>
			{/each}
		</div>
	</nav>
{/snippet}

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
	{@render tabs()}

	<div
		bind:this={swiper}
		class="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain"
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

<script lang="ts">
	// PROTOTYPE (#161) run 5: inside a project on the phone. The header floats over the content with a backdrop blur,
	// so the panels (and the pages) scroll under it, and it is shorter than G's (Justin's note 23). A: back, the
	// centred title with its save cloud, % and ring, then the Panels / Preview switch. B: one line, title on the left
	// and a small switch at the far right, with the project's bar under it (note 25). Swipe between Panels and
	// Preview; on Preview the pages take every drag, so a hidden strip on the left edge swipes back (note 35).
	import type { ComponentProps } from 'svelte';
	import type { LookState } from './look.state.svelte';
	import PanelList from './panel-list.svelte';
	import ProgressRing from './progress-ring.svelte';
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
	const isB = $derived(look.variant === 'B');

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
</script>

{#snippet tabs(isSmall: boolean)}
	<div
		class="relative grid shrink-0 grid-cols-2 rounded-full bg-slate-900/[0.06] p-0.5 {isSmall
			? 'w-[8.5rem] text-[12px]'
			: 'w-44 text-[13px]'}"
		role="tablist"
	>
		<span
			class="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-sm"
			style="transform: translateX({progress * 100}%)"
		></span>
		{#each [['edit', 'Panels'], ['preview', 'Preview']] as const as [tab, label] (tab)}
			<button
				class="relative rounded-full font-medium transition-colors {isSmall
					? 'py-[3px]'
					: 'py-1'} {look.tab === tab ? 'text-slate-900' : 'text-slate-500'}"
				role="tab"
				aria-selected={look.tab === tab}
				onclick={() => show(tab)}>{label}</button
			>
		{/each}
	</div>
{/snippet}

<div class="relative h-dvh overflow-hidden md:hidden {surface}">
	<header
		class="absolute inset-x-0 top-0 z-20 border-b border-slate-900/[0.06] bg-slate-100/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
		bind:clientHeight={top}
	>
		<div class="flex h-12 items-center gap-1 px-1.5">
			<button
				class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
				aria-label="Back"
				onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
			>
			<p class="flex min-w-0 flex-1 items-center gap-1.5 {isB ? 'pl-0.5' : 'justify-center'}">
				<span class="truncate font-semibold text-slate-900">{look.project.title}</span>
				<SaveCloud {look} />
			</p>
			{#if isB}
				<span class="pr-1.5">{@render tabs(true)}</span>
			{:else}
				<span
					class="flex shrink-0 items-center gap-1.5 pr-2 text-sm font-semibold text-slate-700 tabular-nums"
					>{look.overall}%<ProgressRing
						percent={look.overall}
						size={22}
						stroke={3}><span></span></ProgressRing
					></span
				>
			{/if}
		</div>
		{#if isB}
			<div class="px-4 pb-2"><ProjectBar {look} /></div>
		{:else}
			<div class="flex justify-center pb-2">{@render tabs(false)}</div>
		{/if}
	</header>

	<div
		bind:this={swiper}
		class="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain"
		{onscroll}
	>
		<div
			class="w-full shrink-0 snap-start overflow-y-auto px-4 pb-16"
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
</div>

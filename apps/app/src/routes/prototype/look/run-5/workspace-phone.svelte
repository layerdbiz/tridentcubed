<script lang="ts">
	// PROTOTYPE (#161) run 8: inside a project on the phone. A white header floats over the content with a backdrop
	// blur and no border, so the panels (and the pages) show scrolling under it (Justin's note 3): back, the title, and
	// the project's percent and state over its bar (note 2). Panels / Preview is a black bar floating at the bottom
	// centre, like the preview's zoom bar, with the save cloud at its start (note 1). Swipe between the two; on Preview
	// the pages take every drag, so a hidden strip on the left edge swipes back.
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
</script>

{#snippet tabs()}
	<nav
		class="absolute bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black p-1.5 text-white shadow-xl shadow-black/25"
		aria-label="Panels or preview"
	>
		<span class="flex size-9 items-center justify-center"><SaveCloud {look} /></span>
		<span class="h-5 w-px bg-white/15"></span>
		<div
			class="relative grid grid-cols-[1fr_1fr]"
			role="tablist"
		>
			<span
				class="absolute inset-y-0 left-0 w-1/2 rounded-full bg-primary shadow-md shadow-primary/30"
				style="transform: translateX({progress * 100}%)"
			></span>
			{#each [['edit', 'Panels', 'icon-[mdi--view-agenda-outline]'], ['preview', 'Preview', 'icon-[mdi--file-document-outline]']] as const as [tab, label, icon] (tab)}
				<button
					class="relative flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors {look.tab ===
					tab
						? 'text-white'
						: 'text-white/60 hover:text-white'}"
					role="tab"
					aria-selected={look.tab === tab}
					onclick={() => show(tab)}><span class="{icon} size-[18px] shrink-0"></span>{label}</button
				>
			{/each}
		</div>
	</nav>
{/snippet}

<div class="relative h-dvh overflow-hidden md:hidden {surface}">
	<header
		class="absolute inset-x-0 top-0 z-20 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
		bind:clientHeight={top}
	>
		<div class="py-2 pr-4 pl-1.5">
			<ProjectBar {look}>
				<button
					class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
					aria-label="Back"
					onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
				>
				<span class="truncate font-semibold text-slate-900">{look.project.title}</span>
			</ProjectBar>
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
				bottom="bottom-0"
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

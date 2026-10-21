<script lang="ts">
	// PROTOTYPE (#161) look G: inside a project on the phone, B2's header (back, the centred title with the save cloud
	// right after it, the % and a small ring on the right), B2's smaller Panels / Preview tab, and swiping between
	// the two. No status row under the tab (Justin's notes 13 to 16). The tab's pill follows
	// your finger. On the Preview side the pages drag freely, so swipe back from the left edge or tap Panels.
	import type { ComponentProps } from 'svelte';
	import type { LookState } from './look.state.svelte';
	import PanelList from './panel-list.svelte';
	import ProgressRing from './progress-ring.svelte';
	import ReportPreview from './report-preview.svelte';
	import SaveCloud from './save-cloud.svelte';

	let {
		look,
		panels = 'soft',
		preview,
		surface = 'bg-slate-100',
		frame = surface
	}: {
		look: LookState;
		panels?: 'soft' | 'flat' | 'ring';
		preview: Omit<ComponentProps<typeof ReportPreview>, 'look'>;
		surface?: string;
		frame?: string;
	} = $props();

	let swiper: HTMLDivElement | undefined = $state();
	let progress = $state(0);

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
</script>

<div class="flex h-dvh flex-col md:hidden {surface}">
	<header class="flex shrink-0 items-center gap-2 px-3 pt-3 pb-1 {frame}">
		<button
			class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
			aria-label="Back"
			onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
		>
		<p class="flex min-w-0 flex-1 items-center justify-center gap-1.5">
			<span class="truncate font-semibold text-slate-900">{look.project.title}</span>
			<SaveCloud {look} />
		</p>
		<span
			class="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-700 tabular-nums"
			>{look.overall}%<ProgressRing
				percent={look.overall}
				size={22}
				stroke={3}><span></span></ProgressRing
			></span
		>
	</header>
	<div class="flex shrink-0 justify-center pt-1 pb-2.5 {frame}">
		<div
			class="relative grid w-44 grid-cols-2 rounded-full bg-slate-900/[0.06] p-0.5 text-[13px]"
			role="tablist"
		>
			<span
				class="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-sm"
				style="transform: translateX({progress * 100}%)"
			></span>
			{#each [['edit', 'Panels'], ['preview', 'Preview']] as const as [tab, label] (tab)}
				<button
					class="relative rounded-full py-1 font-medium transition-colors {look.tab === tab
						? 'text-slate-900'
						: 'text-slate-500'}"
					role="tab"
					aria-selected={look.tab === tab}
					onclick={() => show(tab)}>{label}</button
				>
			{/each}
		</div>
	</div>
	<div
		bind:this={swiper}
		class="flex min-h-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain"
		{onscroll}
	>
		<div class="w-full shrink-0 snap-start overflow-y-auto px-4 pt-1 pb-16">
			<PanelList
				{look}
				style={panels}
			/>
		</div>
		<div class="relative w-full shrink-0 snap-start">
			<ReportPreview
				{look}
				highlight={look.panelId}
				{...preview}
			/>
			<div
				class="absolute inset-y-0 left-0 z-10 w-5 touch-pan-x"
				aria-hidden="true"
			></div>
		</div>
	</div>
</div>

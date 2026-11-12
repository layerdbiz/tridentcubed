<script lang="ts">
	// PROTOTYPE (#161) run 8: inside a project on the phone. A white header floats over the content with a backdrop
	// blur and no border, so the panels (and the pages) show scrolling under it (Justin's note 3): back, the title, and
	// the project's percent and state over its bar (note 2). Panels / Preview is a black bar floating at the bottom
	// centre, like the preview's zoom bar, with the save cloud at its start (note 1). Swipe between the two; on Preview
	// the pages take every drag, so a hidden strip on the left edge swipes back. Run 9: the bar is words only, with no
	// line after the cloud (note 19); on Panels the left edge swipes the whole project away, back to the dashboard
	// (note 21). Run 11 (2026-10-26 19:22): Panels and Preview moved into the one floating bar (nav-bar.svelte), which
	// sets look.tab; the panes follow it, and their scroll drives the bar's highlight through look.tabProgress. Run 13
	// (2026-11-07 22:21): a Page pane comes first (project-page.svelte), with its own picture and buttons, so the
	// header shows from Edit on; the left edge of the Page swipes the project away. Run 23 (Justin, 2026-11-11: "I
	// don't like how that changes"): Project Header B, C and D keep one top part over all three tabs, with the save
	// cloud in it. B is the full bar (title, percent, progress), C is floating buttons with no bar, D is one slim
	// line with the progress as a hairline under it. A is the header that only shows from Edit on.
	import type { ComponentProps } from 'svelte';
	import { PROJECT_TABS, type LookState, type TabType } from './look.state.svelte';
	import ProjectPage from './project-page.svelte';
	import PanelList from './panel-list.svelte';
	import { STATUS } from './look.data';
	import MoreMenu from './more-menu.svelte';
	import ProjectBar from './project-bar.svelte';
	import SaveCloud from './save-cloud.svelte';
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

	const header = $derived(look.variant('project-header'));
	const status = $derived(STATUS[look.project.status]);
	const BAR =
		'absolute inset-x-0 top-0 z-20 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150';
	const GLASS = 'pointer-events-auto bg-white/85 text-slate-900 shadow-sm backdrop-blur-md';

	let swiper: HTMLDivElement | undefined = $state();
	let top = $state(0);
	let isLanded = false;

	function show(tab: TabType) {
		look.tab = tab;
		swiper?.scrollTo({
			left: PROJECT_TABS.indexOf(tab) * swiper.clientWidth,
			behavior: 'smooth'
		});
	}

	function onscroll() {
		if (!swiper?.clientWidth) return;
		look.tabProgress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = PROJECT_TABS[Math.round(look.tabProgress)] ?? 'page';
	}

	// The bar's Panels and Preview: the panes slide to the one picked. The first time, as the project opens (on
	// Preview when the URL asks for it), they are simply there.
	$effect(() => {
		if (!swiper) return;
		const left = Math.max(0, PROJECT_TABS.indexOf(look.tab)) * swiper.clientWidth;
		if (!isLanded) {
			isLanded = true;
			swiper.scrollLeft = left;
			look.tabProgress = Math.max(0, PROJECT_TABS.indexOf(look.tab));
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
	{#if header === 'B'}
		<!-- The full bar, the same on every tab. -->
		<header
			class={BAR}
			bind:clientHeight={top}
		>
			<div class="py-2 pr-1.5 pl-1.5">
				<ProjectBar
					{look}
					isCloud
				/>
			</div>
		</header>
	{:else if header === 'C'}
		<!-- No bar: the way back with the title, and the cloud with the ⋮, float over whatever tab is showing. -->
		<header
			class="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2"
			bind:clientHeight={top}
		>
			<button
				class="flex h-10 min-w-0 items-center gap-1.5 rounded-full pr-4 pl-2.5 {GLASS}"
				aria-label="Back to Projects"
				onclick={() => look.home()}
			>
				<span class="icon-[mdi--arrow-left] size-6 shrink-0"></span>
				<span class="truncate text-sm font-semibold">{look.project.title}</span>
			</button>
			<span class="flex-1"></span>
			<span class="flex h-10 shrink-0 items-center gap-0.5 rounded-full pr-0.5 pl-3 {GLASS}">
				<SaveCloud {look} />
				<MoreMenu
					{look}
					page="projects"
					id={look.project.id}
					tone="bare"
				/>
			</span>
		</header>
	{:else if header === 'D'}
		<!-- One slim line on every tab: back, the title, the cloud, the percent, the ⋮, and the progress as a hairline. -->
		<header
			class={BAR}
			bind:clientHeight={top}
		>
			<div class="flex h-12 items-center gap-1 pr-1 pl-1.5">
				<button
					class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
					aria-label="Back to Projects"
					onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
				>
				<span class="min-w-0 flex-1 truncate font-semibold text-slate-900"
					>{look.project.title}</span
				>
				<SaveCloud {look} />
				<span class="shrink-0 pl-1.5 text-sm font-semibold tabular-nums {status.tone}"
					>{look.overall}%</span
				>
				<MoreMenu
					{look}
					page="projects"
					id={look.project.id}
				/>
			</div>
			<span class="block h-0.5 bg-slate-900/[0.07]"
				><span
					class="block h-full transition-[width] duration-500 {status.bar}"
					style="width: {look.overall}%"
				></span></span
			>
		</header>
	{:else}
		<header
			class="absolute inset-x-0 top-0 z-20 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 {look.tabProgress <
			0.5
				? 'pointer-events-none'
				: ''}"
			style:opacity={Math.min(1, Math.max(0, look.tabProgress))}
			inert={look.tabProgress < 0.5}
			bind:clientHeight={top}
		>
			<div class="py-2 pr-1.5 pl-1.5">
				<ProjectBar
					{look}
					isCloud={look.variant('bar') !== 'A'}
				/>
			</div>
		</header>
	{/if}

	<div
		bind:this={swiper}
		class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
		{onscroll}
	>
		<div class="h-full w-full shrink-0 snap-start">
			<ProjectPage
				{look}
				project={look.project}
				isWide={false}
				chrome={header === 'A' ? undefined : top}
			/>
		</div>
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
	{#if look.tab === 'page'}
		<div
			class="absolute bottom-0 left-0 z-10 w-4 touch-none"
			style="top: 72px"
			aria-hidden="true"
			onpointerdown={pullDown}
			onpointermove={pullMove}
			onpointerup={pullUp}
			onpointercancel={pullUp}
		></div>
	{/if}
</div>

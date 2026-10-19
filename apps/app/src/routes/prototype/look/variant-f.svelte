<script lang="ts">
	// PROTOTYPE (#161) Variant F, "Floating canvas": the whole app is a dotted canvas, Figma style, and everything else
	// floats over it in rounded cards, the same idea as the floating phone bar. Desktop: B's sidebar as a floating
	// card; inside a project the pages fill the whole window, spread out to drag around, and the panels float on the
	// left. Phone: A's dashboard with a frosted floating bar; inside a project, B's header, tab and swipe.
	// Picks for the open questions: one chart card with the 3 tiles inside it (each with a sparkline); view icons + a
	// filter button; Recent as client logos in progress rings; panels with the icon in its ring (no bar); the QR in
	// the page footer; the time log as a timeline.
	import BottomBar from './bottom-bar.svelte';
	import CountTiles from './count-tiles.svelte';
	import DashboardList from './dashboard-list.svelte';
	import { STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import NewProject from './new-project.svelte';
	import PanelList from './panel-list.svelte';
	import ProgressRing from './progress-ring.svelte';
	import ReportPreview from './report-preview.svelte';
	import SavedBadge from './saved-badge.svelte';
	import Sidebar from './sidebar.svelte';
	import StatChart from './stat-chart.svelte';
	import WorkspacePhone from './workspace-phone.svelte';

	let { look }: { look: LookState } = $props();

	let innerWidth = $state(0);
	const isWide = $derived(innerWidth >= 768);
	const CANVAS =
		'bg-slate-100 bg-[radial-gradient(circle,rgb(15_23_42/0.09)_1px,transparent_1.2px)] bg-[size:22px_22px]';
	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	const PREVIEW = {
		letterhead: 'footer',
		days: 'timeline',
		tone: 'glass',
		surface: CANVAS
	} as const;
</script>

<svelte:window bind:innerWidth />

<div class="min-h-dvh {CANVAS}">
	{#if look.screen === 'dashboard'}
		<aside class="fixed top-3 bottom-3 left-3 z-40 hidden w-72 overflow-hidden md:block {FLOAT}">
			<Sidebar
				{look}
				recent="rings"
			/>
		</aside>
		<main class="md:pl-[312px]">
			<div class="mx-auto max-w-6xl px-4 pt-14 pb-32 md:px-8 md:pt-6 md:pb-12">
				<div class="mb-5 flex items-center justify-between md:hidden">
					<img
						src="/logo-color.svg"
						alt="Trident Cubed"
						class="size-9"
					/>
					<img
						src="https://randomuser.me/api/portraits/women/52.jpg"
						alt="Riley Ford"
						class="size-9 rounded-full object-cover"
					/>
				</div>
				<StatChart
					{look}
					isCard
					height={isWide ? 200 : 130}
				>
					{#snippet top()}
						<div class="mb-5">
							<CountTiles
								{look}
								style="spark"
							/>
						</div>
					{/snippet}
				</StatChart>
				<div class="mt-8">
					<DashboardList
						{look}
						controls="popover"
					/>
				</div>
			</div>
		</main>
		<BottomBar
			{look}
			style="glass"
		/>
	{:else}
		<WorkspacePhone
			{look}
			panels="ring"
			surface={CANVAS}
			preview={{ ...PREVIEW, start: 'column' }}
		/>
		{#if isWide}
			<div class="fixed inset-0">
				<ReportPreview
					{look}
					highlight={look.panelId}
					{...PREVIEW}
					start="spread"
					left={444}
				/>
			</div>
			<aside
				class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}"
			>
				<div class="flex items-center gap-3 px-5 pt-4 pb-4">
					<button
						class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
						aria-label="Back to Dashboard"
						onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
					>
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold text-slate-900">{look.project.title}</p>
						<p class="flex flex-wrap items-center gap-x-2 text-xs">
							<span class="flex items-center gap-1 {STATUS[look.project.status].tone}"
								><span class="{STATUS[look.project.status].icon} size-3.5"></span>{look.project
									.status}</span
							>
							<span class="text-slate-400">{look.project.number}</span>
							<SavedBadge {look} />
						</p>
					</div>
					<ProgressRing
						percent={look.overall}
						size={46}
						stroke={5}
					/>
				</div>
				<div class="flex-1 overflow-y-auto px-4 pb-6">
					<PanelList
						{look}
						style="ring"
					/>
				</div>
			</aside>
		{/if}
	{/if}

	<NewProject {look} />
</div>

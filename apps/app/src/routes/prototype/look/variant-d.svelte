<script lang="ts">
	// PROTOTYPE (#161) Variant D, "One surface": everything sits on one soft grey, with no lines or white bars
	// splitting the screen. Desktop: B's sidebar on the same grey; inside a project that sidebar becomes the panels
	// (the AI-app layout) and the pages float on the same grey beside it. Phone: A's dashboard with the floating bar
	// and its lifted +; inside a project, B's header, tab and swipe.
	// Picks for the open questions: chart under the big number then 3 tiles; view icons + a status dropdown; Recent
	// shows client logos; letterhead with the QR on the right; time log days as "Day 1 (date)".
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
	const SURFACE = 'bg-slate-100';
	const PREVIEW = { letterhead: 'split', days: 'parens', tone: 'dark', surface: SURFACE } as const;
</script>

<svelte:window bind:innerWidth />

<div class="min-h-dvh {SURFACE}">
	<aside
		class="fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-[260ms] ease-out md:block {look.screen ===
		'workspace'
			? 'w-[420px]'
			: 'w-72'}"
	>
		{#if look.screen === 'dashboard'}
			<Sidebar
				{look}
				recent="logos"
			/>
		{:else}
			<div class="flex h-full flex-col">
				<button
					class="flex items-center gap-2 px-6 pt-5 pb-3 text-sm text-slate-500 hover:text-slate-900"
					onclick={() => look.home()}
				>
					<span class="icon-[mdi--arrow-left] size-5"></span> All projects
				</button>
				<div class="flex items-center gap-4 px-6 pb-5">
					<ProgressRing
						percent={look.overall}
						size={64}
						stroke={6}
					/>
					<div class="min-w-0">
						<p class="truncate text-lg font-semibold text-slate-900">{look.project.title}</p>
						<p class="flex flex-wrap items-center gap-x-2 text-xs">
							<span class="flex items-center gap-1 {STATUS[look.project.status].tone}"
								><span class="{STATUS[look.project.status].icon} size-3.5"></span>{look.project
									.status}</span
							>
							<span class="text-slate-400">{look.project.number}</span>
							<SavedBadge {look} />
						</p>
					</div>
				</div>
				<div class="flex-1 overflow-y-auto px-5 pt-2 pb-8">
					<PanelList
						{look}
						style="soft"
					/>
				</div>
			</div>
		{/if}
	</aside>

	<main
		class="transition-[padding] duration-[260ms] ease-out {look.screen === 'workspace'
			? 'md:pl-[420px]'
			: 'md:pl-72'}"
	>
		{#if look.screen === 'dashboard'}
			<div class="mx-auto max-w-6xl px-4 pt-14 pb-32 md:px-10 md:pt-10 md:pb-12">
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
					height={isWide ? 210 : 140}
				/>
				<div class="mt-6">
					<CountTiles
						{look}
						style="stack"
					/>
				</div>
				<div class="mt-8">
					<DashboardList
						{look}
						controls="select"
					/>
				</div>
			</div>
		{:else}
			<WorkspacePhone
				{look}
				panels="soft"
				surface={SURFACE}
				preview={{ ...PREVIEW, start: 'column' }}
			/>
			{#if isWide}
				<div class="h-dvh">
					<ReportPreview
						{look}
						highlight={look.panelId}
						{...PREVIEW}
						start="column"
					/>
				</div>
			{/if}
		{/if}
	</main>

	{#if look.screen === 'dashboard'}
		<BottomBar
			{look}
			style="raised"
		/>
	{/if}

	<NewProject {look} />
</div>

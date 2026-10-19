<script lang="ts">
	// PROTOTYPE (#161) Variant E, "White frame": Justin was unsure about the white top bar and white rail, so this one
	// keeps them, as a white frame around one grey work surface, separated by shadow instead of lines. Desktop: B's
	// sidebar in white; inside a project it folds to an icon rail, a white top bar carries B's header (back, centred
	// title, % ring), and the panels and the pages share the grey. Phone: a white top bar, the dark floating bar.
	// Picks for the open questions: 4 tiles (with Ports) above the chart, the chart in a card, view and status as two
	// dropdowns, Recent as activity (logo, face or project mark), the QR in the middle of the letterhead, time log
	// dates on their own line.
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
	const FRAME = 'bg-white shadow-[0_10px_30px_-24px_rgb(15_23_42/0.45)]';
	const PREVIEW = {
		letterhead: 'center',
		days: 'newline',
		tone: 'light',
		surface: SURFACE,
		start: 'column'
	} as const;
</script>

<svelte:window bind:innerWidth />

<div class="min-h-dvh {SURFACE}">
	<aside
		class="fixed inset-y-0 left-0 z-40 hidden bg-white shadow-[10px_0_30px_-26px_rgb(15_23_42/0.5)] transition-[width] duration-[260ms] ease-out md:block {look.screen ===
		'workspace'
			? 'w-[76px]'
			: 'w-72'}"
	>
		<Sidebar
			{look}
			recent="activity"
			isCollapsed={look.screen === 'workspace'}
		/>
	</aside>

	<main
		class="transition-[padding] duration-[260ms] ease-out {look.screen === 'workspace'
			? 'md:pl-[76px]'
			: 'md:pl-72'}"
	>
		{#if look.screen === 'dashboard'}
			<header
				class="sticky top-0 z-30 flex items-center justify-between px-4 pt-3 pb-3 md:hidden {FRAME}"
			>
				<img
					src="/logo-color.svg"
					alt="Trident Cubed"
					class="size-9"
				/>
				<span class="text-sm font-bold tracking-wide text-slate-900">TRIDENT CUBED</span>
				<img
					src="https://randomuser.me/api/portraits/women/52.jpg"
					alt="Riley Ford"
					class="size-9 rounded-full object-cover"
				/>
			</header>
			<div class="mx-auto max-w-6xl px-4 pt-5 pb-32 md:px-10 md:pt-10 md:pb-12">
				<CountTiles
					{look}
					sets={['projects', 'clients', 'team', 'ports']}
					style="compact"
				/>
				<div class="mt-4">
					<StatChart
						{look}
						isCard
						height={isWide ? 200 : 130}
					/>
				</div>
				<div class="mt-8">
					<DashboardList
						{look}
						controls="dropdowns"
					/>
				</div>
			</div>
		{:else}
			<WorkspacePhone
				{look}
				panels="flat"
				surface={SURFACE}
				frame="bg-white"
				preview={PREVIEW}
			/>
			{#if isWide}
				<header class="relative z-30 flex h-16 items-center gap-3 px-5 {FRAME}">
					<button
						class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
						aria-label="Back to Dashboard"
						onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
					>
					<div class="min-w-0 flex-1 text-center">
						<p class="truncate font-semibold text-slate-900">{look.project.title}</p>
						<p class="flex items-center justify-center gap-2 text-xs">
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
				</header>
				<div class="grid h-[calc(100dvh-64px)] grid-cols-[minmax(380px,440px)_1fr]">
					<section class="overflow-y-auto px-6 pt-6 pb-10">
						<PanelList
							{look}
							style="flat"
						/>
					</section>
					<section class="h-full">
						<ReportPreview
							{look}
							highlight={look.panelId}
							{...PREVIEW}
						/>
					</section>
				</div>
			{/if}
		{/if}
	</main>

	{#if look.screen === 'dashboard'}
		<BottomBar
			{look}
			style="dark"
		/>
	{/if}

	<NewProject {look} />
</div>

<script lang="ts">
	// PROTOTYPE (#161) look G, from Justin's 17 notes on run 3 (design/161-look/run-4-notes.md): D's top half on F's
	// dotted grey. No bottom bar: a menu button top left opens the sidebar, a bell sits top right. On the phone the
	// dashboard is one screen split 35/65: the edge-to-edge chart and the three cards on top, the list in its white
	// box below, scrolling on its own. Inside a project: B2's header (back, centred title with the cloud right after
	// it, the % and a small ring), B2's smaller Panels / Preview switch, and no status row under it.
	import { fade, fly, scale } from 'svelte/transition';
	import ClientLogo from './client-logo.svelte';
	import DashboardList from './dashboard-list.svelte';
	import HeroChart from './hero-chart.svelte';
	import { personOf, RECENT } from './look.data';
	import type { LookState } from './look.state.svelte';
	import NewProject from './new-project.svelte';
	import PanelList from './panel-list.svelte';
	import ProgressRing from './progress-ring.svelte';
	import ReportPreview from './report-preview.svelte';
	import SaveCloud from './save-cloud.svelte';
	import Sidebar from './sidebar.svelte';
	import StatCards from './stat-cards.svelte';
	import WorkspacePhone from './workspace-phone.svelte';

	let { look }: { look: LookState } = $props();

	let innerWidth = $state(0);
	let isDrawerOpen = $state(false);
	let isBellOpen = $state(false);
	let bell: HTMLDivElement | undefined = $state();
	let seen = $state(false);
	const isWide = $derived(innerWidth >= 768);

	const CANVAS =
		'bg-slate-100 bg-[radial-gradient(circle,rgb(15_23_42/0.09)_1px,transparent_1.2px)] bg-[size:22px_22px]';
	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	const ROUND =
		'flex size-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-900/[0.05]';
	const PREVIEW = {
		letterhead: 'footer',
		days: 'timeline',
		tone: 'glass',
		surface: CANVAS
	} as const;

	// Picking anything in the drawer closes it.
	$effect(() => {
		void look.navSection;
		void look.screen;
		void look.isNewOpen;
		isDrawerOpen = false;
	});

	function onpointerdown(event: PointerEvent) {
		if (isBellOpen && bell && !bell.contains(event.target as Node)) isBellOpen = false;
	}

	function ring() {
		isBellOpen = !isBellOpen;
		seen = true;
	}
</script>

<svelte:window
	bind:innerWidth
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isBellOpen = isDrawerOpen = false)}
/>

{#snippet bellButton()}
	<div
		class="relative"
		bind:this={bell}
	>
		<button
			class="{ROUND} relative"
			aria-label="Notifications"
			aria-expanded={isBellOpen}
			onclick={ring}
		>
			<span class="icon-[mdi--bell-outline] size-6"></span>
			{#if !seen}
				<span class="absolute top-2 right-2.5 size-2.5 rounded-full bg-danger ring-2 ring-slate-100"
				></span>
			{/if}
		</button>
		{#if isBellOpen}
			<div
				class="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-3xl bg-white p-2 shadow-[0_2px_6px_rgb(15_23_42/0.06),0_24px_50px_-12px_rgb(15_23_42/0.3)]"
				transition:scale={{ start: 0.95, duration: 140 }}
			>
				<p class="px-3 pt-2 pb-1 text-sm font-semibold text-slate-900">Notifications</p>
				{#each RECENT as item (item.name)}
					<button
						class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-slate-900/[0.04]"
						onclick={() => {
							isBellOpen = false;
							if (item.id) look.open(item.id);
						}}
					>
						{#if item.kind === 'person'}
							<img
								src={personOf(item.name).photo}
								alt=""
								class="size-9 shrink-0 rounded-full object-cover"
							/>
						{:else if item.kind === 'client'}
							<ClientLogo
								name={item.name}
								size={36}
								shape="circle"
							/>
						{:else}
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
								><span class="icon-[mdi--briefcase-variant-outline] size-[18px]"></span></span
							>
						{/if}
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm text-slate-800">{item.name}</span>
							<span class="block truncate text-xs text-slate-400">{item.note}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="min-h-dvh {CANVAS}">
	{#if look.screen === 'dashboard'}
		<aside class="fixed top-3 bottom-3 left-3 z-40 hidden w-72 overflow-hidden md:block {FLOAT}">
			<Sidebar
				{look}
				recent="logos"
			/>
		</aside>

		{#if isDrawerOpen}
			<button
				class="fixed inset-0 z-[60] bg-slate-950/30 md:hidden"
				aria-label="Close menu"
				onclick={() => (isDrawerOpen = false)}
				transition:fade={{ duration: 180 }}
			></button>
			<aside
				class="fixed inset-y-0 left-0 z-[61] w-[84%] max-w-xs overflow-hidden rounded-r-[28px] bg-white pt-[env(safe-area-inset-top)] shadow-2xl md:hidden"
				transition:fly={{ x: -340, duration: 240 }}
			>
				<Sidebar
					{look}
					recent="logos"
				/>
			</aside>
		{/if}

		<main
			class="flex h-dvh flex-col overflow-hidden md:block md:h-auto md:overflow-visible md:pl-[312px]"
		>
			<section class="flex h-[35dvh] min-h-64 shrink-0 flex-col md:h-auto">
				<header
					class="flex shrink-0 items-center justify-between px-2 pt-[max(0.25rem,env(safe-area-inset-top))] md:justify-end md:px-6 md:pt-5"
				>
					<button
						class="{ROUND} md:hidden"
						aria-label="Open menu"
						onclick={() => (isDrawerOpen = true)}
						><span class="icon-[mdi--menu] size-6"></span></button
					>
					{@render bellButton()}
				</header>
				<div class="min-h-0 flex-1 pt-1 md:h-72 md:flex-none md:pt-0">
					<HeroChart {look} />
				</div>
				<div class="shrink-0 px-4 pt-2 pb-3 md:px-8 md:pt-3 md:pb-0">
					<StatCards {look} />
				</div>
			</section>
			<section class="min-h-0 flex-1 px-4 pt-2 md:px-8 md:pt-10 md:pb-12">
				<DashboardList
					{look}
					isSplit={!isWide}
				/>
			</section>
		</main>
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
				<div class="flex items-center gap-2 px-4 pt-4 pb-4">
					<button
						class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
						aria-label="Back to Dashboard"
						onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
					>
					<p class="flex min-w-0 flex-1 items-center gap-1.5">
						<span class="truncate font-semibold text-slate-900">{look.project.title}</span>
						<SaveCloud {look} />
					</p>
					<span
						class="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700 tabular-nums"
						>{look.overall}%<ProgressRing
							percent={look.overall}
							size={24}
							stroke={3.5}><span></span></ProgressRing
						></span
					>
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

<script lang="ts">
	// PROTOTYPE (#161) Bottom Bar, variant B (Justin, 2026-11-11): not a floating pill. On a phone the bar runs edge
	// to edge along the bottom with no glow, and each icon has its page's name under it. The blue + sits above the
	// bar at the bottom right. Inside a project or a record the same bar holds the way back (the page it came from)
	// and the tabs, Page, Edit and Preview, each an icon over its name, the one on show marked by a blue line. The
	// save cloud is not here: it moved up into the header (project-bar.svelte, record-page.svelte).
	// A desktop keeps A's small pill for a project's Page and Preview, without its shadow.
	import { DATASETS, PAGE_ICONS, PAGES, type DatasetType } from '../look.data';
	import type { LookState } from '../look.state.svelte';
	import NavBar from '../nav-bar.svelte';

	let { look, isWide, left }: { look: LookState; isWide: boolean; left: string } = $props();

	const TABS = {
		page: { label: 'Page', icon: 'icon-[mdi--card-text]' },
		edit: { label: 'Edit', icon: 'icon-[mdi--pencil]' },
		preview: { label: 'Preview', icon: 'icon-[mdi--file-eye]' }
	};
	const ITEM =
		'relative flex min-w-0 flex-col items-center gap-0.5 px-0.5 pt-2 pb-1.5 transition-colors';
	const NAME = 'w-full text-center text-[10px] leading-[1.15] font-medium';

	const isInside = $derived(look.screen !== 'dashboard');
	const tabs = $derived(
		look.screen === 'record' ? (['page', 'edit'] as const) : (['page', 'edit', 'preview'] as const)
	);

	function back(id: DatasetType) {
		look.home();
		if (look.dataset !== id) look.pick(id);
	}
</script>

{#if isWide}
	{#if look.screen === 'workspace'}
		<NavBar
			{look}
			{isWide}
			{left}
			isFlat
		/>
	{/if}
{:else}
	<nav
		class="fixed inset-x-0 bottom-0 z-[55] bg-black pb-[env(safe-area-inset-bottom)] text-white"
		aria-label={isInside ? 'Project' : 'Pages'}
	>
		<div
			class="grid"
			style="grid-template-columns: repeat({isInside
				? tabs.length + 1
				: PAGES.length}, minmax(0, 1fr))"
		>
			{#if isInside}
				<button
					class="{ITEM} text-white/45 hover:text-white/70"
					aria-label="Back to {DATASETS[look.dataset].label}"
					onclick={() => back(look.dataset)}
				>
					<span class="{PAGE_ICONS[look.dataset]} size-6"></span>
					<span class={NAME}>{DATASETS[look.dataset].label}</span>
				</button>
				{#each tabs as tab (tab)}
					{@const isOn = look.tab === tab}
					<button
						class="{ITEM} {isOn ? 'text-white' : 'text-white/45 hover:text-white/70'}"
						role="tab"
						aria-selected={isOn}
						onclick={() => (look.tab = tab)}
					>
						{#if isOn}<span class="absolute top-0 h-0.5 w-10 rounded-full bg-primary"></span>{/if}
						<span class="{TABS[tab].icon} size-6"></span>
						<span class={NAME}>{TABS[tab].label}</span>
					</button>
				{/each}
			{:else}
				{#each PAGES as id (id)}
					{@const isOn = look.navSection === id}
					<button
						class="{ITEM} {isOn ? 'text-white' : 'text-white/45 hover:text-white/70'}"
						aria-current={isOn ? 'page' : undefined}
						onclick={() => look.pick(id)}
					>
						<span class="{PAGE_ICONS[id]} size-6"></span>
						<span class={NAME}>{DATASETS[id].label}</span>
					</button>
				{/each}
			{/if}
		</div>
	</nav>
	{#if !isInside}
		<!-- Above the bar, at the right; a white ring in place of a glow keeps it apart from what is under it. -->
		<button
			class="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[55] flex size-14 items-center justify-center rounded-full bg-primary text-white ring-4 ring-white transition hover:brightness-110"
			aria-label="Add"
			title="Add a Project, Customer, Team, Transport Mode or Facility"
			onclick={() => (look.adding = look.dataset)}
			><span class="icon-[mdi--plus] size-8"></span></button
		>
	{/if}
{/if}

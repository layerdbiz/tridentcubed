<script lang="ts">
	// PROTOTYPE (#161) Bottom Bar, variants C and D (Justin, 2026-11-11): back to A's floating black bar, but wider
	// and with no shadow. On a phone it runs nearly the whole width, with room at each side, and holds the five
	// pages as icons with no words. The blue + is out of the bar: it floats above it, flush with the bar's right
	// edge, the same gap over the bar as the bar has under it. Inside a project or a record the bar starts with the
	// white icon of the page it came from and that page's name, which go back there, then the tabs. D (`hasArrow`)
	// puts a right arrow after the name, before the tabs; C has none. No save cloud here: it is in the header.
	// A desktop keeps A's small pill for a project's Page and Preview, without its shadow.
	import { DATASETS, PAGE_ICONS, PAGES, type DatasetType } from '../look.data';
	import type { LookState } from '../look.state.svelte';
	import NavBar from '../nav-bar.svelte';

	let {
		look,
		isWide,
		left,
		hasArrow = false
	}: { look: LookState; isWide: boolean; left: string; hasArrow?: boolean } = $props();

	const TABS = { page: 'Page', edit: 'Edit', preview: 'Preview' };
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
		class="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-[55] flex h-14 items-center rounded-full bg-black px-1.5 text-white"
		aria-label={isInside ? 'Project' : 'Pages'}
	>
		{#if isInside}
			<button
				class="flex h-11 min-w-0 shrink items-center gap-2 rounded-full pr-1 pl-3 text-white"
				aria-label="Back to {DATASETS[look.dataset].label}"
				onclick={() => back(look.dataset)}
			>
				<span class="{PAGE_ICONS[look.dataset]} size-6 shrink-0"></span>
				<span class="truncate text-[13px] font-semibold">{DATASETS[look.dataset].label}</span>
				{#if hasArrow}
					<span class="icon-[mdi--chevron-right] size-5 shrink-0 text-white/50"></span>
				{/if}
			</button>
			<div
				class="ml-auto flex shrink-0 items-center"
				role="tablist"
				aria-label={tabs.map((tab) => TABS[tab]).join(' or ')}
			>
				{#each tabs as tab (tab)}
					{@const isOn = look.tab === tab}
					<button
						class="flex h-11 items-center justify-center rounded-full px-3.5 text-[13px] font-medium transition-colors {isOn
							? 'bg-primary text-white'
							: 'text-white/60 hover:text-white'}"
						role="tab"
						aria-selected={isOn}
						onclick={() => (look.tab = tab)}>{TABS[tab]}</button
					>
				{/each}
			</div>
		{:else}
			{#each PAGES as id (id)}
				{@const isOn = look.navSection === id}
				<button
					class="flex h-11 flex-1 items-center justify-center rounded-full transition-colors {isOn
						? 'text-white'
						: 'text-white/45 hover:text-white/70'}"
					aria-label={DATASETS[id].label}
					aria-current={isOn ? 'page' : undefined}
					title={DATASETS[id].label}
					onclick={() => look.pick(id)}><span class="{PAGE_ICONS[id]} size-6"></span></button
				>
			{/each}
		{/if}
	</nav>
	{#if !isInside}
		<!-- Flush with the bar's right edge, and as far over the bar as the bar is over the bottom. -->
		<button
			class="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[55] flex size-14 items-center justify-center rounded-full bg-primary text-white transition hover:brightness-110"
			aria-label="Add"
			title="Add a Project, Customer, Team, Transport Mode or Facility"
			onclick={() => (look.adding = look.dataset)}
			><span class="icon-[mdi--plus] size-8"></span></button
		>
	{/if}
{/if}

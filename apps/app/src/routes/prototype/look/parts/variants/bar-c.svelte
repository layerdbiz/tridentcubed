<script lang="ts">
	// PROTOTYPE (#161) Bottom Bar, variants C and D (Justin, 2026-11-11): back to A's floating black bar, but wider
	// and with no shadow. On a phone it runs nearly the whole width, with room at each side, and holds the five
	// pages as icons with no words. The blue + is out of the bar: it floats above it, flush with the bar's right
	// edge, the same gap over the bar as the bar has under it. Inside a project or a record the bar starts with the
	// white icon of the page it came from and that page's name, which go back there, then the tabs. D (`hasArrow`)
	// puts a right arrow after the name, before the tabs; C has none. No save cloud here: it is in the header.
	// Run 24 (Justin, 2026-11-11: "the folder icon moves and it shouldn't", "it just jumps in"): it moves the way A
	// does. The first icon keeps a fifth of the bar, the place Projects has on the dashboard, so it never moves; the
	// other four pages slide off to the left behind it while the name and the tabs slide in from the right, and the
	// blue highlight follows the panes as they are swiped.
	// A desktop keeps A's small pill for a project's Page and Preview, without its shadow.
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { DATASETS, PAGE_ICONS, PAGES, type DatasetType } from '../look.data';
	import type { LookState, TabType } from '../look.state.svelte';
	import NavBar from '../nav-bar.svelte';

	let {
		look,
		isWide,
		left,
		hasArrow = false
	}: { look: LookState; isWide: boolean; left: string; hasArrow?: boolean } = $props();

	const TABS = { page: 'Page', edit: 'Edit', preview: 'Preview' };
	const PROJECT: TabType[] = ['page', 'edit', 'preview'];
	const RECORD: TabType[] = ['page', 'edit'];
	const SLIDE =
		'absolute inset-y-0 right-0 flex items-center transition-[transform,opacity] duration-300 ease-out';

	const isInside = $derived(look.screen !== 'dashboard');
	// The far left: Projects on the dashboard; inside, the page it came from.
	const lead = $derived(isInside ? look.dataset : PAGES[0]);
	const isLeadOn = $derived(isInside || look.navSection === lead);
	// The tabs of the last thing opened, so they do not change while they slide away.
	let tabs = $state(PROJECT);
	let list: HTMLDivElement | undefined = $state();
	let mark = $state({ x: 0, width: 0 });

	$effect(() => {
		if (look.screen === 'record') tabs = RECORD;
		else if (look.screen === 'workspace') tabs = PROJECT;
	});

	// The blue highlight sits under its tab and follows the panes as they are swiped.
	function place() {
		const boxes = [...(list?.querySelectorAll<HTMLElement>('[data-tab]') ?? [])];
		if (boxes.length < 2) return;
		const at = Math.min(boxes.length - 1, Math.max(0, look.tabProgress));
		const from = Math.min(boxes.length - 2, Math.floor(at));
		const [a, b] = [boxes[from], boxes[from + 1]];
		const part = at - from;
		mark = {
			x: a.offsetLeft + (b.offsetLeft - a.offsetLeft) * part,
			width: a.offsetWidth + (b.offsetWidth - a.offsetWidth) * part
		};
	}

	$effect(() => {
		void look.tabProgress;
		void tabs;
		void list;
		untrack(place);
	});

	function go(id: DatasetType) {
		if (!isInside) return look.pick(id);
		look.home();
		if (look.dataset !== id) look.pick(id);
	}
</script>

<svelte:window onresize={place} />

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
		<!-- A fifth of the bar, where Projects sits on the dashboard: this icon never moves. -->
		<button
			class="flex h-11 shrink-0 basis-1/5 items-center justify-center rounded-full transition-colors {isLeadOn
				? 'text-white'
				: 'text-white/45 hover:text-white/70'}"
			aria-label={isInside ? `Back to ${DATASETS[lead].label}` : DATASETS[lead].label}
			aria-current={isLeadOn && !isInside ? 'page' : undefined}
			title={DATASETS[lead].label}
			onclick={() => go(lead)}
		>
			{#key lead}<span
					class="{PAGE_ICONS[lead]} size-6"
					in:fade={{ duration: 200 }}
				></span>{/key}
		</button>
		<!-- It starts a little inside the first icon's fifth, so the name sits close to the icon without being cut. -->
		<div class="relative -ml-2.5 h-full min-w-0 flex-1 overflow-hidden">
			<!-- The other four pages: they slide off to the left, behind the first icon. -->
			<div
				class="{SLIDE} left-2.5"
				style:transform={isInside ? 'translateX(-100%)' : undefined}
				style:opacity={isInside ? 0 : 1}
				inert={isInside}
			>
				{#each PAGES.slice(1) as id (id)}
					{@const isOn = look.navSection === id}
					<button
						class="flex h-11 flex-1 items-center justify-center rounded-full transition-colors {isOn
							? 'text-white'
							: 'text-white/45 hover:text-white/70'}"
						aria-label={DATASETS[id].label}
						aria-current={isOn ? 'page' : undefined}
						title={DATASETS[id].label}
						onclick={() => go(id)}><span class="{PAGE_ICONS[id]} size-6"></span></button
					>
				{/each}
			</div>
			<!-- Inside a project or a record: the page's name and the tabs follow them in from the right. -->
			<div
				class="{SLIDE} left-0"
				style:transform={isInside ? undefined : 'translateX(100%)'}
				style:opacity={isInside ? 1 : 0}
				inert={!isInside}
			>
				<button
					class="flex h-11 min-w-0 shrink items-center gap-1 text-white"
					aria-label="Back to {DATASETS[look.dataset].label}"
					onclick={() => go(look.dataset)}
				>
					<span class="truncate text-[13px] font-semibold">{DATASETS[look.dataset].label}</span>
					{#if hasArrow}
						<span class="icon-[mdi--chevron-right] size-5 shrink-0 text-white/50"></span>
					{/if}
				</button>
				<div
					bind:this={list}
					class="relative ml-auto flex shrink-0 items-center"
					role="tablist"
					aria-label={tabs.map((tab) => TABS[tab]).join(' or ')}
				>
					<span
						class="absolute inset-y-0 left-0 rounded-full bg-primary"
						style="width: {mark.width}px; transform: translateX({mark.x}px)"
						aria-hidden="true"
					></span>
					{#each tabs as tab (tab)}
						{@const isOn = look.tab === tab}
						<button
							class="relative flex h-11 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors {isOn
								? 'text-white'
								: 'text-white/60 hover:text-white'}"
							data-tab={tab}
							role="tab"
							aria-selected={isOn}
							onclick={() => (look.tab = tab)}>{TABS[tab]}</button
						>
					{/each}
				</div>
			</div>
		</div>
	</nav>
	<!-- Flush with the bar's right edge, and as far over the bar as the bar is over the bottom. Inside, it goes. -->
	<button
		class="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[55] flex size-14 items-center justify-center rounded-full bg-primary text-white transition duration-300 ease-out hover:brightness-110 {isInside
			? 'pointer-events-none scale-50 opacity-0'
			: ''}"
		aria-label="Add"
		title="Add a Project, Customer, Team, Transport Mode or Facility"
		inert={isInside}
		onclick={() => (look.adding = look.dataset)}
		><span class="icon-[mdi--plus] size-8"></span></button
	>
{/if}

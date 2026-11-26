<script lang="ts">
	// PROTOTYPE (#161) Bottom Bar, variants C and D (Justin, 2026-11-11): back to A's floating black bar, but wider
	// and with no shadow. On a phone it runs nearly the whole width, with room at each side, and holds the five
	// pages as icons with no words. The blue + is out of the bar: it floats above it, flush with the bar's right
	// edge, the same gap over the bar as the bar has under it. Inside a project or a record the bar starts with the
	// white icon of the page it came from and that page's name, which go back there, then the tabs. E (run 25) has
	// larger icons and is the one the app shows; C and D went with #372. No arrow stands after the name any more
	// (Justin, 2026-11-16). No save cloud here: it is in the header.
	// Run 24 (Justin, 2026-11-11: "the folder icon moves and it shouldn't", "it just jumps in"): it moves the way A
	// does. The first icon keeps a fifth of the bar, the place Projects has on the dashboard, so it never moves; the
	// other four pages slide off to the left behind it while the name and the tabs slide in from the right, and the
	// blue highlight follows the panes as they are swiped.
	// Run 28 (Justin, 2026-11-12: on a desktop "it still has the old view"): an open project on a desktop shows this
	// same bar, centred in the room beside the panels, with Page and Preview (Edit is the panels' own column there).
	// A desktop's dashboard has the sidebar for the pages, so no bar.
	import { tick, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { DATASETS, PAGE_ICONS, PAGES, type DatasetType } from '../look.data';
	import type { LookState, TabType } from '../look.state.svelte';
	import { Button, Tabs } from '@layerd/ui';

	let {
		look,
		isWide,
		left
	}: {
		look: LookState;
		isWide: boolean;
		left: string;
	} = $props();

	const TABS = { page: 'Page', edit: 'Edit', preview: 'Preview' };
	const PROJECT: TabType[] = ['page', 'edit', 'preview'];
	const RECORD: TabType[] = ['page', 'edit'];
	// The page on show on the dashboard: its icon is white, on a pill as wide as its place in the bar, in the Add
	// button's blue (Justin, 2026-11-16: a circle "doesn't look right"). It slides from page to page.
	const ON = 'text-white';
	const SLIDE =
		'absolute inset-y-0 right-0 flex items-center transition-[transform,opacity] duration-300 ease-out';

	const isInside = $derived(look.screen !== 'dashboard');
	// On a desktop the bar shows inside a project, a record or the Organization, with the same tabs a phone has
	// (Justin, 2026-11-16: Page, Edit and Preview are three views, never Edit beside another). Nothing is swiped
	// there: a tab is picked.
	const isDesk = $derived(isWide && isInside);
	const shown = $derived(look.tab);
	const ICON_SIZE = 'size-7';
	// What is open decides the bar, never the list last visited (`look.place`).
	const home = $derived(look.place);
	// The far left: Projects on the dashboard; inside, the page of what is open.
	const lead = $derived(isInside ? home : PAGES[0]);
	// Inside the Organization the bar shows its own icon and name. The icon and name are those of the last thing
	// opened, so they do not change while they slide away.
	const ORGANIZATION = { name: 'Organization', icon: 'icon-[mdi--domain]' };
	// The Activity (#306) is one view, so it has no tabs.
	const ACTIVITY = { name: 'Activity', icon: 'icon-[mdi--timeline-clock-outline]' };
	let inside = $state({ name: DATASETS[PAGES[0]].label, icon: PAGE_ICONS[PAGES[0]] });
	const leadIcon = $derived(isInside ? inside.icon : PAGE_ICONS[lead]);
	const isLeadOn = $derived(isInside || look.navSection === lead);
	// The tabs of the last thing opened, so they do not change while they slide away.
	let tabs = $state(PROJECT);
	let mark = $state({ x: 0, width: 0 });
	let bar: HTMLElement | undefined = $state();
	// The pill: where it starts along the bar, how wide it is, and whether a page is on show for it to sit under.
	let seat = $state({ x: 0, width: 0, isOn: false, isMoving: false });

	// Under the icon of the page on show. Measured from the layout, which a layer's slide does not move. Inside a
	// project or a record there is no pill: the pages' layer has slid away, and its page would still count as on
	// show (the pill sat behind the record's own icon, Justin, 2026-11-16).
	function sit() {
		const on = bar?.querySelector<HTMLElement>('[aria-current="page"]');
		if (isInside || !on) return (seat = { ...seat, isOn: false });
		let x = 0;
		for (
			let box: HTMLElement | null = on;
			box && box !== bar;
			box = box.offsetParent as HTMLElement | null
		)
			x += box.offsetLeft;
		// It slides between pages, but is simply there the first time and when it comes back.
		seat = { x, width: on.offsetWidth, isOn: true, isMoving: seat.isOn };
	}

	$effect(() => {
		void look.navSection;
		void isInside;
		void bar;
		void tick().then(sit);
	});

	$effect(() => {
		if (look.screen === 'record' || look.screen === 'settings') tabs = RECORD;
		else if (look.screen === 'workspace') tabs = PROJECT;
		else if (look.screen === 'activity') tabs = [];
	});

	$effect(() => {
		if (look.screen === 'settings') inside = ORGANIZATION;
		else if (look.screen === 'activity') inside = ACTIVITY;
		else if (isInside) inside = { name: DATASETS[home].label, icon: PAGE_ICONS[home] };
	});

	// The blue highlight sits under its tab and follows the panes as they are swiped.
	function place() {
		const boxes = [...(bar?.querySelectorAll<HTMLElement>('[data-tab]') ?? [])];
		if (boxes.length < 2) return;
		const at = isDesk
			? Math.max(0, tabs.indexOf(shown))
			: Math.min(boxes.length - 1, Math.max(0, look.tabProgress));
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
		void shown;
		void tabs;
		void bar;
		untrack(place);
	});

	function go(id: DatasetType) {
		if (!isInside) return look.pick(id);
		look.home();
		// Back from a record opened by a project's pencil lands in that project, and stays there.
		if (look.screen === 'dashboard' && look.dataset !== id) look.pick(id);
	}
</script>

<svelte:window
	onresize={() => {
		place();
		sit();
	}}
/>

{#if !isWide || isDesk}
	<nav
		class="fixed z-[55] flex h-14 items-center rounded-full bg-black px-1.5 text-white {isDesk
			? 'bottom-6 w-[26rem] -translate-x-1/2'
			: 'inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+14px)]'}"
		style:left={isDesk ? left : undefined}
		aria-label={isInside ? 'Project' : 'Pages'}
		bind:this={bar}
	>
		<span
			class="pointer-events-none absolute top-1/2 left-0 h-11 -translate-y-1/2 rounded-full bg-primary ease-out {seat.isMoving
				? 'transition-[transform,width,opacity] duration-300'
				: 'transition-opacity duration-200'} {seat.isOn ? '' : 'opacity-0'}"
			style="width: {seat.width}px; transform: translateX({seat.x}px)"
			aria-hidden="true"
		></span>
		<!-- A fifth of the bar, where Projects sits on the dashboard: this icon never moves. -->
		<button
			class="relative flex h-11 shrink-0 basis-1/5 items-center justify-center rounded-full transition-colors {isLeadOn
				? isInside
					? 'text-white'
					: ON
				: 'text-white/45 hover:text-white/70'}"
			aria-label={isInside ? `Back to ${DATASETS[lead].label}` : DATASETS[lead].label}
			aria-current={isLeadOn && !isInside ? 'page' : undefined}
			title={isInside ? inside.name : DATASETS[lead].label}
			onclick={() => go(lead)}
		>
			{#key leadIcon}<span
					class="{leadIcon} {ICON_SIZE}"
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
							? ON
							: 'text-white/45 hover:text-white/70'}"
						aria-label={DATASETS[id].label}
						aria-current={isOn ? 'page' : undefined}
						title={DATASETS[id].label}
						onclick={() => go(id)}><span class="{PAGE_ICONS[id]} {ICON_SIZE}"></span></button
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
					aria-label="Back to {DATASETS[lead].label}"
					onclick={() => go(lead)}
				>
					<span class="truncate text-[13px] font-semibold">{inside.name}</span>
				</button>
				<Tabs
					class="relative ml-auto flex shrink-0 items-center"
					label={tabs.map((tab) => TABS[tab]).join(' or ')}
					options={tabs}
					bind:value={look.tab}
				>
					{#if tabs.length}<span
							class="absolute inset-y-0 left-0 rounded-full bg-primary"
							style="width: {mark.width}px; transform: translateX({mark.x}px)"
							aria-hidden="true"
						></span>{/if}
					{#snippet option({ value: tab, isOn, props })}
						<button
							{...props}
							class="relative flex h-11 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors {isOn
								? 'text-white'
								: 'text-white/60 hover:text-white'}"
							data-tab={tab}>{TABS[tab]}</button
						>
					{/snippet}
				</Tabs>
			</div>
		</div>
	</nav>
{/if}
{#if !isWide}
	<!-- Flush with the bar's right edge, and as far over the bar as the bar is over the bottom. Inside, it goes. -->
	<div
		class="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[55] transition duration-300 ease-out {isInside
			? 'pointer-events-none scale-50 opacity-0'
			: ''}"
		inert={isInside}
	>
		<Button
			primary
			heavy
			xl
			icon="icon-[mdi--plus]"
			aria-label="Add"
			title="Add a Project, Customer, Team, Transport Mode or Facility"
			onclick={() => (look.adding = look.dataset)}
		/>
	</div>
{/if}

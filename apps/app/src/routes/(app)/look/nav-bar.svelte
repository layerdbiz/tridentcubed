<script lang="ts">
	// PROTOTYPE (#161) run 11: one floating bar at the bottom (Justin, 2026-10-26 19:22). On the dashboard it holds the
	// five pages and a blue + that adds anything (add-sheet.svelte). Open a project and the pages slide off to the
	// left behind the Projects icon, which stays at the far left and goes back; the save cloud with Panels and Preview
	// slide in behind them, and the + goes. It stays one bar the whole time: it narrows or widens, it never jumps. A
	// desktop project has its panels in their own column, so there the bar shows on the dashboard only. Run 12
	// (2026-11-07): Panels is called Edit; a customer, team member, transport or facility opens the same way, with Page
	// and Edit, and the icon at the far left is the page it came from, so it leads back there. Run 13 (2026-11-07): a
	// project has Page, Edit and Preview; the icons are filled everywhere, and the page on show just turns white, with
	// no circle behind it. A desktop project keeps Edit in its column, so its bar shows there too, with Page and Preview.
	// Run 14 (note 11): that desktop project is the only place a desktop shows the bar; its dashboard has the sidebar
	// for the pages and a + of its own at the bottom right (shell.svelte).
	import { untrack } from 'svelte';
	import { DATASETS, PAGE_ICONS, PAGES, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import SaveCloud from './save-cloud.svelte';
	import { fade } from 'svelte/transition';

	let {
		look,
		left = '50%',
		isWide = false,
		isFlat = false
	}: { look: LookState; left?: string; isWide?: boolean; isFlat?: boolean } = $props();

	const PROJECT_TABS = [
		['page', 'Page'],
		['edit', 'Edit'],
		['preview', 'Preview']
	] as const;
	const DESK_TABS = [
		['page', 'Page'],
		['preview', 'Preview']
	] as const;
	const RECORD_TABS = [
		['page', 'Page'],
		['edit', 'Edit']
	] as const;
	const BUTTON =
		'relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors';
	// A group that folds to nothing and back: its one column runs from 0fr to 1fr.
	const FOLD = 'grid transition-[grid-template-columns,opacity] duration-300 ease-out';

	const isProject = $derived(look.screen !== 'dashboard');
	const isDesk = $derived(isWide && look.screen === 'workspace');
	const tabs = $derived(look.screen === 'record' ? RECORD_TABS : isDesk ? DESK_TABS : PROJECT_TABS);
	// On a desktop project nothing is swiped: Edit is always there, and the main part shows Page or Preview.
	const shown = $derived(isDesk && look.tab === 'edit' ? 'preview' : look.tab);
	let nav: HTMLElement | undefined = $state();
	let mark = $state({ x: 0, width: 0 });

	function boxOf(selector: string) {
		const item = nav?.querySelector<HTMLElement>(selector);
		if (!item || !nav) return;
		const outer = nav.getBoundingClientRect();
		const inner = item.getBoundingClientRect();
		return { x: inner.left - outer.left, width: inner.width };
	}

	// In a project or a record the blue highlight sits under its tab, following the panes as they are swiped. On the
	// dashboard there is none: the page on show is the white icon.
	function place() {
		if (!isProject) {
			mark = boxOf(`[data-page="${look.navSection}"]`) ?? mark;
			return;
		}
		const boxes = tabs.map(([tab]) => boxOf(`[data-tab="${tab}"]`));
		if (boxes.some((box) => !box)) return;
		const at = isDesk
			? tabs.findIndex(([tab]) => tab === shown)
			: Math.min(tabs.length - 1, Math.max(0, look.tabProgress));
		const from = Math.min(tabs.length - 2, Math.floor(at));
		const [a, b] = [boxes[from]!, boxes[from + 1]!];
		const part = at - from;
		mark = { x: a.x + (b.x - a.x) * part, width: a.width + (b.width - a.width) * part };
	}

	// While the bar changes shape, the highlight is measured every frame.
	$effect(() => {
		void isProject;
		void tabs;
		void look.navSection;
		const end = performance.now() + 450;
		let frame = 0;
		function tick() {
			place();
			if (performance.now() < end) frame = requestAnimationFrame(tick);
		}
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	$effect(() => {
		void look.tabProgress;
		void shown;
		untrack(place);
	});

	function go(id: DatasetType) {
		if (!isProject) return look.pick(id);
		look.home();
		if (look.dataset !== id) look.pick(id);
	}
</script>

<svelte:window onresize={place} />

{#snippet page(id: DatasetType)}
	{@const isOn = look.navSection === id}
	<button
		class="{BUTTON} {isOn ? 'text-white' : 'text-white/45 hover:text-white/70'}"
		data-page={id}
		aria-label={DATASETS[id].label}
		aria-current={isOn ? 'page' : undefined}
		title={DATASETS[id].label}
		onclick={() => go(id)}><span class="{PAGE_ICONS[id]} size-6"></span></button
	>
{/snippet}

<!-- The far left: Projects on the dashboard; inside a project or a record, the page it came from, which it goes back to. -->
{#snippet lead()}
	{@const id = isProject ? look.dataset : PAGES[0]}
	{@const isOn = isProject || look.navSection === id}
	<button
		class="{BUTTON} {isOn ? 'text-white' : 'text-white/45 hover:text-white/70'}"
		data-page={PAGES[0]}
		aria-label={isProject ? `Back to ${DATASETS[id].label}` : DATASETS[id].label}
		aria-current={isOn && !isProject ? 'page' : undefined}
		title={DATASETS[id].label}
		onclick={() => go(id)}
	>
		{#key id}<span
				class="{PAGE_ICONS[id]} size-6"
				in:fade={{ duration: 200 }}
			></span>{/key}
	</button>
{/snippet}

<nav
	bind:this={nav}
	class="fixed bottom-[calc(env(safe-area-inset-bottom)+14px)] z-[55] flex w-max -translate-x-1/2 items-center rounded-full bg-black p-1.5 text-white {isFlat
		? ''
		: 'shadow-xl shadow-black/25'} {isDesk ? '' : 'md:hidden'}"
	style="left: {left}"
	aria-label={isProject ? 'Project' : 'Pages'}
>
	<span
		class="absolute top-1.5 bottom-1.5 left-0 rounded-full {isProject
			? 'bg-primary shadow-md shadow-primary/30'
			: 'bg-transparent transition-[transform,width,background-color] duration-300 ease-out'}"
		style="width: {mark.width}px; transform: translateX({mark.x}px)"
		aria-hidden="true"
	></span>
	{@render lead()}
	<!-- The other pages: anchored on the right, so as their column narrows they slide left, under the Projects icon. -->
	<div
		class={FOLD}
		style="grid-template-columns: {isProject ? '0fr' : '1fr'}"
		inert={isProject}
	>
		<div class="flex min-w-0 justify-end overflow-hidden">
			<div class="flex shrink-0">
				{#each PAGES.slice(1) as id (id)}{@render page(id)}{/each}
			</div>
		</div>
	</div>
	<!-- Inside a project: anchored on the left, so they follow the pages in from the right. -->
	<div
		class={FOLD}
		style="grid-template-columns: {isProject ? '1fr' : '0fr'}"
		inert={!isProject}
	>
		<div class="flex min-w-0 overflow-hidden">
			<div
				class="flex shrink-0 items-center"
				role="tablist"
				aria-label={tabs.map(([, label]) => label).join(' or ')}
			>
				<span class="flex size-9 items-center justify-center"><SaveCloud {look} /></span>
				{#each tabs as [tab, label] (tab)}
					<button
						class="relative flex h-11 items-center justify-center rounded-full px-4 text-[13px] font-medium transition-colors {shown ===
						tab
							? 'text-white'
							: 'text-white/60 hover:text-white'}"
						data-tab={tab}
						role="tab"
						aria-selected={shown === tab}
						onclick={() => (look.tab = tab)}>{label}</button
					>
				{/each}
			</div>
		</div>
	</div>
	<div
		class={FOLD}
		style="grid-template-columns: {isProject ? '0fr' : '1fr'}; opacity: {isProject ? 0 : 1}"
		inert={isProject}
	>
		<div class="flex min-w-0 overflow-hidden">
			<button
				class="ml-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/40 transition hover:brightness-110"
				aria-label="Add"
				title="Add a Project, Customer, Team, Transport Mode or Facility"
				onclick={() => (look.adding = look.dataset)}
				><span class="icon-[mdi--plus] size-7"></span></button
			>
		</div>
	</div>
</nav>

<script lang="ts">
	// PROTOTYPE (#161) run 11: one floating bar at the bottom (Justin, 2026-10-26 19:22). On the dashboard it holds the
	// five pages and a blue + that adds anything (add-sheet.svelte). Open a project and the pages slide off to the
	// left behind the Projects icon, which stays at the far left and goes back; the save cloud with Panels and Preview
	// slide in behind them, and the + goes. It stays one bar the whole time: it narrows or widens, it never jumps. A
	// desktop project has its panels in their own column, so there the bar shows on the dashboard only.
	import { untrack } from 'svelte';
	import { DATASETS, PAGE_ICONS, PAGES, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import SaveCloud from './save-cloud.svelte';

	let { look, left = '50%' }: { look: LookState; left?: string } = $props();

	const TABS = [
		['edit', 'Panels'],
		['preview', 'Preview']
	] as const;
	const BUTTON =
		'relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors';
	// A group that folds to nothing and back: its one column runs from 0fr to 1fr.
	const FOLD = 'grid transition-[grid-template-columns,opacity] duration-300 ease-out';

	const isProject = $derived(look.screen !== 'dashboard');
	let nav: HTMLElement | undefined = $state();
	let mark = $state({ x: 0, width: 0 });

	function boxOf(selector: string) {
		const item = nav?.querySelector<HTMLElement>(selector);
		if (!item || !nav) return;
		const outer = nav.getBoundingClientRect();
		const inner = item.getBoundingClientRect();
		return { x: inner.left - outer.left, width: inner.width };
	}

	// The highlight sits under the page on show, or in a project under Panels or Preview, following the panes as they
	// are swiped.
	function place() {
		if (!isProject) {
			mark = boxOf(`[data-page="${look.navSection}"]`) ?? mark;
			return;
		}
		const edit = boxOf('[data-tab="edit"]');
		const preview = boxOf('[data-tab="preview"]');
		if (!edit || !preview) return;
		const at = Math.min(1, Math.max(0, look.tabProgress));
		mark = {
			x: edit.x + (preview.x - edit.x) * at,
			width: edit.width + (preview.width - edit.width) * at
		};
	}

	// While the bar changes shape, the highlight is measured every frame.
	$effect(() => {
		void isProject;
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
		class="{BUTTON} {isOn ? 'text-white' : 'text-white/55 hover:text-white'}"
		data-page={id}
		aria-label={isProject ? `Back to ${DATASETS[id].label}` : DATASETS[id].label}
		aria-current={isOn && !isProject ? 'page' : undefined}
		title={DATASETS[id].label}
		onclick={() => go(id)}
		><span class="{isOn ? PAGE_ICONS[id].active : PAGE_ICONS[id].icon} size-6"></span></button
	>
{/snippet}

<nav
	bind:this={nav}
	class="fixed bottom-[calc(env(safe-area-inset-bottom)+14px)] z-[55] flex w-max -translate-x-1/2 items-center rounded-full bg-black p-1.5 text-white shadow-xl shadow-black/25 {isProject
		? 'md:hidden'
		: ''}"
	style="left: {left}"
	aria-label={isProject ? 'Project' : 'Pages'}
>
	<span
		class="absolute top-1.5 bottom-1.5 left-0 rounded-full {isProject
			? 'bg-primary shadow-md shadow-primary/30'
			: 'bg-white/15 transition-[transform,width,background-color] duration-300 ease-out'}"
		style="width: {mark.width}px; transform: translateX({mark.x}px)"
		aria-hidden="true"
	></span>
	{@render page(PAGES[0])}
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
				aria-label="Panels or preview"
			>
				<span class="flex size-9 items-center justify-center"><SaveCloud {look} /></span>
				{#each TABS as [tab, label] (tab)}
					<button
						class="relative flex h-11 items-center justify-center rounded-full px-4 text-[13px] font-medium transition-colors {look.tab ===
						tab
							? 'text-white'
							: 'text-white/60 hover:text-white'}"
						data-tab={tab}
						role="tab"
						aria-selected={look.tab === tab}
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
				title="Add a project, customer, team member, transport or facility"
				onclick={() => (look.adding = look.dataset)}
				><span class="icon-[mdi--plus] size-7"></span></button
			>
		</div>
	</div>
</nav>

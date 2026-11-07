<script lang="ts">
	// PROTOTYPE (#161) run 12: the four menus over every page's list, the same on all five (Justin's run 12 notes 2
	// and 4): chart type, time range, view and filter, as plain icons with no ring and no background. They stay put
	// while a page swipe slides the title and the list under them (note 3; shell.svelte). The filter offers the page's
	// labels, the same as its board's columns and its pie's slices.
	import { CHART_KINDS, RANGE_NAMES, RANGES, type ChartKindType } from './chart.data';
	import { DATASETS } from './look.data';
	import type { LookState, ViewType } from './look.state.svelte';
	import Menu from './menu.svelte';
	import { columnsOf, countOf } from './records.data';

	let { look }: { look: LookState } = $props();

	const VIEWS = [
		{ id: 'table', label: 'List', icon: 'icon-[mdi--format-list-bulleted]' },
		{ id: 'cards', label: 'Cards', icon: 'icon-[mdi--view-grid-outline]' },
		{ id: 'board', label: 'Board', icon: 'icon-[mdi--view-column-outline]' }
	];
	const GHOST =
		'relative flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/[0.05] hover:text-slate-900';

	const kind = $derived(CHART_KINDS.find((item) => item.id === look.chart)!);
	const range = $derived(RANGES.find((item) => item.id === look.range)!);
	const filters = $derived([
		{
			id: 'All',
			label: `All ${DATASETS[look.dataset].label.toLowerCase()}`,
			count: countOf(look, look.dataset)
		},
		...columnsOf(look, look.dataset).map((column) => ({
			id: column.label,
			label: column.label,
			dot: column.tone.bg,
			count: countOf(look, look.dataset, column.label)
		}))
	]);
</script>

<div class="flex shrink-0 items-center">
	<Menu
		label="Chart type"
		value={look.chart}
		options={CHART_KINDS.map((item) => ({ id: item.id, label: item.label, icon: item.icon }))}
		onpick={(id) => (look.chart = id as ChartKindType)}
	>
		{#snippet trigger()}
			<span
				class={GHOST}
				title="Chart: {kind.label}"><span class="{kind.icon} size-[22px]"></span></span
			>
		{/snippet}
	</Menu>
	<Menu
		label="Time range"
		value={look.range}
		options={RANGES.map((item) => ({ id: item.id, label: RANGE_NAMES[item.id] }))}
		onpick={(id) => (look.range = id as typeof look.range)}
	>
		{#snippet trigger()}
			<span
				class={GHOST}
				title="Time range: {RANGE_NAMES[look.range]}"
				><span class="text-xs font-bold tracking-tight tabular-nums">{range.label}</span></span
			>
		{/snippet}
	</Menu>
	<Menu
		label="View"
		value={look.view}
		options={VIEWS}
		onpick={(id) => (look.view = id as ViewType)}
	>
		{#snippet trigger(current)}
			<span
				class={GHOST}
				title="View: {current?.label}"><span class="{current?.icon} size-[22px]"></span></span
			>
		{/snippet}
	</Menu>
	<Menu
		label="Filter"
		value={look.filter}
		options={filters}
		onpick={(id) => (look.filter = id)}
	>
		{#snippet trigger(current)}
			<span
				class="{GHOST} {look.filter === 'All' ? '' : 'text-primary'}"
				title="Filter: {current?.label}"
			>
				<span class="icon-[mdi--filter-variant] size-[22px]"></span>
				{#if current?.dot}
					<span
						class="absolute top-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-white {current.dot}"
					></span>
				{/if}
			</span>
		{/snippet}
	</Menu>
</div>

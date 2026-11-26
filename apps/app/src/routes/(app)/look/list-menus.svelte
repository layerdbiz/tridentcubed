<script lang="ts">
	// PROTOTYPE (#161) run 12: the four menus over every page's list, the same on all five (Justin's run 12 notes 2
	// and 4): chart type, time range, view and filter, as plain icons with no ring and no background. They stay put
	// while a page swipe slides the title and the list under them (note 3; shell.svelte). The filter offers the page's
	// labels, the same as its board's columns and its pie's slices.
	import { CHART_KINDS, RANGE_NAMES, RANGES, type ChartKindType } from './chart.data';
	import { DATASETS } from './look.data';
	import type { LookState, ViewType } from './look.state.svelte';
	import { Menu, type MenuOptionType } from '@layerd/ui';
	import { columnsOf, countOf } from './records.data';

	let { look }: { look: LookState } = $props();

	const VIEWS = [
		{ id: 'table', label: 'List', icon: 'icon-[mdi--format-list-bulleted]' },
		{ id: 'cards', label: 'Cards', icon: 'icon-[mdi--view-grid-outline]' },
		{ id: 'board', label: 'Board', icon: 'icon-[mdi--view-column-outline]' }
	];
	// Each menu hangs from the library Button, a black icon on no shape (the type picked on #386); the time range
	// shows its words in the same round place.
	const ROUND = { secondary: true, ghost: true, md: true };
	const GHOST =
		'relative flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/[0.05] hover:text-slate-900';

	const kind = $derived(CHART_KINDS.find((item) => item.id === look.chart)!);
	const range = $derived(RANGES.find((item) => item.id === look.range)!);
	const view = $derived(VIEWS.find((item) => item.id === look.view) ?? VIEWS[0]);
	const filters = $derived<MenuOptionType[]>([
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
	const filter = $derived(filters.find((item) => item.id === look.filter));
</script>

<div class="flex shrink-0 items-center">
	<Menu
		label="Chart type"
		value={look.chart}
		options={CHART_KINDS.map((item) => ({ id: item.id, label: item.label, icon: item.icon }))}
		onpick={(id) => (look.chart = id as ChartKindType)}
		button={{ ...ROUND, icon: kind.icon, title: `Chart: ${kind.label}` }}
	/>
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
		button={{ ...ROUND, icon: view.icon, title: `View: ${view.label}` }}
	/>
	<!-- A filter picked turns its icon blue, with the label's dot at its corner. -->
	<div class="relative">
		<Menu
			label="Filter"
			value={look.filter}
			options={filters}
			onpick={(id) => (look.filter = id)}
			button={{
				...ROUND,
				secondary: look.filter === 'All',
				primary: look.filter !== 'All',
				icon: 'icon-[mdi--filter-variant]',
				title: `Filter: ${filter?.label}`
			}}
		/>
		{#if filter?.dot}
			<span
				class="pointer-events-none absolute top-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-white {filter.dot}"
			></span>
		{/if}
	</div>
</div>

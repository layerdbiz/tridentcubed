<script lang="ts">
	// PROTOTYPE (#161): the count tiles (run 3: counts, not statuses). Projects is first and blue by default; picking
	// a tile switches the chart and the list to it. Equal widths, never a sideways scroll.
	import { chartOf } from './chart.data';
	import { CLIENTS, DATASETS, PEOPLE, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';

	let {
		look,
		sets = ['projects', 'clients', 'team'],
		style = 'stack'
	}: { look: LookState; sets?: DatasetType[]; style?: 'stack' | 'compact' | 'spark' } = $props();

	function countOf(dataset: DatasetType) {
		if (dataset === 'projects') return look.projects.length;
		if (dataset === 'clients') return CLIENTS.length;
		if (dataset === 'team') return PEOPLE.length;
		return new Set(look.projects.map((project) => project.facility)).size;
	}

	function sparkOf(dataset: DatasetType) {
		const data = chartOf(dataset, '30d', look.projects, 'All');
		const totals = data.labels.map((_, at) =>
			data.series.reduce((sum, series) => sum + series.values[at], 0)
		);
		const max = Math.max(1, ...totals);
		return totals
			.map((value, at) => `${(at / (totals.length - 1)) * 100},${22 - (value / max) * 18}`)
			.join(' ');
	}
</script>

<div
	class="grid gap-2 md:gap-3 {sets.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}"
	role="tablist"
	aria-label="What to count"
>
	{#each sets as dataset (dataset)}
		{@const info = DATASETS[dataset]}
		{@const isOn = look.dataset === dataset}
		<button
			type="button"
			role="tab"
			aria-selected={isOn}
			class="min-w-0 transition duration-200 {style === 'compact' ? '' : 'text-left'} {style ===
			'spark'
				? `rounded-2xl p-3 ${isOn ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-900/[0.03] text-slate-700 hover:bg-slate-900/[0.06]'}`
				: `rounded-3xl ${isOn ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-slate-700 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_24px_-18px_rgb(15_23_42/0.3)] hover:-translate-y-0.5'}`} {style ===
			'compact'
				? 'flex flex-col items-center px-1 py-3 text-center md:flex-row md:gap-3 md:px-4 md:text-left'
				: style === 'stack'
					? 'p-3 md:p-4'
					: ''}"
			onclick={() => look.pick(dataset)}
		>
			{#if style === 'compact'}
				<span
					class="flex shrink-0 items-center justify-center md:size-11 md:rounded-2xl {isOn
						? 'md:bg-white/20'
						: 'md:bg-primary/10'}"
					><span
						class="{isOn ? info.active : info.icon} size-6 {isOn ? 'text-white' : 'text-primary'}"
					></span></span
				>
				<span class="flex w-full min-w-0 flex-col md:w-auto">
					<span class="mt-1 text-xl leading-tight font-semibold tabular-nums md:mt-0 md:text-2xl"
						>{countOf(dataset)}</span
					>
					<span
						class="w-full truncate text-[11px] font-medium md:text-xs {isOn
							? 'text-white/80'
							: 'text-slate-500'}">{info.label}</span
					>
				</span>
			{:else}
				<span class="flex items-center justify-between gap-1">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-full {isOn
							? 'bg-white/20'
							: 'bg-primary/10 text-primary'}"
						><span class="{isOn ? info.active : info.icon} size-5"></span></span
					>
					<span class="text-2xl font-semibold tabular-nums md:text-3xl">{countOf(dataset)}</span>
				</span>
				<span
					class="mt-2 block truncate text-xs font-medium {isOn
						? 'text-white/85'
						: 'text-slate-500'}">{info.label}</span
				>
				{#if style === 'spark'}
					<svg
						viewBox="0 0 100 24"
						preserveAspectRatio="none"
						class="mt-2 h-6 w-full overflow-visible"
						aria-hidden="true"
						><polyline
							points={sparkOf(dataset)}
							class="fill-none {isOn ? 'stroke-white' : 'stroke-primary'}"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							vector-effect="non-scaling-stroke"
						/></svg
					>
				{/if}
			{/if}
		</button>
	{/each}
</div>

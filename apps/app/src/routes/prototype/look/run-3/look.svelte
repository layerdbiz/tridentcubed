<script lang="ts">
	// PROTOTYPE (#161) run 3 (commit 798ea9c, from Justin's 26 notes on run 2): D "One surface", E "White frame",
	// F "Floating canvas". All three carry every note; they differ only where he left a question open (white bars or
	// not, how the filter sits by the view icons, the chart's place, the Recent icons, where the QR goes).
	// Also ?screen=workspace, ?tab=preview, ?project=p2, ?panel=timelog, ?view=cards, ?set=clients, ?range=1y and
	// ?chart=bar, so any state can be linked and screenshotted.
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { ChartKindType, RangeType } from './chart.data';
	import type { DatasetType } from './look.data';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import VariantD from './variant-d.svelte';
	import VariantE from './variant-e.svelte';
	import VariantF from './variant-f.svelte';

	let {
		id,
		variant,
		onready
	}: { id: string; variant: string; onready: (look: LookState) => void } = $props();

	// Each variant opens on a different chart, so all three get seen; the switch inside the chart changes it.
	const CHARTS: Record<string, ChartKindType> = { D: 'area', E: 'bar', F: 'donut' };

	const params = page.url.searchParams;
	const look = new LookState();
	look.tab = (params.get('tab') as TabType) ?? 'edit';
	look.view = (params.get('view') as ViewType) ?? 'table';
	if (params.get('project')) look.open(params.get('project')!);
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	if (params.has('panel')) look.panelId = params.get('panel')!;
	if (params.has('set')) look.pick(params.get('set') as DatasetType);
	if (params.has('range')) look.range = params.get('range') as RangeType;
	// svelte-ignore state_referenced_locally
	let shown = variant;
	look.chart = (params.get('chart') as ChartKindType) ?? CHARTS[shown];
	// svelte-ignore state_referenced_locally
	onready(look);

	$effect(() => {
		if (variant === shown) return;
		shown = variant;
		look.chart = CHARTS[variant];
	});

	$effect(() => {
		const url = new URL(page.url.href);
		url.searchParams.set('variant', id);
		url.searchParams.set('screen', look.screen);
		url.searchParams.set('tab', look.tab);
		url.searchParams.set('view', look.view);
		url.searchParams.set('project', look.projectId);
		url.searchParams.set('set', look.dataset);
		url.searchParams.set('range', look.range);
		url.searchParams.set('chart', look.chart);
		if (url.search !== page.url.search) goto(url, { shallow: true, replace: true });
	});
</script>

<div class="font-sans text-slate-900 [color-scheme:light]">
	{#if variant === 'D'}
		<VariantD {look} />
	{:else if variant === 'E'}
		<VariantE {look} />
	{:else}
		<VariantF {look} />
	{/if}
</div>

{#if look.toast}
	<div
		class="fixed inset-x-0 bottom-28 z-[90] flex justify-center px-4 md:bottom-20"
		transition:fly={{ y: 16, duration: 200 }}
	>
		<p class="rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{look.toast}</p>
	</div>
{/if}

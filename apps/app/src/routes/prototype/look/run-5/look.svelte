<script lang="ts">
	// PROTOTYPE (#161) run 5: looks A and B, from Justin's 29 notes on look G (design/161-look/run-5-notes.md). A is G
	// with every fix; B also folds the first panels into one Project panel and has a one-line project header. Also ?screen=workspace, ?tab=preview, ?project=p2,
	// ?panel=timelog, ?view=cards, ?set=clients, ?range=1y and ?chart=bar, so any state can be linked and screenshotted.
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { ChartKindType, RangeType } from './chart.data';
	import type { DatasetType, VariantType } from './look.data';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import Shell from './shell.svelte';

	let {
		id,
		variant,
		onready
	}: { id: string; variant: VariantType; onready: (look: LookState) => void } = $props();

	const params = page.url.searchParams;
	// svelte-ignore state_referenced_locally
	const look = new LookState(variant);
	look.tab = (params.get('tab') as TabType) ?? 'edit';
	look.view = (params.get('view') as ViewType) ?? 'table';
	if (params.get('project')) look.open(params.get('project')!);
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	if (look.panels.some((panel) => panel.id === params.get('panel')))
		look.panelId = params.get('panel')!;
	if (params.has('set')) look.pick(params.get('set') as DatasetType);
	if (params.has('range')) look.range = params.get('range') as RangeType;
	if (params.has('chart')) look.chart = params.get('chart') as ChartKindType;
	// svelte-ignore state_referenced_locally
	onready(look);

	$effect(() => look.use(variant));

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
		url.searchParams.set('panel', look.panelId);
		if (url.search !== page.url.search) goto(url, { shallow: true, replace: true });
	});
</script>

<div class="font-sans text-slate-900 [color-scheme:light]">
	<Shell {look} />
</div>

{#if look.toast}
	<div
		class="fixed inset-x-0 bottom-28 z-[90] flex justify-center px-4 md:bottom-20"
		transition:fly={{ y: 16, duration: 200 }}
	>
		<p class="rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{look.toast}</p>
	</div>
{/if}

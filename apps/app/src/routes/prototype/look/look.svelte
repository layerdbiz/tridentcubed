<script lang="ts">
	// PROTOTYPE (#161): variants of the Report Generator shell, switchable with ?variant=D|E|F.
	// Also ?screen=workspace, ?tab=preview, ?project=p2, ?panel=timelog, ?view=cards, ?set=clients, ?range=1y and
	// ?chart=bar, so any state can be linked and screenshotted.
	// Run 3 (from Justin's 26 notes on run 2): all three carry every note; they differ only where he left a question
	// open (white bars or not, how the filter sits by the view icons, the chart's place, the Recent icons, where the
	// QR goes). Run 2's A and B live in this branch's history (commit 7914de2).
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { ChartKindType, RangeType } from './chart.data';
	import type { DatasetType } from './look.data';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import Switcher from './switcher.svelte';
	import VariantD from './variant-d.svelte';
	import VariantE from './variant-e.svelte';
	import VariantF from './variant-f.svelte';

	const VARIANTS = ['D', 'E', 'F'];
	const NAMES: Record<string, string> = {
		D: 'One surface',
		E: 'White frame',
		F: 'Floating canvas'
	};
	// Each variant opens on a different chart, so all three get seen; the switch inside the chart changes it.
	const CHARTS: Record<string, ChartKindType> = { D: 'area', E: 'bar', F: 'donut' };

	const params = page.url.searchParams;
	let variant = $state(
		VARIANTS.includes(params.get('variant') ?? '') ? params.get('variant')! : 'D'
	);
	const look = new LookState();
	look.tab = (params.get('tab') as TabType) ?? 'edit';
	look.view = (params.get('view') as ViewType) ?? 'table';
	if (params.get('project')) look.open(params.get('project')!);
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	if (params.has('panel')) look.panelId = params.get('panel')!;
	if (params.has('set')) look.pick(params.get('set') as DatasetType);
	if (params.has('range')) look.range = params.get('range') as RangeType;
	look.chart = (params.get('chart') as ChartKindType) ?? CHARTS[variant];

	function change(next: string) {
		variant = next;
		look.chart = CHARTS[next];
	}

	$effect(() => {
		const url = new URL(page.url.href);
		url.searchParams.set('variant', variant);
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

<svelte:head><title>Look {variant} · Prototype</title></svelte:head>

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

<Switcher
	variants={VARIANTS}
	current={variant}
	names={NAMES}
	onchange={change}
/>

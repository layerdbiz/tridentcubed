<script lang="ts">
	// PROTOTYPE (#161): look B, first built in run 5 from Justin's notes on look G (design/161-look/run-5-notes.md), with one Project
	// panel and a one-line project header; since 2026-10-25 with Transport (once Carrier) and the Transport and
	// Facilities pages. ?screen=workspace, ?tab=preview, ?project=p2, ?panel=timelog, ?view=cards, ?set=transport,
	// ?range=1y and ?chart=bar link to any state, for screenshots. Throwaway: lives on a prototype/161-look-* branch.
	import './look.css';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { ChartKindType, RangeType } from './chart.data';
	import { PAGES, type DatasetType } from './look.data';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import Confirm from './confirm.svelte';
	import type { PageType } from './records.data';
	import PrototypePicker from './prototype-picker.svelte';
	import Shell from './shell.svelte';
	import StatusSheet from './status-sheet.svelte';
	import { formatPicks, parsePicks } from './variants.data';

	let { onready }: { onready: (look: LookState) => void } = $props();

	const params = page.url.searchParams;
	const look = new LookState();
	look.tab = (params.get('tab') as TabType) ?? 'page';
	look.view = (params.get('view') as ViewType) ?? 'table';
	if (params.get('project')) look.open(params.get('project')!, look.tab);
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	if (look.panels.some((panel) => panel.id === params.get('panel')))
		look.panelId = params.get('panel')!;
	// Old links said ?set=clients (Customers since run 11); anything unknown stays on Projects.
	const set = params.get('set')?.replace('clients', 'customers') as DatasetType | undefined;
	if (set && PAGES.includes(set)) look.pick(set);
	// ?screen=record&record=customers:KOGA opens a record's own page (run 12).
	const [recordPage, ...recordKey] = (params.get('record') ?? '').split(':');
	if (look.screen === 'record') {
		const page = recordPage as PageType;
		if (PAGES.slice(1).includes(page) && look.has(page, recordKey.join(':')))
			look.openRecord(page, recordKey.join(':'), look.tab);
		else look.screen = 'dashboard';
	}
	if (params.has('range')) look.range = params.get('range') as RangeType;
	if (params.has('chart')) look.chart = params.get('chart') as ChartKindType;
	// ?v=cover:B,sidebar:C picks each part's look (run 20). A link without it opens the mix this browser used last.
	const PICKS = 'trident-look-161-variants';
	look.variants = parsePicks(
		params.get('v') ?? (typeof localStorage === 'undefined' ? null : localStorage.getItem(PICKS))
	);
	// svelte-ignore state_referenced_locally
	onready(look);

	$effect(() => {
		const url = new URL(page.url.href);
		url.searchParams.delete('variant');
		url.searchParams.set('screen', look.screen);
		url.searchParams.set('tab', look.tab);
		url.searchParams.set('view', look.view);
		url.searchParams.set('project', look.projectId);
		url.searchParams.set('set', look.dataset);
		url.searchParams.set('range', look.range);
		url.searchParams.set('chart', look.chart);
		url.searchParams.set('panel', look.panelId);
		const picks = formatPicks(look.variants);
		if (picks) url.searchParams.set('v', picks);
		else url.searchParams.delete('v');
		localStorage.setItem(PICKS, picks);
		if (look.screen === 'record' && look.record)
			url.searchParams.set('record', `${look.record.page}:${look.record.key}`);
		else url.searchParams.delete('record');
		if (url.search !== page.url.search) goto(url, { shallow: true, replace: true });
	});
</script>

<div class="look font-sans text-slate-900 [color-scheme:light]">
	<Shell {look} />
	<PrototypePicker {look} />
	<StatusSheet {look} />
	<Confirm {look} />
</div>

{#if look.toast}
	<div
		class="fixed inset-x-0 bottom-28 z-[90] flex justify-center px-4 md:bottom-20"
		transition:fly={{ y: 16, duration: 200 }}
	>
		<p class="rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{look.toast}</p>
	</div>
{/if}

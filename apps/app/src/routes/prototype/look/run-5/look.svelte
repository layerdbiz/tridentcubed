<script lang="ts">
	// PROTOTYPE (#161) run 5: look B, from Justin's notes on look G (design/161-look/run-5-notes.md), with one Project
	// panel and a one-line project header; since 2026-10-25 with Transport (once Carrier) and the Transport and
	// Facilities pages. ?screen=workspace, ?tab=preview, ?project=p2, ?panel=timelog, ?view=cards, ?set=transport,
	// ?range=1y and ?chart=bar link to any state, for screenshots. Throwaway: lives on a prototype/161-look-* branch.
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { ChartKindType, RangeType } from './chart.data';
	import type { DatasetType } from './look.data';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import Confirm from './confirm.svelte';
	import Shell from './shell.svelte';

	let { onready }: { onready: (look: LookState) => void } = $props();

	const params = page.url.searchParams;
	const look = new LookState();
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
		if (url.search !== page.url.search) goto(url, { shallow: true, replace: true });
	});
</script>

<div class="font-sans text-slate-900 [color-scheme:light]">
	<Shell {look} />
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

<style>
	/* A barge in mdi's filled style (none of the icon sets has one): cargo on a flat hull over mdi's ferry waves, drawn
	   for Justin's note of 2026-10-25. Masked like the icon-[…] classes, so `icon-barge size-5` works anywhere. */
	@layer components {
		:global(.icon-barge) {
			display: inline-block;
			background-color: currentColor;
			--svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 6.5h7V11H4zm8.5 1.5H20v3h-7.5zM2 12h20l-1.95 7H20c-1.6 0-3-.88-4-2c-1 1.12-2.4 2-4 2s-3-.88-4-2c-1 1.12-2.4 2-4 2h-.06zm18 9c-1.39 0-2.78-.47-4-1.33c-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.37 0 2.74-.35 4-1c2.5 1.3 5.5 1.3 8 0c1.26.65 2.62 1 4 1h2v-2z'/%3E%3C/svg%3E");
			-webkit-mask: var(--svg) no-repeat center / 100% 100%;
			mask: var(--svg) no-repeat center / 100% 100%;
		}
	}
</style>

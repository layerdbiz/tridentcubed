<script lang="ts">
	// PROTOTYPE (#161) run 2 (commit 7914de2): C was dropped, and A and B carry everything the app prototype does
	// (progress, panel controls, photos, time log, live preview with page numbers).
	// Also ?screen=workspace, ?tab=preview and ?project=p2, so any state can be linked and screenshotted.
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import VariantA from './variant-a.svelte';
	import VariantB from './variant-b.svelte';

	let {
		id,
		variant,
		onready
	}: { id: string; variant: string; onready: (look: LookState) => void } = $props();

	const params = page.url.searchParams;
	const look = new LookState();
	look.tab = (params.get('tab') as TabType) ?? 'edit';
	look.view = (params.get('view') as ViewType) ?? 'table';
	if (params.get('project')) look.open(params.get('project')!);
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	if (params.has('panel')) look.panelId = params.get('panel')!;
	// svelte-ignore state_referenced_locally
	onready(look);

	$effect(() => {
		const url = new URL(page.url.href);
		url.searchParams.set('variant', id);
		url.searchParams.set('screen', look.screen);
		url.searchParams.set('tab', look.tab);
		url.searchParams.set('view', look.view);
		url.searchParams.set('project', look.projectId);
		if (url.search !== page.url.search) goto(url, { shallow: true, replace: true });
	});
</script>

<div class="font-sans text-slate-900 [color-scheme:light]">
	{#if variant === 'A'}
		<VariantA {look} />
	{:else}
		<VariantB {look} />
	{/if}
</div>

{#if look.toast}
	<div
		class="fixed inset-x-0 bottom-24 z-[90] flex justify-center px-4 md:bottom-20"
		transition:fly={{ y: 16, duration: 200 }}
	>
		<p class="rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{look.toast}</p>
	</div>
{/if}

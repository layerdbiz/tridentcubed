<script lang="ts">
	// PROTOTYPE (#161) run 1 (commit 9af0a9a): three shells, A "ScavengerBot rail", B "AI-app sidebar", C "Floating".
	// Also ?screen=workspace and ?tab=preview, so any state can be linked and screenshotted.
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import VariantA from './variant-a.svelte';
	import VariantB from './variant-b.svelte';
	import VariantC from './variant-c.svelte';

	let {
		id,
		variant,
		onready
	}: { id: string; variant: string; onready: (look: LookState) => void } = $props();

	const params = page.url.searchParams;
	const look = new LookState();
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	look.tab = (params.get('tab') as TabType) ?? 'edit';
	look.view = (params.get('view') as ViewType) ?? 'table';
	// svelte-ignore state_referenced_locally
	onready(look);

	$effect(() => {
		const url = new URL(page.url.href);
		url.searchParams.set('variant', id);
		url.searchParams.set('screen', look.screen);
		url.searchParams.set('tab', look.tab);
		url.searchParams.set('view', look.view);
		if (url.search !== page.url.search) replaceState(url, {});
	});
</script>

<div class="font-sans text-slate-900 [color-scheme:light]">
	{#if variant === 'A'}
		<VariantA {look} />
	{:else if variant === 'B'}
		<VariantB {look} />
	{:else}
		<VariantC {look} />
	{/if}
</div>

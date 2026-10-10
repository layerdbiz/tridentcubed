<script lang="ts">
	// PROTOTYPE (#161): three variants of the Report Generator shell, switchable with ?variant=A|B|C.
	// Also ?screen=workspace and ?tab=preview, so any state can be linked and screenshotted.
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import Switcher from './switcher.svelte';
	import VariantA from './variant-a.svelte';
	import VariantB from './variant-b.svelte';
	import VariantC from './variant-c.svelte';

	const VARIANTS = ['A', 'B', 'C'];
	const NAMES: Record<string, string> = {
		A: 'ScavengerBot rail',
		B: 'AI-app sidebar',
		C: 'Floating'
	};

	const params = page.url.searchParams;
	let variant = $state(
		VARIANTS.includes(params.get('variant') ?? '') ? params.get('variant')! : 'A'
	);
	const look = new LookState();
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	look.tab = (params.get('tab') as TabType) ?? 'edit';
	look.view = (params.get('view') as ViewType) ?? 'table';

	$effect(() => {
		const url = new URL(page.url.href);
		url.searchParams.set('variant', variant);
		url.searchParams.set('screen', look.screen);
		url.searchParams.set('tab', look.tab);
		url.searchParams.set('view', look.view);
		if (url.search !== page.url.search) replaceState(url, {});
	});
</script>

<svelte:head><title>Look {variant} · Prototype</title></svelte:head>

<div class="font-sans text-slate-900 [color-scheme:light]">
	{#if variant === 'A'}
		<VariantA {look} />
	{:else if variant === 'B'}
		<VariantB {look} />
	{:else}
		<VariantC {look} />
	{/if}
</div>

<Switcher
	variants={VARIANTS}
	current={variant}
	names={NAMES}
	onchange={(next) => (variant = next)}
/>

<script lang="ts">
	// PROTOTYPE (#161): variants of the Report Generator shell, switchable with ?variant=A|B.
	// Also ?screen=workspace, ?tab=preview and ?project=p2, so any state can be linked and screenshotted.
	// Run 2: C was dropped, and A and B now carry everything the app prototype does (progress, panel controls, photos,
	// time log, live preview with page numbers).
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { LookState, type ScreenType, type TabType, type ViewType } from './look.state.svelte';
	import Switcher from './switcher.svelte';
	import VariantA from './variant-a.svelte';
	import VariantB from './variant-b.svelte';

	const VARIANTS = ['A', 'B'];
	const NAMES: Record<string, string> = {
		A: 'ScavengerBot rail',
		B: 'AI-app sidebar'
	};

	const params = page.url.searchParams;
	let variant = $state(
		VARIANTS.includes(params.get('variant') ?? '') ? params.get('variant')! : 'A'
	);
	const look = new LookState();
	look.tab = (params.get('tab') as TabType) ?? 'edit';
	look.view = (params.get('view') as ViewType) ?? 'table';
	if (params.get('project')) look.open(params.get('project')!);
	look.screen = (params.get('screen') as ScreenType) ?? 'dashboard';
	if (params.has('panel')) look.panelId = params.get('panel')!;

	$effect(() => {
		const url = new URL(page.url.href);
		url.searchParams.set('variant', variant);
		url.searchParams.set('screen', look.screen);
		url.searchParams.set('tab', look.tab);
		url.searchParams.set('view', look.view);
		url.searchParams.set('project', look.projectId);
		if (url.search !== page.url.search) goto(url, { shallow: true, replace: true });
	});
</script>

<svelte:head><title>Look {variant} · Prototype</title></svelte:head>

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

<Switcher
	variants={VARIANTS}
	current={variant}
	names={NAMES}
	onchange={(next) => (variant = next)}
/>

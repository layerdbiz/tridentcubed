<script lang="ts">
	// PROTOTYPE (#161): every look built so far behind one switcher, oldest first, so Justin can page from where it
	// started to where it is: run 1 (A1, B1, C), run 2 (A2, B2), run 3 (D, E, F), run 4 (G). ?variant=a1|...|f|g picks
	// one (run 2 and 3 links with A, B, D, E or F still open the same look). Each run keeps its own state and params.
	// Throwaway: lives on a prototype/161-look-* branch and is never merged.
	import { page } from '$app/state';
	import Run1 from './run-1/look.svelte';
	import Run2 from './run-2/look.svelte';
	import Run3 from './run-3/look.svelte';
	import Run4 from './run-4/look.svelte';
	import Switcher from './switcher.svelte';

	type LookType = { id: string; label: string; run: number; variant: string };
	// What the switcher needs to name the page on screen; every run's state has these.
	type PageType = {
		screen: string;
		tab: string;
		isNewOpen: boolean;
		navSection: string;
		project: { title: string };
	};

	const LOOKS: LookType[] = [
		{ id: 'a1', label: 'A1', run: 1, variant: 'A' },
		{ id: 'b1', label: 'B1', run: 1, variant: 'B' },
		{ id: 'c', label: 'C', run: 1, variant: 'C' },
		{ id: 'a2', label: 'A2', run: 2, variant: 'A' },
		{ id: 'b2', label: 'B2', run: 2, variant: 'B' },
		{ id: 'd', label: 'D', run: 3, variant: 'D' },
		{ id: 'e', label: 'E', run: 3, variant: 'E' },
		{ id: 'f', label: 'F', run: 3, variant: 'F' },
		{ id: 'g', label: 'G', run: 4, variant: 'G' }
	];
	const LEGACY: Record<string, string> = { A: 'a2', B: 'b2', C: 'c' };
	const SECTIONS: Record<string, string> = {
		dashboard: 'Dashboard',
		projects: 'Projects',
		lists: 'Lists',
		admin: 'Admin'
	};

	function lookOf(asked: string) {
		return LOOKS.find((look) => look.id === (LEGACY[asked] ?? asked.toLowerCase())) ?? LOOKS[0];
	}

	let current = $state(lookOf(page.url.searchParams.get('variant') ?? ''));
	let shown = $state<PageType>();
	let innerWidth = $state(0);

	// The name of the page on screen, as its own header would say it.
	const name = $derived.by(() => {
		if (!shown) return '';
		if (shown.isNewOpen) return 'New project';
		if (shown.screen === 'dashboard') return SECTIONS[shown.navSection] ?? 'Dashboard';
		if (shown.tab === 'preview' && innerWidth < 768) return 'Preview';
		return shown.project.title;
	});

	function change(id: string) {
		current = lookOf(id);
	}

	function ready(look: PageType) {
		shown = look;
	}
</script>

<svelte:window bind:innerWidth />

<svelte:head><title>{current.label} · {name || 'Prototype'}</title></svelte:head>

{#if current.run === 1}
	<Run1
		id={current.id}
		variant={current.variant}
		onready={ready}
	/>
{:else if current.run === 2}
	<Run2
		id={current.id}
		variant={current.variant}
		onready={ready}
	/>
{:else if current.run === 3}
	<Run3
		id={current.id}
		variant={current.variant}
		onready={ready}
	/>
{:else}
	<Run4
		id={current.id}
		variant={current.variant}
		onready={ready}
	/>
{/if}

<Switcher
	looks={LOOKS}
	current={current.id}
	{name}
	onchange={change}
/>

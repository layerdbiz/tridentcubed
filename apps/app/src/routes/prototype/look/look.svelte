<script lang="ts">
	// PROTOTYPE (#161): the two looks still in the running, behind one switcher. Run 5 starts over from look G as A
	// (G with every fix from Justin's 29 notes) and B (A plus his B experiments: one-line header and one Project panel).
	// ?variant=a|b picks one; any older link (a1..g) opens A. Throwaway: lives on a prototype/161-look-* branch and is
	// never merged.
	import { page } from '$app/state';
	import Run5 from './run-5/look.svelte';
	import Switcher from './switcher.svelte';

	type LookType = { id: string; label: string; variant: 'A' | 'B' };
	// What the switcher needs to name the page on screen.
	type PageType = {
		screen: string;
		tab: string;
		isNewOpen: boolean;
		navSection: string;
		project: { title: string };
	};

	const LOOKS: LookType[] = [
		{ id: 'a', label: 'A', variant: 'A' },
		{ id: 'b', label: 'B', variant: 'B' }
	];
	const SECTIONS: Record<string, string> = {
		home: 'Home',
		projects: 'Projects',
		clients: 'Clients',
		team: 'Team',
		admin: 'Admin'
	};

	function lookOf(asked: string) {
		return LOOKS.find((look) => look.id === asked.toLowerCase()) ?? LOOKS[0];
	}

	let current = $state(lookOf(page.url.searchParams.get('variant') ?? ''));
	let shown = $state<PageType>();
	let innerWidth = $state(0);

	// The name of the page on screen, as its own header would say it.
	const name = $derived.by(() => {
		if (!shown) return '';
		if (shown.isNewOpen) return 'New project';
		if (shown.screen === 'dashboard') return SECTIONS[shown.navSection] ?? 'Home';
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

<Run5
	id={current.id}
	variant={current.variant}
	onready={ready}
/>

<Switcher
	looks={LOOKS}
	current={current.id}
	{name}
	onchange={change}
/>

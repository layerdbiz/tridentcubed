<script lang="ts">
	// PROTOTYPE (#161): the one look left. Run 5 made looks A and B from Justin's notes on look G; on 2026-10-25 he
	// kept B and dropped A, so the A/B switcher went too and any old link (?variant=a, b or older) opens this look.
	// Throwaway: lives on a prototype/161-look-* branch.
	import Run5 from './run-5/look.svelte';

	// What the tab title needs to name the page on screen.
	type PageType = {
		screen: string;
		tab: string;
		adding?: string;
		navSection: string;
		project: { title: string };
	};

	const SECTIONS: Record<string, string> = {
		projects: 'Projects',
		customers: 'Customers',
		team: 'Team',
		transport: 'Transport',
		facilities: 'Facilities',
		admin: 'Admin'
	};

	let shown = $state<PageType>();
	let innerWidth = $state(0);

	// The name of the page on screen, as its own header would say it.
	const name = $derived.by(() => {
		if (!shown) return '';
		if (shown.adding) return 'Add';
		if (shown.screen === 'dashboard') return SECTIONS[shown.navSection] ?? 'Projects';
		if (shown.tab === 'preview' && innerWidth < 768) return 'Preview';
		return shown.project.title;
	});

	function ready(look: PageType) {
		shown = look;
	}
</script>

<svelte:window bind:innerWidth />

<svelte:head><title>{name || 'Report Generator'} · Trident Cubed</title></svelte:head>

<Run5 onready={ready} />

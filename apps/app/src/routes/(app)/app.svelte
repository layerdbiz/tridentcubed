<script lang="ts">
	// The Report Generator V1 (#180): the look prototype's screens (#161, branch prototype/161-look-claude-prototype)
	// carried across whole as the app. This names the browser tab after what is on screen; look/look.svelte is the app.
	import Look from './look/look.svelte';

	// What the tab title needs to name the page on screen.
	type PageType = {
		screen: string;
		tab: string;
		adding?: string;
		navSection: string;
		record?: { key: string };
		project: { title: string };
	};

	const SECTIONS: Record<string, string> = {
		projects: 'Projects',
		customers: 'Customers',
		team: 'Team',
		transport: 'Transport Mode',
		facilities: 'Facilities',
		admin: 'Admin'
	};

	let shown = $state<PageType>();
	let innerWidth = $state(0);

	// The name of the page on screen, as its own header would say it.
	const name = $derived.by(() => {
		if (!shown) return '';
		if (shown.adding) return 'Add';
		if (shown.screen === 'settings') return 'Organization';
		if (shown.screen === 'record' && shown.record) return shown.record.key;
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

<Look onready={ready} />

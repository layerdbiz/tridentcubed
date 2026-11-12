<script lang="ts">
	// The Report Generator V1 (#180): the look prototype's screens (#161, branch prototype/161-look-claude-prototype)
	// carried across whole as the app. This names the browser tab after what is on screen and loads the organization's
	// lists (#183) and who is signed in (#185) before the app starts; look/look.svelte is the app.
	import { fetchSelf } from '#lib/auth/auth.remote.js';
	import { fetchLists } from '#lib/rows/rows.remote.js';
	import Look from './look/look.svelte';

	const lists = (async () => {
		const [rows, self] = await Promise.all([fetchLists(), fetchSelf()]);
		return { rows, self };
	})();

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

{#await lists}
	<div
		class="flex min-h-dvh items-center justify-center"
		role="status"
	>
		<span class="icon-[svg-spinners--ring-resize] size-8 text-slate-400"></span>
		<span class="sr-only">Loading</span>
	</div>
{:then { rows, self }}
	<Look
		{rows}
		{self}
		onready={ready}
	/>
{:catch}
	<div class="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
		<p class="text-slate-700">
			The app could not load its data. Check the connection and try again.
		</p>
		<button
			type="button"
			class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
			onclick={() => location.reload()}>Try again</button
		>
	</div>
{/await}

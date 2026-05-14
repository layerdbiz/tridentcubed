<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import '../app.css';
	import { Component, mq } from '@layerd/ui';
	import * as demoRoutes from './(play)/demo/demo-routes';

	let { children } = $props();
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/demo', label: 'Demo' },
		...demoRoutes.demoRouteLinks.map((route) => ({ href: route.href, label: route.title })),
		{ href: '/features', label: 'Features' },
		{ href: '/grid', label: 'Grid' }
	];

	function getNavHref(href: string): string {
		const nextUrl = new URL(href, page.url);

		if (showRailsDebug) {
			nextUrl.searchParams.set('railsDebug', '1');
		} else {
			nextUrl.searchParams.delete('railsDebug');
		}

		return nextUrl.pathname + nextUrl.search + nextUrl.hash;
	}

	function toggleRailsDebug(event: Event): void {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;

		const nextUrl = new URL(page.url);
		if (target.checked) {
			nextUrl.searchParams.set('railsDebug', '1');
		} else {
			nextUrl.searchParams.delete('railsDebug');
		}

		void goto(nextUrl, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}
</script>

{#snippet content(el: any)}
	<div class="demo">{el}</div>
{/snippet}

{#snippet links()}
	{#each navLinks as link (link.href)}
		<a href={getNavHref(link.href)}>{link.label}</a>
	{/each}
{/snippet}

{#snippet railsDebugToggle()}
	<label class="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 outline-1 outline-slate-300">
		<input
			type="checkbox"
			class="size-4 accent-slate-950"
			checked={showRailsDebug}
			onchange={toggleRailsDebug}
		/>
		<span>Rails Debug</span>
	</label>
{/snippet}

<!-- App -->
<!-- Deubg: Grid -->
<Component tag="main" class="h-svh gap-5!">

	<!-- Nav 
	------------------------------------------------------------->
	{#snippet a1a3()}
		<!-- Deubg: Rails -->
		<Component tag="nav" rails="full" class="flex flex-wrap gap-3 h-full py-5 bg-neutral-200">
			{@render links()}
			{@render railsDebugToggle()}
		</Component>
	{/snippet}

	<!-- Content 
	------------------------------------------------------------->
	<!-- ✅ no rails -->
	{#snippet b1c3()}
		<Component tag="article" rails="full" class="h-full py-5 overflow-y-scroll">
			{@render children()}
		</Component>
	{/snippet}

</Component>


<style lang="postcss">
	@reference "#app.css";

	.demo { @apply p-2 bg-white/40 border-2 border-primary rounded-xl; }

</style>
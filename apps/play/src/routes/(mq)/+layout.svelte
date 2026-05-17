<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import '#app.css';
	import { Component, Button, Mq, mq } from '@layerd/ui';
	import * as demoRoutes from '../(play)/demo/demo-routes';

	type LayoutProps = {
		children: Snippet;
	};

	let { children }: LayoutProps = $props();
	let navOpen = $state(false);
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/demo', label: 'Demo' },
		...demoRoutes.demoRouteLinks.map((route) => ({ href: route.href, label: route.title })),
		{ href: '/features', label: 'Features' },
		{ href: '/grid', label: 'Grid' },
		{ href: '/client', label: 'MQ Client Demo' },
		{ href: '/ssr', label: 'MQ SSR Demo' }
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

	function openNav(): void {
		navOpen = true;
	}

	function closeNav(): void {
		navOpen = false;
	}

	function handleNavSelection(): void {
		if (mq.sm) {
			closeNav();
		}
	}

	function toggleRailsDebug(event: Event): void {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;

		if (mq.sm) {
			closeNav();
		}

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

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && navOpen) {
			closeNav();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#snippet navBody()}
	<Component tag="nav" rails="gutter" class="flex h-full flex-wrap gap-3 bg-neutral-200 py-5">
		{#each navLinks as link (link.href)}
			<a href={getNavHref(link.href)} onclick={handleNavSelection}>{link.label}</a>
		{/each}
		
		<label class="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 outline-1 outline-slate-300">
			<input
				type="checkbox"
				class="size-4 accent-slate-950"
				checked={showRailsDebug}
				onchange={toggleRailsDebug}
			/>
			<span>Rails Debug</span>
		</label>
	</Component>
{/snippet}

{#snippet nav()}
	{#if mq.sm}
		<div class="fixed inset-0 z-40 pointer-events-none">
			<Button label="Menu" icon="menu" aria-expanded={navOpen} onclick={openNav} class="pointer-events-auto fixed left-3 top-3 z-40 {navOpen ? 'opacity-0 pointer-events-none' : ''}"/>

			{#if navOpen}
				<Button label="Close" icon="close" aria-label="Close navigation" onclick={closeNav} class="pointer-events-auto fixed inset-0 z-40"/>
			{/if}

			<aside
				class="pointer-events-auto fixed inset-y-0 left-0 z-50 h-full w-[min(85vw,22rem)] max-w-full bg-neutral-200 transition-transform duration-200 {navOpen ? 'translate-x-0' : '-translate-x-full'}"
				aria-hidden={!navOpen}
			>
				<Button label="Close" icon="close" aria-label="Close navigation" onclick={closeNav} class="pointer-events-auto fixed inset-0 z-40"/>

				<div class="h-full overflow-y-auto pb-20">
					{@render navBody()}
				</div>
			</aside>
		</div>
	{:else}
		<aside class="h-full bg-neutral-200">
			{@render navBody()}
		</aside>
	{/if}
{/snippet}

{#snippet content()}
	<Component tag="article" rails="gutter-xl">
		{@render children()}
	</Component>
{/snippet}

<!-- Main -->
{#if mq.sm}
	<Component tag="main" gap="0" class="h-svh">
		{#snippet full()}
			{@render content()}
		{/snippet}

		{#snippet fg()}
			{@render nav()}
		{/snippet}
	</Component>
{:else}
	<Component tag="main" gap="0" class="h-svh">
		{#snippet a1a3()}
			{@render nav()}
		{/snippet}

		{#snippet b1c3()}
			{@render content()}
		{/snippet}
	</Component>
{/if}
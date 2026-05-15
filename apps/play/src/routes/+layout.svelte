<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import '../app.css';
	import { Component, Mq, mq } from '@layerd/ui';
	import * as demoRoutes from './(play)/demo/demo-routes';

	type LayoutProps = {
		children: Snippet;
		data: LayoutData;
	};

	let { children, data }: LayoutProps = $props();
	let navOpen = $state(false);
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');
	const layoutMqBucket = $derived(browser ? mq.bucket : data.initialMqBucket ?? 'md');
	const isSm = $derived(layoutMqBucket === 'sm');

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

	function openNav(): void {
		navOpen = true;
	}

	function closeNav(): void {
		navOpen = false;
	}

	function handleNavSelection(): void {
		if (isSm) {
			closeNav();
		}
	}

	function toggleRailsDebug(event: Event): void {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;

		if (isSm) {
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

	$effect(() => {
		if (navOpen && !isSm) {
			navOpen = false;
		}
	});

	$effect(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && navOpen) {
				closeNav();
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<Mq />

{#snippet links()}
	{#each navLinks as link (link.href)}
		<a href={getNavHref(link.href)} onclick={handleNavSelection}>{link.label}</a>
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

{#snippet navBody()}
	<Component tag="nav" rails="gutter" class="flex h-full flex-wrap gap-3 bg-neutral-200 py-5">
		{@render links()}
		{@render railsDebugToggle()}
	</Component>
{/snippet}

{#snippet nav()}
	{#if isSm}
		<div class="fixed inset-0 z-40 pointer-events-none">
			<button
				type="button"
				class="pointer-events-auto fixed left-3 top-3 z-40 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-700 shadow-[0_10px_30px_rgb(15_23_42/0.12)] {navOpen ? 'opacity-0 pointer-events-none' : ''}"
				aria-expanded={navOpen}
				onclick={openNav}
			>
				Menu
			</button>

			{#if navOpen}
				<button
					type="button"
					class="pointer-events-auto fixed inset-0 z-40 bg-slate-950/35"
					aria-label="Close navigation"
					onclick={closeNav}
				></button>
			{/if}

			<aside
				class="pointer-events-auto fixed inset-y-0 left-0 z-50 h-full w-[min(85vw,22rem)] max-w-full bg-neutral-200 shadow-[0_25px_50px_rgb(15_23_42/0.2)] transition-transform duration-200 {navOpen ? 'translate-x-0' : '-translate-x-full'}"
				aria-hidden={!navOpen}
			>
				<div class="flex items-center justify-between border-b border-slate-300 px-4 py-4">
					<span class="text-xs font-black uppercase tracking-[0.18em] text-slate-700">Navigation</span>
					<button
						type="button"
						class="rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 outline-1 outline-slate-300"
						aria-label="Close navigation"
						onclick={closeNav}
					>
						X
					</button>
				</div>

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
	<Component tag="article" rails="full">
		{@render children()}
	</Component>
{/snippet}

<!-- Main -->
	{#if isSm}
		<Component tag="main" gap="1.25rem">
			{#snippet full()}
				{@render content()}
			{/snippet}

			{#snippet fg()}
				{@render nav()}
			{/snippet}
		</Component>
	{:else}
		<Component tag="main" gap="1.25rem">
			{#snippet a1a3()}
				{@render nav()}
			{/snippet}

			{#snippet b1c3()}
				{@render content()}
			{/snippet}
		</Component>
	{/if}
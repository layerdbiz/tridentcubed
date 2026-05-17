<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Component, Button, mq } from '@layerd/ui';
	import { navSections, type NavLink } from '$lib';

	let navOpen = $state(false);

	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');

	function isActiveLink(href: string): boolean {
		return page.url.pathname === href;
	}

	function getActiveClass(href: string): string {
		return isActiveLink(href) ? 'bg-black text-white' : '';
	}

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
		if (mq.sm) closeNav();
	}

	function toggleRailsDebug(event: Event): void {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;

		if (mq.sm) closeNav();

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
		if (event.key === 'Escape' && navOpen) closeNav();
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#snippet linkItem(link: NavLink)}
	<a
		class="rounded-lg inline-block w-full px-2 py-1 {getActiveClass(link.href)}"
		aria-current={isActiveLink(link.href) ? 'page' : undefined}
		href={getNavHref(link.href)}
		onclick={handleNavSelection}
	>
		{link.label}
	</a>
{/snippet}

{#snippet menuButton()}
	<Button
		label="Menu"
		icon="menu"
		aria-expanded={navOpen}
		onclick={openNav}
		class="sticky top-0 z-40 m-3 {navOpen ? 'hidden' : ''}"
	/>
{/snippet}

{#snippet closeButton()}
	<Button label="Close" icon="close" aria-label="Close navigation" onclick={closeNav} />
{/snippet}

{#snippet navBody()}
	<Component tag="nav" rails="gutter" class="h-full bg-neutral-200 py-5">
		{#each navSections as section (section.label)}
			<h2 class="mt-4 text-xs font-black uppercase tracking-widest text-primary">
				{section.label}
			</h2>

			<ul>
				{#each section.items as item (item.href)}
					<li class="font-bold">
						{@render linkItem(item)}

						{#if item.children?.length}
							<ul class="border-slate-300 pl-2">
								{#each item.children as child (child.href)}
									<li class="font-normal">
										{@render linkItem(child)}
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/each}

		<label class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 outline-1 outline-slate-300">
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

{#if mq.sm}
	{@render menuButton()}

	{#if navOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-black/40"
			aria-label="Close navigation"
			onclick={closeNav}
		></button>
	{/if}

	<Component
		class="fixed inset-y-0 left-0 z-50 h-full w-64 bg-neutral-200 transition-transform duration-200 {navOpen ? 'translate-x-0' : '-translate-x-full'}"
		aria-hidden={!navOpen}
	>
		<div class="p-3">
			{@render closeButton()}
		</div>

		<div class="h-full overflow-y-auto pb-20">
			{@render navBody()}
		</div>
	</Component>
{:else}
	<Component class="h-full w-64 shrink-0 overflow-y-auto bg-neutral-200">
		{@render navBody()}
	</Component>
{/if}
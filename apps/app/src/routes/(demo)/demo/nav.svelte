<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button, Component, Text, mq } from '@layerd/ui';
	import * as demoNav from './nav.svelte.ts';

	let navOpen = $state(false);

	const currentView = $derived(
		demoNav.getDemoView(page.url.searchParams.get(demoNav.DEMO_VIEW_PARAM)),
	);

	function isActiveView(view: demoNav.DemoViewType): boolean {
		return currentView === view;
	}

	function openNav(): void {
		navOpen = true;
	}

	function closeNav(): void {
		navOpen = false;
	}

	function selectView(view: demoNav.DemoViewType): void {
		if (mq.sm) closeNav();

		void goto(demoNav.getDemoViewHref(page.url, view), {
			keepFocus: true,
			noScroll: true,
			replaceState: true,
		});
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && navOpen) {
			closeNav();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#snippet menuButton()}
	<Button
		label="Menu"
		icon="menu"
		aria-expanded={navOpen}
		onclick={openNav}
		class="fixed! left-3 top-3 z-40 {navOpen ? 'hidden' : ''}"
	/>
{/snippet}

{#snippet closeButton()}
	<Button
		label="Close"
		icon="close"
		aria-label="Close demo navigation"
		onclick={closeNav}
	/>
{/snippet}

{#snippet navBody()}
	<Component tag="nav" rail="full" rails="gutter-lg" secondary lite class="h-full py-6">
		<Component rail="content" gap="1rem">
			<Text h2="Demo" />
			<Text
				p="Use the route nav to switch between the live demo and the page source without forcing a fresh page experience."
				class="text-neutral"
			/>

			{#each demoNav.demoNavItems as item (item.view)}
				<Button
					sm
					width="full"
					variant="text"
					label={item.label}
					primary={isActiveView(item.view)}
					outline={!isActiveView(item.view)}
					onclick={() => selectView(item.view)}
				/>

				<Text small={item.description} class="text-neutral" />
			{/each}
		</Component>
	</Component>
{/snippet}

{#if mq.sm}
	{@render menuButton()}

	{#if navOpen}
		<button
			type="button"
			class="fixed! inset-0 z-40 bg-black/40"
			aria-label="Close demo navigation"
			onclick={closeNav}
		></button>
	{/if}

	<Component
		class="fixed! inset-y-0 left-0 z-50 h-full w-72 transition-transform duration-200 {navOpen ? 'translate-x-0' : '-translate-x-full'}"
		aria-hidden={!navOpen}
	>
		<Component tag="section" base lite class="h-full">
			<Component rail="content" class="py-4">
				{@render closeButton()}
			</Component>

			<Component tag="section" class="h-full overflow-y-auto pb-20">
				{@render navBody()}
			</Component>
		</Component>
	</Component>
{:else}
	<Component class="h-full w-72 overflow-y-auto">
		{@render navBody()}
	</Component>
{/if}
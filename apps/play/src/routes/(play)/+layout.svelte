<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, mq } from '@layerd/ui';
	import { Nav } from '$lib';

	type LayoutProps = { children: Snippet };
	let { children }: LayoutProps = $props();
</script>

{#snippet content()}
	<Component tag="article" rails="gutter-lg" class="py-10 h-full overflow-y-scroll">
		{@render children()}
	</Component>
{/snippet}

<!-- Main -->
{#if mq.sm}
	<Component tag="main" rails="full" gap="0" class="h-svh overflow-hidden">
		{#snippet full()}
			<Nav />
			{@render content()}
		{/snippet}
	</Component>
{:else}
	<Component tag="main" cols="auto 1fr auto" gap="0" class="h-svh overflow-hidden">
		{#snippet a1a3()}
			<Nav />
		{/snippet}

		{#snippet b1c3()}
			{@render content()}
		{/snippet}
	</Component>
{/if}
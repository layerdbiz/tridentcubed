<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, mq } from '@layerd/ui';
	import { Nav } from '$lib';

	type LayoutProps = { children: Snippet };
	let { children }: LayoutProps = $props();
</script>

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
			<Nav />
		{/snippet}
	</Component>
{:else}
	<Component tag="main" gap="0" class="h-svh">
		{#snippet a1a3()}
			<Nav />
		{/snippet}

		{#snippet b1c3()}
			{@render content()}
		{/snippet}
	</Component>
{/if}
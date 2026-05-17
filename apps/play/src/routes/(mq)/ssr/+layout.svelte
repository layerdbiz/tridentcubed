<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, Mq, mq } from '@layerd/ui';
	import { Nav } from '$lib';

	type LayoutProps = { children: Snippet };
	let { children }: LayoutProps = $props();
</script>

<Mq loading="fade" delay={2000} duration={300} />

{#snippet content()}
	<Component tag="article" rails="gutter-lg" class="py-10 h-full overflow-y-scroll">
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
	<Component tag="main" cols="auto 1fr auto" gap="0" class="h-svh">
		{#snippet a1a3()}
			<Nav />
		{/snippet}

		{#snippet b1c3()}
			{@render content()}
		{/snippet}
	</Component>
{/if}
<script lang="ts">
	import { Component, Section, Divider, Container, type ComponentProps } from '@layerd/ui';
	import type { Snippet } from 'svelte';

	interface FooterProps extends ComponentProps {
		// content sections
		left?: string | Snippet;
		center?: string | Snippet;
		right?: string | Snippet;
	}

	let { children, ...props }: FooterProps = $props();
</script>

<Component
	{...props}
	class="{props.class} footer sticky top-[100svh] w-full"
>
	{#snippet component({ props })}
		<footer {...props}>
			{#if children}
				{@render children()}
			{:else}
				footer
			{/if}
		</footer>
	{/snippet}
</Component>

<style>
	/* Auto-distribute children using CSS */
	:global(.footer-left > *),
	:global(.footer-center > *),
	:global(.footer-right > *) {
		display: none;
	}

	:global(.footer-left > *:nth-child(1)) {
		display: block;
	}

	:global(.footer-center > *:nth-child(2)) {
		display: block;
	}

	:global(.footer-right > *:nth-child(3)) {
		display: block;
	}
</style>

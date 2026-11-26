<!--
	@component Header
	@tags header, navigation, layout, scroll, glass, ghost
-->
<script lang="ts">
	import { Component, Container, type ComponentProps, type ContainerProps } from '@layerd/ui';
	import type { Snippet } from 'svelte';

	interface HeaderProps extends ComponentProps {
		fixed?: boolean;
		sticky?: boolean;
		left?: string | Snippet;
		center?: string | Snippet;
		right?: string | Snippet;
		scroll?: boolean;
	}

	let {
		fixed = false,
		sticky = false,
		left,
		center,
		right,
		children = undefined,
		scroll = false,
		...props
	}: HeaderProps = $props();

	// Position classes for header element
	const positionClasses = $derived(
		[fixed ? 'fixed left-0 right-0 top-0 z-50' : '', sticky ? 'sticky top-0 z-50' : '']
			.filter(Boolean)
			.join(' ')
	);
</script>

<!-- The bar across the top; the caller's look lands on the box inside it, the one that shows. -->
<Component {...props}>
	{#snippet component({ props: root })}
		<header class="header {positionClasses} px-4 py-6">
			<!-- The root's props are an element's attributes; the look in them is already classes. -->
			<Container {...root as unknown as ContainerProps}>
				{#if children}
					{@render children()}
				{/if}
			</Container>
		</header>
	{/snippet}
</Component>

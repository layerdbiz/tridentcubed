<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface AccordionContentProps extends ComponentProps {
		children?: Snippet;
		text?: string;
	}

	let { children = undefined, text = undefined, ...props }: AccordionContentProps = $props();
</script>

<Component
	{...props}
	class={`accordion-content ${props.class ?? ''}`.trim()}
>
	{#snippet component({ props: componentProps })}
		<div {...componentProps}>
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</div>
	{/snippet}
</Component>
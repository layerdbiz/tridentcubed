<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface AccordionTitleProps extends ComponentProps {
		children?: Snippet;
		text?: string;
	}

	let { children = undefined, text = undefined, ...props }: AccordionTitleProps = $props();
</script>

<Component
	{...props}
	class={`accordion-summary list-none ${props.class ?? ''}`.trim()}
>
	{#snippet component({ props: componentProps })}
		<summary {...componentProps}>
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</summary>
	{/snippet}
</Component>
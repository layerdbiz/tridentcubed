<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface AccordionProps extends ComponentProps {
		children?: Snippet;
		name?: string;
		open?: boolean;
	}

	let { children = undefined, ...props }: AccordionProps = $props();
</script>

<Component
	{...props}
	class={`accordion select-none ${props.class ?? ''}`.trim()}
>
	{#snippet component({ props: componentProps })}
		<details {...componentProps}>
			{#if children}
				{@render children()}
			{/if}
		</details>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	:global {
		:root {
			interpolate-size: allow-keywords;
		}

		.accordion-summary::-webkit-details-marker {
			display: none;
		}

		.accordion[open] > .accordion-summary .accordion-icon {
			color: blue;
			transform: rotate(90deg);
		}

		.accordion::details-content {
			height: 0;
			overflow: clip;
			opacity: 0;
			transition:
				height 260ms ease,
				opacity 180ms ease,
				content-visibility 260ms allow-discrete;
		}

		.accordion[open]::details-content {
			height: auto;
			opacity: 1;
		}
	}
</style>

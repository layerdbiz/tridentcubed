<script lang="ts">
	/**
	 * @tags ui
	 * @layout horizontal
	 */
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface ExampleProps extends ComponentProps {
		text?: string;
		variant?: 'base' | 'variant1' | 'variant2';
	}

	let { text = undefined, variant = 'base', children = undefined, ...props }: ExampleProps = $props();
</script>

<!-- ⬜ default ⬛ prop 🟪 snippet 🟦 children -->

<!-- Variants 
::::::::::::::::::::::::::::::::::::::::::::: -->
<!-- Base -->
{#snippet base(text: string)}
	{text}
{/snippet}

<!-- Variant 1 -->
{#snippet variant1(text: string)}
	{text}
{/snippet}

<!-- Variant 2 -->
{#snippet variant2(text: string)}
	{text}
{/snippet}

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	{...props}
	class="example {props.class}"
>
	{#snippet component({ props })}
		<div {...props}>
			{#if children}
				{@render children()}
			{:else if variant === 'variant1'}
				{@render variant1(text ?? 'hi variant1')}
			{:else if variant === 'variant2'}
				{@render variant2(text ?? 'hi variant2')}
			{:else}
				{@render base(text ?? 'example')}
			{/if}
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	/* Dont add any style here. Always use tailwind classes in the markup. */
</style>
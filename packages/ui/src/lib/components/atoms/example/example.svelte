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

	let {
		text = undefined,
		variant = 'base',
		children = undefined,
		...props
	}: ExampleProps = $props();
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
	rails="content-xl"
	class="example {(props.class ?? '').trim()}"
>
	{#snippet left()}
		{#if !children && variant === 'variant1'}
			{@render variant1(text ?? 'hi variant1')}
		{/if}
	{/snippet}

	{#snippet center()}
		{#if children}
			{@render children()}
		{:else if variant === 'base'}
			{@render base(text ?? 'example')}
		{/if}
	{/snippet}

	{#snippet right()}
		{#if !children && variant === 'variant2'}
			{@render variant2(text ?? 'hi variant2')}
		{/if}
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	/* Dont add any style here. Always use tailwind classes in the markup. */
</style>

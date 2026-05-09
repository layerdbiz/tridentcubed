<!-- Component.svelte -->
<script lang="ts">
	import { createTotalIndexes } from '@layerd/ui';
	import { Root } from '$lib';
	import type { Snippet } from 'svelte';
	import {
		normalizeComponentTag,
		type ComponentProps,
		type ComponentRenderArgs
	} from '$lib';

	const COMPONENT_DEFAULT_TEXT = 'Component';

	let {
		component,
		children,
		label = undefined,
		observe = undefined,
		snippets = {},
		tag = 'div',
		total = undefined,
		...props
	}: ComponentProps = $props();

	const normalizedTag = $derived(normalizeComponentTag(tag));
	const resolvedLabel = $derived(label ?? COMPONENT_DEFAULT_TEXT);
	const componentTotals = $derived(createTotalIndexes(total));
</script>

{#snippet content(text: string = resolvedLabel)}
	{#if children}
		{@render children()}
	{:else}
		{text}
	{/if}
{/snippet}

{#snippet rootRenderer(args: ComponentRenderArgs)}
	{#if component}
		{@render component({ ...args, content, observe })}
	{:else}
		<svelte:element this={normalizedTag} {...args.props}>
			{@render args.layout()}
		</svelte:element>
	{/if}
{/snippet}

{#each componentTotals as componentIndex (componentIndex)}
	<Root {...props} {children} label={resolvedLabel} {snippets} tag={normalizedTag} root={rootRenderer} />
{/each}
<!-- Component.svelte -->
<script lang="ts">
	import Root from './root.svelte';
	import type { ComponentProps as SvelteComponentProps, Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { normalizeComponentTag, type ComponentRenderArgs } from './component.svelte.ts';

	const COMPONENT_DEFAULT_TEXT = 'Component';

	type RootComponentProps = SvelteComponentProps<typeof Root>;
	type WrapperProps = Omit<RootComponentProps, 'root'> & {
		tag?: keyof SvelteHTMLElements;
		component?: Snippet<[ComponentRenderArgs]>;
	};

	let {
		component,
		children,
		label = undefined,
		observe = undefined,
		tag = 'div',
		...props
	}: WrapperProps = $props();

	const normalizedTag = $derived(normalizeComponentTag(tag));
</script>

{#snippet content(text: string = COMPONENT_DEFAULT_TEXT)}
	{#if children}
		{@render children()}
	{:else if label}
		{label}
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

<Root {...props} {children} {label} tag={normalizedTag} root={rootRenderer} />
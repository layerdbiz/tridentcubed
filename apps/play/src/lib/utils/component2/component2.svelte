<!-- Component2.svelte -->
<script lang="ts">
	import Root2 from './root2.svelte';
	import type { ComponentProps, Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type Root2Props = ComponentProps<typeof Root2>;
	type Component2RenderArgs = {
		props: Record<string, unknown> & { class?: string; style?: string };
		layout: Snippet;
	};
	type Component2Props = Omit<Root2Props, 'root'> & {
		tag?: keyof SvelteHTMLElements;
		component?: Snippet<[Component2RenderArgs]>;
	};

	let {
		component,
		tag = 'div',
		...props
	}: Component2Props = $props();
</script>


{#snippet rootRenderer(args: Component2RenderArgs)}
	{#if component}
		{@render component(args)}
	{:else}
		<svelte:element this={tag} {...args.props}>
			{@render args.layout()}
		</svelte:element>
	{/if}
{/snippet}

<Root2 {...props} root={rootRenderer} />
<!-- Component.svelte -->
<script lang="ts">
	import {Root} from '$lib';
	import type { ComponentProps, Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type RootProps = ComponentProps<typeof Root>;
	type ComponentRenderArgs = {
		props: Record<string, unknown> & { class?: string; style?: string };
		layout: Snippet;
	};
	type ComponentProps = Omit<RootProps, 'root'> & {
		tag?: keyof SvelteHTMLElements;
		component?: Snippet<[ComponentRenderArgs]>;
	};

	let {
		component,
		tag = 'div',
		...props
	}: ComponentProps = $props();
</script>


{#snippet rootRenderer(args: ComponentRenderArgs)}
	{#if component}
		{@render component(args)}
	{:else}
		<svelte:element this={tag} {...args.props}>
			{@render args.layout()}
		</svelte:element>
	{/if}
{/snippet}

<Root {...props} root={rootRenderer} />
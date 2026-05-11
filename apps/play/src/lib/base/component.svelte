<!-- Component.svelte -->
<script lang="ts">
	import {
		createComponentWithStyles,
		createTotalIndexes,
		ObserveClass
	} from '@layerd/ui';
	import { Root } from '$lib';
	import type { Snippet } from 'svelte';
	import { createAttachmentKey, type Attachment } from 'svelte/attachments';
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
	const componentPropsWithoutLayoutSize = $derived(() => {
		const { size: _, debug: __, ...rest } = props;
		return rest;
	});
	const { base: componentBaseProps, classes: componentClasses } = $derived(
		createComponentWithStyles(componentPropsWithoutLayoutSize(), {
			defaults: {},
			getComponentClasses: () => []
		})
	);
	const componentRootProps = $derived({
		...componentBaseProps,
		debug: props.debug,
		size: props.size,
		class: componentClasses
	});

	let elementRefs = $state<(HTMLElement | null)[]>([]);

	const createTrackElement =
		(index: number): Attachment =>
		(element: Element) => {
			elementRefs[index] = element as HTMLElement;
			return () => {
				if (elementRefs[index] === element) {
					elementRefs[index] = null;
				}
			};
		};

	const observeInstances = $derived(
		componentTotals.map((_, index) => {
			const observeOptions =
				typeof observe === 'object' ? { enabled: true, ...observe } : { enabled: observe };
			return new ObserveClass(() => elementRefs[index], observeOptions);
		})
	);

	function getComponentRootProps(index: number) {
		return {
			...componentRootProps,
			class: `${componentRootProps.class ?? ''} ${observeInstances[index]?.isIntersecting ? 'active' : ''}`
				.trim(),
			...(observe ? { [createAttachmentKey()]: createTrackElement(index) } : {})
		};
	}
</script>

{#snippet content(text: string = resolvedLabel)}
	{#if children}
		{@render children()}
	{:else}
		{text}
	{/if}
{/snippet}

{#each componentTotals as componentIndex, componentOffset (componentIndex)}
	{#snippet rootRenderer(args: ComponentRenderArgs)}
		{#if component}
			{@render component({
				...args,
				content,
				observe: observe ? observeInstances[componentOffset] : undefined
			})}
		{:else}
			<svelte:element this={normalizedTag} {...args.props}>
				{@render args.layout()}
			</svelte:element>
		{/if}
	{/snippet}

	<Root
		{...getComponentRootProps(componentOffset)}
		{children}
		label={resolvedLabel}
		{snippets}
		tag={normalizedTag}
		root={rootRenderer}
	/>
{/each}
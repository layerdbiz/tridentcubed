<script lang="ts">
	import { browser } from '$app/environment';
	import { createAttachmentKey, type Attachment } from 'svelte/attachments';
	import {
		createComponentWithStyles,
		createTotalIndexes,
		type ComponentProps,
		type ComponentRenderProps,
		type ComponentRenderArgs,
		type ComponentRootArgs,
		Debug,
		DebugClass,
		getRootGrid,
		normalizeComponentTag,
		normalizeDebugValue,
		ObserveClass,
		pickItemSources,
		Root,
		ScrollClass,
	} from '@layerd/ui';

	// Constants
	const COMPONENT_DEFAULT_TEXT = 'Component';
	const trackAttachmentKey = createAttachmentKey();

	let {
		label = undefined,
		children = undefined,
		class: componentClass = undefined,
		component = undefined,
		debug = false,
		observe = false,
		scroll = false,
		snippets = {},
		tag = 'div',
		total = undefined,
		...props
	}: ComponentProps = $props();

	// Component derived values
	const normalizedTag = $derived(normalizeComponentTag(tag));
	const componentChildren = $derived(children || props.children);
	const componentLabel = $derived(label ?? props.label);
	const resolvedDebug = $derived(normalizeDebugValue(debug));
	const componentLayoutProps = $derived.by(() => {
		const {
			topLeft,
			top,
			topRight,
			left,
			center,
			right,
			bottomLeft,
			bottom,
			bottomRight,
			a1,
			b1,
			c1,
			a2,
			b2,
			c2,
			a3,
			b3,
			c3,
			row1,
			row2,
			row3,
			col1,
			col2,
			col3,
			topHalf,
			bottomHalf,
			leftHalf,
			rightHalf,
			bg,
			full,
			fg,
			grid,
			rail,
			rails,
			ratio,
			mode,
			items,
			content,
			rows,
			cols,
			gap
		} = props;

		return {
			topLeft,
			top,
			topRight,
			left,
			center,
			right,
			bottomLeft,
			bottom,
			bottomRight,
			a1,
			b1,
			c1,
			a2,
			b2,
			c2,
			a3,
			b3,
			c3,
			row1,
			row2,
			row3,
			col1,
			col2,
			col3,
			topHalf,
			bottomHalf,
			leftHalf,
			rightHalf,
			bg,
			full,
			fg,
			grid,
			rail,
			rails,
			ratio,
			mode,
			items,
			content,
			rows,
			cols,
			gap
		};
	});
	const componentItemSources = $derived(pickItemSources(componentLayoutProps));
	const componentRootGrid = $derived(
		getRootGrid(componentLayoutProps.grid, componentLayoutProps.rails)
	);
	const componentHasLayoutRuntimeRequest = $derived.by(() => {
		if (Object.keys(componentItemSources).length > 0) {
			return true;
		}

		for (const value of [
			componentLayoutProps.grid,
			componentLayoutProps.rails,
			componentLayoutProps.ratio,
			componentLayoutProps.mode,
			componentLayoutProps.items,
			componentLayoutProps.content,
			componentLayoutProps.rows,
			componentLayoutProps.cols,
			componentLayoutProps.gap
		]) {
			if (String(value ?? '').trim()) {
				return true;
			}
		}

		return false;
	});
	const shouldShowBoxDebug = $derived(
		resolvedDebug.box ||
			resolvedDebug.rails ||
			(resolvedDebug.auto && (!componentHasLayoutRuntimeRequest || componentRootGrid === 'rails'))
	);
	const componentPropsWithoutRuntime = $derived.by(() => {
		const {
			topLeft: _topLeft,
			top: _top,
			topRight: _topRight,
			left: _left,
			center: _center,
			right: _right,
			bottomLeft: _bottomLeft,
			bottom: _bottom,
			bottomRight: _bottomRight,
			a1: _a1,
			b1: _b1,
			c1: _c1,
			a2: _a2,
			b2: _b2,
			c2: _c2,
			a3: _a3,
			b3: _b3,
			c3: _c3,
			row1: _row1,
			row2: _row2,
			row3: _row3,
			col1: _col1,
			col2: _col2,
			col3: _col3,
			topHalf: _topHalf,
			bottomHalf: _bottomHalf,
			leftHalf: _leftHalf,
			rightHalf: _rightHalf,
			bg: _bg,
			full: _full,
			fg: _fg,
			grid: _grid,
			rail: _rail,
			rails: _rails,
			ratio: _ratio,
			mode: _mode,
			items: _items,
			content: _content,
			rows: _rows,
			cols: _cols,
			gap: _gap,
			...rest
		} = props;

		return rest;
	});

	// Component creation
	const { base: componentBaseProps, classes: componentClasses } = $derived(
		createComponentWithStyles(componentPropsWithoutRuntime, {
			defaults: {},
			componentClass,
			getComponentClasses: () => []
		})
	);

	// Element reference tracking using Svelte's {@attach} - the proper Svelte 5 way!
	let elementRefs = $state<(HTMLElement | null)[]>([]);

	// Create attachment for element tracking per instance
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

	// Handle multiplication
	const componentTotals = $derived(createTotalIndexes(total));
	const componentTotal = $derived(componentTotals.length);

	// Create utility instances for each component instance
	const debugInstances = $derived(
		Array.from(
			{ length: componentTotal },
			(_, i) => new DebugClass(() => elementRefs[i], { enabled: shouldShowBoxDebug })
		)
	);

	const observeInstances = $derived(
		Array.from({ length: componentTotal }, (_, i) => {
			// Handle both boolean and ObserveOptions
			const observeOptions =
				typeof observe === 'object' ? { enabled: true, ...observe } : { enabled: observe };
			return new ObserveClass(() => elementRefs[i], observeOptions);
		})
	);

	const scrollInstances = $derived(
		Array.from(
			{ length: componentTotal },
			(_, i) => new ScrollClass(() => elementRefs[i], { enabled: scroll })
		)
	);

	function getComponentRootProps(index: number) {
		return {
			...componentLayoutProps,
			...componentBaseProps,
			[trackAttachmentKey]:
				shouldShowBoxDebug || observe || scroll ? createTrackElement(index) : undefined,
			class:
				`${componentClasses} ${observe && observeInstances[index]?.isIntersecting ? 'active' : ''} ${scroll && scrollInstances[index]?.hasScrolledDown ? 'scrolled' : ''}`.trim(),
		};
	}
</script>

<!-- 
⬜ default ⬛ prop 🟪 snippet 🟦 children
-->
{#snippet content(text: string = COMPONENT_DEFAULT_TEXT)}
	{#if componentChildren}
		{@render componentChildren()}
	{:else if componentLabel !== undefined && componentLabel !== null && componentLabel !== ''}
		{componentLabel}
	{:else}
		{text}
	{/if}
{/snippet}

{#each componentTotals as componentIndex, componentOffset (componentIndex)}
	{#snippet rootRenderer(args: ComponentRootArgs)}
		{#if component}
			{@render component({
				...args,
				props: args.props as ComponentRenderProps,
				content,
				observe: observe ? observeInstances[componentOffset] : undefined
			})}
		{:else}
			<svelte:element
				this={normalizedTag}
				{...args.props}
				bind:this={elementRefs[componentOffset]}
			>
				{@render args.layout()}
			</svelte:element>
		{/if}
	{/snippet}

	<Root
		{...getComponentRootProps(componentOffset)}
		{children}
		debug={resolvedDebug}
		label={componentLabel}
		{snippets}
		tag={normalizedTag}
		root={rootRenderer}
	/>
{/each}

<!-- Debug overlays for all instances using Debug component -->
{#if browser && shouldShowBoxDebug}
	{#each debugInstances as debugInstance, i (i)}
		<Debug
			debug={debugInstance}
			index={i}
			componentName="Component"
		/>
	{/each}
{/if}

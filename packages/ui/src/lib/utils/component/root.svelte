<!-- Root.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import {
		hasLayoutDebugValue,
		normalizeDebugValue,
		type DebugValueType
	} from '../debug/debug.svelte.ts';
	import * as engine from '@layerd/ui';

	type RootContent = Snippet | string | number | boolean | null | undefined;
	type ItemConfig = {
		tag?: keyof SvelteHTMLElements;
		class?: string;
		rail?: string;
	};
	type RootRenderArgs = {
		props: engine.RootRendererProps;
		layout: Snippet;
	};
	type RootProps = {
		root?: Snippet<[RootRenderArgs]>;
		children?: Snippet;
		label?: string;
		class?: string;
		style?: string;
		tag?: keyof SvelteHTMLElements;
		debug?: boolean | DebugValueType;
		grid?: engine.GridValue;
		rail?: string;
		rails?: string;
		ratio?: string;
		mode?: engine.PlacementMode;
		items?: engine.PlacementValue;
		content?: engine.PlacementValue;
		rows?: string;
		cols?: string;
		size?: string;
		gap?: string;
		snippets?: Partial<Record<string, ItemConfig>>;
		[key: string]: unknown;
	};

	let {
		root,
		children,
		label = undefined,
		class: className = '',
		style: styleName = undefined,
		tag = 'div',
		debug = false,
		grid = undefined,
		rail = '',
		rails = '',
		ratio = '',
		mode = 'auto',
		items = '',
		content = '',
		rows = '',
		cols = '',
		size = '',
		gap = undefined,
		snippets = {},
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
		...props
	}: RootProps = $props();

	let itemRefs = $state<Record<string, HTMLElement | undefined>>({});
	let itemEmpty = $state<Record<string, boolean>>({});
	const resolvedDebug = $derived(normalizeDebugValue(debug));
	const hasExplicitLayoutDebug = $derived(hasLayoutDebugValue(resolvedDebug));

	const resolvedTag = $derived(tag ?? 'div');
	const defaultItemTag = $derived(engine.getItemTag(String(resolvedTag)));
	const rootRail = $derived(engine.normalizeRail(rail));
	const rootRails = $derived(engine.normalizeRail(rails));
	const rootGrid = $derived(engine.getRootGrid(grid, rails));
	const rootMode = $derived(engine.normalizeMode(mode));
	const rootRatio = $derived(engine.normalizeRatio(ratio));
	const rootRailColumn = $derived(engine.getRailColumn(rail));
	const rootRailsColumn = $derived(engine.getRailColumn(rails));
	const rootRailClassName = $derived(engine.getRailClassName(rail));
	const defaultSnippetZoneRailColumn = $derived(engine.getRailColumn('content'));
	const hasRatio = $derived(rootRatio !== 'auto');

	const itemSources = $derived(
		engine.pickItemSources({
			...props,
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
			fg
		})
	);
	const shouldUseRootRuntime = $derived(
		engine.shouldUseRootRuntime({
			debug: hasExplicitLayoutDebug,
			grid,
			rails,
			ratio,
			mode,
			items,
			content,
			rows,
			cols,
			size,
			gap,
			itemSources
		})
	);
	const hasRailsDebugImplementation = false;
	const isAutoGridDebug = $derived(resolvedDebug.auto && shouldUseRootRuntime && rootGrid !== 'rails');
	const isAutoRailsDebug = $derived(
		hasRailsDebugImplementation && resolvedDebug.auto && shouldUseRootRuntime && rootGrid === 'rails'
	);
	const isGridDebugEnabled = $derived(resolvedDebug.grid || isAutoGridDebug);
	const isRailsDebugEnabled = $derived(
		hasRailsDebugImplementation && (resolvedDebug.rails || isAutoRailsDebug)
	);
	const isLayoutDebugEnabled = $derived(isGridDebugEnabled || isRailsDebugEnabled);
	const shouldShowRailFallback = $derived(shouldUseRootRuntime && Boolean(rootRail && !children));

	const resolvedItems = $derived(engine.resolveItems(itemSources, mode, ratio, rootGrid));
	const usageEnvelope = $derived(engine.getUsageEnvelope(resolvedItems));
	const usesGridPlacement = $derived(isLayoutDebugEnabled || engine.hasGridPlacement(resolvedItems));
	const usesCompactMode = $derived(engine.hasCompactPlacement(resolvedItems));
	const usesCompactPlacement = $derived(!isLayoutDebugEnabled && usesCompactMode);
	const usesFitPlacement = $derived(engine.hasFitPlacement(resolvedItems));
	const usesFillPlacement = $derived(engine.hasFillPlacement(resolvedItems));
	const usesDebugFitPlacement = $derived(isLayoutDebugEnabled && usesFitPlacement);
	const hasResolvedItems = $derived(resolvedItems.length > 0);
	const hasExplicitRowTracks = $derived(Boolean(rows.trim() || size.trim()));
	const hasExplicitColTracks = $derived(Boolean(cols.trim() || size.trim()));
	const shouldEmitRows = $derived(isLayoutDebugEnabled || hasResolvedItems || hasExplicitRowTracks);
	const shouldEmitCols = $derived(isLayoutDebugEnabled || hasResolvedItems || hasExplicitColTracks);
	const activeTracks = $derived(
		isLayoutDebugEnabled
			? {
					rows: engine.getInternalTrackIndexes(),
					cols: engine.getInternalTrackIndexes(),
					row_start: 1,
					col_start: 1
				}
			: usageEnvelope
	);
	const rootPlacementTracks = $derived(isLayoutDebugEnabled && hasRatio ? usageEnvelope : activeTracks);
	const colTrackConfig = $derived(
		cols.trim()
			? engine.getResolvedTrackConfig(
					cols,
					'auto',
					['auto', 'auto', 'minmax(0, 1fr)', 'minmax(0, 1fr)', 'auto', 'auto'],
					activeTracks.cols,
					'tracks'
				)
			: size.trim()
				? engine.getResolvedTrackConfig(
						size,
						'auto',
						engine.getDefaultColTracks(
							activeTracks.cols,
							usesGridPlacement,
							usesCompactPlacement,
							usesFitPlacement,
							usesFillPlacement,
							usesDebugFitPlacement
						),
						activeTracks.cols,
						'size'
					)
				: {
						tracks: engine.getDefaultColTracks(
							activeTracks.cols,
							usesGridPlacement,
							usesCompactPlacement,
							usesFitPlacement,
							usesFillPlacement,
							usesDebugFitPlacement
						),
						is_pruned: !isLayoutDebugEnabled,
						kind: 'default'
					}
	);
	const rowTrackConfig = $derived(
		rows.trim()
			? engine.getResolvedTrackConfig(
					rows,
					'auto',
					['auto', 'auto', '1fr', '1fr', 'auto', 'auto'],
					activeTracks.rows,
					'tracks'
				)
			: size.trim()
				? engine.getResolvedTrackConfig(
						size,
						'auto',
						engine.getDefaultRowTracks(
							activeTracks.rows,
							usesGridPlacement,
							usesCompactPlacement,
							usesFitPlacement,
							usesFillPlacement,
							usesDebugFitPlacement
						),
						activeTracks.rows,
						'size'
					)
				: {
						tracks: engine.getDefaultRowTracks(
							activeTracks.rows,
							usesGridPlacement,
							usesCompactPlacement,
							usesFitPlacement,
							usesFillPlacement,
							usesDebugFitPlacement
						),
						is_pruned: !isLayoutDebugEnabled,
						kind: 'default'
					}
	);
	const rootCols = $derived((colTrackConfig.tracks.length ? colTrackConfig.tracks : ['auto']).join(' '));
	const rootRows = $derived((rowTrackConfig.tracks.length ? rowTrackConfig.tracks : ['auto']).join(' '));
	const shouldUseSnippetZone = $derived(rootGrid === 'rails' && hasResolvedItems);
	const snippetZoneRailColumn = $derived(rootRailsColumn ?? defaultSnippetZoneRailColumn);
	const rootTemplateCols = $derived(rootGrid === 'rails' ? undefined : shouldEmitCols ? rootCols : undefined);
	const rootTemplateRows = $derived(shouldUseSnippetZone ? undefined : shouldEmitRows ? rootRows : undefined);
	const rootGap = $derived(
		shouldUseRootRuntime ? String(gap ?? '').trim() || '0.5rem' : undefined
	);
	const rootGapTokens = $derived(rootGap ? rootGap.split(/\s+/).filter(Boolean) : []);
	const rootRowGap = $derived(rootGapTokens[0] ?? '0px');
	const rootColGap = $derived(rootGapTokens[1] ?? rootGapTokens[0] ?? '0px');
	const userItems = $derived(engine.normalizePlacement(items, 'items') || undefined);
	const userContent = $derived(engine.normalizePlacement(content, 'content') || undefined);
	const friendlyRailPackAxis = $derived(engine.getFriendlyRailPackAxis(resolvedItems));
	const packedFriendlyContent = $derived(
		engine.getPackedFriendlyContent(userContent, friendlyRailPackAxis)
	);
	const shouldUsePackedFriendlySnippetZone = $derived(
		shouldUseSnippetZone &&
			!isLayoutDebugEnabled &&
			rootMode === 'auto' &&
			!hasRatio &&
			!rows.trim() &&
			!cols.trim() &&
			!size.trim() &&
			Boolean(friendlyRailPackAxis) &&
			Boolean(userContent)
	);
	const rootItems = $derived(
		shouldUsePackedFriendlySnippetZone
			? userItems ?? 'center'
			: userItems
	);
	const rootContent = $derived(
		userContent ||
			engine.getAutoRatioRootContent(rootPlacementTracks.rows, rootPlacementTracks.cols, hasRatio, usesCompactMode, usesFillPlacement) ||
			engine.getAutoRootContent(activeTracks.cols, isLayoutDebugEnabled)
	);
	const packedFriendlyCols = $derived(
		friendlyRailPackAxis === 'horizontal'
			? 'max-content max-content max-content'
			: 'max-content'
	);
	const packedFriendlyRows = $derived(
		friendlyRailPackAxis === 'horizontal'
			? 'max-content'
			: 'max-content max-content max-content'
	);
	const debugItems = $derived(
		engine.addPlacement(
			isLayoutDebugEnabled ? engine.createDebugItems() : [],
			rowTrackConfig,
			colTrackConfig,
			activeTracks,
			rootGrid,
			shouldUseSnippetZone,
			shouldUsePackedFriendlySnippetZone ? friendlyRailPackAxis ?? undefined : undefined
		)
	);
	const positionedItems = $derived(
		engine.addPlacement(
			resolvedItems,
			rowTrackConfig,
			colTrackConfig,
			activeTracks,
			rootGrid,
			shouldUseSnippetZone,
			shouldUsePackedFriendlySnippetZone ? friendlyRailPackAxis ?? undefined : undefined
		)
	);
	const shouldUsePlainRailsAutoFlow = $derived(
		rootGrid === 'rails' &&
			Boolean(children) &&
			!hasResolvedItems &&
			!rows.trim() &&
			!cols.trim() &&
			!size.trim() &&
			!userItems &&
			!userContent
	);
	const rootClassName = $derived(
		engine.mergeClasses(
			shouldUseRootRuntime
				? engine.createRootClassName({
					className,
					rootGrid,
					rail,
					debug: isLayoutDebugEnabled
				})
				: className,
			!shouldUseRootRuntime ? rootRailClassName : undefined,
			shouldUsePlainRailsAutoFlow ? 'is-plain-rails-flow' : undefined,
			shouldUseRootRuntime && rootRails ? `is-rails-${rootRails}` : undefined
		)
	);
	const rootTrackRows = $derived(activeTracks.rows.join(','));
	const rootTrackCols = $derived(activeTracks.cols.join(','));
	const rootDebugAttributes = $derived(
		engine.createRootDebugAttributes(isLayoutDebugEnabled, {
			rootGrid,
			rootMode,
			rootRail,
			rootRatio,
			rootTrackRows,
			rootTrackCols
		})
	);
	const rootProps = $derived({
		...props,
		class: rootClassName,
		style: shouldUseRootRuntime
			? engine.mergeStyles(
				styleName,
				rootRatio !== 'auto' ? `--grid-ratio: ${rootRatio}` : undefined,
				rootRailColumn ? `--grid-column: ${rootRailColumn}` : undefined,
				rootTemplateCols ? `--grid-template-columns: ${rootTemplateCols}` : undefined,
				rootTemplateRows ? `--grid-template-rows: ${rootTemplateRows}` : undefined,
				rootGap ? `--grid-gap: ${rootGap}` : undefined,
				`--grid-row-gap: ${rootRowGap}`,
				`--grid-col-gap: ${rootColGap}`,
				!shouldUseSnippetZone && rootItems ? `--grid-place-items: ${rootItems}` : undefined,
				!shouldUseSnippetZone && rootContent ? `--grid-place-content: ${rootContent}` : undefined
			)
			: engine.mergeStyles(
				styleName,
				rootRailColumn ? `grid-column: ${rootRailColumn}` : undefined
			),
		...rootDebugAttributes
	} satisfies engine.RootRendererProps);

	function hasMeaningfulContent(element: HTMLElement | undefined): boolean {
		if (!element) return false;
		for (const node of element.childNodes) {
			if (node.nodeType === 3 && node.textContent?.trim()) return true;
			if (node.nodeType === 1) {
				const isFallback = (node as HTMLElement).classList.contains('slot-fallback');
				if (!isFallback) return true;
			}
		}
		return false;
	}

	function refreshItemEmptyState(key: string) {
		itemEmpty[key] = !hasMeaningfulContent(itemRefs[key]);
	}

	function getItemConfig(item: engine.PositionedItem): ItemConfig {
		return snippets[item.key] ?? snippets[item.label] ?? snippets[item.base] ?? {};
	}

	function getItemTagName(item: engine.PositionedItem): keyof SvelteHTMLElements {
		return (getItemConfig(item).tag ?? defaultItemTag) as keyof SvelteHTMLElements;
	}

	function getItemClassName(item: engine.PositionedItem): string {
		const config = getItemConfig(item);
		return engine.mergeClasses(item.className, config.class, engine.getRailClassName(config.rail));
	}

	function getItemStyle(item: engine.PositionedItem): string | undefined {
		return engine.mergeStyles(
			`--grid-column: ${item.grid_column}`,
			`--grid-row: ${item.grid_row}`,
			item.place_self ? `--grid-place-self: ${item.place_self}` : undefined
		);
	}

	function getItemDebugRole(item: engine.PositionedItem): 'debug' | 'item' {
		return item.key.startsWith('debug-') ? 'debug' : 'item';
	}

	function shouldShowItemFallback(item: engine.PositionedItem): boolean {
		return Boolean(itemEmpty[item.key]) && (Boolean(item.snippet) || engine.hasRenderableValue(item.value));
	}

	$effect(() => {
		positionedItems;
		itemRefs;
		for (const item of positionedItems) {
			refreshItemEmptyState(item.key);
		}
	});
</script>

{#snippet defaultRootRenderer(args: RootRenderArgs)}
	<svelte:element this={resolvedTag} {...args.props}>
		{@render args.layout()}
	</svelte:element>
{/snippet}

{#snippet renderItem(item: engine.PositionedItem)}
	<svelte:element
		this={getItemTagName(item)}
		class={getItemClassName(item)}
		style={getItemStyle(item)}
		bind:this={itemRefs[item.key]}
		{...engine.createItemDebugAttributes(isLayoutDebugEnabled, item, getItemDebugRole(item))}
	>
		{#if item.snippet}
			{@render item.snippet()}
		{:else if engine.hasRenderableValue(item.value)}
			{item.value}
		{/if}

		{#if shouldShowItemFallback(item)}
			<span class="slot-fallback">{item.label}</span>
		{/if}
	</svelte:element>
{/snippet}

{#snippet renderDebugItem(item: engine.PositionedItem)}
	<div
		class={item.className}
		style={getItemStyle(item)}
		aria-hidden="true"
		{...engine.createItemDebugAttributes(isLayoutDebugEnabled, item, 'debug')}
	>
		<span class="slot-fallback">{item.label}</span>
	</div>
{/snippet}

{#snippet layout()}
	{#if !shouldUseRootRuntime}
		{#if children}
			{@render children()}
		{:else if label}
			{label}
		{:else if rootRail}
			{rootRail}
		{/if}
	{:else if shouldUseSnippetZone}
		<div
			class="is-snippet-zone"
			style={engine.mergeStyles(
				snippetZoneRailColumn ? `--grid-column: ${snippetZoneRailColumn}` : undefined,
				`--grid-template-columns: ${shouldUsePackedFriendlySnippetZone ? packedFriendlyCols : rootCols}`,
				`--grid-template-rows: ${shouldUsePackedFriendlySnippetZone ? packedFriendlyRows : rootRows}`,
				rootGap ? `--grid-gap: ${rootGap}` : undefined,
				rootItems ? `--grid-place-items: ${rootItems}` : undefined,
				shouldUsePackedFriendlySnippetZone && packedFriendlyContent
					? `--grid-place-content: ${packedFriendlyContent}`
					: !shouldUsePackedFriendlySnippetZone && rootContent
					? `--grid-place-content: ${rootContent}`
					: undefined
			)}
		>
			{#each debugItems as item (item.key)}
				{@render renderDebugItem(item)}
			{/each}

			{#each positionedItems as item (item.key)}
				{@render renderItem(item)}
			{/each}
		</div>
	{:else}
		{#each debugItems as item (item.key)}
			{@render renderDebugItem(item)}
		{/each}

		{#if children && !positionedItems.length}
			{@render children()}
		{:else if shouldShowRailFallback && !positionedItems.length}
			<span class="slot-fallback is-rail-fallback">{rootRail}</span>
		{:else if label && !positionedItems.length}
			<span class="slot-fallback">{label}</span>
		{/if}

		{#each positionedItems as item (item.key)}
			{@render renderItem(item)}
		{/each}
	{/if}
{/snippet}

{@render (root ?? defaultRootRenderer)({ props: rootProps, layout })}

<style lang="postcss">
	:global {
		.root-grid {
			--tl: start start;
			--tc: start center;
			--tr: start end;
			--lc: center start;
			--cc: center center;
			--rc: center end;
			--bl: end start;
			--bc: end center;
			--br: end end;
			--grid-min-row: 1lh;
			--grid-min-col: 2ch;
			--grid-row-gap: 0px;
			--grid-col-gap: 0px;
			--grid-min-row-unit: calc((var(--grid-min-row, 1lh) - var(--grid-row-gap, 0px)) * 0.5);
			--grid-min-col-unit: calc((var(--grid-min-col, 2ch) - var(--grid-col-gap, 0px)) * 0.5);
			--grid-ratio: auto;
			--grid-column: auto;
			--grid-row: auto;
			--grid-template-columns: none;
			--grid-template-rows: none;
			--grid-gap: 0;
			--grid-place-items: stretch;
			--grid-place-content: normal;
			--grid-place-self: auto;
			box-sizing: border-box;
			display: grid;
			position: relative;
			min-width: 0;
			min-height: 0;
			aspect-ratio: var(--grid-ratio);
			grid-column: var(--grid-column);
			grid-template-columns: var(--grid-template-columns);
			grid-template-rows: var(--grid-template-rows);
			gap: var(--grid-gap);
			place-items: var(--grid-place-items);
			place-content: var(--grid-place-content);
		}

		.root-grid.is-inline {
			display: inline-grid;
			justify-self: start;
			align-self: start;
			width: max-content;
			max-width: 100%;
		}

		.root-grid.is-grid-rails {
			--gutter: clamp(1rem, 4vi, 3rem);
			--content-xs-max: 38ch;
			--content-sm-max: 55ch;
			--content-md-max: 72ch;
			--content-lg-max: 64rem;
			--content-xl-max: 80rem;
			--content-available: calc(100% - (var(--gutter) * 2));
			--size-xs: min(var(--content-available), var(--content-xs-max));
			--size-sm: min(var(--content-available), var(--content-sm-max));
			--size-md: min(var(--content-available), var(--content-md-max));
			--size-lg: min(var(--content-available), var(--content-lg-max));
			--size-xl: min(var(--content-available), var(--content-xl-max));
			--edge: minmax(var(--gutter), 1fr);
			--track-xs-half: minmax(0, calc(var(--size-xs) / 2));
			--track-sm: minmax(0, calc((var(--size-sm) - var(--size-xs)) / 2));
			--track-md: minmax(0, calc((var(--size-md) - var(--size-sm)) / 2));
			--track-lg: minmax(0, calc((var(--size-lg) - var(--size-md)) / 2));
			--track-xl: minmax(0, calc((var(--size-xl) - var(--size-lg)) / 2));
			grid-template-columns:
				[content-full-start]
					var(--edge)
					[content-xl-start]
						var(--track-xl)
						[content-lg-start]
							var(--track-lg)
							[content-md-start]
								var(--track-md)
								[content-sm-start]
									var(--track-sm)
									[content-xs-start]
										var(--track-xs-half)
										[content-center]
										var(--track-xs-half)
									[content-xs-end]
									var(--track-sm)
								[content-sm-end]
								var(--track-md)
							[content-md-end]
							var(--track-lg)
						[content-lg-end]
						var(--track-xl)
					[content-xl-end]
					var(--edge)
				[content-full-end];
		}

		.root-grid > .is-snippet-zone {
			--grid-row: auto;
			--grid-place-self: auto;
			box-sizing: border-box;
			display: grid;
			position: relative;
			min-width: 0;
			min-height: 0;
			grid-column: var(--grid-column, auto);
			grid-row: var(--grid-row, auto);
			place-self: var(--grid-place-self, auto);
			grid-template-columns: var(--grid-template-columns, none);
			grid-template-rows: var(--grid-template-rows, none);
			gap: var(--grid-gap, 0);
			place-items: var(--grid-place-items, stretch);
			place-content: var(--grid-place-content, normal);
		}

		:where(
			.root-grid > :where(.is-cell, .is-row, .is-col, .is-range, .is-half, .is-full, .is-bg, .is-fg, .is-debug),
			.root-grid > .is-snippet-zone > :where(.is-cell, .is-row, .is-col, .is-range, .is-half, .is-full, .is-bg, .is-fg, .is-debug)
		) {
			box-sizing: border-box;
			position: relative;
			min-width: 0;
			min-height: 0;
			grid-column: var(--grid-column, auto);
			grid-row: var(--grid-row, auto);
			place-self: var(--grid-place-self, auto);
		}

		.root-grid > .is-rail-fallback {
			place-self: start;
		}

		.root-grid.is-grid-rails > :where(:not(.is-debug)) {
			grid-column: content-md-start / content-md-end;
		}

		.root-grid.is-grid-rails.is-plain-rails-flow {
			align-content: start;
			grid-auto-rows: max-content;
		}

		.root-grid.is-grid-rails > .is-rail-zone {
			display: grid;
			grid-template-columns: subgrid;
			grid-column: content-full-start / content-full-end;
			row-gap: inherit;
			column-gap: inherit;
		}

		.root-grid.is-grid-rails > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-md-start / content-md-end;
		}

		.root-grid.is-grid-rails.is-rails-content-xs > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-xs > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-xs-start / content-xs-end;
		}

		.root-grid.is-grid-rails.is-rails-content-sm > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-sm > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-sm-start / content-sm-end;
		}

		.root-grid.is-grid-rails.is-rails-content > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-md > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-content-md > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-md-start / content-md-end;
		}

		.root-grid.is-grid-rails.is-rails-content-lg > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-popout > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-lg > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-popout > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-lg-start / content-lg-end;
		}

		.root-grid.is-grid-rails.is-rails-content-xl > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-xl > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-xl-start / content-xl-end;
		}

		.root-grid.is-grid-rails.is-rails-content-full > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-full > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-full > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-full > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-bleed > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-full-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-left > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left-center > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left-half > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-bleed-left-center > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-bleed-left-half > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-center;
		}

		.root-grid.is-grid-rails.is-rails-bleed-right > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right-center > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right-half > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-bleed-right-center > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-bleed-right-half > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-center / content-full-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-left-xs > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left-xs > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-xs-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-left-sm > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left-sm > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-sm-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-left-md > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left-md > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-md-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-left-lg > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left-lg > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-lg-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-left-xl > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-left-xl > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-xl-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-right-xs > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right-xs > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-xs-start / content-full-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-right-sm > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right-sm > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-sm-start / content-full-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-right-md > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right-md > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-md-start / content-full-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-right-lg > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right-lg > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-lg-start / content-full-end;
		}

		.root-grid.is-grid-rails.is-rails-bleed-right-xl > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed-right-xl > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-xl-start / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.content-xs, .is-rail-content-xs),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.content-xs, .is-rail-content-xs) {
			grid-column: content-xs-start / content-xs-end;
		}

		.root-grid.is-grid-rails > :is(.content-sm, .is-rail-content-sm),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.content-sm, .is-rail-content-sm) {
			grid-column: content-sm-start / content-sm-end;
		}

		.root-grid.is-grid-rails > :is(.content, .content-md, .is-rail-content, .is-rail-content-md),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.content, .content-md, .is-rail-content, .is-rail-content-md) {
			grid-column: content-md-start / content-md-end;
		}

		.root-grid.is-grid-rails > :is(.content-lg, .popout, .is-rail-content-lg, .is-rail-popout),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.content-lg, .popout, .is-rail-content-lg, .is-rail-popout) {
			grid-column: content-lg-start / content-lg-end;
		}

		.root-grid.is-grid-rails > :is(.content-xl, .is-rail-content-xl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.content-xl, .is-rail-content-xl) {
			grid-column: content-xl-start / content-xl-end;
		}

		.root-grid.is-grid-rails > :is(.content-full, .full, .bleed, .is-rail-content-full, .is-rail-full, .is-rail-bleed),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.content-full, .full, .bleed, .is-rail-content-full, .is-rail-full, .is-rail-bleed) {
			grid-column: content-full-start / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-left, .bleed-left-center, .bleed-left-half, .is-rail-bleed-left, .is-rail-bleed-left-center, .is-rail-bleed-left-half),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-left, .bleed-left-center, .bleed-left-half, .is-rail-bleed-left, .is-rail-bleed-left-center, .is-rail-bleed-left-half) {
			grid-column: content-full-start / content-center;
		}

		.root-grid.is-grid-rails > :is(.bleed-right, .bleed-right-center, .bleed-right-half, .is-rail-bleed-right, .is-rail-bleed-right-center, .is-rail-bleed-right-half),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-right, .bleed-right-center, .bleed-right-half, .is-rail-bleed-right, .is-rail-bleed-right-center, .is-rail-bleed-right-half) {
			grid-column: content-center / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-left-xs, .is-rail-bleed-left-xs),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-left-xs, .is-rail-bleed-left-xs) {
			grid-column: content-full-start / content-xs-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-left-sm, .is-rail-bleed-left-sm),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-left-sm, .is-rail-bleed-left-sm) {
			grid-column: content-full-start / content-sm-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-left-md, .is-rail-bleed-left-md),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-left-md, .is-rail-bleed-left-md) {
			grid-column: content-full-start / content-md-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-left-lg, .is-rail-bleed-left-lg),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-left-lg, .is-rail-bleed-left-lg) {
			grid-column: content-full-start / content-lg-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-left-xl, .is-rail-bleed-left-xl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-left-xl, .is-rail-bleed-left-xl) {
			grid-column: content-full-start / content-xl-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-right-xs, .is-rail-bleed-right-xs),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-right-xs, .is-rail-bleed-right-xs) {
			grid-column: content-xs-start / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-right-sm, .is-rail-bleed-right-sm),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-right-sm, .is-rail-bleed-right-sm) {
			grid-column: content-sm-start / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-right-md, .is-rail-bleed-right-md),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-right-md, .is-rail-bleed-right-md) {
			grid-column: content-md-start / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-right-lg, .is-rail-bleed-right-lg),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-right-lg, .is-rail-bleed-right-lg) {
			grid-column: content-lg-start / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.bleed-right-xl, .is-rail-bleed-right-xl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.bleed-right-xl, .is-rail-bleed-right-xl) {
			grid-column: content-xl-start / content-full-end;
		}

		.root-grid > .is-debug,
		.root-grid > .is-snippet-zone > .is-debug {
			z-index: 0;
			pointer-events: none;
			overflow: visible;
			outline: 1px dashed rgb(100 116 139 / 0.65);
			background: rgb(148 163 184 / 0.14);
			color: #64748b;
			place-self: stretch;
		}

		.slot-fallback {
			display: inline-block;
			color: inherit;
			font: inherit;
			line-height: inherit;
			pointer-events: none;
		}

		.root-grid > .is-debug .slot-fallback,
		.root-grid > .is-snippet-zone > .is-debug .slot-fallback {
			color: inherit;
			white-space: nowrap;
		}

		.root-grid > .is-bg,
		.root-grid > .is-snippet-zone > .is-bg {
			z-index: 0;
		}

		.root-grid > .is-row,
		.root-grid > .is-col,
		.root-grid > .is-snippet-zone > .is-row,
		.root-grid > .is-snippet-zone > .is-col {
			z-index: 1;
		}

		.root-grid > .is-range,
		.root-grid > .is-full,
		.root-grid > .is-half,
		.root-grid > .is-snippet-zone > .is-range,
		.root-grid > .is-snippet-zone > .is-full,
		.root-grid > .is-snippet-zone > .is-half {
			z-index: 2;
		}

		.root-grid > .is-cell,
		.root-grid > .is-snippet-zone > .is-cell {
			z-index: 3;
		}

		.root-grid > .is-fg,
		.root-grid > .is-snippet-zone > .is-fg {
			z-index: 4;
		}

		.is-tl { place-self: var(--tl); }
		.is-tc { place-self: var(--tc); }
		.is-tr { place-self: var(--tr); }
		.is-lc { place-self: var(--lc); }
		.is-cc { place-self: var(--cc); }
		.is-rc { place-self: var(--rc); }
		.is-bl { place-self: var(--bl); }
		.is-bc { place-self: var(--bc); }
		.is-br { place-self: var(--br); }
	}
</style>

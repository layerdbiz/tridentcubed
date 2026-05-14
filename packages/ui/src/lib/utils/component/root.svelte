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
	type RailDebugLine = engine.RailDebugLine;
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
		inset?: string;
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
		inset = undefined,
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
	let _overlayEl = $state<HTMLElement | null>(null);
	let _debugLineEls = $state<Record<string, HTMLElement | null>>({});
	const resolvedDebug = $derived(normalizeDebugValue(debug));
	const hasExplicitLayoutDebug = $derived(hasLayoutDebugValue(resolvedDebug));

	const resolvedTag = $derived(tag ?? 'div');
	const defaultItemTag = $derived(engine.getItemTag(String(resolvedTag)));
	const rootRail = $derived(engine.normalizeRail(rail));
	const rootRails = $derived(engine.normalizeRail(rails));
	const rootRailDefinition = $derived(engine.getRailDefinition(rail));
	const rootRailsDefinition = $derived(engine.getRailDefinition(rails));
	const rootRailInset = $derived(engine.getRailInset(rail, inset));
	const rootRailsInset = $derived(engine.getRailInset(rails, inset));
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
	const hasRailsDebugImplementation = true;
	const isAutoGridDebug = $derived(resolvedDebug.auto && shouldUseRootRuntime && rootGrid !== 'rails');
	const isAutoRailsDebug = $derived(
		hasRailsDebugImplementation && resolvedDebug.auto && shouldUseRootRuntime && rootGrid === 'rails'
	);
	const isGridDebugEnabled = $derived(resolvedDebug.grid || isAutoGridDebug);
	const isRailsDebugEnabled = $derived(
		hasRailsDebugImplementation && (resolvedDebug.rails || isAutoRailsDebug)
	);
	const isLayoutDebugEnabled = $derived(isGridDebugEnabled || isRailsDebugEnabled);
	const railDebugLines = $derived(
		isRailsDebugEnabled
			? [
				...engine.getCanonicalRailDebugLines(),
				...engine.getRailInsetDebugLines(rootRails, inset)
			]
			: []
	);
	const shouldShowRailFallback = $derived(shouldUseRootRuntime && Boolean(rootRail && !children));

	const resolvedItems = $derived(engine.resolveItems(itemSources, mode, ratio, rootGrid));
	const usageEnvelope = $derived(engine.getUsageEnvelope(resolvedItems));
	const usesGridPlacement = $derived(isGridDebugEnabled || engine.hasGridPlacement(resolvedItems));
	const usesCompactMode = $derived(engine.hasCompactPlacement(resolvedItems));
	const usesCompactPlacement = $derived(!isGridDebugEnabled && usesCompactMode);
	const usesFitPlacement = $derived(engine.hasFitPlacement(resolvedItems));
	const usesFillPlacement = $derived(engine.hasFillPlacement(resolvedItems));
	const usesDebugFitPlacement = $derived(isGridDebugEnabled && usesFitPlacement);
	const hasResolvedItems = $derived(resolvedItems.length > 0);
	const hasExplicitRowTracks = $derived(Boolean(rows.trim() || size.trim()));
	const hasExplicitColTracks = $derived(Boolean(cols.trim() || size.trim()));
	const shouldEmitRows = $derived(isGridDebugEnabled || hasResolvedItems || hasExplicitRowTracks);
	const shouldEmitCols = $derived(isGridDebugEnabled || hasResolvedItems || hasExplicitColTracks);
	const activeTracks = $derived(
		isGridDebugEnabled
			? {
					rows: engine.getInternalTrackIndexes(),
					cols: engine.getInternalTrackIndexes(),
					row_start: 1,
					col_start: 1
				}
			: usageEnvelope
	);
	const rootPlacementTracks = $derived(isGridDebugEnabled && hasRatio ? usageEnvelope : activeTracks);
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
						is_pruned: !isGridDebugEnabled,
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
						is_pruned: !isGridDebugEnabled,
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
			!isGridDebugEnabled &&
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
			engine.getAutoRootContent(activeTracks.cols, isGridDebugEnabled)
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
			isGridDebugEnabled ? engine.createDebugItems() : [],
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
			rootRailInset ? 'has-rail-inset' : undefined,
			rootRailInset && rootRail !== 'full' && !rootRailDefinition?.inset ? 'has-rail-safe-inset' : undefined,
			shouldUsePlainRailsAutoFlow ? 'is-plain-rails-flow' : undefined,
			shouldUseRootRuntime ? engine.getRailClassNames(rootRails, 'is-rails') : undefined,
			rootRailsInset ? 'has-rails-inset' : undefined,
			rootGrid === 'rails' && rootRailsInset && rootRails !== 'full' && !rootRailsDefinition?.inset
				? 'has-rails-safe-inset'
				: undefined
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
				rootRailInset ? `--rail-inset: ${rootRailInset}` : undefined,
				rootRailsInset ? `--rails-inset: ${rootRailsInset}` : undefined,
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
				rootRailColumn ? `grid-column: ${rootRailColumn}` : undefined,
				rootRailInset ? `--rail-inset: ${rootRailInset}` : undefined,
				rootRailsInset ? `--rails-inset: ${rootRailsInset}` : undefined
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
		return (
			!hasMeaningfulContent(itemRefs[item.key]) &&
			(Boolean(item.snippet) || engine.hasRenderableValue(item.value))
		);
	}

	$effect(() => {
		if (!isRailsDebugEnabled || !_overlayEl) return;
		const parent = _overlayEl.parentElement;
		if (!parent) return;

		// Access _debugLineEls to re-run when lines mount/unmount
		const lineKeys = Object.keys(_debugLineEls);
		void lineKeys;

		function measure() {
			const pRect = parent!.getBoundingClientRect();
			const cs = getComputedStyle(parent!);
			const pl = parseFloat(cs.paddingLeft);
			const pr = parseFloat(cs.paddingRight);
			const contentLeft = Math.round(pRect.x + pl);
			const contentRight = Math.round(pRect.x + pRect.width - pr);

			const lines: Record<string, { relToContentArea: number }> = {};
			for (const [key, el] of Object.entries(_debugLineEls)) {
				if (!el) continue;
				const r = el.getBoundingClientRect();
				lines[key] = { relToContentArea: Math.round(r.x - contentLeft) };
			}

			console.group('%c[Rails Debug] Alignment', 'color:#ec4899;font-weight:bold');
			console.log(
				`parent x=${Math.round(pRect.x)} w=${Math.round(pRect.width)} pl=${Math.round(pl)} pr=${Math.round(pr)} | content x=${contentLeft}..${contentRight} w=${contentRight - contentLeft}`
			);
			console.log('Lines relative to content-full-start (full-start=0, full-end=contentW expected):');
			console.table(lines);
			console.groupEnd();
		}

		const obs = new ResizeObserver(measure);
		obs.observe(parent);
		measure();
		return () => obs.disconnect();
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

{#snippet renderRailDebugLine(line: RailDebugLine)}
	<div
		class={engine.mergeClasses(
			'is-debug',
			'is-debug-rail-line',
			line.kind === 'named' ? 'is-debug-rail-line-named' : 'is-debug-rail-line-inset',
			line.side === 'end'
				? 'is-debug-rail-line-end'
				: line.side === 'center'
				? 'is-debug-rail-line-center'
				: 'is-debug-rail-line-start'
		)}
		style={
			line.kind === 'named'
				? engine.mergeStyles(
						line.side === 'end'
							? `--grid-column: content-full-start / ${line.line}`
							: `--grid-column: ${line.line} / ${line.line}`,
						'--grid-row: 1 / -1'
				  )
				: engine.mergeStyles(`--rail-debug-inset: ${line.inset}`)
		}
		aria-hidden="true"
		bind:this={_debugLineEls[line.key]}
	>
		{#if line.label}
			<span class="slot-fallback">{line.label}</span>
		{/if}
	</div>
{/snippet}

{#snippet renderRailDebugSurface()}
	<div class="is-debug is-debug-rail-surface" aria-hidden="true"></div>
{/snippet}

{#snippet renderRailDebugOverlay()}
	<div class="is-debug-rail-overlay" aria-hidden="true" bind:this={_overlayEl}>
		{@render renderRailDebugSurface()}

		{#each railDebugLines as line (line.key)}
			{@render renderRailDebugLine(line)}
		{/each}
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
	{:else}
		{#if isRailsDebugEnabled}
			{@render renderRailDebugOverlay()}
		{/if}

		{#if shouldUseSnippetZone}
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
			--rail-inset: 0px;
			--rails-inset: 0px;
			--rail-debug-inset: 0px;
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
			--rail-safe-edge: var(--gutter);
			--rail-debug-line-color: rgb(236 72 153 / 0.92);
			--rail-debug-line-glow: rgb(251 207 232 / 0.4);
			--rail-debug-fill: rgb(236 72 153 / 0.1);
			--rail-debug-outline: rgb(236 72 153 / 0.72);
			--rail-inset-xs: 0.25rem;
			--rail-inset-sm: 0.5rem;
			--rail-inset-md: 1rem;
			--rail-inset-lg: 2rem;
			--rail-inset-xl: clamp(2.5rem, 6vw, 4rem);
			--rail-inset-xxl: 4rem;
			--content-available: calc(100% - (var(--rail-safe-edge) * 2));
			--size-xs: min(calc(var(--content-available) * 0.72), 26rem);
			--size-sm: min(calc(var(--content-available) * 0.84), 34rem);
			--size-content: min(var(--content-available), 48rem);
			--size-lg: min(var(--content-available), 60rem);
			--size-xl: min(var(--content-available), 72rem);
			--size-xxl: min(var(--content-available), 84rem);
			--edge: minmax(var(--rail-safe-edge), 1fr);
			--track-xs-half: minmax(0, calc(var(--size-xs) / 2));
			--track-sm: minmax(0, calc((var(--size-sm) - var(--size-xs)) / 2));
			--track-content: minmax(0, calc((var(--size-content) - var(--size-sm)) / 2));
			--track-lg: minmax(0, calc((var(--size-lg) - var(--size-content)) / 2));
			--track-xl: minmax(0, calc((var(--size-xl) - var(--size-lg)) / 2));
			--track-xxl: minmax(0, calc((var(--size-xxl) - var(--size-xl)) / 2));
			grid-template-columns:
				[content-full-start]
					var(--edge)
					[content-xxl-start]
						var(--track-xxl)
						[content-xl-start]
							var(--track-xl)
							[content-lg-start]
								var(--track-lg)
								[content-md-start]
									var(--track-content)
									[content-sm-start]
										var(--track-sm)
										[content-xs-start]
											var(--track-xs-half)
											[content-center]
											var(--track-xs-half)
										[content-xs-end]
										var(--track-sm)
									[content-sm-end]
									var(--track-content)
								[content-md-end]
								var(--track-lg)
							[content-lg-end]
							var(--track-xl)
						[content-xl-end]
						var(--track-xxl)
					[content-xxl-end]
					var(--edge)
				[content-full-end];
		}

		.root-grid.is-grid-rails.has-rails-safe-inset {
			--rail-safe-edge: max(var(--gutter), var(--rails-inset));
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

		.root-grid.is-grid-rails > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
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

		.root-grid.is-grid-rails > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
			grid-column: content-md-start / content-md-end;
		}

		.root-grid.is-grid-rails.is-rails-content-xs > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-xs > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
			grid-column: content-xs-start / content-xs-end;
		}

		.root-grid.is-grid-rails.is-rails-content-sm > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-sm > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
			grid-column: content-sm-start / content-sm-end;
		}

		.root-grid.is-grid-rails.is-rails-content > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-md > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)),
		.root-grid.is-grid-rails.is-rails-content-md > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
			grid-column: content-md-start / content-md-end;
		}

		.root-grid.is-grid-rails.is-rails-content-lg > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-popout > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-lg > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)),
		.root-grid.is-grid-rails.is-rails-popout > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
			grid-column: content-lg-start / content-lg-end;
		}

		.root-grid.is-grid-rails.is-rails-content-xl > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-xl > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
			grid-column: content-xl-start / content-xl-end;
		}

		.root-grid.is-grid-rails.is-rails-xxl > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-xxl > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-xxl > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)),
		.root-grid.is-grid-rails.is-rails-content-xxl > .is-rail-zone > :where(:not(.is-debug):not(.is-debug-rail-line):not(.is-debug-rail-surface)) {
			grid-column: content-xxl-start / content-xxl-end;
		}

		.root-grid.is-grid-rails.is-rails-content-full > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-full > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-gutter-xs > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-gutter-sm > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-gutter-md > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-gutter-lg > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-gutter-xl > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-gutter-xxl > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-full-inset-sm > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-full-inset-md > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-full-inset-lg > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-bleed > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails.is-rails-content-full > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-full > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-gutter-xs > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-gutter-sm > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-gutter-md > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-gutter-lg > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-gutter-xl > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-gutter-xxl > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-full-inset-sm > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-full-inset-md > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-full-inset-lg > .is-rail-zone > :where(:not(.is-debug)),
		.root-grid.is-grid-rails.is-rails-bleed > .is-rail-zone > :where(:not(.is-debug)) {
			grid-column: content-full-start / content-full-end;
		}

		.root-grid.is-grid-rails.is-rails-gutter-xs {
			--rails-inset: var(--rail-inset-xs);
		}

		.root-grid.is-grid-rails.is-rails-gutter-sm {
			--rails-inset: var(--rail-inset-sm);
		}

		.root-grid.is-grid-rails.is-rails-gutter-md {
			--rails-inset: var(--rail-inset-md);
		}

		.root-grid.is-grid-rails.is-rails-gutter-lg {
			--rails-inset: var(--rail-inset-lg);
		}

		.root-grid.is-grid-rails.is-rails-gutter-xl {
			--rails-inset: var(--rail-inset-xl);
		}

		.root-grid.is-grid-rails.is-rails-gutter-xxl {
			--rails-inset: var(--rail-inset-xxl);
		}

		.root-grid.is-grid-rails.is-rails-full-inset-sm {
			--rails-inset: var(--rail-inset-sm);
		}

		.root-grid.is-grid-rails.is-rails-full-inset-md {
			--rails-inset: var(--rail-inset-md);
		}

		.root-grid.is-grid-rails.is-rails-full-inset-lg {
			--rails-inset: var(--rail-inset-lg);
		}

		.root-grid.is-grid-rails:is(
			.is-rails-full.has-rails-inset,
			.is-rails-gutter-xs,
			.is-rails-gutter-sm,
			.is-rails-gutter-md,
			.is-rails-gutter-lg,
			.is-rails-gutter-xl,
			.is-rails-gutter-xxl,
			.is-rails-full-inset-sm,
			.is-rails-full-inset-md,
			.is-rails-full-inset-lg
		) > :where(:not(.is-debug):not(.is-rail-zone)),
		.root-grid.is-grid-rails:is(
			.is-rails-full.has-rails-inset,
			.is-rails-gutter-xs,
			.is-rails-gutter-sm,
			.is-rails-gutter-md,
			.is-rails-gutter-lg,
			.is-rails-gutter-xl,
			.is-rails-gutter-xxl,
			.is-rails-full-inset-sm,
			.is-rails-full-inset-md,
			.is-rails-full-inset-lg
		) > .is-rail-zone > :where(:not(.is-debug)) {
			justify-self: center;
			width: calc(100% - (var(--rails-inset) * 2));
			max-width: calc(100% - (var(--rails-inset) * 2));
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

		.root-grid.is-grid-rails > :is(.xxl, .content-xxl, .is-rail-xxl, .is-rail-content-xxl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.xxl, .content-xxl, .is-rail-xxl, .is-rail-content-xxl) {
			grid-column: content-xxl-start / content-xxl-end;
		}

		.root-grid.is-grid-rails > :is(.content-full, .full, .gutter-xs, .gutter-sm, .gutter-md, .gutter-lg, .gutter-xl, .gutter-xxl, .full-inset-sm, .full-inset-md, .full-inset-lg, .full-inset-xl, .full-inset-xxl, .bleed, .is-rail-content-full, .is-rail-full, .is-rail-gutter-xs, .is-rail-gutter-sm, .is-rail-gutter-md, .is-rail-gutter-lg, .is-rail-gutter-xl, .is-rail-gutter-xxl, .is-rail-full-inset-sm, .is-rail-full-inset-md, .is-rail-full-inset-lg, .is-rail-full-inset-xl, .is-rail-full-inset-xxl, .is-rail-bleed),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.content-full, .full, .gutter-xs, .gutter-sm, .gutter-md, .gutter-lg, .gutter-xl, .gutter-xxl, .full-inset-sm, .full-inset-md, .full-inset-lg, .full-inset-xl, .full-inset-xxl, .bleed, .is-rail-content-full, .is-rail-full, .is-rail-gutter-xs, .is-rail-gutter-sm, .is-rail-gutter-md, .is-rail-gutter-lg, .is-rail-gutter-xl, .is-rail-gutter-xxl, .is-rail-full-inset-sm, .is-rail-full-inset-md, .is-rail-full-inset-lg, .is-rail-full-inset-xl, .is-rail-full-inset-xxl, .is-rail-bleed) {
			grid-column: content-full-start / content-full-end;
		}

		.root-grid.is-grid-rails > :is(.gutter-xs, .is-rail-gutter-xs),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.gutter-xs, .is-rail-gutter-xs) {
			--rail-inset: var(--rail-inset-xs);
		}

		.root-grid.is-grid-rails > :is(.gutter-sm, .is-rail-gutter-sm),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.gutter-sm, .is-rail-gutter-sm) {
			--rail-inset: var(--rail-inset-sm);
		}

		.root-grid.is-grid-rails > :is(.gutter-md, .is-rail-gutter-md),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.gutter-md, .is-rail-gutter-md) {
			--rail-inset: var(--rail-inset-md);
		}

		.root-grid.is-grid-rails > :is(.gutter-lg, .is-rail-gutter-lg),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.gutter-lg, .is-rail-gutter-lg) {
			--rail-inset: var(--rail-inset-lg);
		}

		.root-grid.is-grid-rails > :is(.gutter-xl, .is-rail-gutter-xl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.gutter-xl, .is-rail-gutter-xl) {
			--rail-inset: var(--rail-inset-xl);
		}

		.root-grid.is-grid-rails > :is(.gutter-xxl, .is-rail-gutter-xxl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.gutter-xxl, .is-rail-gutter-xxl) {
			--rail-inset: var(--rail-inset-xxl);
		}

		.root-grid.is-grid-rails > :is(.full-inset-sm, .is-rail-full-inset-sm),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.full-inset-sm, .is-rail-full-inset-sm) {
			--rail-inset: var(--rail-inset-sm);
		}

		.root-grid.is-grid-rails > :is(.full-inset-md, .is-rail-full-inset-md),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.full-inset-md, .is-rail-full-inset-md) {
			--rail-inset: var(--rail-inset-md);
		}

		.root-grid.is-grid-rails > :is(.full-inset-lg, .is-rail-full-inset-lg),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.full-inset-lg, .is-rail-full-inset-lg) {
			--rail-inset: var(--rail-inset-lg);
		}

		.root-grid.is-grid-rails > :is(.full-inset-xl, .is-rail-full-inset-xl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.full-inset-xl, .is-rail-full-inset-xl) {
			--rail-inset: var(--rail-inset-xl);
		}

		.root-grid.is-grid-rails > :is(.full-inset-xxl, .is-rail-full-inset-xxl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.full-inset-xxl, .is-rail-full-inset-xxl) {
			--rail-inset: var(--rail-inset-xxl);
		}

		.root-grid.is-grid-rails > :is(.full.has-rail-inset, .is-rail-full.has-rail-inset, .gutter-xs, .gutter-sm, .gutter-md, .gutter-lg, .gutter-xl, .gutter-xxl, .full-inset-sm, .full-inset-md, .full-inset-lg, .full-inset-xl, .full-inset-xxl, .is-rail-gutter-xs, .is-rail-gutter-sm, .is-rail-gutter-md, .is-rail-gutter-lg, .is-rail-gutter-xl, .is-rail-gutter-xxl, .is-rail-full-inset-sm, .is-rail-full-inset-md, .is-rail-full-inset-lg, .is-rail-full-inset-xl, .is-rail-full-inset-xxl),
		.root-grid.is-grid-rails > .is-rail-zone > :is(.full.has-rail-inset, .is-rail-full.has-rail-inset, .gutter-xs, .gutter-sm, .gutter-md, .gutter-lg, .gutter-xl, .gutter-xxl, .full-inset-sm, .full-inset-md, .full-inset-lg, .full-inset-xl, .full-inset-xxl, .is-rail-gutter-xs, .is-rail-gutter-sm, .is-rail-gutter-md, .is-rail-gutter-lg, .is-rail-gutter-xl, .is-rail-gutter-xxl, .is-rail-full-inset-sm, .is-rail-full-inset-md, .is-rail-full-inset-lg, .is-rail-full-inset-xl, .is-rail-full-inset-xxl) {
			justify-self: center;
			width: calc(100% - (var(--rail-inset) * 2));
			max-width: calc(100% - (var(--rail-inset) * 2));
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

		.root-grid.is-grid-rails > .is-debug-rail-overlay {
			display: contents;
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-surface {
			pointer-events: none;
			position: absolute;
			inset: 0;
			z-index: 5;
			grid-column: content-full-start / content-full-end;
			border: 1px solid var(--rail-debug-outline);
			background: var(--rail-debug-fill);
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line {
			pointer-events: none;
			position: absolute;
			z-index: 6;
			top: 0;
			bottom: 0;
			left: 0;
			width: 0;
			overflow: visible;
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line-named {
			grid-column: var(--grid-column, auto);
			justify-self: start;
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line-named.is-debug-rail-line-end {
			justify-self: end;
			left: auto;
			right: 0;
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line-inset {
			grid-column: content-full-start / content-full-end;
			left: var(--rail-debug-inset);
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line-inset.is-debug-rail-line-end {
			left: auto;
			right: var(--rail-debug-inset);
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line::before {
			content: '';
			position: absolute;
			inset-block: 0;
			left: 0;
			width: 1px;
			background: var(--rail-debug-line-color);
			box-shadow: 0 0 0 1px var(--rail-debug-line-glow);
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line .slot-fallback {
			position: absolute;
			top: 50%;
			left: 0;
			transform: translate(-50%, -50%) rotate(-90deg);
			transform-origin: center;
			border-radius: 9999px;
			background: var(--rail-debug-line-color);
			padding: 0.125rem 0.5rem;
			font-size: 0.6875rem;
			font-weight: 600;
			line-height: 1;
			color: white;
			white-space: nowrap;
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line-end .slot-fallback {
			left: 0;
			right: auto;
			transform: translate(-50%, -50%) rotate(-90deg);
		}

		.root-grid.is-grid-rails > .is-debug-rail-overlay > .is-debug-rail-line-center .slot-fallback {
			display: none;
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

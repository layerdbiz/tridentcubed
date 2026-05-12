<!-- Demo.svelte -->
<script lang="ts">
	import { Component } from '@layerd/ui';
	import type { PlacementMode } from '$lib';
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';

	type DemoMode = PlacementMode;
	type DemoComponentProps = Record<string, unknown> & {
		class?: string;
		mode?: DemoMode;
		debug?: boolean;
		children?: Snippet;
	};
	type DemoSnippets = Record<string, unknown>;
	type DebugViewName = 'off' | 'split' | 'inline';
	type LogMode = 'hide' | 'open' | 'failed';
	type DebugViewKey = 'normal' | 'debug' | 'inline';
	type ComparableValue = string | number;
	const validModes: DemoMode[] = ['auto', 'grid', 'compact', 'fit', 'fill'];

	interface DebugViewItem {
		key: DebugViewKey;
		label: string;
		debug: boolean;
	}

	interface FlatView {
		key: string;
		mode: DemoMode;
		view: DebugViewItem;
	}

	interface ItemData {
		label: string;
		base: string;
		family: string;
		mode: string;
		canonical: string;
		railZone: string;
		col: string;
		row: string;
	}

	interface ChildDataItem {
		tag: string;
		className: string;
		text: string;
	}

	interface ChildData {
		count: number;
		items: ChildDataItem[];
	}

	interface CssData {
		display: string;
		position: string;
		boxSizing: string;
		minWidth: string;
		width: string;
		maxWidth: string;
		minHeight: string;
		height: string;
		maxHeight: string;
		padding: string;
		margin: string;
		border: string;
		aspectRatio: string;
		gridTemplateRows: string;
		gridTemplateColumns: string;
		gridAutoRows: string;
		gridAutoColumns: string;
		gridAutoFlow: string;
		gap: string;
		rowGap: string;
		columnGap: string;
		placeContent: string;
		placeItems: string;
		placeSelf: string;
		gridColumn: string;
		gridRow: string;
	}

	interface RootData {
		index: number;
		tag: string;
		className: string;
		text: string;
		size: {
			width: number;
			height: number;
		};
		css: CssData;
		data: {
			grid: string;
			mode: string;
			rail: string;
			ratio: string;
			rows: string;
			cols: string;
			internal: string;
		};
		children: ChildData;
	}

	interface PanelStats {
		found: boolean;
		mode: string;
		debug: boolean;
		rows: number[];
		cols: number[];
		internalRows: number[];
		internalCols: number[];
		resolvedModes: string[];
		items: ItemData[];
		roots: RootData[];
	}

	interface ExpectedModeValue {
		rows?: ComparableValue[];
		cols?: ComparableValue[];
		items?: string[];
		itemCount?: number;
	}

	type DemoExpectation = Partial<Record<DemoMode, ExpectedModeValue>> &
		Record<string, ExpectedModeValue | undefined>;

	interface DemoProps extends Record<string, unknown> {
		label?: string;
		componentProps?: DemoComponentProps;
		modeViews?: Array<DemoMode | string>;
		debugView?: DebugViewName | string;
		viewCols?: string | number;
		placeModifier?: string;
		inspect?: boolean;
		expect?: DemoExpectation | null;
		logMode?: LogMode | string;
		tag?: string;
		grid?: string;
		rail?: string;
		ratio?: string;
		size?: string;
		rows?: string;
		cols?: string;
		items?: string;
		content?: string;
		gap?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		label = '',
		componentProps = {},
		modeViews = ['auto'] as DemoMode[],
		debugView = 'off',
		viewCols = '1',
		placeModifier = '',
		inspect = false,
		expect = null,
		logMode = 'hide',

		tag = '',
		grid = '',
		rail = '',
		ratio = '',
		size = '',
		rows = '',
		cols = '',
		items = '',
		content = '',
		gap = '',
		class: className = '',

		children = undefined,
		...snippets
	}: DemoProps = $props();

	let panelRefs = $state<Record<string, HTMLDivElement | undefined>>({});
	let stats = $state<Record<string, PanelStats>>({});

	const placeModifiers = ['TL', 'TC', 'TR', 'LC', 'CC', 'RC', 'BL', 'BC', 'BR'] as const;

	const normalizedDebugView = $derived(normalizeDebugView(debugView));
	const normalizedLogMode = $derived(normalizeLogMode(logMode));
	const visibleModes = $derived(normalizeModeViews(modeViews));
	const debugViews = $derived(getDebugViews(normalizedDebugView));
	const flatViews = $derived(createFlatViews(visibleModes, debugViews));
	const resolvedViewCols = $derived(getResolvedViewCols(viewCols, visibleModes, debugViews));
	const modifiedSnippets = $derived(createModifiedSnippets(snippets, placeModifier));
	const snippetsKey = $derived(Object.keys(modifiedSnippets).sort().join('|'));

	const localProps = $derived(
		cleanProps({
			tag,
			grid,
			rail,
			ratio,
			size,
			rows,
			cols,
			items,
			content,
			gap,
			class: className
		})
	);

	const mergedProps = $derived(mergeProps(localProps, componentProps));
	const propsKey = $derived(JSON.stringify(mergedProps));
	const shouldShowLog = $derived(inspect && normalizedLogMode !== 'hide');
	const shouldOpenLog = $derived(
		normalizedLogMode === 'open' ||
			(normalizedLogMode === 'failed' && getTotalIssues().length > 0)
	);

	function normalizeModeViews(values: Array<DemoMode | string>): DemoMode[] {
		const nextModes: DemoMode[] = [];

		for (const value of values) {
			const candidate = String(value).trim().toLowerCase() as DemoMode;
			if (validModes.includes(candidate)) nextModes.push(candidate);
		}

		return nextModes.length ? nextModes : ['auto'];
	}

	function normalizeDebugView(value: unknown): DebugViewName {
		const candidate = String(value).trim().toLowerCase();
		if (candidate === 'inline') return 'inline';
		if (candidate === 'split') return 'split';
		return 'off';
	}

	function normalizeLogMode(value: unknown): LogMode {
		const candidate = String(value).trim().toLowerCase();
		if (candidate === 'open') return 'open';
		if (candidate === 'failed') return 'failed';
		return 'hide';
	}

	function cleanProps(props: DemoComponentProps): DemoComponentProps {
		const clean: DemoComponentProps = {};

		for (const [key, value] of Object.entries(props)) {
			if (value !== '') clean[key] = value;
		}

		return clean;
	}

	function mergeProps(local: DemoComponentProps, global: DemoComponentProps): DemoComponentProps {
		const cleanLocal = cleanProps(local);
		const cleanGlobal = cleanProps(global);
		const classNames: string[] = [];

		if (typeof cleanLocal.class === 'string' && cleanLocal.class) classNames.push(cleanLocal.class);
		if (typeof cleanGlobal.class === 'string' && cleanGlobal.class) classNames.push(cleanGlobal.class);

		return {
			...cleanLocal,
			...cleanGlobal,
			...(classNames.length ? { class: classNames.join(' ') } : {})
		};
	}

	function getDebugViews(value: DebugViewName): DebugViewItem[] {
		if (value === 'inline') {
			return [{ key: 'inline', label: 'Debug', debug: true }];
		}

		if (value === 'off') {
			return [{ key: 'normal', label: 'Normal', debug: false }];
		}

		return [
			{ key: 'normal', label: 'Normal', debug: false },
			{ key: 'debug', label: 'Debug', debug: true }
		];
	}

	function getResolvedViewCols(
		value: string | number,
		modes: DemoMode[],
		views: DebugViewItem[]
	): number {
		const numericValue = Number(value);

		if ([1, 2, 3, 4, 5, 6].includes(numericValue)) return numericValue;

		return Math.min(6, Math.max(1, modes.length * views.length));
	}

	function hasExplicitModifier(key: string): boolean {
		for (const modifier of placeModifiers) {
			if (key.endsWith(modifier)) return true;
		}

		return false;
	}

	function createModifiedSnippets(source: DemoSnippets, modifier: string): DemoSnippets {
		if (!modifier) return source;

		const modified: DemoSnippets = {};

		for (const [key, snippet] of Object.entries(source)) {
			if (typeof snippet !== 'function') {
				modified[key] = snippet;
				continue;
			}

			const nextKey = hasExplicitModifier(key) ? key : key + modifier;
			modified[nextKey] = snippet;
		}

		return modified;
	}

	function createFlatViews(modes: DemoMode[], views: DebugViewItem[]): FlatView[] {
		const flat: FlatView[] = [];

		for (const mode of modes) {
			for (const view of views) {
				flat.push({ key: `${mode}:${view.key}`, mode, view });
			}
		}

		return flat;
	}

	function getPrimaryView(): DebugViewKey {
		if (normalizedDebugView === 'inline') return 'inline';
		return 'normal';
	}

	function createProps(mode: DemoMode, debug: boolean): DemoComponentProps {
		const { mode: _mode, debug: _debug, children: _children, ...rest } = mergedProps;

		return {
			...rest,
			mode,
			debug
		};
	}

	function getPanelKey(mode: DemoMode | string, view: string): string {
		return `${mode}:${view}`;
	}

	function createEmptyStats(): PanelStats {
		return {
			found: false,
			mode: '',
			debug: false,
			rows: [],
			cols: [],
			internalRows: [],
			internalCols: [],
			resolvedModes: [],
			items: [],
			roots: []
		};
	}

	function toIndexes(value: unknown): number[] {
		return String(value || '')
			.split(',')
			.map((item) => Number(item.trim()))
			.filter(Boolean);
	}

	function toText(element: Element | null | undefined): string {
		return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
	}

	function toCssData(element: Element): CssData {
		const style = getComputedStyle(element);

		return {
			display: style.display,
			position: style.position,
			boxSizing: style.boxSizing,
			minWidth: style.minWidth,
			width: style.width,
			maxWidth: style.maxWidth,
			minHeight: style.minHeight,
			height: style.height,
			maxHeight: style.maxHeight,
			padding: style.padding,
			margin: style.margin,
			border: style.border,
			aspectRatio: style.aspectRatio,
			gridTemplateRows: style.gridTemplateRows,
			gridTemplateColumns: style.gridTemplateColumns,
			gridAutoRows: style.gridAutoRows,
			gridAutoColumns: style.gridAutoColumns,
			gridAutoFlow: style.gridAutoFlow,
			gap: style.gap,
			rowGap: style.rowGap,
			columnGap: style.columnGap,
			placeContent: style.placeContent,
			placeItems: style.placeItems,
			placeSelf: style.placeSelf,
			gridColumn: style.gridColumn,
			gridRow: style.gridRow
		};
	}

	function toChildData(element: HTMLElement): ChildData {
		const items: ChildDataItem[] = [];

		for (const child of element.children) {
			const childElement = child as HTMLElement;
			items.push({
				tag: childElement.tagName.toLowerCase(),
				className: childElement.className || '',
				text: toText(childElement)
			});
		}

		return { count: items.length, items };
	}

	function toRootData(element: HTMLElement, index: number): RootData {
		const rect = element.getBoundingClientRect();

		return {
			index,
			tag: element.tagName.toLowerCase(),
			className: element.className || '',
			text: toText(element).slice(0, 80),
			size: {
				width: Number(rect.width.toFixed(2)),
				height: Number(rect.height.toFixed(2))
			},
			css: toCssData(element),
			data: {
				grid: element.dataset.grid || '',
				mode: element.dataset.gridMode || '',
				rail: element.dataset.gridRail || '',
				ratio: element.dataset.gridRatio || '',
				rows: element.dataset.gridRows || '',
				cols: element.dataset.gridCols || '',
				internal: element.dataset.gridInternal || ''
			},
			children: toChildData(element)
		};
	}

	function toItemData(element: HTMLElement): ItemData {
		return {
			label: element.dataset.gridLabel || '',
			base: element.dataset.gridBase || '',
			family: element.dataset.gridFamily || '',
			mode: element.dataset.gridMode || '',
			canonical: element.dataset.gridCanonical || '',
			railZone: element.dataset.gridRailZone || '',
			col: `${element.dataset.gridColStart || ''} / ${element.dataset.gridColEnd || ''}`,
			row: `${element.dataset.gridRowStart || ''} / ${element.dataset.gridRowEnd || ''}`
		};
	}

	function getResolvedModes(roots: RootData[]): string[] {
		const modes = new Set<string>();

		for (const root of roots) {
			for (const child of root.children.items) {
				const match = String(child.className).match(/is-mode-([a-z]+)/);
				if (match?.[1]) modes.add(match[1]);
			}
		}

		return [...modes];
	}

	function readPanel(panel: HTMLDivElement | undefined): PanelStats {
		const roots: RootData[] = [];
		const rootElements = panel ? panel.querySelectorAll<HTMLElement>('.root-grid') : [];

		for (const [index, root] of Array.from(rootElements).entries()) {
			roots.push(toRootData(root, index));
		}

		const debugRoot = panel?.querySelector<HTMLElement>('[data-grid-root="true"]');
		const resolvedModes = getResolvedModes(roots);

		if (!debugRoot) {
			return { ...createEmptyStats(), resolvedModes, roots };
		}

		const itemElements = debugRoot.querySelectorAll<HTMLElement>('[data-grid-role="item"]');
		const items: ItemData[] = [];

		for (const element of itemElements) {
			items.push(toItemData(element));
		}

		return {
			found: true,
			mode: debugRoot.dataset.gridMode || '',
			debug: debugRoot.dataset.gridDebug === 'true',
			rows: toIndexes(debugRoot.dataset.gridRows),
			cols: toIndexes(debugRoot.dataset.gridCols),
			internalRows: toIndexes(debugRoot.dataset.gridRows),
			internalCols: toIndexes(debugRoot.dataset.gridCols),
			resolvedModes,
			items,
			roots
		};
	}

	function getStats(mode: DemoMode, view: DebugViewKey = getPrimaryView()): PanelStats {
		return stats[getPanelKey(mode, view)] ?? createEmptyStats();
	}

	function getAutoModeLabel(mode: DemoMode, viewKey: DebugViewKey): string {
		const activeStats = getStats(mode, viewKey);
		const modes = activeStats.resolvedModes;

		if (mode !== 'auto' || !modes.length) return mode.toUpperCase();

		return `AUTO (${modes.map((item) => item.toUpperCase()).join('+')})`;
	}

	function getModeClass(mode: DemoMode): string {
		return `is-mode-${mode}`;
	}

	function toComparableList(values: ComparableValue[]): string {
		return [...values].map(String).sort().join('|');
	}

	function toExpectedLabel(value: string): string {
		if (!placeModifier) return value;
		if (!value.endsWith(placeModifier)) return value;

		return value.slice(0, -placeModifier.length);
	}

	function createIssues(mode: DemoMode): string[] {
		const expectedValue = expect?.[mode];
		const activeStats = getStats(mode);
		const nextIssues: string[] = [];

		if (!expectedValue) return nextIssues;

		const actualItems = activeStats.items.map((item) => toExpectedLabel(item.label));

		if (toComparableList(activeStats.rows) !== toComparableList(expectedValue.rows ?? [])) {
			nextIssues.push(`rows expected [${expectedValue.rows}] but got [${activeStats.rows}]`);
		}

		if (toComparableList(activeStats.cols) !== toComparableList(expectedValue.cols ?? [])) {
			nextIssues.push(`cols expected [${expectedValue.cols}] but got [${activeStats.cols}]`);
		}

		if (typeof expectedValue.itemCount === 'number' && actualItems.length !== expectedValue.itemCount) {
			nextIssues.push(`itemCount expected ${expectedValue.itemCount} but got ${actualItems.length}`);
		}

		if (expectedValue.items && toComparableList(actualItems) !== toComparableList(expectedValue.items)) {
			nextIssues.push(`items expected [${expectedValue.items}] but got [${actualItems}]`);
		}

		return nextIssues;
	}

	function getTotalIssues(): string[] {
		const issues: string[] = [];

		for (const mode of visibleModes) {
			for (const issue of createIssues(mode)) {
				issues.push(`${mode}: ${issue}`);
			}
		}

		return issues;
	}

	function getStatusLabel(): string {
		if (!expect) return 'Inspect';
		return getTotalIssues().length ? 'Failed' : 'Passed';
	}

	function getStatusClass(): string {
		if (!expect) return 'is-neutral';
		return getTotalIssues().length ? 'is-failed' : 'is-passed';
	}

	function createLogPayload(): Record<string, Record<string, PanelStats>> {
		const payload: Record<string, Record<string, PanelStats>> = {};

		for (const mode of visibleModes) {
			payload[mode] = {};

			for (const view of debugViews) {
				payload[mode][view.key] = getStats(mode, view.key);
			}
		}

		return payload;
	}

	async function copyLog(value: unknown): Promise<void> {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
	}

	async function refreshStats(): Promise<void> {
		await tick();

		const nextStats: Record<string, PanelStats> = {};

		for (const panel of flatViews) {
			nextStats[getPanelKey(panel.mode, panel.view.key)] = readPanel(panelRefs[panel.key]);
		}

		stats = nextStats;
	}

	$effect(() => {
		panelRefs;
		propsKey;
		snippetsKey;
		modeViews;
		debugView;
		normalizedDebugView;
		viewCols;
		placeModifier;
		inspect;
		logMode;
		normalizedLogMode;
		children;

		refreshStats();
	});
</script>

<article class="demo-card">
	<section class="demo-card-grid" style:grid-template-columns="repeat({resolvedViewCols}, minmax(0, 1fr))">
		{#each flatViews as panel (panel.key)}
			<section class="demo-panel">
				<header class="demo-panel-header">
					<strong>{label}</strong>

					<span class="demo-pills">
						<span class="demo-pill {getModeClass(panel.mode)}">{getAutoModeLabel(panel.mode, panel.view.key)}</span>

						{#if panel.view.debug}
							<span class="demo-pill is-debug">DEBUG</span>
						{/if}
					</span>
				</header>

				<div class="demo-panel-body" bind:this={panelRefs[panel.key]}>
					{#key `${panel.mode}:${panel.view.key}:${propsKey}:${snippetsKey}`}
						{#if children}
							<Component {...createProps(panel.mode, panel.view.debug)} {...modifiedSnippets}>
								{@render children()}
							</Component>
						{:else}
							<Component {...createProps(panel.mode, panel.view.debug)} {...modifiedSnippets} />
						{/if}
					{/key}
				</div>
			</section>
		{/each}
	</section>

	{#if shouldShowLog}
		<details class="demo-log" open={shouldOpenLog}>
			<summary class="{getStatusClass()}">
				{getStatusLabel()} - {expect ? `${getTotalIssues().length} issue${getTotalIssues().length === 1 ? '' : 's'}` : 'actual output'}
			</summary>

			<div class="demo-log-body">
				<button class="copy-all-button" type="button" onclick={() => copyLog(createLogPayload())}>
					Copy all JSON
				</button>

				{#if getTotalIssues().length}
					<section class="issue-card">
						<strong>Issues</strong>

						<ul>
							{#each getTotalIssues() as issue}
								<li>{issue}</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#each visibleModes as mode}
					<details class="actual-card">
						<summary>Actual - {mode}</summary>

						<div class="actual-list">
							{#each debugViews as view}
								<section class="json-card">
									<header>
										<strong>{view.label}</strong>
										<button type="button" onclick={() => copyLog(getStats(mode, view.key))}>Copy</button>
									</header>
									<pre>{JSON.stringify(getStats(mode, view.key), null, 2)}</pre>
								</section>
							{/each}
						</div>
					</details>
				{/each}
			</div>
		</details>
	{/if}
</article>

<style>
	.demo-card {
		display: contents;
	}

	.demo-card-grid {
		display: contents;
	}

	.demo-panel {
		min-width: 0;
		overflow: hidden;
		padding: 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.875rem;
		background: #f8fafc;
	}

	.demo-panel-header {
		display: flex;
		gap: 0.75rem;
		align-items: start;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.demo-panel-header > strong {
		min-width: 0;
		color: #0f172a;
		font-size: 0.85rem;
		font-weight: 900;
		line-height: 1.2;
	}

	.demo-pills {
		display: inline-flex;
		flex: 0 0 auto;
		flex-wrap: wrap;
		gap: 0.35rem;
		justify-content: flex-end;
	}

	.demo-pill {
		display: inline-flex;
		align-items: center;
		border-radius: 999rem;
		padding: 0.22rem 0.55rem;
		background: #e2e8f0;
		color: #334155;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		line-height: 1;
	}

	.demo-pill.is-mode-auto {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.demo-pill.is-mode-grid {
		background: #ede9fe;
		color: #6d28d9;
	}

	.demo-pill.is-mode-compact {
		background: #dcfce7;
		color: #15803d;
	}

	.demo-pill.is-mode-fit {
		background: #fef3c7;
		color: #b45309;
	}

	.demo-pill.is-mode-fill {
		background: #fee2e2;
		color: #b91c1c;
	}

	.demo-pill.is-debug {
		background: #e2e8f0;
		color: #475569;
	}

	.demo-log {
		grid-column: 1 / -1;
		margin-top: 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.875rem;
		background: white;
	}

	.demo-log > summary {
		cursor: pointer;
		padding: 0.6rem 0.75rem;
		font-size: 0.78rem;
		font-weight: 900;
	}

	.demo-log > summary.is-neutral {
		color: #475569;
	}

	.demo-log > summary.is-passed {
		color: #047857;
	}

	.demo-log > summary.is-failed {
		color: #b91c1c;
	}

	.demo-log-body {
		display: grid;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.copy-all-button,
	.json-card button {
		justify-self: start;
		border: 0;
		border-radius: 999rem;
		background: #0f172a;
		color: white;
		padding: 0.35rem 0.65rem;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 900;
		cursor: pointer;
	}

	.issue-card,
	.actual-card,
	.json-card {
		border: 1px solid #cbd5e1;
		border-radius: 0.75rem;
		background: #f8fafc;
	}

	.issue-card {
		padding: 0.75rem;
		color: #991b1b;
		background: #fef2f2;
	}

	.issue-card ul {
		margin: 0.5rem 0 0;
		padding-left: 1.25rem;
	}

	.actual-card > summary {
		cursor: pointer;
		padding: 0.6rem 0.75rem;
		font-size: 0.78rem;
		font-weight: 900;
	}

	.actual-list {
		display: grid;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	.json-card {
		overflow: hidden;
	}

	.json-card header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem;
		border-bottom: 1px solid #cbd5e1;
		background: white;
	}

	.json-card pre {
		max-height: 20rem;
		margin: 0;
		overflow: auto;
		padding: 0.75rem;
		background: #020617;
		color: #e2e8f0;
		font-size: 0.72rem;
		white-space: pre-wrap;
	}
</style>
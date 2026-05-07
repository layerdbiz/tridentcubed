
<!-- Demo.svelte -->
<script>
	import { tick } from 'svelte';
	import Component from './Component.svelte';

	let {
		label = '',
		componentProps = {},
		modeViews = ['auto'],
		debugView = 'off',
		viewCols = '1',
		placeModifier = '',
		inspect = false,
		expect = null,
		logMode = 'hide',

		// local passthrough props
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

		// children/snippets
		children,
		...snippets
	} = $props();

	let demoRoot = $state(null);
	let stats = $state({});

	const placeModifiers = ['TL', 'TC', 'TR', 'LC', 'CC', 'RC', 'BL', 'BC', 'BR'];

	const visibleModes = $derived(modeViews.length ? modeViews : ['auto']);
	const debugViews = $derived(getDebugViews(debugView));
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
	const shouldShowLog = $derived(inspect && logMode !== 'hide');
	const shouldOpenLog = $derived(logMode === 'open' || (logMode === 'failed' && getTotalIssues().length > 0));

	function cleanProps(props) {
		const clean = {};

		for (const [key, value] of Object.entries(props)) {
			if (value !== '') clean[key] = value;
		}

		return clean;
	}

	function mergeProps(local, global) {
		const cleanLocal = cleanProps(local);
		const cleanGlobal = cleanProps(global);
		const classNames = [];

		if (cleanLocal.class) classNames.push(cleanLocal.class);
		if (cleanGlobal.class) classNames.push(cleanGlobal.class);

		return {
			...cleanLocal,
			...cleanGlobal,
			...(classNames.length ? { class: classNames.join(' ') } : {})
		};
	}

	function getDebugViews(value) {
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

	function getResolvedViewCols(value, modes, views) {
		const numericValue = Number(value);

		if ([1, 2, 3, 4, 5, 6].includes(numericValue)) return numericValue;

		return Math.min(6, Math.max(1, modes.length * views.length));
	}

	function hasExplicitModifier(key) {
		for (const modifier of placeModifiers) {
			if (key.endsWith(modifier)) return true;
		}

		return false;
	}

	function createModifiedSnippets(source, modifier) {
		if (!modifier) return source;

		const modified = {};

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

	function createFlatViews(modes, views) {
		const flat = [];

		for (const mode of modes) {
			for (const view of views) {
				flat.push({
					key: `${mode}:${view.key}`,
					mode,
					view
				});
			}
		}

		return flat;
	}

	function getPrimaryView() {
		if (debugView === 'inline') return 'inline';
		return 'normal';
	}

	function createProps(mode, debug) {
		const {
			mode: _mode,
			debug: _debug,
			children: _children,
			...rest
		} = mergedProps;

		return {
			...rest,
			mode,
			debug
		};
	}

	function getPanelKey(mode, view) {
		return `${mode}:${view}`;
	}

	function createEmptyStats() {
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

	function toIndexes(value) {
		return String(value || '')
			.split(',')
			.map((item) => Number(item.trim()))
			.filter(Boolean);
	}

	function toText(element) {
		return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
	}

	function toCssData(element) {
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

	function toChildData(element) {
		const items = [];

		for (const child of element.children) {
			items.push({
				tag: child.tagName.toLowerCase(),
				className: child.className || '',
				text: toText(child)
			});
		}

		return {
			count: items.length,
			items
		};
	}

	function toRootData(element, index) {
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

	function toItemData(element) {
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

	function getResolvedModes(roots) {
		const modes = new Set();

		for (const root of roots) {
			for (const child of root.children.items) {
				const match = String(child.className).match(/is-mode-([a-z]+)/);
				if (match?.[1]) modes.add(match[1]);
			}
		}

		return [...modes];
	}

	function readPanel(panel) {
		const roots = [];
		const rootElements = panel?.querySelectorAll('.root-grid') ?? [];

		for (const [index, root] of rootElements.entries()) {
			roots.push(toRootData(root, index));
		}

		const debugRoot = panel?.querySelector('[data-grid-root="true"]');
		const resolvedModes = getResolvedModes(roots);

		if (!debugRoot) {
			return {
				...createEmptyStats(),
				resolvedModes,
				roots
			};
		}

		const itemElements = debugRoot.querySelectorAll('[data-grid-role="item"]');
		const items = [];

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

	function getStats(mode, view = getPrimaryView()) {
		return stats[getPanelKey(mode, view)] ?? createEmptyStats();
	}

	function getAutoModeLabel(mode, viewKey) {
		const activeStats = getStats(mode, viewKey);
		const modes = activeStats.resolvedModes;

		if (mode !== 'auto' || !modes.length) return mode.toUpperCase();

		return `AUTO (${modes.map((item) => item.toUpperCase()).join('+')})`;
	}

	function getModeClass(mode) {
		return `is-mode-${mode}`;
	}

	function toComparableList(values) {
		return [...values].map(String).sort().join('|');
	}

	function toExpectedLabel(value) {
		if (!placeModifier) return value;
		if (!value.endsWith(placeModifier)) return value;

		return value.slice(0, -placeModifier.length);
	}

	function createIssues(mode) {
		const expected = expect?.[mode];
		const activeStats = getStats(mode);
		const nextIssues = [];

		if (!expected) return nextIssues;

		const actualItems = activeStats.items.map((item) => toExpectedLabel(item.label));

		if (toComparableList(activeStats.rows) !== toComparableList(expected.rows ?? [])) {
			nextIssues.push(`rows expected [${expected.rows}] but got [${activeStats.rows}]`);
		}

		if (toComparableList(activeStats.cols) !== toComparableList(expected.cols ?? [])) {
			nextIssues.push(`cols expected [${expected.cols}] but got [${activeStats.cols}]`);
		}

		if (typeof expected.itemCount === 'number' && actualItems.length !== expected.itemCount) {
			nextIssues.push(`itemCount expected ${expected.itemCount} but got ${actualItems.length}`);
		}

		if (expected.items && toComparableList(actualItems) !== toComparableList(expected.items)) {
			nextIssues.push(`items expected [${expected.items}] but got [${actualItems}]`);
		}

		return nextIssues;
	}

	function getTotalIssues() {
		const issues = [];

		for (const mode of visibleModes) {
			for (const issue of createIssues(mode)) {
				issues.push(`${mode}: ${issue}`);
			}
		}

		return issues;
	}

	function getStatusLabel() {
		if (!expect) return 'Ç Inspect';
		return getTotalIssues().length ? ' Failed' : ' Passed';
	}

	function getStatusClass() {
		if (!expect) return 'is-neutral';
		return getTotalIssues().length ? 'is-failed' : 'is-passed';
	}

	function createLogPayload() {
		const payload = {};

		for (const mode of visibleModes) {
			payload[mode] = {};

			for (const view of debugViews) {
				payload[mode][view.key] = getStats(mode, view.key);
			}
		}

		return payload;
	}

	async function copyLog(value) {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
	}

	async function refreshStats() {
		await tick();

		const nextStats = {};
		const panels = demoRoot?.querySelectorAll('[data-demo-panel]') ?? [];

		for (const panel of panels) {
			const mode = panel.dataset.demoMode;
			const view = panel.dataset.demoView;

			nextStats[getPanelKey(mode, view)] = readPanel(panel);
		}

		stats = nextStats;
	}

	$effect(() => {
		demoRoot;
		propsKey;
		snippetsKey;
		modeViews;
		debugView;
		viewCols;
		placeModifier;
		inspect;
		logMode;
		children;

		refreshStats();
	});
</script>

<article bind:this={demoRoot} class="demo-card">
	<section
		class="demo-card-grid"
		style:grid-template-columns="repeat({resolvedViewCols}, minmax(0, 1fr))"
		data-view-cols={resolvedViewCols}
	>
		{#each flatViews as panel (panel.key)}
			<section class="demo-panel">
				<header class="demo-panel-header">
					<strong>{label}</strong>

					<span class="demo-pills">
						<span class="demo-pill {getModeClass(panel.mode)}">
							{getAutoModeLabel(panel.mode, panel.view.key)}
						</span>

						{#if panel.view.debug}
							<span class="demo-pill is-debug">DEBUG</span>
						{/if}
					</span>
				</header>

				<div data-demo-panel data-demo-mode={panel.mode} data-demo-view={panel.view.key}>
					{#key `${panel.mode}:${panel.view.key}:${propsKey}:${snippetsKey}`}
						<Component {...createProps(panel.mode, panel.view.debug)} {...modifiedSnippets}>
							{#if children}
								{@render children()}
							{/if}
						</Component>
					{/key}
				</div>
			</section>
		{/each}
	</section>

	{#if shouldShowLog}
		<details class="demo-log" open={shouldOpenLog}>
			<summary class="{getStatusClass()}">
				{getStatusLabel()} · {expect ? `${getTotalIssues().length} issue${getTotalIssues().length === 1 ? '' : 's'}` : 'actual output'}
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
						<summary>Actual · {mode}</summary>

						<div class="actual-list">
							{#each debugViews as view}
								<section class="json-card">
									<header>
										<strong>{view.label}</strong>

										<button type="button" onclick={() => copyLog(getStats(mode, view.key))}>
											Copy
										</button>
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

<!-- SnippetsDemos.svelte -->
<script>
	import Demo from './Demo.svelte';

	let {
		componentProps = {},
		modeViews = ['grid'],
		debugView = 'split',
		viewCols = '2',
		placeModifier = '',
		logMode = 'hide'
	} = $props();

	const all = [1, 2, 3];
	const mid = [2];
	const panelViewCols = '1';
	const resolvedDemoCols = $derived(getResolvedDemoCols(viewCols));

	function getResolvedDemoCols(value) {
		const numericValue = Number(value);

		if ([1, 2, 3, 4, 5, 6].includes(numericValue)) return numericValue;

		return 1;
	}

	function makeExpect({ autoRows, autoCols, gridRows = all, gridCols = all, compactRows, compactCols = all, fitRows, fitCols, fillRows = all, fillCols = all, items }) {
		return {
			auto: { rows: autoRows, cols: autoCols, items, itemCount: items.length },
			grid: { rows: gridRows, cols: gridCols, items, itemCount: items.length },
			compact: { rows: compactRows, cols: compactCols, items, itemCount: items.length },
			fit: { rows: fitRows ?? compactRows, cols: fitCols ?? compactCols, items, itemCount: items.length },
			fill: { rows: fillRows, cols: fillCols, items, itemCount: items.length }
		};
	}

	function makeSameExpect({ rows, cols, items }) {
		return makeExpect({
			autoRows: rows,
			autoCols: cols,
			gridRows: rows,
			gridCols: cols,
			compactRows: rows,
			compactCols: cols,
			fitRows: rows,
			fitCols: cols,
			fillRows: rows,
			fillCols: cols,
			items
		});
	}

	function makeGridToCompactExpect({ compactRows, compactCols = all, items }) {
		return makeExpect({
			autoRows: all,
			autoCols: all,
			gridRows: all,
			gridCols: all,
			compactRows,
			compactCols,
			fitRows: compactRows,
			fitCols: compactCols,
			fillRows: all,
			fillCols: all,
			items
		});
	}

	function makeHalfExpect(items) {
		return makeExpect({
			autoRows: mid,
			autoCols: mid,
			gridRows: all,
			gridCols: all,
			compactRows: mid,
			compactCols: mid,
			fitRows: mid,
			fitCols: mid,
			fillRows: all,
			fillCols: all,
			items
		});
	}

	const expected = {
		canonicalA1: makeGridToCompactExpect({ compactRows: [1], items: ['a1'] }),
		canonicalB2: makeGridToCompactExpect({ compactRows: [2], items: ['b2'] }),
		canonicalC3: makeGridToCompactExpect({ compactRows: [3], items: ['c3'] }),
		canonicalDiagonal: makeGridToCompactExpect({ compactRows: all, items: ['a1', 'b2', 'c3'] }),
		topLeft: makeGridToCompactExpect({ compactRows: [1], items: ['topLeft'] }),
		topRight: makeGridToCompactExpect({ compactRows: [1], items: ['topRight'] }),
		bottomLeft: makeGridToCompactExpect({ compactRows: [3], items: ['bottomLeft'] }),
		bottomRight: makeGridToCompactExpect({ compactRows: [3], items: ['bottomRight'] }),
		leftCenterRight: makeGridToCompactExpect({ compactRows: [2], items: ['left', 'center', 'right'] }),
		topCenterBottom: makeGridToCompactExpect({ compactRows: all, compactCols: [2], items: ['top', 'center', 'bottom'] }),
		friendlyCols: makeGridToCompactExpect({ compactRows: [2], items: ['leftCol', 'col', 'rightCol'] }),
		friendlyRows: makeGridToCompactExpect({ compactRows: all, items: ['topRow', 'row', 'bottomRow'] }),
		rangeA1B2: makeGridToCompactExpect({ compactRows: [1, 2], compactCols: [1, 2], items: ['a1b2'] }),
		rangeB2C3: makeGridToCompactExpect({ compactRows: [2, 3], compactCols: [2, 3], items: ['b2c3'] }),
		rangeA1C1: makeGridToCompactExpect({ compactRows: [1], items: ['a1c1'] }),
		rangeC1C3: makeGridToCompactExpect({ compactRows: all, compactCols: [3], items: ['c1c3'] }),
		rangeA1C3: makeGridToCompactExpect({ compactRows: all, items: ['a1c3'] }),
		topHalf: makeHalfExpect(['topHalf']),
		bottomHalf: makeHalfExpect(['bottomHalf']),
		leftHalf: makeHalfExpect(['leftHalf']),
		rightHalf: makeHalfExpect(['rightHalf']),
		topBottomHalves: makeHalfExpect(['topHalf', 'bottomHalf']),
		leftRightHalves: makeHalfExpect(['leftHalf', 'rightHalf']),
		allHalves: makeHalfExpect(['topHalf', 'bottomHalf', 'leftHalf', 'rightHalf']),
		bg: makeSameExpect({ rows: all, cols: all, items: ['bg'] }),
		full: makeSameExpect({ rows: all, cols: all, items: ['full'] }),
		fg: makeSameExpect({ rows: all, cols: all, items: ['fg'] }),
		bgFullCenterFg: makeSameExpect({ rows: all, cols: all, items: ['bg', 'full', 'center', 'fg'] })
	};
</script>

<section class="snippet-demos">
	<details class="demo-section" open>
		<summary class="demo-summary">Plain defaults</summary>
		<section class="demo-section-content" style:grid-template-columns="repeat({resolvedDemoCols}, minmax(0, 1fr))">
			<Demo label="0a. empty component stays plain" class="demo plain-probe" modeViews={['auto']} debugView="off" viewCols={panelViewCols} />
			<Demo label="0b. label only stays plain" class="demo plain-probe" componentProps={{ label: 'Plain label only' }} modeViews={['auto']} debugView="off" viewCols={panelViewCols} />
			<Demo label="0c. tag and children stay plain" class="demo plain-probe" tag="section" modeViews={['auto']} debugView="off" viewCols={panelViewCols}>plain child content</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Canonical cells</summary>
		<section class="demo-section-content" style:grid-template-columns="repeat({resolvedDemoCols}, minmax(0, 1fr))">
			<Demo label="1. canonical cell a1" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.canonicalA1} {logMode}>{#snippet a1()}{/snippet}</Demo>
			<Demo label="2. canonical cell b2" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.canonicalB2} {logMode}>{#snippet b2()}{/snippet}</Demo>
			<Demo label="3. canonical cell c3" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.canonicalC3} {logMode}>{#snippet c3()}{/snippet}</Demo>
			<Demo label="4. canonical diagonal a1 b2 c3" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.canonicalDiagonal} {logMode}>{#snippet a1()}{/snippet}{#snippet b2()}{/snippet}{#snippet c3()}{/snippet}</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Friendly cells</summary>
		<section class="demo-section-content" style:grid-template-columns="repeat({resolvedDemoCols}, minmax(0, 1fr))">
			<Demo label="5. friendly corner topLeft" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.topLeft} {logMode}>{#snippet topLeft()}{/snippet}</Demo>
			<Demo label="6. friendly corner topRight" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.topRight} {logMode}>{#snippet topRight()}{/snippet}</Demo>
			<Demo label="7. friendly corner bottomLeft" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.bottomLeft} {logMode}>{#snippet bottomLeft()}{/snippet}</Demo>
			<Demo label="8. friendly corner bottomRight" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.bottomRight} {logMode}>{#snippet bottomRight()}{/snippet}</Demo>
			<Demo label="9a. friendly position left center" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.leftCenterRight} {logMode}>{#snippet left()}{/snippet}{#snippet center()}{/snippet}</Demo>
			<Demo label="9b. friendly position left center right" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.leftCenterRight} {logMode}>{#snippet left()}{/snippet}{#snippet center()}{/snippet}{#snippet right()}{/snippet}</Demo>
			<Demo label="10a. friendly position top center" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.topCenterBottom} {logMode}>{#snippet top()}{/snippet}{#snippet center()}{/snippet}</Demo>
			<Demo label="10b. friendly position top center bottom" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.topCenterBottom} {logMode}>{#snippet top()}{/snippet}{#snippet center()}{/snippet}{#snippet bottom()}{/snippet}</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Rows and columns</summary>
		<section class="demo-section-content" style:grid-template-columns="repeat({resolvedDemoCols}, minmax(0, 1fr))">
			<Demo label="11a. friendly columns leftCol col" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.friendlyCols} {logMode}>{#snippet leftCol()}{/snippet}{#snippet col()}{/snippet}</Demo>
			<Demo label="11b. friendly columns leftCol col rightCol" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.friendlyCols} {logMode}>{#snippet leftCol()}{/snippet}{#snippet col()}{/snippet}{#snippet rightCol()}{/snippet}</Demo>
			<Demo label="12. canonical columns col1 col2 col3" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect {logMode}>{#snippet col1()}{/snippet}{#snippet col2()}{/snippet}{#snippet col3()}{/snippet}</Demo>
			<Demo label="13. friendly rows topRow row bottomRow" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.friendlyRows} {logMode}>{#snippet topRow()}{/snippet}{#snippet row()}{/snippet}{#snippet bottomRow()}{/snippet}</Demo>
			<Demo label="14. canonical rows row1 row2 row3" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect {logMode}>{#snippet row1()}{/snippet}{#snippet row2()}{/snippet}{#snippet row3()}{/snippet}</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Ranges</summary>
		<section class="demo-section-content" style:grid-template-columns="repeat({resolvedDemoCols}, minmax(0, 1fr))">
			<Demo label="15. cells matching range a1 b1 a2 b2" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect {logMode}>{#snippet a1()}{/snippet}{#snippet b1()}{/snippet}{#snippet a2()}{/snippet}{#snippet b2()}{/snippet}</Demo>
			<Demo label="16. range a1b2" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.rangeA1B2} {logMode}>{#snippet a1b2()}{/snippet}</Demo>
			<Demo label="17. range b2c3" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.rangeB2C3} {logMode}>{#snippet b2c3()}{/snippet}</Demo>
			<Demo label="18. range a1c1" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.rangeA1C1} {logMode}>{#snippet a1c1()}{/snippet}</Demo>
			<Demo label="19. range c1c3" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.rangeC1C3} {logMode}>{#snippet c1c3()}{/snippet}</Demo>
			<Demo label="20. range a1c3" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.rangeA1C3} {logMode}>{#snippet a1c3()}{/snippet}</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Halves</summary>
		<section class="demo-section-content" style:grid-template-columns="repeat({resolvedDemoCols}, minmax(0, 1fr))">
			<Demo label="21. half topHalf" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.topHalf} {logMode}>{#snippet topHalf()}{/snippet}</Demo>
			<Demo label="22. half bottomHalf" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.bottomHalf} {logMode}>{#snippet bottomHalf()}{/snippet}</Demo>
			<Demo label="23. half leftHalf" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.leftHalf} {logMode}>{#snippet leftHalf()}{/snippet}</Demo>
			<Demo label="24. half rightHalf" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.rightHalf} {logMode}>{#snippet rightHalf()}{/snippet}</Demo>
			<Demo label="25. halves topHalf bottomHalf" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.topBottomHalves} {logMode}>{#snippet topHalf()}{/snippet}{#snippet bottomHalf()}{/snippet}</Demo>
			<Demo label="26. halves leftHalf rightHalf" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.leftRightHalves} {logMode}>{#snippet leftHalf()}{/snippet}{#snippet rightHalf()}{/snippet}</Demo>
			<Demo label="27. halves all four" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.allHalves} {logMode}>{#snippet topHalf()}{/snippet}{#snippet bottomHalf()}{/snippet}{#snippet leftHalf()}{/snippet}{#snippet rightHalf()}{/snippet}</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Layers</summary>
		<section class="demo-section-content" style:grid-template-columns="repeat({resolvedDemoCols}, minmax(0, 1fr))">
			<Demo label="28. bg only" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.bg} {logMode}>{#snippet bg()}{/snippet}</Demo>
			<Demo label="29. full only" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.full} {logMode}>{#snippet full()}{/snippet}</Demo>
			<Demo label="30. fg only" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.fg} {logMode}>{#snippet fg()}{/snippet}</Demo>
			<Demo label="31. bg full center fg" class="demo" gap="0.5rem" {componentProps} {modeViews} {debugView} viewCols={panelViewCols} {placeModifier} inspect expect={expected.bgFullCenterFg} {logMode}>{#snippet bg()}{/snippet}{#snippet full()}{/snippet}{#snippet center()}{/snippet}{#snippet fg()}{/snippet}</Demo>
		</section>
	</details>
</section>

<style>
	.snippet-demos {
		display: grid;
		gap: 0.5rem;
	}

	.demo-section-content {
		display: grid;
		gap: 0.75rem;
		padding: 0.75rem;
	}

	:global {
		.demo.plain-probe:not(.root-grid) {
			box-sizing: border-box;
			display: block;
			min-height: 4rem;
			padding: 0.75rem;
			border: 1px dashed #94a3b8;
			border-radius: 0.875rem;
			background: linear-gradient(135deg, rgb(248 250 252 / 0.96), rgb(241 245 249 / 0.96));
			color: #0f172a;
		}

		.demo.root-grid {
			min-height: 4rem;
			padding: 0.75rem;
			border: 1px solid #93c5fd;
			border-radius: 0.875rem;
			background: linear-gradient(135deg, rgb(219 234 254 / 0.85), rgb(240 249 255 / 0.85));
			box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.65);
		}

		.demo.root-grid > :where(:not(.root-grid):not(.is-debug):not(.slot-fallback)) {
			box-sizing: border-box;
			display: block;
			position: relative;
			min-width: 0;
			min-height: 0;
			padding: 0.65rem;
			border: 1px solid rgb(148 163 184 / 0.45);
			border-radius: 0.625rem;
			background: white;
			box-shadow: 0 0.25rem 0.75rem rgb(15 23 42 / 0.08);
			font-weight: 800;
			color: #0f172a;
		}

		.demo.root-grid > .is-cell:not(.is-debug) { border-color: #60a5fa; background: #eff6ff; }
		.demo.root-grid > .is-row:not(.is-debug) { border-color: #c084fc; background: #faf5ff; }
		.demo.root-grid > .is-col:not(.is-debug) { border-color: #a78bfa; background: #f5f3ff; }
		.demo.root-grid > .is-range:not(.is-debug) { border-color: #34d399; background: #ecfdf5; }
		.demo.root-grid > .is-half:not(.is-debug) { border-color: #fb923c; background: #fff7ed; }
		.demo.root-grid > .is-bg:not(.is-debug) { border-color: #38bdf8; background: rgb(186 230 253 / 0.65); }
		.demo.root-grid > .is-full:not(.is-debug) { border-color: #facc15; background: rgb(254 249 195 / 0.8); }
		.demo.root-grid > .is-fg:not(.is-debug) { border-color: #f472b6; background: rgb(252 231 243 / 0.88); }

		.demo.root-grid > .is-debug {
			position: relative;
			z-index: 0;
			pointer-events: none;
			overflow: visible;
			padding: 0;
			min-width: 0;
			min-height: 0;
			outline: 1px dashed #94a3b8;
			border: 0;
			background: rgb(148 163 184 / 0.14);
			box-shadow: none;
			color: #64748b;
		}

		.demo.root-grid > .is-debug .slot-fallback {
			display: inline-block;
			background: transparent;
			color: inherit;
			font: inherit;
			line-height: inherit;
			white-space: nowrap;
			pointer-events: none;
		}

		.demo.root-grid > :not(.is-debug) .slot-fallback,
		.demo.root-grid > .slot-fallback {
			display: inline-block;
			padding: 0.25rem 0.5rem;
			border-radius: 0.25rem;
			background: rgb(255 255 255 / 0.7);
			color: inherit;
			font-weight: 800;
		}
	}
</style>
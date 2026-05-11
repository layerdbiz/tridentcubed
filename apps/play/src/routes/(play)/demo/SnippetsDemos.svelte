<!-- SnippetsDemos.svelte -->
<script lang="ts">
	import Demo from './Demo.svelte';

	type GridIndexes = number[];
	type ItemKeys = string[];
	type ModeExpectation = {
		rows: GridIndexes;
		cols: GridIndexes;
		items: ItemKeys;
		itemCount: number;
	};
	type ExpectationMap = {
		auto: ModeExpectation;
		grid: ModeExpectation;
		compact: ModeExpectation;
		fit: ModeExpectation;
		fill: ModeExpectation;
	};
	type MakeExpectInput = {
		autoRows: GridIndexes;
		autoCols: GridIndexes;
		gridRows?: GridIndexes;
		gridCols?: GridIndexes;
		compactRows: GridIndexes;
		compactCols?: GridIndexes;
		fitRows?: GridIndexes;
		fitCols?: GridIndexes;
		fillRows?: GridIndexes;
		fillCols?: GridIndexes;
		items: ItemKeys;
	};

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
	const sectionStyle = $derived(`grid-template-columns: repeat(${resolvedDemoCols}, minmax(0, 1fr))`);
	const sharedDemoProps = $derived({
		class: 'demo',
		gap: '0.5rem',
		componentProps,
		modeViews,
		debugView,
		viewCols: panelViewCols,
		placeModifier,
		inspect: true,
		logMode
	});
	const plainDemoProps = {
		modeViews: ['auto'],
		debugView: 'off',
		viewCols: panelViewCols
	};
	const plainProbeClass =
		'demo min-h-16 rounded-xl p-3 text-slate-950 outline-1 outline-dashed outline-slate-400';

	function getResolvedDemoCols(value: string | number) {
		const numericValue = Number(value);

		if ([1, 2, 3, 4, 5, 6].includes(numericValue)) return numericValue;

		return 1;
	}

	function makeExpect({
		autoRows,
		autoCols,
		gridRows = all,
		gridCols = all,
		compactRows,
		compactCols = all,
		fitRows,
		fitCols,
		fillRows = all,
		fillCols = all,
		items
	}: MakeExpectInput): ExpectationMap {
		return {
			auto: { rows: autoRows, cols: autoCols, items, itemCount: items.length },
			grid: { rows: gridRows, cols: gridCols, items, itemCount: items.length },
			compact: { rows: compactRows, cols: compactCols, items, itemCount: items.length },
			fit: { rows: fitRows ?? compactRows, cols: fitCols ?? compactCols, items, itemCount: items.length },
			fill: { rows: fillRows, cols: fillCols, items, itemCount: items.length }
		};
	}

	function makeSameExpect({ rows, cols, items }: { rows: GridIndexes; cols: GridIndexes; items: ItemKeys }) {
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

	function makeGridToCompactExpect({ compactRows, compactCols = all, items }: { compactRows: GridIndexes; compactCols?: GridIndexes; items: ItemKeys }) {
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

	function makeHalfExpect(items: ItemKeys) {
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
		<section class="demo-section-content" style={sectionStyle}>
			<Demo 
				{...plainDemoProps}
				label="0a. empty component stays plain" class={plainProbeClass} />
			<Demo 
				{...plainDemoProps}
				label="0b. label only stays plain" class={plainProbeClass} componentProps={{ label: 'Plain label only' }} />
			<Demo 
				{...plainDemoProps}
				label="0c. tag and children stay plain" class={plainProbeClass} tag="section">
				plain child content
			</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Canonical cells</summary>
		<section class="demo-section-content" style={sectionStyle}>
			<Demo 
				{...sharedDemoProps}
				label="1. canonical cell a1" 
				expect={expected.canonicalA1}>
				{#snippet a1()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="2. canonical cell b2" 
				expect={expected.canonicalB2}>
				{#snippet b2()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="3. canonical cell c3" 
				expect={expected.canonicalC3}>
				{#snippet c3()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="4. canonical diagonal a1 b2 c3" 
				expect={expected.canonicalDiagonal}>
				{#snippet a1()}{/snippet}
				{#snippet b2()}{/snippet}
				{#snippet c3()}{/snippet}
			</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Friendly cells</summary>
		<section class="demo-section-content" style={sectionStyle}>
			<Demo 
				{...sharedDemoProps}
				label="5. friendly corner topLeft" 
				expect={expected.topLeft}>
				{#snippet topLeft()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="6. friendly corner topRight" 
				expect={expected.topRight}>
				{#snippet topRight()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="7. friendly corner bottomLeft" 
				expect={expected.bottomLeft}>
				{#snippet bottomLeft()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="8. friendly corner bottomRight" 
				expect={expected.bottomRight}>
				{#snippet bottomRight()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="9a. friendly position left center" 
				expect={expected.leftCenterRight}>
				{#snippet left()}{/snippet}
				{#snippet center()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="9b. friendly position left center right" 
				expect={expected.leftCenterRight}>
				{#snippet left()}{/snippet}
				{#snippet center()}{/snippet}
				{#snippet right()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="10a. friendly position top center" 
				expect={expected.topCenterBottom}>
				{#snippet top()}{/snippet}
				{#snippet center()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="10b. friendly position top center bottom" 
				expect={expected.topCenterBottom}>
				{#snippet top()}{/snippet}
				{#snippet center()}{/snippet}
				{#snippet bottom()}{/snippet}
			</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Rows and columns</summary>
		<section class="demo-section-content" style={sectionStyle}>
			<Demo 
				{...sharedDemoProps}
				label="11a. friendly columns leftCol col" 
				expect={expected.friendlyCols}>
				{#snippet leftCol()}{/snippet}
				{#snippet col()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="11b. friendly columns leftCol col rightCol" 
				expect={expected.friendlyCols}>
				{#snippet leftCol()}{/snippet}
				{#snippet col()}{/snippet}
				{#snippet rightCol()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="12. canonical columns col1 col2 col3">
				{#snippet col1()}{/snippet}
				{#snippet col2()}{/snippet}
				{#snippet col3()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="13. friendly rows topRow row bottomRow" 
				expect={expected.friendlyRows}>
				{#snippet topRow()}{/snippet}
				{#snippet row()}{/snippet}
				{#snippet bottomRow()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="14. canonical rows row1 row2 row3">
				{#snippet row1()}{/snippet}
				{#snippet row2()}{/snippet}
				{#snippet row3()}{/snippet}
			</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Ranges</summary>
		<section class="demo-section-content" style={sectionStyle}>
			<Demo 
				{...sharedDemoProps}
				label="15. cells matching range a1 b1 a2 b2">
				{#snippet a1()}{/snippet}
				{#snippet b1()}{/snippet}
				{#snippet a2()}{/snippet}
				{#snippet b2()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="16. range a1b2" 
				expect={expected.rangeA1B2}>
				{#snippet a1b2()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="17. range b2c3" 
				expect={expected.rangeB2C3}>
				{#snippet b2c3()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="18. range a1c1" 
				expect={expected.rangeA1C1}>
				{#snippet a1c1()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="19. range c1c3" 
				expect={expected.rangeC1C3}>
				{#snippet c1c3()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="20. range a1c3" 
				expect={expected.rangeA1C3}>
				{#snippet a1c3()}{/snippet}
			</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Halves</summary>
		<section class="demo-section-content" style={sectionStyle}>
			<Demo 
				{...sharedDemoProps}
				label="21. half topHalf" 
				expect={expected.topHalf}>
				{#snippet topHalf()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="22. half bottomHalf" 
				expect={expected.bottomHalf}>
				{#snippet bottomHalf()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="23. half leftHalf" 
				expect={expected.leftHalf}>
				{#snippet leftHalf()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="24. half rightHalf" 
				expect={expected.rightHalf}>
				{#snippet rightHalf()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="25. halves topHalf bottomHalf" 
				expect={expected.topBottomHalves}>
				{#snippet topHalf()}{/snippet}
				{#snippet bottomHalf()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="26. halves leftHalf rightHalf" 
				expect={expected.leftRightHalves}>
				{#snippet leftHalf()}{/snippet}
				{#snippet rightHalf()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="27. halves all four" 
				expect={expected.allHalves}>
				{#snippet topHalf()}{/snippet}
				{#snippet bottomHalf()}{/snippet}
				{#snippet leftHalf()}{/snippet}
				{#snippet rightHalf()}{/snippet}
			</Demo>
		</section>
	</details>

	<details class="demo-section">
		<summary class="demo-summary">Layers</summary>
		<section class="demo-section-content" style={sectionStyle}>
			<Demo 
				{...sharedDemoProps}
				label="28. bg only" 
				expect={expected.bg}>
				{#snippet bg()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="29. full only" 
				expect={expected.full}>
				{#snippet full()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="30. fg only" 
				expect={expected.fg}>
				{#snippet fg()}{/snippet}
			</Demo>
			<Demo 
				{...sharedDemoProps}
				label="31. bg full center fg" 
				expect={expected.bgFullCenterFg}>
				{#snippet bg()}{/snippet}
				{#snippet full()}{/snippet}
				{#snippet center()}{/snippet}
				{#snippet fg()}{/snippet}
			</Demo>
		</section>
	</details>
</section>
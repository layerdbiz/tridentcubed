
<!-- App.svelte -->
<script>
	import RailsDemos from './RailsDemos.svelte';
	import SnippetsDemos from './SnippetsDemos.svelte';

	const storageKey = 'layout-snippets-controls-client-demo-v3';

	let hasLoadedSettings = $state(false);

	let demoZoom = $state(0.6);
	let activeTab = $state('snippets');
	let placeModifier = $state('');

	let controls = $state({
		snippets: {
			modeViews: ['auto'],
			viewCols: '2',
			debugView: 'split',
			logMode: 'hide'
		},
		rails: {
			modeViews: ['auto'],
			viewCols: '1',
			debugView: 'off',
			logMode: 'hide'
		}
	});

	let tag = $state('');
	let grid = $state('');
	let rail = $state('');
	let ratio = $state('');
	let size = $state('');
	let rows = $state('');
	let cols = $state('');
	let items = $state('');
	let content = $state('');
	let gap = $state('');
	let className = $state('');

	const tabs = ['snippets', 'rails'];
	const modeOptions = ['auto', 'grid', 'compact', 'fit', 'fill'];
	const debugViewOptions = ['off', 'inline', 'split'];
	const viewColOptions = ['auto', '1', '2', '3', '4', '5', '6'];
	const placeModifierOptions = ['', 'TL', 'TC', 'TR', 'LC', 'CC', 'RC', 'BL', 'BC', 'BR'];
	const logOptions = ['open', 'failed', 'closed', 'hide'];
	const gridOptions = ['', 'full', 'inline', 'rails'];
	const tagOptions = ['', 'div', 'main', 'section', 'article', 'header', 'footer', 'aside', 'button', 'a', 'label', 'ul', 'ol'];

	const railOptions = [
		{ label: 'default', value: '' },
		{ label: 'content', value: 'content' },
		{ label: 'xs', value: 'content-xs' },
		{ label: 'sm', value: 'content-sm' },
		{ label: 'md', value: 'content-md' },
		{ label: 'lg', value: 'content-lg' },
		{ label: 'xl', value: 'content-xl' },
		{ label: 'full', value: 'full' },
		{ label: 'bleed', value: 'bleed' },
		{ label: 'left', value: 'bleed-left' },
		{ label: 'right', value: 'bleed-right' },
		{ label: 'left-sm', value: 'bleed-left-sm' },
		{ label: 'right-sm', value: 'bleed-right-sm' },
		{ label: 'left-lg', value: 'bleed-left-lg' },
		{ label: 'right-lg', value: 'bleed-right-lg' }
	];

	const ratioOptions = [
		{ label: 'default', value: '' },
		{ label: 'square', value: 'square' },
		{ label: 'video', value: 'video' },
		{ label: 'horizontal', value: 'horizontal' },
		{ label: 'landscape', value: 'landscape' },
		{ label: 'portrait', value: 'portrait' },
		{ label: 'vertical', value: 'vertical' },
		{ label: '1:1', value: '1:1' },
		{ label: '4:3', value: '4:3' },
		{ label: '3:2', value: '3:2' },
		{ label: '16:9', value: '16:9' },
		{ label: '9:16', value: '9:16' },
		{ label: '24:7', value: '24:7' }
	];

	const gapOptions = [
		{ label: 'default', value: '' },
		{ label: '0', value: '0' },
		{ label: '.25', value: '0.25rem' },
		{ label: '.5', value: '0.5rem' },
		{ label: '1', value: '1rem' }
	];

	const sizeOptions = [
		{ label: 'default', value: '' },
		{ label: '3rem', value: '3rem' },
		{ label: '100px', value: '100px' },
		{ label: '1fr', value: '1fr' }
	];

	const rowOptions = [
		{ label: 'default', value: '' },
		{ label: 'auto/1fr/auto', value: 'auto 1fr auto' },
		{ label: '1fr/auto/1fr', value: '1fr auto 1fr' },
		{ label: '3x 1fr', value: 'repeat(3, 1fr)' },
		{ label: '3x max', value: 'max-content max-content max-content' }
	];

	const colOptions = [
		{ label: 'default', value: '' },
		{ label: 'auto/1fr/auto', value: 'auto 1fr auto' },
		{ label: '1fr/auto/1fr', value: '1fr auto 1fr' },
		{ label: '3x 1fr', value: 'repeat(3, 1fr)' },
		{ label: 'max/1fr/max', value: 'max-content 1fr max-content' }
	];

	const itemPlacementOptions = [
		{ label: 'default', value: '' },
		{ label: 'center', value: 'center' },
		{ label: 'stretch', value: 'stretch' },
		{ label: 'top', value: 'top' },
		{ label: 'right', value: 'right' },
		{ label: 'bottom', value: 'bottom' },
		{ label: 'left', value: 'left' },
		{ label: 'topLeft', value: 'topLeft' },
		{ label: 'topCenter', value: 'topCenter' },
		{ label: 'topRight', value: 'topRight' },
		{ label: 'leftCenter', value: 'leftCenter' },
		{ label: 'rightCenter', value: 'rightCenter' },
		{ label: 'bottomLeft', value: 'bottomLeft' },
		{ label: 'bottomCenter', value: 'bottomCenter' },
		{ label: 'bottomRight', value: 'bottomRight' }
	];

	const contentPlacementOptions = [
		...itemPlacementOptions,
		{ label: 'between', value: 'between' },
		{ label: 'around', value: 'around' },
		{ label: 'evenly', value: 'evenly' }
	];

	const skinClass = [
		'min-h-24 rounded-xl border border-blue-300 bg-blue-50 p-4 shadow-sm',
		'[&>.is-cell]:rounded-lg [&>.is-cell]:border [&>.is-cell]:border-blue-300 [&>.is-cell]:bg-white [&>.is-cell]:p-3',
		'[&>.is-row]:rounded-lg [&>.is-row]:border [&>.is-row]:border-purple-300 [&>.is-row]:bg-purple-50 [&>.is-row]:p-3',
		'[&>.is-col]:rounded-lg [&>.is-col]:border [&>.is-col]:border-purple-300 [&>.is-col]:bg-purple-50 [&>.is-col]:p-3',
		'[&>.is-range]:rounded-lg [&>.is-range]:border [&>.is-range]:border-emerald-300 [&>.is-range]:bg-emerald-50 [&>.is-range]:p-3',
		'[&>.is-half]:rounded-lg [&>.is-half]:border [&>.is-half]:border-orange-300 [&>.is-half]:bg-orange-50 [&>.is-half]:p-3',
		'[&>.is-bg]:rounded-lg [&>.is-bg]:border [&>.is-bg]:border-blue-300 [&>.is-bg]:bg-blue-100/70 [&>.is-bg]:p-3',
		'[&>.is-full]:rounded-lg [&>.is-full]:border [&>.is-full]:border-amber-300 [&>.is-full]:bg-amber-100/70 [&>.is-full]:p-3',
		'[&>.is-fg]:rounded-lg [&>.is-fg]:border [&>.is-fg]:border-pink-300 [&>.is-fg]:bg-pink-100/70 [&>.is-fg]:p-3'
	].join(' ');

	const classPresets = [
		{ label: 'default', value: '' },
		{ label: 'skin', value: skinClass },
		{ label: 'bare', value: 'min-h-24' },
		{ label: 'card', value: 'min-h-32 rounded-2xl border border-slate-300 bg-white p-4 shadow-lg' },
		{ label: 'panel', value: 'min-h-32 rounded-xl border border-slate-300 bg-slate-50 p-3' }
	];

	const activeControls = $derived(controls[activeTab]);
	const modeViews = $derived(activeControls.modeViews);
	const viewCols = $derived(activeControls.viewCols);
	const debugView = $derived(activeControls.debugView);
	const logMode = $derived(activeControls.logMode);
	const resolvedViewCols = $derived(getResolvedViewCols(viewCols, modeViews, debugView));

	const componentProps = $derived(
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

	const currentSettings = $derived({
		demoZoom,
		activeTab,
		controls,
		placeModifier,
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
		className
	});

	function cleanProps(props) {
		const clean = {};

		for (const [key, value] of Object.entries(props)) {
			if (value !== '') clean[key] = value;
		}

		return clean;
	}

	function getDefaultSettings() {
		return {
			demoZoom: 0.6,
			activeTab: 'snippets',
			controls: {
				snippets: {
					modeViews: ['auto'],
					viewCols: '2',
					debugView: 'split',
					logMode: 'hide'
				},
				rails: {
					modeViews: ['auto'],
					viewCols: '1',
					debugView: 'off',
					logMode: 'hide'
				}
			},
			placeModifier: '',
			tag: '',
			grid: '',
			rail: '',
			ratio: '',
			size: '',
			rows: '',
			cols: '',
			items: '',
			content: '',
			gap: '',
			className: ''
		};
	}

	function normalizeModeViews(value) {
		if (!Array.isArray(value) || !value.length) return ['auto'];

		const nextModes = modeOptions.filter((mode) => value.includes(mode));
		return nextModes.length ? nextModes : ['auto'];
	}

	function normalizeControls(value) {
		const defaults = getDefaultSettings().controls;
		const source = value && typeof value === 'object' ? value : defaults;

		return {
			snippets: {
				...defaults.snippets,
				...(source.snippets ?? {}),
				modeViews: normalizeModeViews(source.snippets?.modeViews)
			},
			rails: {
				...defaults.rails,
				...(source.rails ?? {}),
				modeViews: normalizeModeViews(source.rails?.modeViews)
			}
		};
	}

	function parseSettings(value) {
		try {
			const parsed = JSON.parse(value);
			if (!parsed || typeof parsed !== 'object') return getDefaultSettings();

			return {
				...getDefaultSettings(),
				...parsed,
				activeTab: tabs.includes(parsed.activeTab) ? parsed.activeTab : 'snippets',
				controls: normalizeControls(parsed.controls)
			};
		} catch {
			return getDefaultSettings();
		}
	}

	function loadSettings() {
		if (typeof localStorage === 'undefined') return getDefaultSettings();

		const saved = localStorage.getItem(storageKey);
		if (!saved) return getDefaultSettings();

		return parseSettings(saved);
	}

	function saveSettings(settings) {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(storageKey, JSON.stringify(settings));
	}

	function applySettings(settings) {
		demoZoom = settings.demoZoom;
		activeTab = settings.activeTab;
		controls = settings.controls;
		placeModifier = settings.placeModifier;
		tag = settings.tag;
		grid = settings.grid;
		rail = settings.rail;
		ratio = settings.ratio;
		size = settings.size;
		rows = settings.rows;
		cols = settings.cols;
		items = settings.items;
		content = settings.content;
		gap = settings.gap;
		className = settings.className;
	}

	function setZoom(event) {
		demoZoom = Number(event.currentTarget.value);
	}

	function setZoomValue(value) {
		demoZoom = Math.min(1, Math.max(0.3, Number(value.toFixed(2))));
	}

	function hasModeView(value) {
		return activeControls.modeViews.includes(value);
	}

	function toggleModeView(value) {
		if (hasModeView(value) && activeControls.modeViews.length === 1) return;

		const nextModes = hasModeView(value)
			? activeControls.modeViews.filter((mode) => mode !== value)
			: [...activeControls.modeViews, value];

		controls[activeTab].modeViews = modeOptions.filter((mode) => nextModes.includes(mode));
	}

	function setViewCols(value) {
		controls[activeTab].viewCols = value;
	}

	function setDebugView(value) {
		controls[activeTab].debugView = value;
	}

	function setLogMode(value) {
		controls[activeTab].logMode = value;
	}

	function getResolvedViewCols(value, modes, debugMode) {
		const numericValue = Number(value);

		if ([1, 2, 3, 4, 5, 6].includes(numericValue)) return numericValue;

		const viewCount = debugMode === 'split' ? 2 : 1;
		return Math.min(6, Math.max(1, modes.length * viewCount));
	}

	function resetControls() {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(storageKey);
		}

		applySettings(getDefaultSettings());
	}

	$effect(() => {
		applySettings(loadSettings());
		hasLoadedSettings = true;
	});

	$effect(() => {
		if (!hasLoadedSettings) return;
		saveSettings(currentSettings);
	});
</script>

<div class="demo-shell">
	<section class="demo-controls" aria-label="Demo controls">
		<div class="zoom-row">
			<label class="zoom-control">
				<span>Zoom</span>
				<button type="button" onclick={() => setZoomValue(demoZoom - 0.05)}></button>
				<input type="range" min="0.3" max="1" step="0.05" value={demoZoom} oninput={setZoom} />
				<button type="button" onclick={() => setZoomValue(demoZoom + 0.05)}>+</button>
				<output>{Math.round(demoZoom * 100)}%</output>
			</label>

			<button class="reset-top-button" type="button" onclick={resetControls}>Reset</button>
		</div>

		<div class="control-scale" style="zoom: {demoZoom}; --demo-view-cols: {resolvedViewCols};">
			<div class="control-row">
				<section class="pill-group" aria-label="Mode views">
					<span>Modes</span>

					{#each modeOptions as option}
						<button
							type="button"
							data-active={hasModeView(option) ? 'true' : 'false'}
							onclick={() => toggleModeView(option)}
						>
							{option}
						</button>
					{/each}
				</section>

				<section class="pill-group" aria-label="View columns">
					<span>Cols</span>

					{#each viewColOptions as option}
						<button
							type="button"
							data-active={viewCols === option ? 'true' : 'false'}
							onclick={() => setViewCols(option)}
						>
							{option}
						</button>
					{/each}
				</section>

				<section class="pill-group" aria-label="Debug view">
					<span>Debug</span>

					{#each debugViewOptions as option}
						<button
							type="button"
							data-active={debugView === option ? 'true' : 'false'}
							onclick={() => setDebugView(option)}
						>
							{option}
						</button>
					{/each}
				</section>

				<section class="pill-group" aria-label="Log mode">
					<span>Logs</span>

					{#each logOptions as option}
						<button
							type="button"
							data-active={logMode === option ? 'true' : 'false'}
							onclick={() => setLogMode(option)}
						>
							{option}
						</button>
					{/each}
				</section>
			</div>

			<details class="prop-panel">
				<summary>
					Prop overrides
					<span>{Object.keys(componentProps).length ? `${Object.keys(componentProps).length} active` : 'default'}</span>
				</summary>

				<div class="prop-panel-body">
					<section class="prop-group">
						<div>1. Root</div>

						<div class="prop-matrix">
							<span class="prop-label">grid</span>
							<div class="prop-buttons">
								{#each gridOptions as option}
									<button type="button" data-active={grid === option ? 'true' : 'false'} onclick={() => (grid = option)}>
										{option || 'default'}
									</button>
								{/each}
							</div>

							<span class="prop-label">rail</span>
							<div class="prop-buttons">
								{#each railOptions as option}
									<button type="button" data-active={rail === option.value ? 'true' : 'false'} onclick={() => (rail = option.value)}>
										{option.label}
									</button>
								{/each}
							</div>

							<span class="prop-label">tag</span>
							<div class="prop-buttons">
								{#each tagOptions as option}
									<button type="button" data-active={tag === option ? 'true' : 'false'} onclick={() => (tag = option)}>
										{option || 'default'}
									</button>
								{/each}
							</div>
						</div>
					</section>

					<section class="prop-group">
						<div>2. Ratio</div>

						<div class="prop-matrix">
							<span class="prop-label">preset</span>
							<div class="prop-buttons">
								{#each ratioOptions as option}
									<button type="button" data-active={ratio === option.value ? 'true' : 'false'} onclick={() => (ratio = option.value)}>
										{option.label}
									</button>
								{/each}
							</div>

							<span class="prop-label">custom</span>
							<label class="ratio-field">
								<input type="text" placeholder="24:7, 24/7, 24 / 7" bind:value={ratio} />
							</label>
						</div>
					</section>

					<section class="prop-group">
						<div>3. Size</div>
						<div>
							{#each sizeOptions as option}
								<button type="button" data-active={size === option.value ? 'true' : 'false'} onclick={() => (size = option.value)}>
									{option.label}
								</button>
							{/each}
						</div>
					</section>

					<section class="prop-group">
						<div>4. Box</div>

						<div class="prop-matrix">
							<span class="prop-label">gap</span>
							<div class="prop-buttons">
								{#each gapOptions as option}
									<button type="button" data-active={gap === option.value ? 'true' : 'false'} onclick={() => (gap = option.value)}>
										{option.label}
									</button>
								{/each}
							</div>
						</div>
					</section>

					<section class="prop-group">
						<div>5. Tracks</div>

						<div class="prop-matrix">
							<span class="prop-label">cols</span>
							<div class="prop-buttons">
								{#each colOptions as option}
									<button type="button" data-active={cols === option.value ? 'true' : 'false'} onclick={() => (cols = option.value)}>
										{option.label}
									</button>
								{/each}
							</div>

							<span class="prop-label">rows</span>
							<div class="prop-buttons">
								{#each rowOptions as option}
									<button type="button" data-active={rows === option.value ? 'true' : 'false'} onclick={() => (rows = option.value)}>
										{option.label}
									</button>
								{/each}
							</div>
						</div>
					</section>

					<section class="prop-group">
						<div>6. Content</div>
						<div>
							{#each contentPlacementOptions as option}
								<button type="button" data-active={content === option.value ? 'true' : 'false'} onclick={() => (content = option.value)}>
									{option.label}
								</button>
							{/each}
						</div>
					</section>

					<section class="prop-group">
						<div>7. Items</div>
						<div>
							{#each itemPlacementOptions as option}
								<button type="button" data-active={items === option.value ? 'true' : 'false'} onclick={() => (items = option.value)}>
									{option.label}
								</button>
							{/each}
						</div>
					</section>

					<section class="prop-group">
						<div>8. Self</div>
						<div>
							{#each placeModifierOptions as option}
								<button type="button" data-active={placeModifier === option ? 'true' : 'false'} onclick={() => (placeModifier = option)}>
									{option || 'none'}
								</button>
							{/each}
						</div>
					</section>

					<section class="prop-group">
						<div>9. Style</div>
						<div>
							{#each classPresets as option}
								<button type="button" data-active={className === option.value ? 'true' : 'false'} onclick={() => (className = option.value)}>
									{option.label}
								</button>
							{/each}
						</div>
					</section>

					<label class="class-field">
						<span>class</span>
						<textarea bind:value={className}></textarea>
					</label>
				</div>
			</details>

			<nav class="tab-row" aria-label="Demo tabs">
				{#each tabs as tab}
					<button
						type="button"
						data-active={activeTab === tab ? 'true' : 'false'}
						onclick={() => (activeTab = tab)}
					>
						{tab}
					</button>
				{/each}
			</nav>
		</div>
	</section>

	<main class="demo-scroll">
		<div class="demo-scale" style="zoom: {demoZoom}; --demo-view-cols: {resolvedViewCols};">
			{#if activeTab === 'snippets'}
				<SnippetsDemos {componentProps} {modeViews} {debugView} {viewCols} {placeModifier} {logMode} />
			{:else}
				<RailsDemos {componentProps} {modeViews} {debugView} {viewCols} {placeModifier} {logMode} />
			{/if}
		</div>
	</main>
</div>

<style>
	:global {
		html,
		body {
			width: 100%;
			height: 100%;
			margin: 0 !important;
			padding: 0 !important;
			background: white;
			overflow: hidden;
		}

		body {
			display: block !important;
		}

		button,
		input,
		textarea {
			font: inherit;
		}

		.demo-section {
			margin: 0;
			overflow: visible;
			border: 0;
			border-bottom: 1px solid #cbd5e1;
			background: white;
		}

		.demo-section-content {
			display: grid;
			grid-template-columns: repeat(var(--demo-view-cols, 1), minmax(0, 1fr));
			gap: 0.75rem;
			padding: 0.75rem;
		}

		.demo-summary {
			position: sticky;
			top: 0;
			z-index: 40;
			cursor: pointer;
			padding: 0.8rem 1rem;
			border-bottom: 1px solid #cbd5e1;
			background: rgb(255 255 255 / 0.98);
			backdrop-filter: blur(0.75rem);
			font-weight: 900;
			color: #1d4ed8;
		}

		.demo-summary::marker {
			color: #1d4ed8;
		}
	}

	.demo-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		width: 100%;
		height: 100dvh;
		overflow: hidden;
		background: white;
		font-family: Arial, sans-serif;
		color: #0f172a;
	}

	.demo-controls {
		z-index: 100;
		display: grid;
		gap: 0.25rem;
		padding: 0.25rem;
		border-bottom: 1px solid #cbd5e1;
		background: white;
		font-size: 0.75rem;
	}

	.zoom-row,
	.control-row {
		display: flex;
		gap: 0.25rem;
		align-items: center;
		overflow-x: auto;
		white-space: nowrap;
		scrollbar-width: none;
	}

	.zoom-row {
		justify-content: space-between;
	}

	.zoom-row::-webkit-scrollbar,
	.control-row::-webkit-scrollbar {
		display: none;
	}

	.zoom-control,
	.pill-group {
		display: inline-flex;
		flex: 0 0 auto;
		gap: 0.25rem;
		align-items: center;
		border: 1px solid #cbd5e1;
		border-radius: 999rem;
		background: white;
		font-weight: 800;
	}

	.zoom-control {
		padding: 0.4rem 0.5rem;
		font-size: 1rem;
	}

	.zoom-control button,
	.pill-group button,
	.prop-group button,
	.tab-row button,
	.reset-top-button {
		border: 0;
		cursor: pointer;
		font-weight: 800;
	}

	.zoom-control button {
		min-width: 1.75rem;
		min-height: 1.75rem;
		border-radius: 999rem;
		background: #f1f5f9;
	}

	.zoom-control input {
		width: 5rem;
		accent-color: #2563eb;
	}

	.zoom-control output {
		min-width: 2.5rem;
		font-variant-numeric: tabular-nums;
	}

	.reset-top-button {
		flex: 0 0 auto;
		border-radius: 999rem;
		background: #0f172a;
		color: white;
		padding: 0.75rem 1rem;
	}

	.control-scale {
		display: grid;
		gap: 0.25rem;
		transform-origin: top left;
	}

	.pill-group {
		padding: 0.25rem;
		font-size: 0.72rem;
	}

	.pill-group > span {
		padding-inline: 0.25rem;
	}

	.pill-group button,
	.prop-group button {
		border-radius: 999rem;
		background: #f1f5f9;
		color: #64748b;
		padding: 0.22rem 0.55rem;
	}

	.pill-group button[data-active='true'],
	.prop-group button[data-active='true'],
	.tab-row button[data-active='true'] {
		background: #2563eb;
		color: white;
	}

	.prop-panel {
		border: 1px solid #cbd5e1;
		border-radius: 0.75rem;
		background: #f8fafc;
	}

	.prop-panel > summary {
		cursor: pointer;
		padding: 0.4rem 0.6rem;
		border-radius: 0.75rem;
		background: white;
		font-weight: 900;
		color: #1d4ed8;
	}

	.prop-panel > summary > span {
		margin-left: 0.4rem;
		border-radius: 999rem;
		background: #f1f5f9;
		color: #64748b;
		padding: 0.16rem 0.5rem;
	}

	.prop-panel-body {
		display: grid;
		max-height: 45dvh;
		gap: 0.4rem;
		overflow: auto;
		padding: 0.4rem;
	}

	.prop-group,
	.class-field {
		display: grid;
		gap: 0.25rem;
		padding: 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.65rem;
		background: white;
	}

	.prop-group > div:first-child,
	.class-field > span {
		font-weight: 900;
	}

	.prop-group > div:last-child {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.prop-matrix {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: 0.35rem 0.5rem;
		align-items: start;
	}

	.prop-label {
		padding-block: 0.3rem;
		font-weight: 900;
		color: #475569;
	}

	.prop-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.ratio-field input,
	.class-field textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.class-field textarea {
		min-height: 4rem;
	}

	.tab-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding-block: 0.5rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tab-row::-webkit-scrollbar {
		display: none;
	}

	.tab-row button {
		flex: 0 0 auto;
		border: 1px solid #cbd5e1;
		border-radius: 999rem;
		background: white;
		color: #475569;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		text-transform: capitalize;
	}

	.demo-scroll {
		min-height: 0;
		overflow: auto;
		background: white;
		scroll-padding-top: 0;
	}

	.demo-scale {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
		padding: 0.25rem;
		transform-origin: top left;
	}
</style>
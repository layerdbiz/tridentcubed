<script lang="ts">
	import Controls from './Controls.svelte';
	import RailsDemos from './RailsDemos.svelte';
	import SnippetsDemos from './SnippetsDemos.svelte';

	type TabType = 'snippets' | 'rails';
	type ModeType = 'auto' | 'grid' | 'compact' | 'fit' | 'fill';
	type DebugViewType = 'off' | 'inline' | 'split';
	type ViewColsType = 'auto' | '1' | '2' | '3' | '4' | '5' | '6';
	type LogModeType = 'open' | 'failed' | 'closed' | 'hide';
	type ControlStateType = {
		modeViews: ModeType[];
		viewCols: ViewColsType;
		debugView: DebugViewType;
		logMode: LogModeType;
	};
	type ControlsStateType = Record<TabType, ControlStateType>;
	type PartialControlsStateType = Partial<Record<TabType, Partial<ControlStateType>>>;
	type SettingsStateType = {
		activeTab: TabType;
		controls: ControlsStateType;
		placeModifier: string;
		tag: string;
		grid: string;
		rail: string;
		ratio: string;
		size: string;
		rows: string;
		cols: string;
		items: string;
		content: string;
		gap: string;
		className: string;
	};

	const storageKey = 'play-route-demo-controls-v1';
	const tabs: TabType[] = ['snippets', 'rails'];
	const modeOptions: ModeType[] = ['auto', 'grid', 'compact', 'fit', 'fill'];
	const debugViewOptions: DebugViewType[] = ['off', 'inline', 'split'];
	const viewColOptions: ViewColsType[] = ['auto', '1', '2', '3', '4', '5', '6'];
	const placeModifierOptions = ['', 'TL', 'TC', 'TR', 'LC', 'CC', 'RC', 'BL', 'BC', 'BR'];
	const logOptions: LogModeType[] = ['open', 'failed', 'closed', 'hide'];
	const gridOptions = ['', 'full', 'inline', 'rails'];
	const tagOptions = ['', 'div', 'main', 'section', 'article', 'header', 'footer', 'aside', 'button', 'a', 'label', 'ul', 'ol'];

	const railOptions = [
		{ label: 'default', value: '' },
		{ label: 'content', value: 'content' },
		{ label: 'xs', value: 'xs' },
		{ label: 'sm', value: 'sm' },
		{ label: 'lg', value: 'lg' },
		{ label: 'xl', value: 'xl' },
		{ label: 'xxl', value: 'xxl' },
		{ label: 'full', value: 'full' },
		{ label: 'gutter-xs', value: 'gutter-xs' },
		{ label: 'gutter-sm', value: 'gutter-sm' },
		{ label: 'gutter-md', value: 'gutter-md' },
		{ label: 'gutter-lg', value: 'gutter-lg' },
		{ label: 'gutter-xl', value: 'gutter-xl' },
		{ label: 'gutter-xxl', value: 'gutter-xxl' },
		{ label: 'left', value: 'left' },
		{ label: 'right', value: 'right' },
		{ label: 'left-sm', value: 'left-sm' },
		{ label: 'right-sm', value: 'right-sm' },
		{ label: 'left-lg', value: 'left-lg' },
		{ label: 'right-xl', value: 'right-xl' }
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
		'rounded-xl outline outline-1 outline-sky-300 bg-sky-50 p-4',
		'[&>.is-cell]:rounded-lg [&>.is-cell]:outline [&>.is-cell]:outline-1 [&>.is-cell]:outline-sky-300 [&>.is-cell]:bg-white [&>.is-cell]:p-3',
		'[&>.is-row]:rounded-lg [&>.is-row]:outline [&>.is-row]:outline-1 [&>.is-row]:outline-violet-300 [&>.is-row]:bg-violet-50 [&>.is-row]:p-3',
		'[&>.is-col]:rounded-lg [&>.is-col]:outline [&>.is-col]:outline-1 [&>.is-col]:outline-indigo-300 [&>.is-col]:bg-indigo-50 [&>.is-col]:p-3',
		'[&>.is-range]:rounded-lg [&>.is-range]:outline [&>.is-range]:outline-1 [&>.is-range]:outline-emerald-300 [&>.is-range]:bg-emerald-50 [&>.is-range]:p-3',
		'[&>.is-half]:rounded-lg [&>.is-half]:outline [&>.is-half]:outline-1 [&>.is-half]:outline-orange-300 [&>.is-half]:bg-orange-50 [&>.is-half]:p-3',
		'[&>.is-bg]:rounded-lg [&>.is-bg]:outline [&>.is-bg]:outline-1 [&>.is-bg]:outline-cyan-300 [&>.is-bg]:bg-cyan-100/70 [&>.is-bg]:p-3',
		'[&>.is-full]:rounded-lg [&>.is-full]:outline [&>.is-full]:outline-1 [&>.is-full]:outline-amber-300 [&>.is-full]:bg-amber-100/70 [&>.is-full]:p-3',
		'[&>.is-fg]:rounded-lg [&>.is-fg]:outline [&>.is-fg]:outline-1 [&>.is-fg]:outline-pink-300 [&>.is-fg]:bg-pink-100/70 [&>.is-fg]:p-3'
	].join(' ');

	const classPresets = [
		{ label: 'default', value: '' },
		{ label: 'skin', value: skinClass },
		{ label: 'bare', value: 'rounded-xl p-4' },
		{ label: 'card', value: 'rounded-2xl outline outline-1 outline-slate-300 bg-white p-4 shadow-lg' },
		{ label: 'panel', value: 'rounded-xl outline outline-1 outline-slate-300 bg-slate-50 p-3' }
	];

	let hasLoadedSettings = $state(false);
	let activeTab = $state<TabType>('snippets');
	let placeModifier = $state('');
	let controls = $state<ControlsStateType>({
		snippets: { modeViews: ['auto'], viewCols: '2', debugView: 'split', logMode: 'hide' },
		rails: { modeViews: ['auto'], viewCols: '1', debugView: 'off', logMode: 'hide' }
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

	const activeControls = $derived(controls[activeTab]);
	const modeViews = $derived(activeControls.modeViews);
	const viewCols = $derived(activeControls.viewCols);
	const debugView = $derived(activeControls.debugView);
	const logMode = $derived(activeControls.logMode);

	const componentProps = $derived(cleanProps({ tag, grid, rail, ratio, size, rows, cols, items, content, gap, class: className }));
	const railsComponentProps = $derived({ ...componentProps, grid: 'rails' });
	const currentSettings = $derived({
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
	} satisfies SettingsStateType);

	function cleanProps(props: Record<string, string>): Record<string, string> {
		const clean: Record<string, string> = {};
		for (const [key, value] of Object.entries(props)) {
			if (value !== '') clean[key] = value;
		}
		return clean;
	}

	function getDefaultSettings(): SettingsStateType {
		return {
			activeTab: 'snippets',
			controls: {
				snippets: { modeViews: ['auto'], viewCols: '2', debugView: 'split', logMode: 'hide' },
				rails: { modeViews: ['auto'], viewCols: '1', debugView: 'off', logMode: 'hide' }
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

	function normalizeModeViews(value: unknown): ModeType[] {
		if (!Array.isArray(value) || !value.length) return ['auto'];
		const nextModes = modeOptions.filter((mode) => value.includes(mode));
		return nextModes.length ? nextModes : ['auto'];
	}

	function normalizeControls(value: unknown): ControlsStateType {
		const defaults = getDefaultSettings().controls;
		const source = value && typeof value === 'object' ? (value as PartialControlsStateType) : defaults;
		return {
			snippets: { ...defaults.snippets, ...(source.snippets ?? {}), modeViews: normalizeModeViews(source.snippets?.modeViews) },
			rails: { ...defaults.rails, ...(source.rails ?? {}), modeViews: normalizeModeViews(source.rails?.modeViews) }
		};
	}

	function parseSettings(value: string): SettingsStateType {
		try {
			const parsed = JSON.parse(value) as Partial<SettingsStateType> | null;
			if (!parsed || typeof parsed !== 'object') return getDefaultSettings();
			return {
				...getDefaultSettings(),
				...parsed,
				activeTab: tabs.includes(parsed.activeTab as TabType) ? (parsed.activeTab as TabType) : 'snippets',
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

	function saveSettings(settings: SettingsStateType): void {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(storageKey, JSON.stringify(settings));
	}

	function applySettings(settings: SettingsStateType): void {
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

	function resetControls() {
		if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey);
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

<main class="demo-route-page">
	<header class="demo-route-header">
		<div class="demo-route-copy">
			<p class="demo-route-eyebrow">Playground Route</p>
			<h1 class="demo-route-title">Interactive Grid Demos</h1>
			<p class="demo-route-text">This route brings the old merge demo controls back into the app as a dedicated sandbox, without moving any demo plumbing into <code>$lib</code>.</p>
		</div>

		<nav class="demo-route-tabs" aria-label="Demo groups">
			{#each tabs as tab (tab)}
				<button type="button" class:active={activeTab === tab} onclick={() => (activeTab = tab)}>{tab}</button>
			{/each}
		</nav>
	</header>

	<Controls
		bind:debugView={controls[activeTab].debugView}
		bind:logMode={controls[activeTab].logMode}
		bind:modeViews={controls[activeTab].modeViews}
		bind:viewCols={controls[activeTab].viewCols}
		bind:placeModifier
		bind:tag
		bind:grid
		bind:rail
		bind:ratio
		bind:size
		bind:rows
		bind:cols
		bind:items
		bind:content
		bind:gap
		bind:className
		componentProps={activeTab === 'rails' ? railsComponentProps : componentProps}
		{modeOptions}
		{debugViewOptions}
		{viewColOptions}
		{placeModifierOptions}
		{logOptions}
		{gridOptions}
		{tagOptions}
		{railOptions}
		{ratioOptions}
		{gapOptions}
		{sizeOptions}
		{rowOptions}
		{colOptions}
		{itemPlacementOptions}
		{contentPlacementOptions}
		{classPresets}
		onReset={resetControls}
	/>

	<section class="demo-route-stage">
		{#if activeTab === 'snippets'}
			<SnippetsDemos {componentProps} {modeViews} {debugView} {viewCols} {placeModifier} {logMode} />
		{:else}
			<RailsDemos componentProps={railsComponentProps} {modeViews} {debugView} {viewCols} {placeModifier} {logMode} />
		{/if}
	</section>
</main>

<style lang="postcss">
	@reference '#app.css';

	.demo-route-page { @apply grid gap-4 p-4 md:gap-5 md:p-5; }
	.demo-route-header { @apply grid gap-3 rounded-2xl bg-linear-to-br from-amber-50 via-white to-sky-50 p-4 outline-1 outline-slate-200 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-5; }
	.demo-route-copy { @apply grid gap-2; }
	.demo-route-eyebrow { @apply text-xs font-black uppercase tracking-[0.24em] text-amber-700; }
	.demo-route-title { @apply text-2xl font-black tracking-tight text-slate-950 md:text-3xl; }
	.demo-route-text { @apply max-w-3xl text-sm leading-6 text-slate-600; }
	.demo-route-tabs { @apply inline-flex flex-wrap gap-2; }
	.demo-route-tabs button { @apply rounded-full bg-white px-4 py-2 text-sm font-black capitalize text-slate-500 outline-1 outline-slate-300 transition-colors; }
	.demo-route-tabs button.active { @apply bg-slate-950 text-white outline-slate-950; }
	.demo-route-stage { @apply grid gap-4; }

	:global {
		.snippet-demos,
		.rails-demos { @apply grid gap-2; }
		.demo-section-content { @apply grid gap-3 p-3; }
		.demo.root-grid { @apply min-h-16 rounded-xl p-3 outline-1 outline-sky-300; }
		.demo.root-grid > :where(:not(.root-grid):not(.is-debug):not(.slot-fallback):not(.is-snippet-zone)),
		.demo.root-grid > .is-snippet-zone > :where(:not(.root-grid):not(.is-debug):not(.slot-fallback)) {
			@apply relative box-border block min-h-0 min-w-0 rounded-lg bg-white p-3 font-extrabold text-slate-950 shadow-sm outline-1 outline-slate-400/45;
		}
		.demo.root-grid > .is-cell:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-cell:not(.is-debug) { @apply bg-sky-50 outline-sky-400; }
		.demo.root-grid > .is-row:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-row:not(.is-debug) { @apply bg-violet-50 outline-violet-400; }
		.demo.root-grid > .is-col:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-col:not(.is-debug) { @apply bg-indigo-50 outline-indigo-400; }
		.demo.root-grid > .is-range:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-range:not(.is-debug) { @apply bg-emerald-50 outline-emerald-400; }
		.demo.root-grid > .is-half:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-half:not(.is-debug) { @apply bg-orange-50 outline-orange-400; }
		.demo.root-grid > .is-bg:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-bg:not(.is-debug) { @apply bg-cyan-100/70 outline-cyan-400; }
		.demo.root-grid > .is-full:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-full:not(.is-debug) { @apply bg-amber-100/70 outline-amber-400; }
		.demo.root-grid > .is-fg:not(.is-debug),
		.demo.root-grid > .is-snippet-zone > .is-fg:not(.is-debug) { @apply bg-pink-100/70 outline-pink-400; }
		.demo.root-grid > .is-debug,
		.demo.root-grid > .is-snippet-zone > .is-debug {
			@apply relative z-0 min-h-0 min-w-0 overflow-visible bg-slate-400/15 p-0 text-slate-500 outline-1 outline-dashed outline-slate-400;
			pointer-events: none;
			box-shadow: none;
			border: 0;
		}
		.demo.root-grid > .is-debug .slot-fallback,
		.demo.root-grid > .is-snippet-zone > .is-debug .slot-fallback {
			@apply inline-block bg-transparent;
			color: inherit;
			font: inherit;
			line-height: inherit;
			white-space: nowrap;
			pointer-events: none;
		}
		.demo.root-grid > .is-snippet-zone > :not(.is-debug) .slot-fallback,
		.demo.root-grid > :not(.is-debug) .slot-fallback,
		.demo.root-grid > .slot-fallback {
			@apply inline-block rounded bg-white/70 px-2 py-1 font-extrabold;
			color: inherit;
		}
		.demo-section { @apply overflow-hidden rounded-2xl bg-white outline-1 outline-slate-200; }
		.demo-summary { @apply cursor-pointer px-4 py-3 text-sm font-black text-slate-900; }
	}
</style>
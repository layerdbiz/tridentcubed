<!-- One entry in the shell (#342): its options as views, each on the screens and in the themes picked, filling the
     page or laid out on the zoomable canvas. Every control is kept in this browser for this entry and written into
     the address; an address with settings in it wins over what was kept. -->
<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import Bar from './bar.svelte';
	import { Canvas } from './canvas.svelte';
	import type { EntryType } from './catalog';
	import Choices from './choices.svelte';
	import Dock from './dock.svelte';
	import Fold from './fold.svelte';
	import Frame from './frame.svelte';
	import { keep, readKept } from './keep';
	import {
		CONTAINER_LIMITS,
		LAYOUTS,
		SCREENS,
		SIZE_LIMITS,
		THEMES,
		createSettings,
		fromHash,
		pickScreen,
		toFrames,
		toHash,
		toSettingsText,
		toggle,
		type LayoutType,
		type ScreenType,
		type ThemeType
	} from './settings';
	import { isWide } from './side.svelte';
	import Slider from './slider.svelte';
	import Stage from './stage.svelte';
	import Switch from './switch.svelte';

	type BoardProps = { entry: EntryType; section: string };

	let { entry, section }: BoardProps = $props();

	// The page is remade for each entry ({#key} in its route), so the entry it opened on is the one it keeps.
	const { kind, slug, options } = untrack(() => entry);
	const KEY = `play:${kind}:${slug}`;
	const DOCK_KEY = 'play:dock';
	const FOLDS_KEY = 'play:folds';
	/** The desktop controls panel's width and its gap from the edge. */
	const DOCK_ROOM = 320;

	const systemTheme: ThemeType = matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';
	const base = createSettings(options, systemTheme);

	let settings = $state(fromHash(location.hash || readKept(KEY) || '', base, options));
	let isDockOpen = $state(isWide() && readKept(DOCK_KEY) !== 'shut');
	let folds = $state(readFolds());
	let copied = $state('');
	let copyNote = $state('');

	const canvas = new Canvas();
	const frames = $derived(toFrames(settings, options));
	const isFill = $derived(settings.screens[0] === 'fill');
	const groups = $derived(
		settings.views
			.map((view) => ({ view, frames: frames.filter((frame) => frame.view === view) }))
			.filter((group) => group.frames.length)
	);
	const hasLabels = $derived(!isFill || frames.length > 1);
	const viewNames = $derived(
		settings.views
			.map((view) => options.find((option) => option.slug === view)?.label ?? view)
			.join(', ')
	);
	const screenNames = $derived(
		settings.screens
			.map((screen) =>
				screen === 'custom' ? `${settings.width}×${settings.height}` : SCREENS[screen].label
			)
			.join(', ')
	);

	const screenOptions = Object.entries(SCREENS).map(([value, screen]) => ({
		value: value as ScreenType,
		label: screen.label
	}));
	const themeOptions = Object.entries(THEMES).map(([value, label]) => ({
		value: value as ThemeType,
		label
	}));
	const layoutOptions = Object.entries(LAYOUTS).map(([value, label]) => ({
		value: value as LayoutType,
		label
	}));
	const viewOptions = options.map((option) => ({ value: option.slug, label: option.label }));

	$effect(() => {
		const hash = toHash(settings);
		keep(KEY, hash);
		try {
			// Read without tracking: writing the address changes page.state, which must not run this again.
			replaceState(
				`#${hash}`,
				untrack(() => page.state)
			);
		} catch {
			// The router is not up yet on the very first run; the next change writes the address.
		}
	});

	// New frames, sizes or layout: fit them all again once they are drawn.
	$effect(() => {
		void frames.map((frame) => `${frame.key}:${frame.width}x${frame.height}`).join();
		void settings.layout;
		tick().then(() => canvas.fit());
	});

	$effect(() => {
		if (isWide()) keep(DOCK_KEY, isDockOpen ? 'open' : 'shut');
		// On a desktop the panel floats over the canvas: fit the frames into the room beside it.
		canvas.inset = isWide() && isDockOpen ? DOCK_ROOM : 0;
		if (untrack(() => canvas.isFitted)) canvas.fit();
	});

	$effect(() => keep(FOLDS_KEY, JSON.stringify(folds)));

	function readFolds() {
		const folds = { Views: true, Screens: true, Themes: false, Container: false, Layout: false };
		try {
			const kept = JSON.parse(readKept(FOLDS_KEY) ?? '{}') as Record<string, unknown>;
			for (const name of Object.keys(folds) as (keyof typeof folds)[]) {
				if (typeof kept[name] === 'boolean') folds[name] = kept[name];
			}
		} catch {
			// Nothing kept: the first two panels open.
		}
		return folds;
	}

	async function copySettings() {
		const text = toSettingsText(settings, options, `${location.origin}${location.pathname}`);
		try {
			await navigator.clipboard.writeText(text);
			copied = '';
			copyNote = 'Copied';
		} catch {
			// No clipboard here (an older phone, or no permission): show the text to select instead.
			copied = text;
			copyNote = 'Select and copy';
		}
		setTimeout(() => (copyNote = ''), 1600);
	}
</script>

<svelte:head>
	<title>{entry.label} · Trident Cubed Play</title>
</svelte:head>

<Bar
	{section}
	title={entry.label}
>
	{#snippet actions()}
		{#if !isFill}
			<div
				class="zoom"
				role="group"
				aria-label="Zoom"
			>
				<button
					type="button"
					aria-label="Zoom out"
					onclick={() => canvas.zoomBy(1 / 1.25)}>−</button
				>
				<button
					type="button"
					class="amount"
					aria-label="Fit everything"
					onclick={() => canvas.fit()}>{Math.round(canvas.scale * 100)}%</button
				>
				<button
					type="button"
					aria-label="Zoom in"
					onclick={() => canvas.zoomBy(1.25)}>+</button
				>
			</div>
		{/if}
		<button
			type="button"
			class="controls"
			aria-expanded={isDockOpen}
			onclick={() => (isDockOpen = !isDockOpen)}
		>
			<svg
				viewBox="0 0 24 24"
				width="18"
				height="18"
				aria-hidden="true"
				><path
					fill="currentColor"
					d="M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z"
				/></svg
			>
			<span>Controls</span>
		</button>
	{/snippet}
</Bar>

<div class="room">
	{#if isFill}
		<div class="fill {settings.layout}">
			{#each groups as group (group.view)}
				<div class="group">
					{#each group.frames as frame (frame.key)}
						<Frame
							{frame}
							{settings}
							canvas={null}
							hasLabel={hasLabels}
						/>
					{/each}
				</div>
			{/each}
		</div>
	{:else}
		<Stage {canvas}>
			<div class="lay {settings.layout}">
				{#each groups as group (group.view)}
					<div class="group">
						{#each group.frames as frame (frame.key)}
							<Frame
								{frame}
								{settings}
								{canvas}
								hasLabel={hasLabels}
							/>
						{/each}
					</div>
				{/each}
			</div>
		</Stage>
	{/if}

	<Dock bind:isOpen={isDockOpen}>
		<div class="copy">
			<button
				type="button"
				onclick={copySettings}>{copyNote || 'Copy settings'}</button
			>
			{#if copied}
				<textarea
					readonly
					rows="3"
					aria-label="Every setting, as text"
					value={copied}></textarea>
			{/if}
		</div>

		<Fold
			name={entry.kind === 'component' ? 'Variants' : 'Views'}
			now={viewNames}
			bind:isOpen={folds.Views}
		>
			<Choices
				label="Views"
				options={viewOptions}
				picked={settings.views}
				onpick={(view) => (settings.views = toggle(settings.views, view))}
			/>
			{#if entry.options.length > 1}
				<button
					type="button"
					class="all"
					onclick={() => (settings.views = entry.options.map((option) => option.slug))}
					>Show all</button
				>
			{/if}
		</Fold>

		<Fold
			name="Screens"
			now={screenNames}
			bind:isOpen={folds.Screens}
		>
			<Choices
				label="Screens"
				options={screenOptions}
				picked={settings.screens}
				onpick={(screen) => (settings.screens = pickScreen(settings.screens, screen))}
			/>
			{#if settings.screens.includes('custom')}
				<Slider
					label="Width"
					bind:value={settings.width}
					least={SIZE_LIMITS.least}
					most={SIZE_LIMITS.most}
					step={10}
				/>
				<Slider
					label="Height"
					bind:value={settings.height}
					least={SIZE_LIMITS.least}
					most={SIZE_LIMITS.most}
					step={10}
				/>
			{/if}
		</Fold>

		<Fold
			name="Themes"
			now={settings.themes.map((theme) => THEMES[theme]).join(', ')}
			bind:isOpen={folds.Themes}
		>
			<Choices
				label="Themes"
				options={themeOptions}
				picked={settings.themes}
				onpick={(theme) => (settings.themes = toggle(settings.themes, theme))}
			/>
		</Fold>

		<Fold
			name="Container"
			now={settings.isContainerOn ? `${settings.container} px` : 'Off'}
			bind:isOpen={folds.Container}
		>
			<Switch
				label="Hold the container's width"
				bind:isOn={settings.isContainerOn}
			/>
			<Slider
				label="Width"
				bind:value={settings.container}
				least={CONTAINER_LIMITS.least}
				most={CONTAINER_LIMITS.most}
				step={10}
			/>
			<p class="help">
				For container queries: the box marked <code>data-container</code> (or the page's body) is held
				to this width while the screen stays its own size.
			</p>
		</Fold>

		<Fold
			name="Layout"
			now={LAYOUTS[settings.layout]}
			bind:isOpen={folds.Layout}
		>
			<Choices
				label="Layout"
				options={layoutOptions}
				picked={[settings.layout]}
				onpick={(layout) => (settings.layout = layout)}
			/>
		</Fold>
	</Dock>
</div>

<style>
	.room {
		position: relative;
		display: flex;
		flex: 1;
		min-height: 0;
		background: var(--bg);
	}
	.fill {
		display: flex;
		flex: 1;
		min-width: 0;
		gap: 1px;
		background: var(--line);
	}
	.fill.column {
		flex-direction: column;
	}
	.fill .group {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		gap: 1px;
		background: var(--bg);
	}
	.fill.column .group {
		flex-direction: row;
	}
	.lay {
		display: flex;
		align-items: flex-start;
		gap: 64px;
		padding: 8px;
	}
	.lay.column {
		flex-direction: column;
	}
	.lay .group {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 48px;
	}
	.lay.column .group {
		flex-direction: row;
	}
	.zoom {
		display: flex;
		align-items: center;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 10px;
	}
	.zoom button {
		min-width: 32px;
		height: 32px;
		padding: 0 6px;
		border: 0;
		background: none;
		font-size: 16px;
		cursor: pointer;
	}
	.zoom .amount {
		min-width: 52px;
		font-size: 12.5px;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.zoom button:hover,
	.controls:hover {
		background: var(--side-hover);
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 10px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: none;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.controls[aria-expanded='true'] {
		border-color: var(--accent);
		color: var(--accent);
	}
	@media (max-width: 560px) {
		.controls span,
		.zoom button:not(.amount) {
			display: none;
		}
	}
	.copy {
		display: grid;
		gap: 6px;
		padding-bottom: 10px;
	}
	.copy button,
	.all {
		height: 32px;
		border: 0;
		border-radius: 9px;
		background: var(--bar-soft);
		color: var(--bar-fg);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
	}
	.all {
		justify-self: start;
		padding: 0 12px;
		background: none;
		color: var(--bar-dim);
		text-decoration: underline;
	}
	textarea {
		width: 100%;
		padding: 8px;
		border: 0;
		border-radius: 9px;
		background: var(--bar-soft);
		color: var(--bar-fg);
		font:
			11px ui-monospace,
			monospace;
		resize: none;
	}
	.help {
		margin: 0;
		color: var(--bar-dim);
		font-size: 12px;
		line-height: 1.45;
	}
	code {
		color: var(--bar-fg);
	}
</style>

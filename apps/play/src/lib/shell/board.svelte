<!-- One entry in the shell (#342): its options, each on every device picked (all of them unless told) and in every
     theme picked, laid out by the packer so together they fill the page at their true sizes, or filling the page
     with no device. Every control is kept in this browser for this entry and written into the address; an address
     with settings in it wins over what was kept. Library pieces only, with the theme's colours. -->
<script lang="ts">
	import { Accordion, Button, Component, Switch } from '@layerd/ui';
	import { page } from '$app/state';
	import { onDestroy, onMount, untrack } from 'svelte';
	import Amount from './amount.svelte';
	import Bar from './bar.svelte';
	import { Canvas, EDGE } from './canvas.svelte';
	import type { EntryType } from './catalog';
	import Choices from './choices.svelte';
	import { setViews } from './current.svelte';
	import Device from './device.svelte';
	import { toBody } from './devices';
	import Dock from './dock.svelte';
	import { keep, readKept } from './keep';
	import { toPacked } from './pack';
	import Page from './page.svelte';
	import {
		CONTAINER_LIMITS,
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
		type ScreenType,
		type ThemeType
	} from './settings';
	import { isWide } from './side.svelte';
	import Stage from './stage.svelte';

	type BoardProps = { entry: EntryType; section: string };

	let { entry, section }: BoardProps = $props();

	// The page is remade for each entry ({#key} in its route), so the entry it opened on is the one it keeps.
	const { kind, slug, options } = untrack(() => entry);
	const KEY = `play:v2:${kind}:${slug}`;
	const DOCK_KEY = 'play:v2:dock';
	/** The desktop controls panel's width and its gap from the edge. */
	const DOCK_ROOM = 324;
	/** On screen at the fitted zoom: each device's name line, and the space between devices (less on a phone). */
	const label = $derived(isWide() ? 30 : 22);
	const gap = $derived(isWide() ? 28 : 20);

	const systemTheme: ThemeType = matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';
	const base = createSettings(options, systemTheme);

	// What was kept, then whatever the address names on top: a link with #v=b changes the view and nothing else.
	let settings = $state(
		fromHash(
			untrack(() => page.url.hash) || location.hash,
			fromHash(readKept(KEY) ?? '', base, options),
			options
		)
	);
	let isDockOpen = $state(isWide() && readKept(DOCK_KEY) === 'open');
	let copyNote = $state('');
	let copied = $state('');
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	const canvas = new Canvas();
	const frames = $derived(toFrames(settings, options));
	const isFill = $derived(settings.screens[0] === 'fill');
	const address = `${location.host}${location.pathname}`;
	const container = $derived(settings.isContainerOn ? settings.container : null);

	const bodies = $derived(
		frames.map((frame) =>
			frame.kind && frame.width && frame.height
				? toBody(frame.kind, frame.width, frame.height)
				: null
		)
	);
	const packed = $derived.by(() => {
		if (isFill) return null;
		const room = canvas.room;
		return toPacked(
			bodies.map((body) => ({ width: body?.width ?? 0, height: body?.height ?? 0 })),
			{ width: Math.max(1, room.width - 2 * EDGE), height: Math.max(1, room.height - 2 * EDGE) },
			gap,
			label,
			// One option in one theme on every device stays together.
			frames.map((frame) => `${frame.view}:${frame.theme}`)
		);
	});
	const fillColumns = $derived(Math.ceil(Math.sqrt(frames.length)));
	/** With more than one option or theme, a soft panel behind each one's devices shows which belong together. */
	const blocks = $derived.by(() => {
		if (!packed || settings.views.length * settings.themes.length < 2) return [];
		const margin = gap / 2 - 4;
		const found = new Map<string, { x: number; y: number; right: number; bottom: number }>();
		for (const [index, frame] of frames.entries()) {
			const place = packed.places[index];
			if (!place) continue;
			const key = `${frame.view}:${frame.theme}`;
			const block = found.get(key) ?? { x: place.x, y: place.y, right: 0, bottom: 0 };
			found.set(key, {
				x: Math.min(block.x, place.x),
				y: Math.min(block.y, place.y),
				right: Math.max(block.right, place.x + place.width),
				bottom: Math.max(block.bottom, place.y + place.height)
			});
		}
		const pad = margin / packed.scale;
		return [...found].map(([key, block]) => ({
			key,
			x: block.x - pad,
			y: block.y - pad,
			width: block.right - block.x + 2 * pad,
			height: block.bottom - block.y + 2 * pad,
			radius: 12 / packed.scale
		}));
	});

	const viewOptions = options.map((option) => ({ value: option.slug, label: option.label }));
	const screenOptions = (Object.keys(SCREENS) as ScreenType[]).map((value) => ({
		value,
		label: SCREENS[value].label
	}));
	const themeOptions = (Object.keys(THEMES) as ThemeType[]).map((value) => ({
		value,
		label: THEMES[value]
	}));
	const viewNames = $derived(
		settings.views
			.map((view) => options.find((option) => option.slug === view)?.label ?? view)
			.join(', ')
	);
	const screenNames = $derived(
		settings.screens.length === 4 && !settings.screens.includes('custom')
			? 'Every device'
			: settings.screens.map((screen) => SCREENS[screen].label).join(', ')
	);

	$effect(() => {
		const hash = toHash(settings);
		keep(KEY, hash);
		// Straight to the browser and in order, keeping SvelteKit's own history state: only the hash changes.
		history.replaceState(history.state, '', `#${hash}`);
		setViews(settings.views);
	});

	// The devices change, or the room they fill does: lay them out again and fit them. A view the viewer zoomed is
	// left where it is when only the room changes.
	let laidOut = '';
	$effect(() => {
		if (!packed) return;
		canvas.content = { width: packed.width, height: packed.height };
		const key = frames.map((frame) => `${frame.key}:${frame.width}x${frame.height}`).join();
		const isNew = key !== laidOut;
		laidOut = key;
		untrack(() => {
			if (isNew || canvas.isFitted) canvas.fit();
		});
	});

	$effect(() => {
		if (isWide()) keep(DOCK_KEY, isDockOpen ? 'open' : 'shut');
		// On a desktop the panel floats over the canvas: the devices are laid out in the room beside it.
		canvas.inset = isWide() && isDockOpen ? DOCK_ROOM : 0;
	});

	// A link in the menu to another file of this entry changes only the address's hash.
	onMount(() => {
		const onHash = () => (settings = fromHash(location.hash, settings, options));
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	});

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
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copyNote = ''), 1600);
	}

	onDestroy(() => {
		clearTimeout(copyTimer);
		setViews([]);
	});
</script>

<svelte:head>
	<title>{entry.label} · Trident Cubed Play</title>
</svelte:head>

{#snippet fold(name: string, now: string, body: import('svelte').Snippet)}
	<Accordion
		sm
		open
		icon="icon-[mdi--chevron-down]"
		class="border-b border-base-200-800"
	>
		{#snippet head()}
			<b class="shrink-0">{name}</b>
			<span class="min-w-0 flex-1 truncate text-end text-base-500-400">{now}</span>
		{/snippet}
		{@render body()}
	</Accordion>
{/snippet}

{#snippet viewsBody()}
	<Choices
		label={kind === 'component' ? 'Variants' : 'Views'}
		options={viewOptions}
		picked={settings.views}
		onpick={(view) => (settings.views = toggle(settings.views, view))}
	/>
	{#if options.length > 1}
		<Button
			ghost
			sm
			label="Show all {options.length}"
			icon="icon-[mdi--view-grid-outline]"
			onclick={() => (settings.views = options.map((option) => option.slug))}
		/>
	{/if}
{/snippet}

{#snippet screensBody()}
	<Choices
		label="Screens"
		options={screenOptions}
		picked={settings.screens}
		onpick={(screen) => (settings.screens = pickScreen(settings.screens, screen))}
	/>
	<p class="m-0 text-xs text-base-500-400">
		Each device at its real size: iPhone 16, iPad Air 11″, MacBook Air 13″ and a 1080p monitor.
		Custom is a browser window of the size below; Fill gives the prototype the whole page.
	</p>
	{#if settings.screens.includes('custom')}
		<div class="grid grid-cols-2 gap-2">
			<Amount
				label="Width"
				bind:value={settings.width}
				least={SIZE_LIMITS.least}
				most={SIZE_LIMITS.most}
			/>
			<Amount
				label="Height"
				bind:value={settings.height}
				least={SIZE_LIMITS.least}
				most={SIZE_LIMITS.most}
			/>
		</div>
	{/if}
{/snippet}

{#snippet themesBody()}
	<Choices
		label="Themes"
		options={themeOptions}
		picked={settings.themes}
		onpick={(theme) => (settings.themes = toggle(settings.themes, theme))}
	/>
{/snippet}

{#snippet containerBody()}
	<label class="flex items-center justify-between gap-3 text-sm">
		<span>Hold the container's width</span>
		<Switch
			label="Hold the container's width"
			bind:checked={settings.isContainerOn}
		/>
	</label>
	{#if settings.isContainerOn}
		<Amount
			label="Container width"
			bind:value={settings.container}
			least={CONTAINER_LIMITS.least}
			most={CONTAINER_LIMITS.most}
		/>
	{/if}
	<p class="m-0 text-xs text-base-500-400">
		For container queries: the box marked <code>data-container</code> (or the page's body) is held to
		this width while the screen keeps its own size.
	</p>
{/snippet}

<Bar
	{section}
	title={entry.label}
>
	{#snippet actions()}
		{#if !isFill}
			<div
				class="flex items-center"
				role="group"
				aria-label="Zoom"
			>
				<Button
					ghost
					sm
					variant="icon"
					icon="icon-[mdi--minus]"
					label="Zoom out"
					aria-label="Zoom out"
					class="max-[560px]:hidden"
					onclick={() => canvas.zoomBy(1 / 1.25)}
				/>
				<Button
					ghost
					sm
					label="{Math.round(canvas.scale * 100)}%"
					aria-label="Fit every device"
					title="Fit every device"
					class="zoom-amount min-w-[4.2em] tabular-nums"
					onclick={() => canvas.fit()}
				/>
				<Button
					ghost
					sm
					variant="icon"
					icon="icon-[mdi--plus]"
					label="Zoom in"
					aria-label="Zoom in"
					class="max-[560px]:hidden"
					onclick={() => canvas.zoomBy(1.25)}
				/>
			</div>
		{/if}
		<Button
			sm
			icon="icon-[mdi--tune-variant]"
			label="Controls"
			aria-label="Controls"
			primary={isDockOpen}
			lite
			aria-expanded={isDockOpen}
			class="max-[560px]:[&_.btn-label]:hidden"
			onclick={() => (isDockOpen = !isDockOpen)}
		/>
	{/snippet}
</Bar>

<Component class="theme-heavy relative flex min-h-0 flex-1">
	{#if isFill}
		<div
			class="grid min-w-0 flex-1 gap-px bg-base-300-700"
			style:grid-template-columns="repeat({fillColumns}, minmax(0, 1fr))"
		>
			{#each frames as frame (frame.key)}
				<div class="theme-base flex min-h-0 min-w-0 flex-col">
					{#if frame.name}
						<div class="shrink-0 truncate px-3 py-1 text-xs font-semibold">{frame.name}</div>
					{/if}
					<div class="min-h-0 flex-1">
						<Page
							url={frame.url}
							title={frame.name || entry.label}
							theme={frame.theme}
							{container}
							canvas={null}
						/>
					</div>
				</div>
			{/each}
		</div>
	{:else if packed}
		<Stage {canvas}>
			<div
				class="relative"
				style:width="{packed.width}px"
				style:height="{packed.height}px"
			>
				{#each blocks as block (block.key)}
					<div
						class="absolute bg-base-100-800/60"
						style:left="{block.x}px"
						style:top="{block.y}px"
						style:width="{block.width}px"
						style:height="{block.height}px"
						style:border-radius="{block.radius}px"
					></div>
				{/each}
				{#each frames as frame, index (frame.key)}
					{@const body = bodies[index]}
					{@const place = packed.places[index]}
					{#if body && place}
						<Device
							{frame}
							{body}
							{place}
							label={label / packed.scale}
							fit={packed.scale}
							{address}
							{container}
							{canvas}
							onfocus={() => canvas.show(place)}
						/>
					{/if}
				{/each}
			</div>
		</Stage>
	{/if}

	<Dock bind:isOpen={isDockOpen}>
		<div class="grid gap-2 border-b border-base-200-800 p-3">
			<Button
				lite
				sm
				width="full"
				icon="icon-[mdi--content-copy]"
				label={copyNote || 'Copy settings'}
				onclick={copySettings}
			/>
			{#if copied}
				<textarea
					readonly
					rows="3"
					aria-label="Every setting, as text"
					class="theme-heavy w-full resize-none rounded-box border-0 p-2 font-mono text-[11px]"
					value={copied}></textarea>
			{/if}
		</div>
		{@render fold(kind === 'component' ? 'Variants' : 'Views', viewNames, viewsBody)}
		{@render fold('Screens', screenNames, screensBody)}
		{@render fold('Themes', settings.themes.map((theme) => THEMES[theme]).join(', '), themesBody)}
		{@render fold(
			'Container',
			settings.isContainerOn ? `${settings.container} px` : 'Off',
			containerBody
		)}
	</Dock>
</Component>

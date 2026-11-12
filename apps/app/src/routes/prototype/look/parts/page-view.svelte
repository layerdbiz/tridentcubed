<script lang="ts">
	// PROTOTYPE (#161) run 13: the Page tab of a project, customer, team member, transport or facility (Justin,
	// 2026-11-07 22:21). It is the dashboard's split (split.svelte): the lower half the same rounded sheet, dragged up
	// or down, holding everything there is to read; the upper half a big picture with the name and the main facts laid
	// over it, the way a project card lays them over its photo. A switch at the top changes the picture for a map of
	// where it is (a ship's last port, a project's trip). With several photos they swipe sideways. A team member's
	// photo is too small to fill the screen, so it shows blurred behind them, with their face in front. Without a
	// photo the map shows first. Run 25 (Justin, 2026-11-11), Picture B: with no photo a dark placeholder stands in,
	// so the Page always opens on a picture; what is written over the picture is the same over a photo and over the
	// map, white on a dark fade, with no card behind it. `isDarkMap` is Map B, the dark map. The sheet below holds
	// only up-and-down scrolling, so a sideways swipe on it reaches the tabs.
	import type { Snippet } from 'svelte';
	import type { PinType } from './chart.data';
	import { FADE } from './look.data';
	import Split from './split.svelte';
	import WorldMap from './world-map.svelte';

	let {
		photos,
		pins,
		route = [],
		isBlurred = false,
		isWide,
		left = 0,
		onback,
		backLabel,
		buttons = 'glass',
		picture = 'A',
		isDarkMap = false,
		hasChevron = false,
		onphoto,
		actions,
		overlay,
		children
	}: {
		photos: string[];
		pins: PinType[];
		route?: [number, number][];
		isBlurred?: boolean;
		isWide: boolean;
		// Room on the left for the desktop's floating column.
		left?: number;
		onback: () => void;
		backLabel: string;
		// The back arrow and the ⋮ at the top. 'glass' (Header A): each in a round glass button, Photo and Map at the
		// right. 'ghost' (Header B): bare icons, Photo and Map in the centre. 'none': the screen's own header
		// (page-header.svelte) draws the two in the same place, so only Photo and Map are here, in the centre.
		buttons?: 'glass' | 'ghost' | 'none';
		// The Picture and Map letters, and Header C's chevron for back.
		picture?: string;
		isDarkMap?: boolean;
		hasChevron?: boolean;
		// Told whether the picture is dark (a photo, or the dark map), so a header over it can turn its icons white.
		onphoto?: (isPhoto: boolean) => void;
		actions: Snippet;
		// What sits over the bottom of the picture; `true` while it is over a photo (white words), `false` over the map.
		overlay: Snippet<[boolean]>;
		children: Snippet;
	} = $props();

	let isMap = $state(false);
	let strip: HTMLDivElement | undefined = $state();
	let at = $state(0);
	let overlayHeight = $state(0);
	const isAlike = $derived(picture !== 'A');
	const isPhoto = $derived(!isMap && (photos.length > 0 || isAlike));
	// Dark behind the top buttons; white words over the bottom.
	const isDark = $derived(isPhoto || isDarkMap);
	const isOver = $derived(isPhoto || isAlike);
	const GLASS = $derived(
		isDark
			? 'bg-slate-950/35 text-white backdrop-blur-md'
			: 'bg-white/85 text-slate-900 shadow-sm backdrop-blur-md'
	);

	const GHOST = $derived(
		isDark ? 'text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]' : 'text-slate-900'
	);

	$effect(() => {
		onphoto?.(isDark);
	});

	function onscroll() {
		if (strip?.clientWidth) at = Math.round(strip.scrollLeft / strip.clientWidth);
	}
</script>

{#snippet backdrop()}
	{#if isPhoto}
		<div class="relative size-full bg-slate-900">
			<div
				bind:this={strip}
				class="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
				data-swipe-ignore
				{onscroll}
			>
				{#each photos as photo, index (index)}
					<img
						src={photo}
						alt=""
						draggable="false"
						class="size-full shrink-0 snap-center object-cover {isBlurred
							? 'scale-125 blur-2xl brightness-75'
							: ''}"
					/>
				{/each}
			</div>
			{#if !photos.length}
				<!-- No photo yet: the dark card a project with no photos shows in the Cards view. -->
				<div
					class="absolute inset-0 flex flex-col items-center gap-1.5 bg-linear-to-br from-slate-700 to-slate-950 pt-[30%] md:pt-[12%]"
				>
					<span class="icon-[mdi--image-off-outline] size-9 text-white/30"></span>
					<span class="text-sm font-medium text-white/50">No photos yet</span>
				</div>
			{/if}
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-slate-950/50 to-transparent"
			></div>
			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-slate-950/90 via-slate-950/45 to-transparent"
			></div>
		</div>
	{:else}
		<div class="relative size-full">
			{#key isDarkMap}
				<WorldMap
					{pins}
					{route}
					maxZoom={8}
					isDark={isDarkMap}
					padding={{ top: 80, bottom: overlayHeight + 88, left: left + 32, right: 32 }}
				/>
			{/key}
			{#if isAlike}
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-slate-950/90 via-slate-950/45 to-transparent"
				></div>
			{/if}
		</div>
	{/if}
{/snippet}

<Split
	{isWide}
	first={0.52}
	{backdrop}
>
	{#snippet head()}
		<div
			class="flex shrink-0 items-center {buttons === 'glass'
				? 'gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]'
				: 'gap-1 px-1.5 pt-[calc(env(safe-area-inset-top)+0.5rem)]'}"
			style="padding-left: {left + (buttons === 'glass' ? 12 : 6)}px"
		>
			{#if buttons === 'none'}
				<span class="size-10 shrink-0"></span>
			{:else}
				<button
					class="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full {buttons ===
					'glass'
						? GLASS
						: GHOST}"
					aria-label={backLabel}
					onclick={onback}
					><span
						class={hasChevron ? 'icon-[mdi--chevron-left] size-7' : 'icon-[mdi--arrow-left] size-6'}
					></span></button
				>
			{/if}
			<span class="flex-1"></span>
			{#if photos.length || isAlike}
				<span
					class="pointer-events-auto flex rounded-full p-1 {GLASS}"
					role="tablist"
					aria-label="Picture or map"
				>
					{#each [[false, 'Photo', 'icon-[mdi--image]'], [true, 'Map', 'icon-[mdi--map]']] as const as [value, label, icon] (label)}
						<button
							class="flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition {isMap ===
							value
								? isDark
									? 'bg-white text-slate-900'
									: 'bg-slate-900 text-white'
								: ''}"
							role="tab"
							aria-selected={isMap === value}
							onclick={() => (isMap = value)}><span class="{icon} size-4"></span>{label}</button
						>
					{/each}
				</span>
			{/if}
			{#if buttons !== 'glass'}<span class="flex-1"></span>{/if}
			{#if buttons === 'none'}
				<span class="size-10 shrink-0"></span>
			{:else}
				<span
					class="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full {buttons ===
					'glass'
						? GLASS
						: GHOST}">{@render actions()}</span
				>
			{/if}
		</div>
		<div class="min-h-0 flex-1"></div>
		<div
			class="shrink-0 px-4 pb-5 md:px-8"
			style="padding-left: {left + (isWide ? 32 : 16)}px"
			bind:clientHeight={overlayHeight}
		>
			{#if isPhoto && photos.length > 1}
				<span class="mb-3 flex justify-center gap-1.5">
					{#each photos.slice(0, 8) as _, index (index)}
						<span
							class="rounded-full bg-white transition-all {index === at
								? 'size-[7px]'
								: 'size-1.5 opacity-50'}"
						></span>
					{/each}
				</span>
			{/if}
			<div
				class="max-w-3xl {isOver
					? ''
					: 'pointer-events-auto rounded-3xl bg-white/85 p-3 shadow-sm backdrop-blur-md'}"
			>
				{@render overlay(isOver)}
			</div>
		</div>
	{/snippet}
	<div
		class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+96px)] {FADE}"
		style="padding-left: {left + 16}px"
	>
		<div class="max-w-3xl">{@render children()}</div>
	</div>
</Split>

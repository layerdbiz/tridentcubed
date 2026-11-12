<script lang="ts">
	// PROTOTYPE (#161) run 5: the dashboard chart. It runs edge to edge in one blue, its fill fading out just above
	// the cards. Run 11 (2026-10-26 19:22): the chart type and time range menus moved down to the list's heading
	// (dashboard-list.svelte). Each card opens on its own chart (note 11): projects an area, customers a map of where
	// they are, the team a pie by label, and pies give numbers, never percents (note 12). A finger (or mouse) scrubs
	// back in time. The history was made up until run 16; now each point counts what had been made by then
	// (chart.data.ts). Run 12 (2026-11-07): the chart ends on the same count as its
	// card (note 13); the pie has one slice per label, in the board's order and colours, a tap on a slice filters the
	// list below to it, and a desktop lists the labels beside it.
	// Run 13 (Justin, 2026-11-07 22:21): the number is back at the top left, with what changed beside it in green (▲3
	// this week), on every page and every chart: it follows a finger or mouse scrubbing the chart, and a pie slice
	// tapped (its name beside the number). Nothing else is written up here. The pie is a thick ring of rounded slices
	// with the page's icon in its middle, so no word can run over it; on a phone it sits at the right, beside the number,
	// using the whole height, and on a desktop in the middle. The map is a real one, behind the whole top of
	// the screen (shell.svelte, world-map.svelte), so this draws only the number over it and lets taps through.
	// Run 14 (note 7): the pie sits in the middle on a phone too, and the number moves into its hole, with the page's
	// name (or the tapped slice's) written under it in place of the icon. Only the pie loses the top-left number.
	import { fade } from 'svelte/transition';
	import { chartOf, headlineAt, RANGE_NAMES, RANGES, slicesOf } from './chart.data';
	import { DATASETS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { countOf, createdOf } from './records.data';

	let { look }: { look: LookState } = $props();

	let width = $state(0);
	let height = $state(0);
	let sectionHeight = $state(0);
	let scrub = $state<number | undefined>(undefined);
	let hovered = $state<string>();

	const total = $derived(countOf(look, look.dataset, look.filter));
	const data = $derived(chartOf(createdOf(look, look.dataset, look.filter), look.range));
	const count = $derived(data.labels.length);
	const last = $derived(count - 1);
	const index = $derived(scrub ?? last);
	const slices = $derived(slicesOf(look, look.dataset));
	const range = $derived(RANGES.find((item) => item.id === look.range)!);
	const change = $derived(headlineAt(data, last) - headlineAt(data, 0));
	// The slice the number is about: the one filtered to, else the one under a mouse.
	const picked = $derived(
		look.chart === 'pie'
			? slices.find((slice) => slice.name === (look.filter === 'All' ? hovered : look.filter))
			: undefined
	);
	const isScrubbing = $derived(
		scrub !== undefined && (look.chart === 'area' || look.chart === 'bar')
	);
	const value = $derived(isScrubbing ? headlineAt(data, index) : (picked?.value ?? total));

	function tap(name: string) {
		look.filter = look.filter === name ? 'All' : name;
	}

	const totals = $derived(data.values);
	const max = $derived(Math.max(1, ...totals) * 1.12);
	const barWidth = $derived(Math.max(3, Math.min(28, count > 1 ? (width / count) * 0.55 : 28)));
	const inset = $derived(look.chart === 'bar' ? barWidth / 2 + 12 : 0);
	const step = $derived(count > 1 ? (width - inset * 2) / (count - 1) : 0);
	const TOP = 10;

	function xOf(at: number) {
		return inset + at * step;
	}
	function yOf(amount: number) {
		return TOP + (1 - amount / max) * (height - TOP);
	}

	// Monotone cubic curve through the totals, so it stays smooth and never dips below zero.
	const line = $derived.by(() => {
		const points = totals.map((amount, at) => [xOf(at), yOf(amount)]);
		if (points.length < 2) return '';
		const slopes = points
			.slice(0, -1)
			.map((point, at) => (points[at + 1][1] - point[1]) / (points[at + 1][0] - point[0] || 1));
		const tangents = points.map((_, at) => {
			if (at === 0) return slopes[0];
			if (at === points.length - 1) return slopes[at - 1];
			const [a, b] = [slopes[at - 1], slopes[at]];
			if (a * b <= 0) return 0;
			const mid = (a + b) / 2;
			return Math.sign(mid) * Math.min(Math.abs(mid), 3 * Math.min(Math.abs(a), Math.abs(b)));
		});
		let path = `M${points[0][0]},${points[0][1]}`;
		for (let at = 0; at < points.length - 1; at += 1) {
			const [x0, y0] = points[at];
			const [x1, y1] = points[at + 1];
			const third = (x1 - x0) / 3;
			path += `C${x0 + third},${y0 + tangents[at] * third} ${x1 - third},${y1 - tangents[at + 1] * third} ${x1},${y1}`;
		}
		return path;
	});
	const area = $derived(line ? `${line}L${xOf(last)},${height}L${xOf(0)},${height}Z` : '');

	// Pie: today's counts, each slice in its own colour; a label nothing has yet has no slice, only its legend row.
	const shares = $derived.by(() => {
		const sum = slices.reduce((all, slice) => all + slice.value, 0) || 1;
		let start = 0;
		return slices
			.filter((slice) => slice.value > 0)
			.map((slice) => {
				const share = slice.value / sum;
				const item = { slice, start, end: start + share };
				start += share;
				return item;
			});
	});

	// The ring's rounded corners come from a stroke in the slice's own colour, so the shape is drawn that much smaller.
	const ROUND = 5;
	const GAP = 3;

	function pointAt(turn: number, radius: number) {
		const angle = turn * Math.PI * 2 - Math.PI / 2;
		return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
	}

	// One slice of the ring, from `start` to `end` (shares of a turn), with an even gap on both sides.
	function sliceOf(start: number, end: number, outer: number, inner: number) {
		const [big, small] = [outer - ROUND / 2, inner + ROUND / 2];
		if (shares.length === 1)
			return `M${pointAt(0, big)} A${big},${big} 0 1 1 ${pointAt(0.5, big)} A${big},${big} 0 1 1 ${pointAt(0, big)} M${pointAt(0, small)} A${small},${small} 0 1 0 ${pointAt(0.5, small)} A${small},${small} 0 1 0 ${pointAt(0, small)}Z`;
		const half = (GAP + ROUND) / 2;
		const [outerGap, innerGap] = [half / (big * Math.PI * 2), half / (small * Math.PI * 2)];
		const [a, b] = [start + outerGap, Math.max(start + outerGap, end - outerGap)];
		const [c, d] = [start + innerGap, Math.max(start + innerGap, end - innerGap)];
		const isLarge = end - start > 0.5 ? 1 : 0;
		return `M${pointAt(a, big)} A${big},${big} 0 ${isLarge} 1 ${pointAt(b, big)} L${pointAt(d, small)} A${small},${small} 0 ${isLarge} 0 ${pointAt(c, small)}Z`;
	}

	// A picked slice moves out a little from the middle.
	function nudgeOf(start: number, end: number) {
		const angle = ((start + end) / 2) * Math.PI * 2 - Math.PI / 2;
		return `translate(${Math.cos(angle) * 6}px, ${Math.sin(angle) * 6}px)`;
	}

	function onpointermove(event: PointerEvent) {
		const box = (event.currentTarget as SVGElement).getBoundingClientRect();
		scrub = Math.max(
			0,
			Math.min(last, Math.round((event.clientX - box.left - inset) / (step || 1)))
		);
	}
</script>

<section
	class="pointer-events-none relative flex h-full min-h-0 flex-col"
	bind:clientHeight={sectionHeight}
>
	<!-- Over the map the number gets a soft glow of the page's grey, so a place name under it never muddles it. -->
	<p
		class="relative z-10 flex shrink-0 items-baseline gap-2 px-4 md:px-8 {look.chart === 'pie'
			? 'invisible'
			: ''} {look.chart === 'map' ? '[text-shadow:0_0_10px_#f1f5f9,0_0_4px_#f1f5f9]' : ''}"
		aria-hidden={look.chart === 'pie'}
	>
		<span class="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums md:text-5xl"
			>{value}</span
		>
		{#if isScrubbing}
			<span class="truncate text-sm font-medium text-slate-500">{data.labels[index]}</span>
		{:else if picked}
			<span class="flex min-w-0 items-center gap-1.5 text-sm font-semibold {picked.tone.text}"
				><span class="size-2.5 shrink-0 rounded-full {picked.tone.bg}"></span><span class="truncate"
					>{picked.name}</span
				></span
			>
		{:else}
			<span
				class="flex items-center text-sm font-semibold whitespace-nowrap {change >= 0
					? 'text-success'
					: 'text-danger'}"
				><span class="{change >= 0 ? 'icon-[mdi--menu-up]' : 'icon-[mdi--menu-down]'} size-5"
				></span>{Math.abs(change)}&nbsp;{range.long}</span
			>
		{/if}
	</p>

	<div
		class="relative min-h-0 flex-1"
		bind:clientWidth={width}
		bind:clientHeight={height}
	>
		{#key `${look.dataset}-${look.range}-${look.chart}${look.chart === 'pie' ? '' : `-${look.filter}`}`}
			<div
				class="absolute inset-0"
				in:fade={{ duration: 260 }}
			>
				{#if look.chart === 'pie'}
					{@const size = Math.max(60, Math.min(sectionHeight - 12, 220))}
					{@const outer = size / 2 - 8}
					{@const inner = outer * 0.58}
					<div
						class="absolute inset-x-0 bottom-0 flex items-center justify-center gap-10 px-5 md:px-8"
						style="height: {sectionHeight}px"
					>
						<svg
							viewBox="{-size / 2} {-size / 2} {size} {size}"
							width={size}
							height={size}
							class="pointer-events-auto shrink-0 overflow-visible"
							role="group"
							aria-label="{DATASETS[look.dataset].label} by label"
						>
							{#each shares as item, at (item.slice.name)}
								{@const isPicked = picked?.name === item.slice.name}
								<path
									d={sliceOf(item.start, item.end, outer, inner)}
									fill-rule="evenodd"
									stroke-width={ROUND}
									stroke-linejoin="round"
									class="pie-slice cursor-pointer outline-none {item.slice.tone.fill} {item.slice
										.tone.stroke} {picked && !isPicked ? 'opacity-30' : ''}"
									style="animation-delay: {at * 40}ms; transform: {isPicked
										? nudgeOf(item.start, item.end)
										: 'none'}"
									role="button"
									tabindex="0"
									aria-label="{item.slice.name}: {item.slice.value}"
									onclick={() => tap(item.slice.name)}
									onkeydown={(event) => event.key === 'Enter' && tap(item.slice.name)}
									onpointerenter={(event) =>
										event.pointerType === 'mouse' && (hovered = item.slice.name)}
									onpointerleave={() => (hovered = undefined)}
								/>
							{/each}
							<foreignObject
								x={-inner * 0.7}
								y={-inner * 0.7}
								width={inner * 1.4}
								height={inner * 1.4}
								class="pointer-events-none"
							>
								<span
									class="flex size-full flex-col items-center justify-center px-1 text-center leading-tight"
								>
									<span
										class="font-semibold tracking-tight text-slate-900 tabular-nums"
										style="font-size: {Math.round(inner * 0.5)}px">{value}</span
									>
									<span
										class="line-clamp-2 font-medium transition-colors {picked
											? picked.tone.text
											: 'text-slate-500'}"
										style="font-size: {Math.max(11, Math.round(inner * 0.16))}px"
										>{picked?.name ?? DATASETS[look.dataset].label}</span
									>
								</span>
							</foreignObject>
						</svg>
						<ul
							class="pointer-events-auto hidden max-h-full shrink-0 overflow-y-auto text-sm {look.variant(
								'pie'
							) === 'B'
								? 'w-[30rem] grid-cols-2 content-center gap-x-6 gap-y-0.5 md:grid'
								: 'w-56 space-y-0.5 md:block'}"
						>
							{#each slices as slice (slice.name)}
								<li>
									<button
										class="flex w-full items-center gap-2 rounded-lg px-2 py-0.5 text-left {picked &&
										picked.name !== slice.name
											? 'opacity-50'
											: ''}"
										onclick={() => tap(slice.name)}
										onpointerenter={() => (hovered = slice.name)}
										onpointerleave={() => (hovered = undefined)}
									>
										<span class="size-2.5 shrink-0 rounded-full {slice.tone.bg}"></span>
										<span class="min-w-0 flex-1 truncate text-slate-600">{slice.name}</span>
										<span class="font-semibold text-slate-900 tabular-nums">{slice.value}</span>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{:else if look.chart !== 'map' && width && height}
					<svg
						{width}
						{height}
						class="pointer-events-auto block touch-pan-y"
						role="img"
						aria-label="{look.dataset} over {RANGE_NAMES[look.range]}"
						{onpointermove}
						onpointerdown={onpointermove}
						onpointerleave={() => (scrub = undefined)}
					>
						<defs>
							<linearGradient
								id="hero-fill"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									class="text-primary"
									stop-color="currentColor"
									stop-opacity="0.32"
								/>
								<stop
									offset="85%"
									class="text-primary"
									stop-color="currentColor"
									stop-opacity="0.04"
								/>
								<stop
									offset="100%"
									class="text-primary"
									stop-color="currentColor"
									stop-opacity="0"
								/>
							</linearGradient>
						</defs>
						{#if look.chart === 'area'}
							<path
								d={area}
								fill="url(#hero-fill)"
								class="chart-fill"
							/>
							<path
								d={line}
								class="chart-draw fill-none stroke-primary"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								pathLength="1"
							/>
						{:else}
							{#each totals as amount, at (at)}
								<rect
									x={xOf(at) - barWidth / 2}
									y={yOf(amount)}
									width={barWidth}
									height={Math.max(1, height - yOf(amount))}
									rx={Math.min(barWidth / 2, 6)}
									fill="url(#hero-fill)"
									class="chart-bar {scrub !== undefined && scrub !== at
										? 'opacity-40'
										: ''} transition-opacity"
									style="animation-delay: {at * 12}ms"
								/>
								<rect
									x={xOf(at) - barWidth / 2}
									y={yOf(amount)}
									width={barWidth}
									height="3"
									rx="1.5"
									class="chart-bar fill-primary {scrub !== undefined && scrub !== at
										? 'opacity-40'
										: ''}"
									style="animation-delay: {at * 12}ms"
								/>
							{/each}
						{/if}
						{#if scrub !== undefined}
							<line
								x1={xOf(index)}
								x2={xOf(index)}
								y1={TOP}
								y2={height}
								class="stroke-slate-900/25"
								stroke-dasharray="3 3"
							/>
							{#if look.chart === 'area'}
								<circle
									cx={xOf(index)}
									cy={yOf(totals[index])}
									r="5"
									class="fill-white stroke-primary"
									stroke-width="2.5"
								/>
							{/if}
						{/if}
					</svg>
				{/if}
			</div>
		{/key}
	</div>
</section>

<style>
	.chart-draw {
		stroke-dasharray: 1;
		animation: draw 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.chart-fill {
		animation: rise 700ms ease-out both;
	}
	.pie-slice {
		transform-box: view-box;
		transform-origin: center;
		transition:
			transform 200ms ease-out,
			opacity 200ms;
		animation: pop 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.chart-bar {
		transform-box: fill-box;
		transform-origin: bottom;
		animation: grow 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
		}
	}
	@keyframes pop {
		from {
			opacity: 0;
			scale: 0.85;
		}
	}
	@keyframes grow {
		from {
			transform: scaleY(0);
		}
	}
</style>

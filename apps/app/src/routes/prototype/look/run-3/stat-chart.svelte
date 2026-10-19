<script lang="ts">
	// PROTOTYPE (#161): the dashboard chart, Cash App style: a big number, a smooth chart under it, ranges from
	// 24 hours to all time, and a finger (or mouse) that scrubs back in time. Area, bars or donut, over whatever the
	// selected count tile counts. The history is made up (chart.data.ts); the right edge is the real list.
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { CHART_KINDS, chartOf, headlineAt, RANGES, type SeriesType } from './chart.data';
	import { DATASETS } from './look.data';
	import type { LookState } from './look.state.svelte';

	let {
		look,
		height = 150,
		isCard = false,
		top
	}: { look: LookState; height?: number; isCard?: boolean; top?: Snippet } = $props();

	let width = $state(0);
	let scrub = $state<number | undefined>(undefined);

	const data = $derived(chartOf(look.dataset, look.range, look.projects, look.filter));
	const count = $derived(data.labels.length);
	const last = $derived(count - 1);
	const index = $derived(scrub ?? last);
	const value = $derived(headlineAt(data, index));
	const change = $derived(headlineAt(data, last) - headlineAt(data, 0));
	const range = $derived(RANGES.find((item) => item.id === look.range)!);
	const label = $derived(
		look.dataset === 'projects' && look.filter !== 'All'
			? look.filter
			: DATASETS[look.dataset].headline
	);

	const PAD = 6;
	const totals = $derived(
		data.labels.map((_, at) => data.series.reduce((sum, series) => sum + series.values[at], 0))
	);
	const max = $derived(Math.max(1, ...totals) * 1.18);
	// Bars sit inside the edges, so the first and last are not cut in half.
	const barWidth = $derived(
		Math.max(3, Math.min(40, count > 1 ? ((width - PAD * 2) / (count - 1)) * 0.5 : 40))
	);
	const inset = $derived(look.chart === 'bar' ? barWidth / 2 : 0);
	const step = $derived(count > 1 ? (width - (PAD + inset) * 2) / (count - 1) : 0);

	function xOf(at: number) {
		return PAD + inset + at * step;
	}
	function yOf(amount: number) {
		return PAD + (1 - amount / max) * (height - PAD * 2);
	}

	// Layer tops for the stacked chart: each series sits on the ones before it.
	const layers = $derived.by(() => {
		const base = data.labels.map(() => 0);
		return data.series.map((series) => {
			const lower = [...base];
			series.values.forEach((amount, at) => (base[at] += amount));
			return { series, lower, upper: [...base] };
		});
	});

	type SegmentType = [number, number, number, number, number, number, number, number];

	// Monotone cubic segments (no overshoot below zero), so the curves stay smooth and honest.
	function segmentsOf(values: number[]): SegmentType[] {
		const points = values.map((amount, at) => [xOf(at), yOf(amount)]);
		const slopes = points
			.slice(0, -1)
			.map((point, at) => (points[at + 1][1] - point[1]) / (points[at + 1][0] - point[0] || 1));
		const tangents = points.map((_, at) => {
			if (at === 0) return slopes[0] ?? 0;
			if (at === points.length - 1) return slopes[at - 1] ?? 0;
			const [a, b] = [slopes[at - 1], slopes[at]];
			if (a * b <= 0) return 0;
			const mid = (a + b) / 2;
			return Math.sign(mid) * Math.min(Math.abs(mid), 3 * Math.min(Math.abs(a), Math.abs(b)));
		});
		return points.slice(0, -1).map((point, at) => {
			const next = points[at + 1];
			const third = (next[0] - point[0]) / 3;
			return [
				point[0],
				point[1],
				point[0] + third,
				point[1] + tangents[at] * third,
				next[0] - third,
				next[1] - tangents[at + 1] * third,
				next[0],
				next[1]
			];
		});
	}

	function lineOf(values: number[]) {
		const segments = segmentsOf(values);
		if (!segments.length) return '';
		return (
			`M${segments[0][0]},${segments[0][1]}` +
			segments
				.map((item) => `C${item[2]},${item[3]} ${item[4]},${item[5]} ${item[6]},${item[7]}`)
				.join('')
		);
	}

	function areaOf(upper: number[], lower: number[]) {
		const back = segmentsOf(lower).reverse();
		return (
			lineOf(upper) +
			`L${xOf(lower.length - 1)},${yOf(lower[lower.length - 1])}` +
			back
				.map((item) => `C${item[4]},${item[5]} ${item[2]},${item[3]} ${item[0]},${item[1]}`)
				.join('') +
			'Z'
		);
	}

	// Donut: each series' share over the whole range.
	const shares = $derived.by(() => {
		const sums = data.series.map((series) =>
			series.values.reduce((sum, amount) => sum + amount, 0)
		);
		const total = sums.reduce((sum, amount) => sum + amount, 0) || 1;
		let start = 0;
		return data.series.map((series, at) => {
			const share = sums[at] / total;
			const item = { series, share, start, end: start + share };
			start += share;
			return item;
		});
	});

	function arcOf(start: number, end: number, radius: number) {
		const gap = 0.012;
		const [from, to] = [start + gap, Math.max(start + gap, end - gap)];
		const a = from * Math.PI * 2 - Math.PI / 2;
		const b = to * Math.PI * 2 - Math.PI / 2;
		const isLarge = to - from > 0.5 ? 1 : 0;
		return `M${Math.cos(a) * radius},${Math.sin(a) * radius} A${radius},${radius} 0 ${isLarge} 1 ${Math.cos(b) * radius},${Math.sin(b) * radius}`;
	}

	function onpointermove(event: PointerEvent) {
		const box = (event.currentTarget as SVGElement).getBoundingClientRect();
		scrub = Math.max(
			0,
			Math.min(last, Math.round((event.clientX - box.left - PAD - inset) / (step || 1)))
		);
	}

	function pointOf(series: SeriesType, at: number) {
		return layers.find((layer) => layer.series === series)?.upper[at] ?? 0;
	}
</script>

<section
	class={isCard
		? 'rounded-[28px] bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-16px_rgb(15_23_42/0.18)] md:p-6'
		: ''}
>
	{#if top}{@render top()}{/if}

	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
			<p class="flex items-baseline gap-2">
				<span class="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums md:text-5xl"
					>{value}</span
				>
				{#if scrub === undefined}
					<span
						class="flex items-center text-sm font-semibold {change >= 0
							? 'text-success'
							: 'text-danger'}"
						><span class="{change >= 0 ? 'icon-[mdi--menu-up]' : 'icon-[mdi--menu-down]'} size-5"
						></span>{Math.abs(change)}
						{range.long}</span
					>
				{:else}
					<span class="text-sm font-medium text-slate-500">{data.labels[index]}</span>
				{/if}
			</p>
		</div>
		<div
			class="flex shrink-0 rounded-full bg-slate-900/5 p-0.5"
			role="radiogroup"
			aria-label="Chart type"
		>
			{#each CHART_KINDS as kind (kind.id)}
				<button
					type="button"
					class="flex size-8 items-center justify-center rounded-full transition {look.chart ===
					kind.id
						? 'bg-white text-slate-900 shadow-sm'
						: 'text-slate-400 hover:text-slate-700'}"
					role="radio"
					aria-checked={look.chart === kind.id}
					aria-label={kind.label}
					title={kind.label}
					onclick={() => (look.chart = kind.id)}
					><span class="{kind.icon} size-[18px]"></span></button
				>
			{/each}
		</div>
	</div>

	<div
		class="relative mt-3"
		bind:clientWidth={width}
		style="height: {height}px"
	>
		{#key `${look.dataset}-${look.range}-${look.chart}-${look.filter}`}
			<div
				class="absolute inset-0"
				in:fade={{ duration: 260 }}
			>
				{#if look.chart === 'donut'}
					{@const radius = height / 2 - 12}
					<div class="flex h-full items-center gap-5 md:gap-10">
						<svg
							viewBox="{-height / 2} {-height / 2} {height} {height}"
							width={height}
							{height}
							class="shrink-0"
						>
							<circle
								r={radius}
								class="fill-none stroke-slate-100"
								stroke-width="14"
							/>
							{#each shares as item (item.series.name)}
								{#if item.share > 0}
									<path
										d={arcOf(item.start, item.end, radius)}
										class="chart-draw fill-none {item.series.tone.stroke}"
										stroke-width="14"
										stroke-linecap="round"
										pathLength="1"
									/>
								{/if}
							{/each}
							<text
								y="-2"
								text-anchor="middle"
								class="fill-slate-900 text-[22px] font-semibold">{value}</text
							>
							<text
								y="16"
								text-anchor="middle"
								class="fill-slate-400 text-[10px] font-medium uppercase">now</text
							>
						</svg>
						<ul class="min-w-0 flex-1 space-y-1.5 text-xs md:max-w-xs md:text-sm">
							{#each shares as item (item.series.name)}
								<li class="flex items-center gap-2">
									<span class="size-2.5 shrink-0 rounded-full {item.series.tone.bg}"></span>
									<span class="min-w-0 flex-1 truncate text-slate-600">{item.series.name}</span>
									<span class="font-semibold text-slate-900 tabular-nums"
										>{Math.round(item.share * 100)}%</span
									>
								</li>
							{/each}
						</ul>
					</div>
				{:else if width}
					<svg
						{width}
						{height}
						class="touch-pan-y overflow-visible"
						role="img"
						aria-label="{label} over {range.label}"
						{onpointermove}
						onpointerdown={onpointermove}
						onpointerleave={() => (scrub = undefined)}
					>
						<defs>
							{#each data.series as series, at (series.name)}
								<linearGradient
									id="fill-{at}"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										class={series.tone.text}
										stop-color="currentColor"
										stop-opacity="0.38"
									/>
									<stop
										offset="100%"
										class={series.tone.text}
										stop-color="currentColor"
										stop-opacity="0.04"
									/>
								</linearGradient>
							{/each}
						</defs>
						{#each [0.25, 0.5, 0.75] as line (line)}
							<line
								x1={PAD}
								x2={width - PAD}
								y1={PAD + line * (height - PAD * 2)}
								y2={PAD + line * (height - PAD * 2)}
								class="stroke-slate-900/[0.05]"
								stroke-dasharray="2 4"
							/>
						{/each}
						{#if look.chart === 'area'}
							{#each layers as layer, at (layer.series.name)}
								<path
									d={areaOf(layer.upper, layer.lower)}
									fill="url(#fill-{at})"
									class="chart-fill"
								/>
							{/each}
							{#each layers as layer (layer.series.name)}
								<path
									d={lineOf(layer.upper)}
									class="chart-draw fill-none {layer.series.tone.stroke}"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									pathLength="1"
								/>
							{/each}
						{:else}
							{#each data.labels as _, at (at)}
								{#each layers as layer (layer.series.name)}
									{@const size = yOf(layer.lower[at]) - yOf(layer.upper[at])}
									{#if size > 0.5}
										<rect
											x={xOf(at) - barWidth / 2}
											y={yOf(layer.upper[at]) + 1}
											width={barWidth}
											height={Math.max(1, size - 1.5)}
											rx={Math.min(barWidth / 2, 6)}
											class="chart-bar {layer.series.tone.fill} {scrub !== undefined && scrub !== at
												? 'opacity-35'
												: ''} transition-opacity"
											style="animation-delay: {at * 12}ms"
										/>
									{/if}
								{/each}
							{/each}
						{/if}
						{#if scrub !== undefined}
							<line
								x1={xOf(index)}
								x2={xOf(index)}
								y1={PAD}
								y2={height - PAD}
								class="stroke-slate-900/25"
								stroke-dasharray="3 3"
							/>
							{#if look.chart === 'area'}
								{#each data.series as series (series.name)}
									<circle
										cx={xOf(index)}
										cy={yOf(pointOf(series, index))}
										r="5"
										class="fill-white {series.tone.stroke}"
										stroke-width="2.5"
									/>
								{/each}
							{/if}
						{/if}
					</svg>
				{/if}
			</div>
		{/key}
	</div>

	{#if look.chart !== 'donut'}
		<div class="mt-1 flex justify-between text-[10px] text-slate-400">
			<span>{data.labels[0]}</span><span>{data.labels[Math.floor(last / 2)]}</span><span>Now</span>
		</div>
	{/if}

	<div
		class="mt-3 grid grid-cols-8 gap-1 md:flex md:justify-start md:gap-1.5"
		role="radiogroup"
		aria-label="Time range"
	>
		{#each RANGES as item (item.id)}
			<button
				type="button"
				class="rounded-full py-1.5 text-[11px] font-semibold tracking-wide transition md:px-3.5 {look.range ===
				item.id
					? 'bg-slate-900 text-white'
					: 'text-slate-500 hover:bg-slate-900/5'}"
				role="radio"
				aria-checked={look.range === item.id}
				onclick={() => (look.range = item.id)}>{item.label}</button
			>
		{/each}
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
	@keyframes grow {
		from {
			transform: scaleY(0);
		}
	}
</style>

<script lang="ts">
	// PROTOTYPE (#161) run 5: the dashboard chart. It runs edge to edge in one blue, its fill fading out just above
	// the cards. The big number and its change sat top left until run 12. Run 11 (2026-10-26 19:22): the chart type and time range
	// menus moved down to the list's heading (dashboard-list.svelte). Each card opens on its own chart (note 11):
	// projects an area, customers a map of where they are, the team a pie by label, and pies give numbers, never
	// percents (note 12). A finger (or mouse) scrubs back in time. The history is made up (chart.data.ts); the map is us-atlas (map.data.ts).
	// Run 12 (2026-11-07): the chart ends on the same count as its card (note 13), and the card carries the number and
	// what changed, so no big number repeats it up here; scrubbing shows the count on the day under the finger. The pie
	// sits in the middle (note 11) with one slice per label, in the board's order and colours, and no legend on a phone
	// (note 12): tap a slice and its count and name show in the middle, and the list below filters to it; tap it again
	// for all. A desktop has room for the legend beside it, every label listed, zero or not.
	import { fade } from 'svelte/transition';
	import { chartOf, headlineAt, pinsOf, RANGE_NAMES, slicesOf } from './chart.data';
	import { DATASETS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { US_BORDERS, US_NATION } from './map.data';
	import { countOf } from './records.data';

	let { look }: { look: LookState } = $props();

	let width = $state(0);
	let height = $state(0);
	let scrub = $state<number | undefined>(undefined);
	let hovered = $state<string>();

	const total = $derived(countOf(look, look.dataset, look.filter));
	const data = $derived(chartOf(look.dataset, look.range, total, look.filter));
	const count = $derived(data.labels.length);
	const last = $derived(count - 1);
	const index = $derived(scrub ?? last);
	const slices = $derived(slicesOf(look, look.dataset));
	const map = $derived(pinsOf(look, look.dataset, look.filter));
	const note = $derived(
		`On the map: ${map.pins.length} US ${map.pins.length === 1 ? 'city' : 'cities'}${map.away.length ? ` + ${[...new Set(map.away)].join(', ')}` : ''}`
	);
	// The slice in the middle of the pie: the one filtered to, else the one under a mouse.
	const picked = $derived(
		slices.find((slice) => slice.name === (look.filter === 'All' ? hovered : look.filter))
	);

	// What the number in the middle of the pie counts, short enough to fit inside it.
	const NOUNS = {
		projects: 'projects',
		customers: 'customers',
		team: 'people',
		transport: 'transports',
		facilities: 'facilities'
	};

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
		const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
		let start = 0;
		return slices
			.filter((slice) => slice.value > 0)
			.map((slice) => {
				const share = slice.value / total;
				const item = { slice, start, end: start + share };
				start += share;
				return item;
			});
	});

	// Map: the whole country, with a little room so edge pins are not cut off.
	const viewBox = '-10 -20 995 650';
	// Map units per screen pixel, so pins and labels keep their size on screen.
	const pinScale = $derived.by(() => {
		const [w, h] = [995, 650];
		return width && height ? Math.max(w / width, h / height) : 1;
	});

	const radiusOf = (count: number) => (4 + Math.sqrt(count) * 3) * pinScale;

	// City labels, biggest pin first: to the right, else to the left, else none, so no two overlap where pins crowd
	// (the facilities on the Gulf coast); a pin's tooltip still names it.
	const spots = $derived.by(() => {
		type BoxType = { x1: number; x2: number; y1: number; y2: number };
		const boxes: BoxType[] = map.pins.map((pin) => {
			const r = radiusOf(pin.count);
			return { x1: pin.x - r, x2: pin.x + r, y1: pin.y - r, y2: pin.y + r };
		});
		const found = new Map<string, { x: number; anchor: 'start' | 'end' }>();
		for (const pin of map.pins.toSorted((a, b) => b.count - a.count)) {
			const r = radiusOf(pin.count);
			const width = pin.city.split(',')[0].length * 5.8 * pinScale;
			const half = 6 * pinScale;
			for (const anchor of ['start', 'end'] as const) {
				const x = anchor === 'start' ? pin.x + r + 3 * pinScale : pin.x - r - 3 * pinScale;
				const box = {
					x1: anchor === 'start' ? x : x - width,
					x2: anchor === 'start' ? x + width : x,
					y1: pin.y - half,
					y2: pin.y + half
				};
				const isTaken = boxes.some(
					(other) =>
						other.x1 < box.x2 && box.x1 < other.x2 && other.y1 < box.y2 && box.y1 < other.y2
				);
				if (isTaken) continue;
				boxes.push(box);
				found.set(pin.city, { x, anchor });
				break;
			}
		}
		return found;
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
			Math.min(last, Math.round((event.clientX - box.left - inset) / (step || 1)))
		);
	}
</script>

<section class="flex h-full min-h-0 flex-col">
	<div
		class="relative min-h-0 flex-1"
		bind:clientWidth={width}
		bind:clientHeight={height}
	>
		{#if scrub !== undefined && (look.chart === 'area' || look.chart === 'bar')}
			<p
				class="pointer-events-none absolute top-0 left-4 z-10 flex items-baseline gap-2 rounded-full bg-white/80 px-3 py-1 backdrop-blur md:left-8"
			>
				<span class="text-lg font-semibold text-slate-900 tabular-nums"
					>{headlineAt(data, index)}</span
				>
				<span class="text-xs font-medium text-slate-500">{data.labels[index]}</span>
			</p>
		{:else if look.chart === 'map'}
			<p
				class="pointer-events-none absolute top-0 left-4 z-10 max-w-[60%] truncate text-xs font-medium text-slate-500 md:left-8"
			>
				{note}
			</p>
		{/if}
		{#key `${look.dataset}-${look.range}-${look.chart}${look.chart === 'pie' ? '' : `-${look.filter}`}`}
			<div
				class="absolute inset-0"
				in:fade={{ duration: 260 }}
			>
				{#if look.chart === 'pie'}
					{@const size = Math.max(60, Math.min(height - 8, 240))}
					{@const radius = size / 2 - 14}
					<div class="flex h-full items-center justify-center gap-10 px-4 md:px-8">
						<svg
							viewBox="{-size / 2} {-size / 2} {size} {size}"
							width={size}
							height={size}
							class="shrink-0 overflow-visible"
							role="group"
							aria-label="{DATASETS[look.dataset].label} by label"
						>
							<circle
								r={radius}
								class="fill-none stroke-slate-900/[0.06]"
								stroke-width="24"
							/>
							{#each shares as item (item.slice.name)}
								{@const isDim = picked && picked.name !== item.slice.name}
								<path
									d={arcOf(item.start, item.end, radius)}
									class="chart-draw cursor-pointer fill-none transition-[opacity,stroke-width] duration-200 outline-none {item
										.slice.tone.stroke} {isDim ? 'opacity-25' : ''}"
									stroke-width={picked?.name === item.slice.name ? 30 : 24}
									pathLength="1"
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
							<text
								text-anchor="middle"
								y={-6}
								class="pointer-events-none fill-slate-900 text-[26px] font-semibold tabular-nums"
								>{picked ? picked.value : total}</text
							>
							<text
								text-anchor="middle"
								y={14}
								class="pointer-events-none fill-slate-500 text-[11px] font-medium"
								>{(picked?.name ?? NOUNS[look.dataset]).slice(0, 16)}</text
							>
						</svg>
						<ul
							class="hidden max-h-full w-56 shrink-0 space-y-0.5 overflow-y-auto text-sm md:block"
						>
							{#each slices as slice (slice.name)}
								<li>
									<button
										class="flex w-full items-center gap-2 rounded-lg px-2 py-0.5 text-left transition hover:bg-slate-900/[0.04] {picked &&
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
				{:else if look.chart === 'map'}
					<svg
						{viewBox}
						overflow="visible"
						class="block size-full"
						preserveAspectRatio="xMidYMid meet"
						role="img"
						aria-label="Where the {look.dataset} are"
					>
						<path
							d={US_NATION}
							class="fill-slate-900/[0.07]"
						/>
						<path
							d={US_BORDERS}
							class="fill-none stroke-white"
							stroke-width={1.2 * pinScale}
							stroke-linejoin="round"
						/>
						{#each map.pins as pin, at (pin.city)}
							{@const r = radiusOf(pin.count)}
							{@const spot = spots.get(pin.city)}
							<g
								class="chart-pin"
								style="animation-delay: {at * 60}ms"
							>
								<title>{pin.city}: {pin.names.join(', ')}</title>
								<circle
									cx={pin.x}
									cy={pin.y}
									r={r * 1.6}
									class="fill-primary/15"
								/>
								<circle
									cx={pin.x}
									cy={pin.y}
									{r}
									class="fill-primary stroke-white"
									stroke-width={2 * pinScale}
								/>
								{#if pin.count > 1}
									<text
										x={pin.x}
										y={pin.y}
										text-anchor="middle"
										dominant-baseline="central"
										class="fill-white font-semibold"
										style="font-size: {10 * pinScale}px">{pin.count}</text
									>
								{/if}
								{#if spot}
									<text
										x={spot.x}
										y={pin.y}
										text-anchor={spot.anchor}
										dominant-baseline="central"
										class="fill-slate-600 font-medium"
										style="font-size: {10 * pinScale}px">{pin.city.split(',')[0]}</text
									>
								{/if}
							</g>
						{/each}
					</svg>
				{:else if width && height}
					<svg
						{width}
						{height}
						class="block touch-pan-y"
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
	.chart-pin {
		animation: rise 500ms ease-out both;
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

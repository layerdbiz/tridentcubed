<script lang="ts">
	// The trip as a strip (#247, #256; the Stops look, settled by Justin on 2026-11-22, is #273): facilities as
	// circles in a row, a line from one to the next, the Transport Mode on the line with its name under it. Each
	// circle has its facility's name and location written inside its ring like a coin's legends, and its point's
	// word (Start, Stop or End) on a filled band outside it. A plain line runs in before the first facility and
	// out after the last, and the trip has one arrowhead, pointing into the End. Where everything goes is worked
	// out in trip.utils.ts from the text's own widths; this measures the text and draws what that says.
	//
	// It takes the trip as legs and draws itself, at the report page's own width unless it is given another. The
	// report's cover is its first user.
	//
	// The text is measured as the page draws it, in hidden copies of its labels (never on a canvas): a phone that
	// will not draw text under 8 px, or has a larger text setting, prints a name bigger than a canvas says, and the
	// names ran into each other on Justin's phone. For the same reason no real font size on the strip is under
	// 8 px: a vehicle's name is set at four times its size and scaled back down by a quarter, and the lettering in
	// and round a circle is drawn in a picture several times its size and scaled back by its view box. A label is
	// measured by its laid out size (`offsetWidth`), which the zoom the preview's pages are drawn at does not
	// change.
	import { onMount } from 'svelte';
	import {
		TRIP_AVAIL,
		TRIP_BAND,
		TRIP_COLORS,
		TRIP_LINE_COLOR,
		TRIP_NODE_CLEAR,
		TRIP_PAD,
		TRIP_RING,
		TRIP_SIZES
	} from './trip.constants';
	import type { TripLegType, TripMeasureType, TripStripType } from './trip.types';
	import { toTripArc, toTripRun, tripDepthsOf, tripLayoutOf, tripSlotOf } from './trip.utils';

	export type TripProps = {
		/** The trip: each leg's Transport Mode and the facilities it calls at, in order. */
		legs: TripLegType[];
		/** The widest it may print, in points: the report page's own unless another is given. */
		width?: number;
	};

	let { legs, width = TRIP_AVAIL }: TripProps = $props();

	// A page may hold the strip more than once (the Preview is mounted for the phone and for the desk), so each
	// names its lettering's paths its own.
	const uid = $props.id();

	// How many times its size the lettering in a ring and on a band is drawn at, and the size its hidden copy is
	// measured at.
	const RING_ZOOM = 8;
	const BAND_ZOOM = 4;
	const PROBE = 40;

	// The hidden labels text is written into and measured in.
	let vehicleProbe = $state<HTMLElement>();
	let ringProbe = $state<SVGTextElement>();
	let bandProbe = $state<SVGTextElement>();

	const names = new Map<string, { width: number; height: number }>();
	const lengths = new Map<string, number>();
	function forget() {
		names.clear();
		lengths.clear();
	}
	// A length of lettering, read from its hidden copy at the copy's size.
	function lengthOf(probe: SVGTextElement, text: string) {
		probe.textContent = text;
		return probe.getComputedTextLength() / PROBE;
	}
	const measure: TripMeasureType = {
		vehicle(text) {
			let size = names.get(text);
			if (!size) {
				if (!vehicleProbe) return { width: 0, height: 0 };
				vehicleProbe.textContent = text;
				// A little over what was measured, so a name that rounds up a pixel never touches its neighbour.
				size = {
					width: (vehicleProbe.offsetWidth / 4) * 1.02 + 0.5,
					height: vehicleProbe.offsetHeight / 4
				};
				names.set(text, size);
			}
			return size;
		},
		// The hidden copy has no space between its letters; the space after every letter but the last is added.
		ring(text) {
			let length = lengths.get(`ring:${text}`);
			if (length === undefined) {
				if (!ringProbe) return 0;
				length = lengthOf(ringProbe, text) + TRIP_RING.spacing * ([...text].length - 1);
				lengths.set(`ring:${text}`, length);
			}
			return length;
		},
		band(text) {
			let length = lengths.get(`band:${text}`);
			if (length === undefined) {
				if (!bandProbe) return 0;
				length = lengthOf(bandProbe, text) * TRIP_BAND.text;
				lengths.set(`band:${text}`, length);
			}
			return length;
		}
	};

	// The text is measured again once the page's own font has arrived: until then it is another font's width.
	let fonts = $state(0);
	onMount(() => {
		void document.fonts?.ready.then(() => {
			forget();
			fonts += 1;
		});
	});

	// How wide the strip is laid out: nothing while it is not drawn at all (the Preview is mounted for the phone and
	// for the desk, and only one of the two is shown). Text cannot be measured there, so the strip waits, and
	// measures afresh when it comes to be drawn.
	let drawn = $state(0);
	let strip = $state.raw<TripStripType>({ kind: 'none' });
	let room = $state(0);
	let depths = $state.raw({ line: 0, vehicle: 0, height: 0 });

	$effect(() => {
		void fonts;
		if (!vehicleProbe || !ringProbe || !bandProbe) return;
		if (!drawn) {
			forget();
			return;
		}
		const next = tripLayoutOf(toTripRun(legs), measure, width);
		room = tripSlotOf(measure);
		depths = tripDepthsOf(measure);
		strip = next;
	});

	const round = (value: number) => Math.round(value * 10) / 10;

	// The lettering inside a ring is drawn in a picture of the circle, RING_ZOOM times its size. The name's line
	// runs clockwise from just past the foot, so its letters stand with their heads to the rim; the location's
	// runs the other way from just left of the top, so it reads the right way up along the foot.
	const COIN = TRIP_SIZES.dot * RING_ZOOM;
	function legendPath(where: 'top' | 'bottom', radius: number) {
		return where === 'top'
			? toTripArc(COIN / 2, radius * RING_ZOOM, 95, 445)
			: toTripArc(COIN / 2, radius * RING_ZOOM, 265, -85);
	}

	// The band is drawn in a picture a little bigger than its circle, BAND_ZOOM times its size.
	const edge = TRIP_SIZES.dot / 2;
	const box = 2 * (edge + TRIP_BAND.out + 2);
	const ARC = {
		box,
		view: box * BAND_ZOOM,
		// The line its lettering stands on, from where the lettering starts.
		path: toTripArc(
			(box * BAND_ZOOM) / 2,
			(edge + TRIP_BAND.base) * BAND_ZOOM,
			TRIP_BAND.from,
			TRIP_BAND.from + 215
		),
		middle: (edge + TRIP_BAND.middle) * BAND_ZOOM,
		thick: TRIP_BAND.thick * BAND_ZOOM
	};
</script>

<div
	class="strip"
	style="--rule: {TRIP_LINE_COLOR}; min-height: {round(room)}px"
	bind:offsetWidth={drawn}
>
	<!-- The hidden labels that text is measured in. -->
	<div
		class="probe"
		aria-hidden="true"
	>
		<div class="lab"><b bind:this={vehicleProbe}></b></div>
		<svg
			width="1"
			height="1"
		>
			<text
				class="legend"
				font-size={PROBE}
				bind:this={ringProbe}
			></text>
			<text
				class="word"
				font-size={PROBE}
				bind:this={bandProbe}
			></text>
		</svg>
	</div>

	{#if strip.kind === 'row'}
		{@const { row, scale } = strip}
		<!-- Laid out at full size, then scaled as one piece: up to its starting size, or down to fit its room. -->
		<div
			class="fitbox"
			style="width: {round(row.width * scale)}px; height: {round(depths.height * scale)}px"
		>
			<div
				class="route"
				style="width: {round(row.width)}px; height: {round(
					depths.height
				)}px; transform: scale({Math.round(scale * 10000) / 10000})"
			>
				{#each row.segs as seg (seg.index)}
					<div
						class="ln {seg.fade} {seg.hasArrow ? 'has-arrow' : ''}"
						style="left: {round(row.x[seg.index])}px; width: {round(
							row.x[seg.index + 1] - row.x[seg.index]
						)}px; top: {round(depths.line - TRIP_SIZES.line / 2)}px; --v: {round(
							seg.fading
						)}px; --e: {round(seg.tip)}px"
					></div>
				{/each}
				<!-- Clear paper between the line and whatever sits on it. -->
				{#each row.segs as seg (seg.index)}
					{#if !seg.isBare}
						<div
							class="mask"
							style="left: {round(seg.middle)}px; top: {round(
								depths.line
							)}px; width: {TRIP_PAD}px; height: {TRIP_PAD}px"
						></div>
					{/if}
				{/each}
				{#each row.nodes as node, at (at)}
					{#if !node.isGhost}
						<div
							class="mask"
							style="left: {round(row.x[at])}px; top: {round(depths.line)}px; width: {round(
								2 * (node.half + TRIP_NODE_CLEAR)
							)}px; height: {round(TRIP_SIZES.dot + 2 * TRIP_NODE_CLEAR)}px"
						></div>
					{/if}
				{/each}
				<!-- A line with a vehicle carries its Transport Mode: a plain dark icon on it. -->
				{#each row.segs as seg (seg.index)}
					{#if !seg.isBare}
						<div
							class="vh"
							style="left: {round(seg.middle)}px; top: {round(depths.line)}px"
						>
							<span
								class="{seg.icon} block"
								style="width: {TRIP_SIZES.mode}px; height: {TRIP_SIZES.mode}px"
							></span>
						</div>
					{/if}
				{/each}
				{#each row.nodes as node, at (at)}
					{#if !node.isGhost}
						{@const place = `--p: ${TRIP_COLORS[node.point]}; left: ${round(row.x[at])}px; top: ${round(depths.line)}px`}
						<!-- One circle: the facility's icon in its point's colour. Its ring is its own border. -->
						<div
							class="dot"
							style="{place}; width: {TRIP_SIZES.dot}px; height: {TRIP_SIZES.dot}px; border-width: {TRIP_SIZES.border}px"
							role="img"
							aria-label={[node.word, node.name, node.city].filter(Boolean).join(', ')}
						>
							<span
								class="{node.icon} block"
								style="width: {TRIP_SIZES.icon}px; height: {TRIP_SIZES.icon}px"
							></span>
						</div>
						{#if node.ring}
							{@const { ring } = node}
							{@const letters = ring.size * RING_ZOOM}
							<!-- Its name and its location inside the ring, with a line between them on each side. -->
							<svg
								class="coin"
								viewBox="0 0 {COIN} {COIN}"
								width={TRIP_SIZES.dot}
								height={TRIP_SIZES.dot}
								style={place}
								aria-hidden="true"
							>
								{#each ring.legends as legend (legend.where)}
									<path
										id="{uid}-{legend.where}-{at}"
										d={legendPath(legend.where, legend.radius)}
										fill="none"
									/>
									<!-- The space after the last letter would push a legend off its middle, so half of it is
									     given back. -->
									<text
										class="legend"
										font-size={round(letters)}
										dx={round((TRIP_RING.spacing * letters) / 2)}
										text-anchor="middle"
										style="letter-spacing: {TRIP_RING.spacing}em"
										><textPath
											href="#{uid}-{legend.where}-{at}"
											startOffset={round(
												(legend.radius * RING_ZOOM * legend.along * Math.PI) / 180
											)}>{legend.text}</textPath
										></text
									>
								{/each}
								{#each ring.rules as rule (rule.from)}
									<path
										class="rule"
										d={toTripArc(COIN / 2, ring.middle * RING_ZOOM, rule.from, rule.to)}
										stroke-width={round(letters * TRIP_RING.cap * TRIP_RING.stroke)}
									/>
								{/each}
							</svg>
						{/if}
						{#if node.band}
							{@const { band } = node}
							<!-- Its point's word, white on a band of the circle's colour that follows its top left. -->
							<svg
								class="arc"
								viewBox="0 0 {ARC.view} {ARC.view}"
								width={round(ARC.box)}
								height={round(ARC.box)}
								style={place}
								aria-hidden="true"
							>
								<path
									class="ribbon"
									d={toTripArc(ARC.view / 2, ARC.middle, band.from, band.to)}
									stroke-width={round(ARC.thick)}
								/>
								<path
									id="{uid}-band-{at}"
									d={ARC.path}
									fill="none"
								/>
								<text
									class="word"
									font-size={round(band.size * BAND_ZOOM * 100) / 100}
									><textPath href="#{uid}-band-{at}">{band.text}</textPath></text
								>
							</svg>
						{/if}
					{/if}
				{/each}
				{#each row.segs as seg (seg.index)}
					{#if !seg.isBare && seg.name}
						<div
							class="lab x4"
							style="left: {round(seg.middle)}px; top: {round(depths.vehicle)}px"
						>
							<b>{seg.name}</b>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	/* The paper's own colours: the strip prints the same in the app's light and dark. Sizes are trip.constants.ts's,
	   the vehicle names at four times their size (see the note at the top). */
	.strip {
		--paper: #ffffff;
		--ink: #0f172a;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		/* As wide as where it stands, so its width says whether it is drawn at all. */
		align-self: stretch;
	}
	.fitbox {
		flex: none;
	}
	.route {
		position: relative;
		flex: none;
		transform-origin: 0 0;
		text-align: center;
	}
	.route > * {
		position: absolute;
	}
	/* A line with the arrowhead stops a little inside the head (--stop), so no line shows beside or past its
	   point. --e is how far short of the line's end the head's point stands. */
	.ln {
		height: 1.5px;
		background: linear-gradient(
			90deg,
			var(--rule) 0,
			var(--rule) var(--stop, 100%),
			transparent var(--stop, 100%)
		);
	}
	.ln.has-arrow {
		--stop: calc(100% - var(--e) - 2.5px);
	}
	/* A line in fades from nothing at its far end, over --v of its length; so does a line out. */
	.ln.in {
		background: linear-gradient(
			90deg,
			transparent 0,
			var(--rule) var(--v),
			var(--rule) var(--stop, 100%),
			transparent var(--stop, 100%)
		);
	}
	.ln.out {
		background: linear-gradient(270deg, transparent 0, var(--rule) var(--v));
	}
	.ln.has-arrow::after {
		content: '';
		position: absolute;
		right: var(--e);
		top: 50%;
		transform: translateY(-50%);
		border-left: 5px solid var(--rule);
		border-block: 3.5px solid transparent;
	}
	.mask {
		border-radius: 999px;
		background: var(--paper);
		transform: translate(-50%, -50%);
	}
	.vh {
		display: grid;
		place-items: center;
		color: var(--ink);
		transform: translate(-50%, -50%);
	}
	/* The ring is the circle's own border, so it is the same thickness all the way round at any size. (As a second
	   circle laid inside the first, it came out uneven on small circles.) */
	.dot {
		box-sizing: border-box;
		display: grid;
		place-items: center;
		border-style: solid;
		border-color: var(--p);
		border-radius: 50%;
		background: color-mix(in srgb, var(--p) 12%, #fff);
		color: var(--p);
		transform: translate(-50%, -50%);
	}
	/* The facility's name and location inside its circle, like a coin's legends: the circle's colour, made lighter
	   so it does not weigh on the icon. */
	.coin,
	.arc {
		overflow: visible;
		pointer-events: none;
		transform: translate(-50%, -50%);
	}
	.legend {
		font-weight: 700;
		fill: var(--p);
		fill-opacity: 0.62;
	}
	.rule {
		fill: none;
		stroke: var(--p);
		stroke-opacity: 0.4;
		stroke-linecap: round;
	}
	/* The point's word: white lettering that follows the circle, on a band of the circle's colour. */
	.word {
		font-weight: 800;
		letter-spacing: 0.06em;
		fill: #fff;
	}
	.ribbon {
		fill: none;
		stroke: var(--p);
		stroke-linecap: butt;
	}
	.lab {
		display: flex;
		flex-direction: column;
		align-items: center;
		white-space: nowrap;
	}
	.lab.x4 {
		position: absolute;
		transform: scale(0.25) translateX(-50%);
		transform-origin: 0 0;
	}
	.probe {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
		overflow: hidden;
		visibility: hidden;
		pointer-events: none;
	}
	/* The Transport Mode's name: small, heavy and always in capitals. */
	.lab b {
		font-size: 21px;
		line-height: 1.2;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--ink);
	}
</style>

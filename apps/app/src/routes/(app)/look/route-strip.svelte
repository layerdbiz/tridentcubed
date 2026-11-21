<script lang="ts">
	// The trip as a strip on the report's cover (#247; the final design is #256): facilities as circles in a row,
	// each with its location curved round its top left, a line from one to the next, the Transport Mode on the line
	// with its name under it. A line runs in before the first facility and out after the last, and the line out
	// ends in the strip's one arrowhead. Where everything goes is worked out in route-strip.ts from the vehicle
	// names' widths; this measures the names and draws what that says.
	//
	// The names are measured as the page draws them, in a hidden copy of a label (never on a canvas): a phone that
	// will not draw text under 8 px, or has a larger text setting, prints a name bigger than a canvas says, and the
	// names ran into each other on Justin's phone. For the same reason the strip's text is set at four times its
	// size and scaled back down by a quarter, so no real font size is under 8 px. A label is measured by its laid
	// out size (`offsetWidth`), which the zoom the preview's pages are drawn at does not change.
	import { onMount } from 'svelte';
	import {
		arcOf,
		CURVE,
		depthsOf,
		layoutOf,
		LINE_COLOR,
		NODE_CLEAR,
		PAD,
		POINT_COLORS,
		runOf,
		SIZES,
		slotOf,
		type RouteNodeType,
		type StripLegType,
		type StripType
	} from './route-strip';

	let { legs }: { legs: StripLegType[] } = $props();

	// The Preview is mounted twice, for the phone and for the desk, so each strip names its curves' paths its own.
	const uid = $props.id();

	// The hidden label a vehicle's name is written into and measured in.
	let vehicleProbe = $state<HTMLElement>();

	const measured = new Map<string, { width: number; height: number }>();
	function measure(text: string) {
		let size = measured.get(text);
		if (!size) {
			if (!vehicleProbe) return { width: 0, height: 0 };
			vehicleProbe.textContent = text;
			// A little over what was measured, so a name that rounds up a pixel never touches its neighbour.
			size = {
				width: (vehicleProbe.offsetWidth / 4) * 1.02 + 0.5,
				height: vehicleProbe.offsetHeight / 4
			};
			measured.set(text, size);
		}
		return size;
	}

	// The names are measured again once the page's own font has arrived: until then they are another font's width.
	let fonts = $state(0);
	onMount(() => {
		void document.fonts?.ready.then(() => {
			measured.clear();
			fonts += 1;
		});
	});

	// How wide the strip is laid out: nothing while it is not drawn at all (the Preview is mounted for the phone and
	// for the desk, and only one of the two is shown). A name cannot be measured there, so the strip waits, and
	// measures afresh when it comes to be drawn.
	let drawn = $state(0);
	let strip = $state.raw<StripType>({ kind: 'none' });
	let room = $state(0);
	let depths = $state.raw({ line: 0, vehicle: 0, height: 0 });

	$effect(() => {
		void fonts;
		if (!vehicleProbe) return;
		if (!drawn) {
			measured.clear();
			return;
		}
		const next = layoutOf(runOf(legs), measure);
		room = slotOf(measure);
		depths = depthsOf(measure);
		strip = next;
	});

	const round = (value: number) => Math.round(value * 10) / 10;

	// The colour a facility's circle takes: its point's; where two legs meet, a Stop's.
	function colorOf(node: RouteNodeType) {
		return POINT_COLORS[node.points.length > 1 ? 'Stop' : (node.points[0] ?? 'Stop')];
	}

	// The curved location is drawn at four times its size, like the rest of the strip's text, and scaled back by
	// its picture's view box. `ARC.box` is the picture's side on the page, `ARC.base` the circle its lettering
	// stands on, `ARC.room` the furthest along that circle it may run.
	const edge = SIZES.dot / 2;
	const box = 2 * (edge + CURVE.gap + SIZES.place + 2);
	const base = (edge + CURVE.gap) * 4;
	const ARC = {
		box,
		base,
		path: arcOf(box * 2, base, CURVE.from, CURVE.from + 215),
		text: SIZES.place * 4,
		room: base * ((CURVE.most * Math.PI) / 180)
	};

	// A location too long for its circle is set smaller until it fits the part of the circle it may use. It is
	// fitted again when the page's font arrives and when the strip comes to be drawn.
	function fitted(_text: string) {
		return (node: SVGTextElement) => {
			void fonts;
			void drawn;
			node.setAttribute('font-size', String(ARC.text));
			const length = node.getComputedTextLength();
			if (length > ARC.room)
				node.setAttribute(
					'font-size',
					String(Math.floor((ARC.text * ARC.room * 100) / length) / 100)
				);
		};
	}
</script>

<div
	class="strip"
	style="--rule: {LINE_COLOR}; min-height: {round(room)}px"
	bind:offsetWidth={drawn}
>
	<!-- The hidden label that vehicle names are measured in. -->
	<div
		class="probe"
		aria-hidden="true"
	>
		<div class="lab"><b bind:this={vehicleProbe}></b></div>
	</div>

	{#if strip.kind === 'row'}
		{@const { row, scale } = strip}
		<!-- Laid out at full size, then scaled as one piece: up to its starting size, or down to fit the page. -->
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
						)}px; top: {round(depths.line - SIZES.line / 2)}px; --v: {round(seg.fading)}px"
					></div>
				{/each}
				<!-- Clear paper between the line and whatever sits on it. -->
				{#each row.segs as seg (seg.index)}
					{#if !seg.isBare}
						<div
							class="mask"
							style="left: {round(seg.middle)}px; top: {round(
								depths.line
							)}px; width: {PAD}px; height: {PAD}px"
						></div>
					{/if}
				{/each}
				{#each row.nodes as node, at (at)}
					{#if !node.isGhost}
						<div
							class="mask"
							style="left: {round(row.x[at])}px; top: {round(depths.line)}px; width: {round(
								2 * (node.half + NODE_CLEAR)
							)}px; height: {round(SIZES.dot + 2 * NODE_CLEAR)}px"
						></div>
					{/if}
				{/each}
				<!-- A line between two facilities carries its Transport Mode: a plain dark icon in the middle of it. -->
				{#each row.segs as seg (seg.index)}
					{#if !seg.isBare}
						<div
							class="vh"
							style="left: {round(seg.middle)}px; top: {round(depths.line)}px"
						>
							<span
								class="{seg.icon} block"
								style="width: {SIZES.mode}px; height: {SIZES.mode}px"
							></span>
						</div>
					{/if}
				{/each}
				{#each row.nodes as node, at (at)}
					{#if !node.isGhost}
						<!-- One circle: the facility's icon in its point's colour. -->
						<div
							class="dot"
							style="--p: {colorOf(node)}; left: {round(row.x[at])}px; top: {round(
								depths.line
							)}px; width: {SIZES.dot}px; height: {SIZES.dot}px"
						>
							<span
								><span
									class="{node.icon} block"
									style="width: {SIZES.icon}px; height: {SIZES.icon}px"
								></span></span
							>
						</div>
						{#if node.city}
							<!-- Its location, following the top left of the circle in the circle's own colour. -->
							<svg
								class="arc"
								viewBox="0 0 {ARC.box * 4} {ARC.box * 4}"
								width={round(ARC.box)}
								height={round(ARC.box)}
								style="--p: {colorOf(node)}; left: {round(row.x[at])}px; top: {round(
									depths.line
								)}px"
								role="img"
								aria-label={node.city}
							>
								<path
									id="{uid}-arc-{at}"
									d={ARC.path}
									fill="none"
								/>
								<text
									font-size={ARC.text}
									{@attach fitted(node.city)}
									><textPath href="#{uid}-arc-{at}">{node.city.toUpperCase()}</textPath></text
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
	/* The paper's own colours: the strip prints the same in the app's light and dark. Sizes are route-strip.ts's
	   SIZES, the text at four times its size (see the note at the top). */
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
	.ln {
		height: 1.5px;
		background: var(--rule);
	}
	/* A line in fades from nothing at its far end, over its outer piece; so does a line out where the trip breaks. */
	.ln.in {
		background: linear-gradient(90deg, transparent 0, var(--rule) var(--v));
	}
	.ln.out {
		background: linear-gradient(270deg, transparent 0, var(--rule) var(--v));
	}
	/* An arrowhead is the end of its line: the line stops a little inside the head, so nothing shows beside or
	   past its point. */
	.ln.has-arrow {
		background: linear-gradient(
			90deg,
			var(--rule) 0,
			var(--rule) calc(100% - 2.5px),
			transparent calc(100% - 2.5px)
		);
	}
	.ln.has-arrow::after {
		content: '';
		position: absolute;
		right: 0;
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
	.dot {
		padding: 2px;
		border-radius: 50%;
		background: var(--p);
		transform: translate(-50%, -50%);
	}
	.dot > span {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: color-mix(in srgb, var(--p) 12%, #fff);
		color: var(--p);
	}
	/* Curved location: lettering that follows the circle, in the circle's colour. */
	.arc {
		overflow: visible;
		pointer-events: none;
		transform: translate(-50%, -50%);
	}
	.arc text {
		font-weight: 800;
		letter-spacing: 0.06em;
		fill: var(--p);
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

<script lang="ts">
	// The trip as a strip on the report's cover (#247): facilities as circles in a row, a line from one to the
	// next, the Transport Mode on the line. Where everything goes is worked out in route-strip.ts from the names'
	// widths; this measures the names and draws what that says.
	//
	// The names are measured as the page draws them, in a hidden copy of a label (never on a canvas): a phone that
	// will not draw text under 8 px, or has a larger text setting, prints a name bigger than a canvas says, and the
	// names ran into each other on Justin's phone. For the same reason the strip's text is set at four times its
	// size and scaled back down by a quarter, so no real font size is under 8 px. A label is measured by its laid
	// out size (`offsetWidth`), which the zoom the preview's pages are drawn at does not change.
	import { onMount } from 'svelte';
	import { ROUTE_JOIN } from './look.constants';
	import {
		CLEAR,
		depthsOf,
		layoutOf,
		LINE_COLOR,
		PAD,
		POINT_COLORS,
		runOf,
		SIZES,
		slotOf,
		type JoinType,
		type MeasureKindType,
		type RowNodeType,
		type RouteNodeType,
		type StripLegType,
		type StripType
	} from './route-strip';

	let { legs, join = ROUTE_JOIN }: { legs: StripLegType[]; join?: JoinType } = $props();

	// The hidden labels: the element a name is written into, and the one whose size is its size.
	let nameProbe = $state<HTMLElement>();
	let placeSlot = $state<HTMLElement>();
	let placeBox = $state<HTMLElement>();
	let vehicleProbe = $state<HTMLElement>();

	const measured = new Map<string, { width: number; height: number }>();
	function measure(kind: MeasureKindType, text: string) {
		const key = `${kind}:${text}`;
		let size = measured.get(key);
		if (!size) {
			const slot = kind === 'name' ? nameProbe : kind === 'place' ? placeSlot : vehicleProbe;
			const box = kind === 'place' ? placeBox : slot;
			if (!slot || !box) return { width: 0, height: 0 };
			slot.textContent = text;
			// A little over what was measured, so a name that rounds up a pixel never touches its neighbour.
			size = { width: (box.offsetWidth / 4) * 1.02 + 0.5, height: box.offsetHeight / 4 };
			measured.set(key, size);
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
	let depths = $state.raw({ line: 0, vehicle: 0, facility: 0, height: 0 });
	let soloHeight = $state(0);

	$effect(() => {
		void fonts;
		if (!nameProbe || !placeSlot || !placeBox || !vehicleProbe) return;
		if (!drawn) {
			measured.clear();
			return;
		}
		const next = layoutOf(runOf(legs), measure, join);
		room = slotOf(measure);
		if (next.kind === 'row') depths = depthsOf(next.row, measure);
		if (next.kind === 'single')
			soloHeight =
				measure('name', next.node.name).height +
				Math.max(
					next.node.city ? measure('place', next.node.city).height : 0,
					next.transport.name ? measure('place', next.transport.name).height : 0
				) +
				1;
		strip = next;
	});

	const round = (value: number) => Math.round(value * 10) / 10;

	// The colour a facility's circle takes: its point's; where two legs meet (and the join is not two circles or
	// the gradient), a Stop's.
	function colorOf(node: RouteNodeType) {
		return POINT_COLORS[node.points.length > 1 ? 'Stop' : (node.points[0] ?? 'Stop')];
	}
	function isBlend(node: RowNodeType) {
		return node.points.length > 1 && join === 'gradient';
	}
	const BLEND = `linear-gradient(135deg, ${POINT_COLORS.End} 22%, ${POINT_COLORS.Start} 78%)`;
</script>

<!-- One circle: the facility's icon in its point's colour. -->
{#snippet dot(
	icon: string,
	color: string,
	at: number | undefined,
	isFront: boolean,
	isBlended: boolean
)}
	<div
		class="dot {isFront ? 'is-front' : ''} {isBlended ? 'grad' : ''} {at === undefined
			? ''
			: 'on-line'}"
		style="--p: {color}; width: {SIZES.dot}px; height: {SIZES.dot}px;{at === undefined
			? ''
			: ` left: ${round(at)}px; top: ${round(depths.line)}px;`}"
	>
		<span
			><span
				class="{icon} block"
				style="width: {SIZES.icon}px; height: {SIZES.icon}px;{isBlended
					? ` background-image: ${BLEND};`
					: ''}"
			></span></span
		>
	</div>
{/snippet}

<div
	class="strip"
	style="--rule: {LINE_COLOR}; min-height: {round(room)}px"
	bind:offsetWidth={drawn}
>
	<!-- The hidden labels that names are measured in. -->
	<div
		class="probe"
		aria-hidden="true"
	>
		<div class="lab x4">
			<b bind:this={nameProbe}></b><small bind:this={placeBox}
				><span class="mark icon-[mdi--map-marker]"></span><span bind:this={placeSlot}></span></small
			>
		</div>
		<div class="lab x4 veh"><b bind:this={vehicleProbe}></b></div>
	</div>

	{#if strip.kind === 'row'}
		{@const { row, scale } = strip}
		<!-- Laid out at full size, then scaled down as one piece when it is too wide for the page. -->
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
					{@const to = row.nodes[seg.index + 1]}
					<div
						class="ln {seg.fade} {to.isGhost ? '' : 'has-arrow'}"
						style="left: {round(row.x[seg.index])}px; width: {round(
							row.x[seg.index + 1] - row.x[seg.index]
						)}px; top: {round(depths.line - SIZES.line / 2)}px; --e: {round(to.half + CLEAR + 1)}px"
					></div>
				{/each}
				<!-- Clear paper between the line and whatever sits on it. -->
				{#each row.segs as seg (seg.index)}
					<div
						class="mask"
						style="left: {round(seg.middle)}px; top: {round(
							depths.line
						)}px; width: {PAD}px; height: {PAD}px"
					></div>
				{/each}
				{#each row.nodes as node, at (at)}
					{#if !node.isGhost}
						<div
							class="mask"
							style="left: {round(row.x[at])}px; top: {round(depths.line)}px; width: {round(
								2 * (node.half + CLEAR)
							)}px; height: {SIZES.dot + 2 * CLEAR}px"
						></div>
					{/if}
				{/each}
				<!-- Every line carries its Transport Mode: a plain dark icon in the middle of it. -->
				{#each row.segs as seg (seg.index)}
					<div
						class="vh"
						style="left: {round(seg.middle)}px; top: {round(depths.line)}px"
					>
						<span
							class="{seg.icon} block"
							style="width: {SIZES.mode}px; height: {SIZES.mode}px"
						></span>
					</div>
				{/each}
				{#each row.nodes as node, at (at)}
					{#if node.isGhost}
						<!-- A place that is not on the report: nothing is drawn there. -->
					{:else if node.isPair}
						<!-- Where two legs meet, as two circles: the End, then the Start over its edge. -->
						{@render dot(node.icon, POINT_COLORS.End, row.x[at] - SIZES.dot * 0.42, false, false)}
						{@render dot(node.icon, POINT_COLORS.Start, row.x[at] + SIZES.dot * 0.42, true, false)}
					{:else}
						{@render dot(node.icon, colorOf(node), row.x[at], false, isBlend(node))}
					{/if}
				{/each}
				{#each row.segs as seg (seg.index)}
					{#if seg.name}
						<div
							class="lab x4 veh"
							style="left: {round(seg.middle)}px; top: {round(depths.vehicle)}px"
						>
							<b>{seg.name}</b>
						</div>
					{/if}
				{/each}
				{#each row.nodes as node, at (at)}
					{#if !node.isGhost}
						<div
							class="lab x4"
							style="left: {round(row.x[at])}px; top: {round(depths.facility)}px"
						>
							<b>{node.name}</b>
							{#if node.city}
								<small
									><span class="mark icon-[mdi--map-marker]"></span><span>{node.city}</span></small
								>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{:else if strip.kind === 'single'}
		{@const { node, transport } = strip}
		<!-- One facility: no line. The Transport Mode rides on the circle's corner in a black badge, and its name
		     shares one line with the location, after it. -->
		<div class="single">
			<div class="solo">
				{@render dot(node.icon, colorOf(node), undefined, false, false)}
				{#if transport.icon}
					<i class="badge"
						><span
							class="{transport.icon} block"
							style="width: {SIZES.badgeIcon}px; height: {SIZES.badgeIcon}px"
						></span></i
					>
				{/if}
			</div>
			<div
				class="hold"
				style="height: {round(soloHeight)}px"
			>
				<div class="lab x4">
					<b>{node.name}</b>
					<div class="meta">
						{#if node.city}
							<small
								><span class="mark icon-[mdi--map-marker]"></span><span>{node.city}</span></small
							>
						{/if}
						{#if transport.name}
							<small><span class="mark {transport.icon}"></span><span>{transport.name}</span></small
							>
						{/if}
					</div>
				</div>
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
		--ink-soft: #64748b;
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
	.ln.in {
		background: linear-gradient(90deg, transparent 5%, var(--rule) 60%);
	}
	.ln.out {
		background: linear-gradient(90deg, var(--rule) 40%, transparent 95%);
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
	.dot {
		padding: 2px;
		border-radius: 50%;
		background: var(--p);
	}
	.dot.on-line {
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
	/* Where two legs meet: two circles side by side, or one circle that runs from the End's green at its top
	   left to the Start's blue at its bottom right, in its border, its icon and its lighter fill. */
	.dot.is-front {
		box-shadow: 0 0 0 2px var(--paper);
	}
	.dot.grad {
		background: linear-gradient(135deg, #10b981 22%, #2563eb 78%);
	}
	.dot.grad > span {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, #10b981 20%, #fff) 22%,
			color-mix(in srgb, #2563eb 20%, #fff) 78%
		);
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
	.hold {
		position: relative;
		align-self: stretch;
	}
	.hold > .lab {
		left: 50%;
		top: 0;
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
	.lab b {
		font-size: 33.6px;
		line-height: 1.25;
		font-weight: 600;
		color: var(--ink);
	}
	.lab small {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		font-size: 28.8px;
		line-height: 1.35;
		color: var(--ink-soft);
	}
	/* The icon beside a location or a vehicle is black; its text stays gray. */
	.lab small .mark {
		display: block;
		width: 1em;
		height: 1em;
		flex: none;
		color: var(--ink);
	}
	/* The Transport Mode's name: small, heavy and always in capitals. */
	.lab.veh b {
		font-size: 21px;
		line-height: 1.2;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	/* One facility: the location and the Transport Mode side by side on one line. */
	.meta {
		display: flex;
		align-items: center;
		gap: 32px;
	}
	.single {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}
	.solo {
		position: relative;
		display: grid;
		place-items: center;
		margin-bottom: 4px;
	}
	.badge {
		position: absolute;
		right: -4px;
		bottom: -3px;
		display: grid;
		place-items: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--ink);
		color: #fff;
		box-shadow: 0 0 0 2px var(--paper);
	}
</style>

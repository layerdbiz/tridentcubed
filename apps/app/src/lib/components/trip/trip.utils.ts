// The trip as a strip (#247, #256; the Stops look, settled by Justin on 2026-11-22, is #273). Facilities are
// circles in a row, each with its name and location written inside its ring like a coin's legends and its point's
// word on a filled band outside it; a line joins one to the next, and the Transport Mode sits on the line with
// its name under it. This file is where everything goes; trip.svelte measures the text in the page and draws what
// this says. Every number is in points, at full size, on the 595 wide page.
//
// The rules the layout keeps:
// - Lines are outset: one runs in before the first facility and one out after the last, both plain and fading.
// - The trip has one arrowhead. It points into the End, on the line that arrives there. A trip with no End has it
//   on the tip of its last line, and a line with the arrowhead on its tip does not fade.
// - How far apart facilities stand follows the vehicle names only: the longest of them with a set space either
//   side, and that one distance is used for every line, so every piece of line is the same length. Lines never
//   stretch to fill spare room, and a facility's own words never set the distance.
// - The outer lines have one set length, whatever the vehicle names are.
// - One facility alone shows its vehicle once: leaving a Start on the right, arriving at an End on the left. The
//   other side is a plain line as long as the vehicle's whole line, so the facility stands on the centre line.
// - Otherwise the icon nearest the row's middle stands on the page's centre line, under the middle of the logo.
// - Every ring on the strip uses one size of lettering: the largest at which the ring that needs the most room
//   still has dividing lines of the least length. The lines in a ring are all the same length.
// - The strip starts at 125% of these sizes, and a trip too wide for its room is scaled down as one piece:
//   circles, icons, lines and text together. Nothing wraps to a second row.
import {
	TRIP_AVAIL,
	TRIP_BAND,
	TRIP_FADE,
	TRIP_LINE,
	TRIP_LONE,
	TRIP_NODE_CLEAR,
	TRIP_OUTER,
	TRIP_OUTER_LONE,
	TRIP_PAD,
	TRIP_RING,
	TRIP_SIZES,
	TRIP_SPACE,
	TRIP_START_SCALE,
	TRIP_UNDER
} from './trip.constants';
import type {
	TripBandType,
	TripLegType,
	TripMeasureType,
	TripNodeType,
	TripRingType,
	TripRowNodeType,
	TripRowSegType,
	TripRowType,
	TripRunType,
	TripStripType
} from './trip.types';

const GHOST: TripNodeType = {
	isGhost: true,
	name: '',
	city: '',
	icon: '',
	points: [],
	point: 'Stop',
	word: ''
};
const DEGREES = 180 / Math.PI;
// A facility's circle to its border's outer edge, and to where the lettering inside it may reach.
const EDGE = TRIP_SIZES.dot / 2;
const RIM = EDGE - TRIP_SIZES.border - TRIP_RING.inset;

/**
 * The trip as one run of facilities with the lines between them. A facility that ends one leg and starts the next
 * is drawn once, as a Stop. A stop with no facility picked yet is left out, and so is a leg with none. Two or
 * more Stops are numbered in trip order; one alone is not.
 */
export function toTripRun(legs: TripLegType[]): TripRunType {
	const run: TripRunType = { nodes: [], segs: [] };
	for (const leg of legs) {
		const called = leg.stops.filter((stop) => stop.facility);
		// A facility whose point nobody picked takes its place's, as the Transport Mode panel's order does: the
		// first is the Start, the last the End, any between a Stop.
		let stops = called.map((stop, at): TripNodeType => {
			const point = stop.point || (at === 0 ? 'Start' : at === called.length - 1 ? 'End' : 'Stop');
			return {
				isGhost: false,
				name: stop.facility,
				city: stop.city,
				icon: stop.icon,
				points: [point],
				point,
				word: point
			};
		});
		if (!stops.length) continue;
		// One facility alone: the line runs in from, or out to, a place that is not on the report.
		if (stops.length === 1) {
			const { point } = stops[0];
			stops =
				point === 'Start'
					? [stops[0], GHOST]
					: point === 'End'
						? [GHOST, stops[0]]
						: [GHOST, stops[0], GHOST];
		}
		const last = run.nodes.at(-1);
		let first = run.nodes.length;
		if (last && !last.isGhost && !stops[0].isGhost && last.name === stops[0].name) {
			last.points.push(stops[0].points[0]);
			last.point = 'Stop';
			last.word = 'Stop';
			first = run.nodes.length - 1;
			stops = stops.slice(1);
		}
		run.nodes.push(...stops);
		// Every line carries its Transport Mode, so a leg with Stops shows the same one on each line.
		for (let index = first; index < run.nodes.length - 1; index += 1)
			run.segs.push({ index, name: leg.transport.name, icon: leg.transport.icon });
	}
	const stops = run.nodes.filter((node) => !node.isGhost && node.point === 'Stop');
	if (stops.length > 1) for (const [at, node] of stops.entries()) node.word = `Stop ${at + 1}`;
	return run;
}

// What the lettering inside one ring takes at a size: each legend's circle and how many degrees of it the
// lettering runs, the circle the dividing lines follow, and the clear space each side of a line, in degrees.
function legendsOf(node: { name: string; city: string }, size: number, measure: TripMeasureType) {
	const cap = size * TRIP_RING.cap;
	const middle = RIM - cap / 2;
	const texts: { where: 'top' | 'bottom'; text: string; radius: number }[] = [
		// Letters along the top grow outward from their line, so that line sits a letter's height in.
		{ where: 'top', text: node.name.toUpperCase(), radius: RIM - cap }
	];
	if (node.city.trim()) texts.push({ where: 'bottom', text: node.city.toUpperCase(), radius: RIM });
	const legends = texts.map((legend) => ({
		...legend,
		length: ((measure.ring(legend.text) * size) / legend.radius) * DEGREES
	}));
	return { legends, middle, pad: ((cap * TRIP_RING.clear) / middle) * DEGREES };
}

/**
 * The size of the lettering inside every ring on the strip: the largest at which the ring that needs the most
 * room still has dividing lines of the least length, kept between the least and the most of its starting size.
 */
export function tripRingSizeOf(
	nodes: { isGhost: boolean; name: string; city: string }[],
	measure: TripMeasureType
) {
	const real = nodes.filter((node) => !node.isGhost);
	let scale = 1;
	// A ring's need is a little off a straight line in the size (the name's own circle shrinks as its letters
	// grow), so the size is stepped to until it settles.
	for (let pass = 0; pass < 12; pass += 1) {
		let need = 0;
		for (const node of real) {
			const { legends, pad } = legendsOf(node, TRIP_RING.text * scale, measure);
			const taken =
				legends.reduce((sum, legend) => sum + legend.length, 0) + legends.length * 2 * pad;
			// One legend alone keeps to half the ring.
			const room = legends.length === 1 ? TRIP_RING.alone : 360 - legends.length * TRIP_RING.line;
			need = Math.max(need, taken / room);
		}
		if (!need) break;
		const next = Math.min(TRIP_RING.most, Math.max(TRIP_RING.least, scale / need));
		if (Math.abs(next - scale) < 0.0005) break;
		scale = next;
	}
	return TRIP_RING.text * scale;
}

// One ring's lettering at the strip's size: its legends set round it one after another with the same gap between
// each two, the name centred on the top, and a line in every gap.
function ringOf(
	node: { name: string; city: string },
	size: number,
	measure: TripMeasureType
): TripRingType {
	const { legends, middle, pad } = legendsOf(node, size, measure);
	const gap = (360 - legends.reduce((sum, legend) => sum + legend.length, 0)) / legends.length;
	const turn = (angle: number) => ((angle % 360) + 360) % 360;
	const rules: TripRingType['rules'] = [];
	let at = 270 - legends[0].length / 2;
	const placed = legends.map((legend) => {
		const centre = at + legend.length / 2;
		// How far along its own line the legend's middle is: the top line runs clockwise from 95 degrees, the
		// bottom one the other way from 265.
		const along = legend.where === 'top' ? turn(centre - 95) : turn(265 - centre);
		at += legend.length;
		if (gap - 2 * pad > 1) rules.push({ from: at + pad, to: at + gap - pad });
		at += gap;
		return { ...legend, along: Math.min(350, along) };
	});
	return { size, middle, legends: placed, rules };
}

// The band that carries a facility's word: exactly as long as its lettering, with its padding at each square end.
// A word too long for the band's room is set smaller until it fits.
function bandOf(word: string, measure: TripMeasureType): TripBandType {
	const text = word.toUpperCase();
	const base = EDGE + TRIP_BAND.base;
	const room = (base * TRIP_BAND.most) / DEGREES;
	let size = TRIP_BAND.text;
	let length = measure.band(text);
	if (length > room) {
		size = (size * room) / length;
		length = room;
	}
	const ends = (TRIP_BAND.ends / (EDGE + TRIP_BAND.middle)) * DEGREES;
	return {
		text,
		size,
		from: TRIP_BAND.from - ends,
		to: TRIP_BAND.from + (length / base) * DEGREES + ends
	};
}

type OutsetSegType = { index: number; name: string; icon: string; isBare: boolean };

// The run with its outer lines: a line in before the first facility and out after the last. A longer trip's outer
// lines have no vehicle, since nothing says what carried the cargo before its Start or after its End. One facility
// alone has its vehicle on one of them: leaving a Start on the right, arriving at an End (or a Stop) on the left.
// A leg with one facility in a longer trip already runs its own line in or out, with its vehicle.
function outsetOf(run: TripRunType, real: TripNodeType[]) {
	const bare = (index: number): OutsetSegType => ({ index, name: '', icon: '', isBare: true });
	if (real.length === 1) {
		const mode = (index: number): OutsetSegType => ({
			index,
			name: run.segs[0]?.name ?? '',
			icon: run.segs[0]?.icon ?? '',
			isBare: false
		});
		const isLeaving = real[0].point === 'Start';
		return {
			isLone: true,
			nodes: [GHOST, real[0], GHOST],
			segs: isLeaving ? [bare(0), mode(1)] : [mode(0), bare(1)]
		};
	}
	const nodes = [...run.nodes];
	let segs = run.segs.map((seg): OutsetSegType => ({ ...seg, isBare: false }));
	if (!nodes[0].isGhost) {
		nodes.unshift(GHOST);
		segs = [bare(0), ...segs.map((seg) => ({ ...seg, index: seg.index + 1 }))];
	}
	if (!nodes[nodes.length - 1].isGhost) {
		nodes.push(GHOST);
		segs.push(bare(nodes.length - 2));
	}
	return { isLone: false, nodes, segs };
}

// Where everything in a row goes, at full size.
function solve(run: TripRunType, real: TripNodeType[], measure: TripMeasureType): TripRowType {
	const outset = outsetOf(run, real);
	const ring = tripRingSizeOf(real, measure);
	const nodes = outset.nodes.map((node): TripRowNodeType => {
		if (node.isGhost) return { ...node, half: 0, out: 0 };
		return {
			...node,
			half: EDGE,
			out: EDGE + TRIP_BAND.out,
			ring: ringOf(node, ring, measure),
			band: bandOf(node.word, measure)
		};
	});
	const lastReal = nodes.findLastIndex((node) => !node.isGhost);
	const hasEnd = nodes[lastReal].points.includes('End');
	const lastSeg = outset.segs.at(-1);
	const segs = outset.segs.map((seg): TripRowSegType => {
		const isTip = nodes[seg.index + 1].isGhost;
		// The one arrowhead points into the End, on the line that arrives there; a trip with no End has it on the
		// tip of its last line.
		const hasArrow = hasEnd ? seg.index + 1 === lastReal : isTip && seg === lastSeg;
		return {
			...seg,
			width: seg.isBare || !seg.name ? 0 : measure.vehicle(seg.name).width,
			middle: 0,
			// A line that carries the arrowhead on its tip does not fade: a fade would take the arrow away.
			fade: nodes[seg.index].isGhost ? 'in' : isTip && !hasArrow ? 'out' : '',
			fading: 0,
			hasArrow,
			tip: isTip ? 0 : nodes[seg.index + 1].half + TRIP_NODE_CLEAR
		};
	});

	// The clear distance between two facilities starts at a minimum: a vehicle's icon with the least line either
	// side. With a longer vehicle name it is that name and a set space each side of it, measured on the line that
	// shows, from where it leaves one facility's clear paper to where it reaches the next's.
	let gap = TRIP_PAD + 2 * (TRIP_LINE + TRIP_NODE_CLEAR);
	for (const seg of segs)
		if (seg.width) gap = Math.max(gap, seg.width + 2 * TRIP_SPACE + 2 * TRIP_NODE_CLEAR);
	// The piece of line from a facility's edge to a vehicle's clear paper.
	const piece = (gap - TRIP_PAD) / 2;
	const stub = outset.isLone ? TRIP_OUTER_LONE : TRIP_OUTER;

	// One facility alone. Its vehicle's line (`mate`) either leaves it with the arrowhead on its tip, and gives up
	// the head's length so the head is the end of the line and not an addition to it (`tipped`); or arrives at it,
	// with a longer piece beyond the vehicle, since that line fades (`arriving`). The plain line on the other side
	// is as long as the vehicle's whole line (`whole`).
	const mate = outset.isLone ? segs.find((seg) => !seg.isBare) : undefined;
	const tipped = mate && !hasEnd && mate === segs.at(-1) ? mate : undefined;
	const arriving = mate && nodes[mate.index].isGhost ? mate : undefined;
	const longer = stub * TRIP_LONE.longer;
	const whole = mate
		? piece +
			TRIP_PAD +
			(mate === arriving ? longer : stub) -
			(mate === tipped ? TRIP_SIZES.arrow : 0)
		: stub;

	// Each seg by the node it leaves, so two nodes with no line between them are still placed.
	const leaving = new Map(segs.map((seg) => [seg.index, seg]));
	const x = [0];
	for (let index = 0; index < nodes.length - 1; index += 1) {
		const from = nodes[index];
		const to = nodes[index + 1];
		const seg = leaving.get(index);
		const start = x[index] + from.half;
		if (!seg) {
			// Where the trip breaks. Two facilities stand as far apart as any other two; a line that faded out ends
			// where the next fades in, or at a facility's clear paper.
			const between =
				!from.isGhost && !to.isGhost ? gap : from.isGhost && to.isGhost ? 0 : TRIP_NODE_CLEAR;
			x[index + 1] = start + between + to.half;
		} else if (seg.isBare) {
			x[index + 1] = start + whole + to.half;
			// Beside one facility alone the plain line fades along its whole length; a longer trip's, over a little
			// more than half of what shows.
			seg.fading = (whole - TRIP_NODE_CLEAR) * (mate ? TRIP_LONE.plain : TRIP_FADE);
		} else {
			// On an outer line with a vehicle, the piece beyond the vehicle is the set outer length.
			const lead = from.isGhost ? (seg === arriving ? longer : stub) : piece;
			const tail = (to.isGhost ? stub : piece) - (seg === tipped ? TRIP_SIZES.arrow : 0);
			seg.middle = start + lead + TRIP_PAD / 2;
			x[index + 1] = start + lead + TRIP_PAD + tail + to.half;
			// Beside one facility alone the vehicle's line fades over a share of what shows of it; a longer trip's,
			// over a little more than half of the piece beyond the vehicle.
			seg.fading = mate
				? (lead + TRIP_PAD + tail - TRIP_NODE_CLEAR) * TRIP_LONE.vehicle
				: (from.isGhost ? lead : tail) * TRIP_FADE;
		}
	}

	let left = Infinity;
	let right = -Infinity;
	function reach(at: number, half: number) {
		left = Math.min(left, at - half);
		right = Math.max(right, at + half);
	}
	for (const [index, node] of nodes.entries()) reach(x[index], node.out);
	for (const seg of segs) if (!seg.isBare) reach(seg.middle, Math.max(seg.width, TRIP_PAD) / 2);
	// One facility alone stands on the centre line. Otherwise the icon nearest the row's middle goes there: for an
	// even trip that is the middle facility or the middle vehicle. The row is as wide either side of it as its
	// longer side.
	const centre = (left + right) / 2;
	const icons = [
		...x.filter((_, index) => !nodes[index].isGhost),
		...segs.filter((seg) => !seg.isBare).map((seg) => seg.middle)
	];
	let anchor = icons[0] ?? centre;
	if (!outset.isLone)
		for (const at of icons)
			if (Math.abs(at - centre) < Math.abs(anchor - centre) - 0.01) anchor = at;
	const half = Math.max(anchor - left, right - anchor);
	const shift = anchor - half;
	for (let index = 0; index < x.length; index += 1) x[index] -= shift;
	for (const seg of segs) seg.middle -= shift;
	return { nodes, segs, x, width: 2 * half, gap };
}

/**
 * What a trip prints as: nothing before it has a facility, otherwise one row. The row is laid out at full size and
 * printed at the starting scale, or scaled down as one piece when that is wider than its room (`avail`, the
 * report page's own unless another is given).
 */
export function tripLayoutOf(
	run: TripRunType,
	measure: TripMeasureType,
	avail = TRIP_AVAIL
): TripStripType {
	const real = run.nodes.filter((node) => !node.isGhost);
	if (!real.length) return { kind: 'none' };
	const row = solve(run, real, measure);
	return { kind: 'row', row, scale: Math.min(TRIP_START_SCALE, avail / row.width) };
}

/** How far down a row's parts sit, from its top, at full size: the line, the vehicle names, and its foot. The same
 * for every trip. */
export function tripDepthsOf(measure: TripMeasureType) {
	// The band stands above its circle, so the whole row moves down to make room.
	const line = TRIP_BAND.out + 1 + EDGE;
	const vehicle = line + TRIP_SIZES.mode / 2 + TRIP_UNDER;
	const height = Math.max(line + EDGE, vehicle + measure.vehicle('Ag').height);
	return { line, vehicle, height };
}

/** The room the strip is given, whatever the trip: a row at its starting size. */
export function tripSlotOf(measure: TripMeasureType) {
	return tripDepthsOf(measure).height * TRIP_START_SCALE;
}

/**
 * A piece of a circle as an SVG path, between two angles in degrees clockwise from the right. From a smaller
 * angle to a larger one it runs clockwise; from a larger to a smaller it runs the other way, which stands
 * lettering on the foot of a circle the right way up.
 */
export function toTripArc(centre: number, radius: number, from: number, to: number) {
	const round = (value: number) => Math.round(value * 10) / 10;
	function at(degrees: number) {
		const turn = degrees / DEGREES;
		return `${round(centre + radius * Math.cos(turn))},${round(centre + radius * Math.sin(turn))}`;
	}
	return `M${at(from)} A${round(radius)},${round(radius)} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 1 : 0} ${at(to)}`;
}

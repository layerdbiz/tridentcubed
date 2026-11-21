// The trip as a strip on the report's cover (#247; the final design, settled by Justin on 2026-11-21 after forty
// rounds of the prototype, is #256). Facilities are circles in a row with their location curved round them, a line
// joins one to the next, and the Transport Mode sits on the line with its name under it. This file is where
// everything goes; route-strip.svelte measures the vehicle names in the page and draws what this says. Every
// number is in points, at full size, on the 595 wide page.
//
// The rules the layout keeps:
// - Lines are outset: one runs in before the first facility and one out after the last. The line in fades from
//   nothing; the line out is solid and carries the strip's only arrowhead, on its tip.
// - How far apart facilities stand follows the vehicle names only: the longest of them with a set space either
//   side, and that one distance is used for every line, so every piece of line is the same length. Lines never
//   stretch to fill spare room, and a facility's own words never set the distance.
// - The outer lines have one set length, whatever the vehicle names are.
// - The icon nearest the row's middle stands on the page's centre line, under the middle of the logo.
// - The strip starts at 125% of these sizes, and a trip too wide for the page is scaled down as one piece:
//   circles, icons, lines and text together. Nothing wraps to a second row.
import type { PointType } from './look.data';

export const SIZES = {
	/** A Transport Mode's name, and the location curved round a facility's circle. */
	vehicle: 5.25,
	place: 5.6,
	/** A facility's circle, its border and its icon. */
	dot: 50,
	border: 2,
	icon: 25,
	/** A vehicle's icon on the line. */
	mode: 14,
	/** The line, and its arrowhead: how long it is, and how far inside it the line stops. */
	line: 1.5,
	arrow: 5,
	arrowStop: 2.5
};
/** The curved location: how far outside its circle's border it stands, where it starts in degrees clockwise from
 * the right (just above the far left), and the furthest round the circle it may run, so it never comes down onto
 * the line on the far side. */
export const CURVE = { gap: 2.5, from: 189, most: 150 };
/** How far the curved location reaches from its circle's border. */
const CURVE_OUT = CURVE.gap + SIZES.place;

/** Start blue, every stopping point between amber, End green. A facility that ends one leg and starts the next is
 * a Stop. */
export const POINT_COLORS: Record<PointType, string> = {
	Start: '#2563eb',
	Stop: '#f59e0b',
	End: '#10b981'
};
export const LINE_COLOR = '#cbd5e1';

/** The size every trip starts at; one too wide for the page is scaled down from it. */
export const START_SCALE = 1.25;
/** Clear paper between a line and a vehicle's icon. */
export const CLEAR = 6;
/** Clear paper between a line and a facility: the line stops short of the curved location. */
export const NODE_CLEAR = CURVE_OUT + 1;
/** The paper cleared around a vehicle's icon. */
export const PAD = SIZES.mode + 2 * CLEAR;
/** The line that shows either side of the longest vehicle name. */
export const SPACE = 8;
// The least piece of line that shows between a facility and a vehicle.
const LINE = 14;
/** An outer line with no vehicle, from its far end to the facility's edge; and the piece beyond the vehicle when
 * one facility stands alone. */
export const OUTER = 42;
export const OUTER_LONE = 32;
/** How much of what shows of an outer piece fades. */
export const FADE = 0.55;
/** The widest the strip may print: 28 either side of the page. */
export const AVAIL = 539;
// The space between a vehicle's icon and its name.
const UNDER = 4;

/** How wide and tall a vehicle's name prints at full size, as the page draws it. */
export type MeasureType = (text: string) => { width: number; height: number };

/** A leg as the strip reads it: one Transport Mode and the facilities it calls at, in order. */
export type StripLegType = {
	transport: { name: string; icon: string };
	stops: { point: PointType | ''; facility: string; city: string; icon: string }[];
};

export type RouteNodeType = {
	/** A place that is not on the report: where a line comes in from or goes out to. */
	isGhost: boolean;
	name: string;
	city: string;
	icon: string;
	/** Its point; two when it ends one leg and starts the next. */
	points: PointType[];
};
export type RouteSegType = {
	/** The node it leaves from; it runs to the next. */
	index: number;
	/** Its Transport Mode. */
	name: string;
	icon: string;
};
export type RouteType = { nodes: RouteNodeType[]; segs: RouteSegType[] };

const GHOST: RouteNodeType = { isGhost: true, name: '', city: '', icon: '', points: [] };

/**
 * The trip as one run of facilities with the lines between them. A facility that ends one leg and starts the next
 * is drawn once. A stop with no facility picked yet is left out, and so is a leg with none.
 */
export function runOf(legs: StripLegType[]): RouteType {
	const run: RouteType = { nodes: [], segs: [] };
	for (const leg of legs) {
		const called = leg.stops.filter((stop) => stop.facility);
		// A facility whose point nobody picked takes its place's, as the Transport Mode panel's order does: the
		// first is the Start, the last the End, any between a Stop.
		let stops = called.map((stop, at): RouteNodeType => ({
			isGhost: false,
			name: stop.facility,
			city: stop.city,
			icon: stop.icon,
			points: [stop.point || (at === 0 ? 'Start' : at === called.length - 1 ? 'End' : 'Stop')]
		}));
		if (!stops.length) continue;
		// One facility alone: the line runs in from, or out to, a place that is not on the report.
		if (stops.length === 1) {
			const point = stops[0].points[0];
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
			first = run.nodes.length - 1;
			stops = stops.slice(1);
		}
		run.nodes.push(...stops);
		// Every line carries its Transport Mode, so a leg with Stops shows the same one on each line.
		for (let index = first; index < run.nodes.length - 1; index += 1)
			run.segs.push({ index, name: leg.transport.name, icon: leg.transport.icon });
	}
	return run;
}

export type RowNodeType = RouteNodeType & {
	/** Half of what it takes on the line, and how far it reaches from its centre with its curved location. */
	half: number;
	out: number;
};
export type RowSegType = RouteSegType & {
	/** An outer line with no vehicle: a piece of line and nothing on it. */
	isBare: boolean;
	/** How wide its vehicle's name is, and where its vehicle stands. */
	width: number;
	middle: number;
	/** Whether it fades at its far end, how much of it does, and whether its tip is the strip's arrowhead. */
	fade: 'in' | 'out' | '';
	fading: number;
	hasArrow: boolean;
};
export type RowType = {
	nodes: RowNodeType[];
	segs: RowSegType[];
	/** Each node's centre, from the row's left edge. */
	x: number[];
	width: number;
	/** The clear distance between two facilities, edge to edge: the same for every line. */
	gap: number;
};

// The run with its outer lines: a line in before the first facility and out after the last. One facility alone has
// its vehicle on both; a longer trip's outer lines have none, since nothing says what carried the cargo before its
// Start or after its End. A leg with one facility already runs its own line in or out, with its vehicle.
function outsetOf(run: RouteType, real: RouteNodeType[]) {
	const bare = (index: number) => ({ index, name: '', icon: '', isBare: true });
	if (real.length === 1) {
		const mode = { name: run.segs[0]?.name ?? '', icon: run.segs[0]?.icon ?? '', isBare: false };
		return {
			isLone: true,
			nodes: [GHOST, real[0], GHOST],
			segs: [
				{ index: 0, ...mode },
				{ index: 1, ...mode }
			]
		};
	}
	const nodes = [...run.nodes];
	let segs = run.segs.map((seg) => ({ ...seg, isBare: false }));
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
function solve(run: RouteType, real: RouteNodeType[], measure: MeasureType): RowType {
	const outset = outsetOf(run, real);
	const nodes = outset.nodes.map((node): RowNodeType => {
		const half = node.isGhost ? 0 : SIZES.dot / 2;
		return { ...node, half, out: node.isGhost ? 0 : half + CURVE_OUT };
	});
	const last = nodes.length - 1;
	const segs = outset.segs.map((seg): RowSegType => {
		const hasArrow = seg.index + 1 === last;
		return {
			...seg,
			width: seg.isBare || !seg.name ? 0 : measure(seg.name).width,
			middle: 0,
			fade: nodes[seg.index].isGhost
				? 'in'
				: nodes[seg.index + 1].isGhost && !hasArrow
					? 'out'
					: '',
			fading: 0,
			hasArrow
		};
	});

	// The clear distance between two facilities starts at a minimum: a vehicle's icon with the least line either
	// side. With a longer vehicle name it is that name and a set space each side of it, measured on the line that
	// shows, from where it leaves one facility's clear paper to where it reaches the next's.
	let gap = PAD + 2 * (LINE + NODE_CLEAR);
	for (const seg of segs)
		if (seg.width) gap = Math.max(gap, seg.width + 2 * SPACE + 2 * NODE_CLEAR);
	// The piece of line from a facility's edge to a vehicle's clear paper.
	const piece = (gap - PAD) / 2;
	const stub = outset.isLone ? OUTER_LONE : OUTER;

	// Each seg by the node it leaves, so two nodes with no line between them are still placed.
	const leaving = new Map(segs.map((seg) => [seg.index, seg]));
	const x = [0];
	for (let index = 0; index < last; index += 1) {
		const from = nodes[index];
		const to = nodes[index + 1];
		const seg = leaving.get(index);
		const start = x[index] + from.half;
		if (!seg) {
			// Where the trip breaks. Two facilities stand as far apart as any other two; a line that faded out ends
			// where the next fades in, or at a facility's clear paper.
			const between =
				!from.isGhost && !to.isGhost ? gap : from.isGhost && to.isGhost ? 0 : NODE_CLEAR;
			x[index + 1] = start + between + to.half;
		} else if (seg.isBare) {
			x[index + 1] = start + stub + to.half;
			seg.fading = (stub - NODE_CLEAR) * FADE;
		} else {
			// On an outer line with a vehicle, the piece beyond the vehicle is the set outer length.
			const lead = from.isGhost ? stub : piece;
			const tail = to.isGhost ? stub : piece;
			seg.middle = start + lead + PAD / 2;
			x[index + 1] = start + lead + PAD + tail + to.half;
			seg.fading = stub * FADE;
		}
	}

	let left = Infinity;
	let right = -Infinity;
	function reach(at: number, half: number) {
		left = Math.min(left, at - half);
		right = Math.max(right, at + half);
	}
	for (const [index, node] of nodes.entries()) reach(x[index], node.out);
	for (const seg of segs) if (!seg.isBare) reach(seg.middle, Math.max(seg.width, PAD) / 2);
	// The icon nearest the row's middle goes on the centre line, and the row is as wide either side of it as its
	// longer side. For an even trip that is the middle facility or the middle vehicle.
	const centre = (left + right) / 2;
	const icons = [
		...x.filter((_, index) => !nodes[index].isGhost),
		...segs.filter((seg) => !seg.isBare).map((seg) => seg.middle)
	];
	let anchor = icons[0] ?? centre;
	for (const at of icons) if (Math.abs(at - centre) < Math.abs(anchor - centre) - 0.01) anchor = at;
	const half = Math.max(anchor - left, right - anchor);
	const shift = anchor - half;
	for (let index = 0; index < x.length; index += 1) x[index] -= shift;
	for (const seg of segs) seg.middle -= shift;
	return { nodes, segs, x, width: 2 * half, gap };
}

export type StripType =
	| { kind: 'none' }
	/** A row, and the size it prints at: its starting size, or less when it is too wide for the page. */
	| { kind: 'row'; row: RowType; scale: number };

/**
 * What a trip prints as: nothing before it has a facility, otherwise one row. The row is laid out at full size and
 * printed at the starting scale, or scaled down as one piece when that is wider than the page allows.
 */
export function layoutOf(run: RouteType, measure: MeasureType): StripType {
	const real = run.nodes.filter((node) => !node.isGhost);
	if (!real.length) return { kind: 'none' };
	const row = solve(run, real, measure);
	return { kind: 'row', row, scale: Math.min(START_SCALE, AVAIL / row.width) };
}

/** How far down a row's parts sit, from its top, at full size: the line, the vehicle names, and its foot. The same
 * for every trip. */
export function depthsOf(measure: MeasureType) {
	// The curved location stands above its circle, so the whole row moves down to make room.
	const line = NODE_CLEAR + SIZES.dot / 2;
	const vehicle = line + SIZES.mode / 2 + UNDER;
	const height = Math.max(line + SIZES.dot / 2, vehicle + measure('Ag').height);
	return { line, vehicle, height };
}

/** The room the strip is given under the subtitle, whatever the trip: a row at its starting size. */
export function slotOf(measure: MeasureType) {
	return depthsOf(measure).height * START_SCALE;
}

/** A piece of a circle as an SVG path, clockwise between two angles in degrees from the right. */
export function arcOf(centre: number, radius: number, from: number, to: number) {
	const round = (value: number) => Math.round(value * 10) / 10;
	function at(degrees: number) {
		const turn = (degrees * Math.PI) / 180;
		return `${round(centre + radius * Math.cos(turn))},${round(centre + radius * Math.sin(turn))}`;
	}
	return `M${at(from)} A${radius},${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${at(to)}`;
}

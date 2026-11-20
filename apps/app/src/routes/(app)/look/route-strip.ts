// The trip as a strip on the report's cover (#247; Justin approved the prototype on 2026-11-19 after twelve
// rounds). Facilities are circles in a row, a line joins one to the next, and the Transport Mode sits on the line.
// This file is where everything goes, worked out from the names' measured widths; route-strip.svelte measures the
// names in the page and draws what this says. Every number is in points, at full size, on the 595 wide page.
//
// The rules the layout keeps:
// - A name is never cut and never on two lines, so the names are measured first.
// - The clear run between two facilities is the same everywhere, with the vehicle in its middle, so every piece of
//   line is the same length.
// - The icon nearest the row's middle stands on the page's centre line, under the middle of the logo.
// - A trip too wide for the page is scaled down as one piece: circles, icons, lines and text together. Nothing
//   wraps to a second row, and text is never shrunk on its own.
import type { PointType } from './look.data';

/** What is drawn where two legs meet at one facility: as a Stop, as the End and the Start side by side, or as one
 * circle running from the End's green into the Start's blue. */
export type JoinType = 'amber' | 'pair' | 'gradient';

export const SIZES = {
	/** A facility's name, its location and a Transport Mode's name. */
	name: 8.4,
	place: 7.2,
	vehicle: 5.25,
	/** A facility's circle, its border and its icon. */
	dot: 40,
	border: 2,
	icon: 20,
	/** A vehicle's icon on the line. */
	mode: 14,
	/** One facility alone: the vehicle's badge on the circle, and the icon in it. */
	badge: 16,
	badgeIcon: 9,
	/** The line, and its arrowhead. */
	line: 1.5,
	arrow: 5
};
/** Start, Stop and End, as the app's points have them. */
export const POINT_COLORS: Record<PointType, string> = {
	Start: '#2563eb',
	Stop: '#f59e0b',
	End: '#10b981'
};
export const LINE_COLOR = '#cbd5e1';

/** Clear paper between a line and whatever sits on it: the same at a facility as at a vehicle's icon. */
export const CLEAR = 6;
/** The paper cleared around a vehicle's icon. */
export const PAD = SIZES.mode + 2 * CLEAR;
// The least clear space between two names in the same row of text, and the least piece of line.
const GAP = 14;
const LINE = 14;
// The longest clear run between two circles when the row has room to spare.
const LONGEST = 132;
/** The widest the strip may print: 28 either side of the page. */
export const AVAIL = 539;

export type MeasureKindType = 'name' | 'place' | 'vehicle';
/** How wide and tall a name prints at full size, as the page draws it. */
export type MeasureType = (
	kind: MeasureKindType,
	text: string
) => { width: number; height: number };

/** A leg as the strip reads it: one Transport Mode and the facilities it calls at, in order. */
export type StripLegType = {
	transport: { name: string; icon: string };
	stops: { point: PointType | ''; facility: string; city: string; icon: string }[];
};

export type RouteNodeType = {
	/** A place that is not on the report: where a leg with one facility comes from or goes to. */
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
	name: string;
	icon: string;
	fade: 'in' | 'out' | '';
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
			run.segs.push({
				index,
				name: leg.transport.name,
				icon: leg.transport.icon,
				fade: run.nodes[index].isGhost ? 'in' : run.nodes[index + 1].isGhost ? 'out' : ''
			});
	}
	return run;
}

export type RowNodeType = RouteNodeType & {
	/** Drawn as two circles side by side. */
	isPair: boolean;
	/** Half of what it takes on the line, and how wide its words are. */
	half: number;
	width: number;
};
export type RowSegType = RouteSegType & { width: number; middle: number };
export type RowType = {
	nodes: RowNodeType[];
	segs: RowSegType[];
	/** Each node's centre, from the row's left edge. */
	x: number[];
	width: number;
	/** The least clear run that keeps the names apart, and the one used. */
	need: number;
	span: number;
};

/**
 * Where everything in a row goes, at full size. The clear run between two facilities, edge to edge (the span), is
 * the same everywhere and the vehicle sits in its middle. The span is the least that keeps two names in the same
 * row of text apart: facility names are one row, Transport Mode names another. `given` asks for a longer one.
 */
export function solve(
	run: RouteType,
	measure: MeasureType,
	join: JoinType,
	given?: number
): RowType {
	const nodes = run.nodes.map((node): RowNodeType => {
		if (node.isGhost) return { ...node, isPair: false, half: 0, width: 0 };
		const isPair = node.points.length > 1 && join === 'pair';
		const width = Math.max(
			measure('name', node.name).width,
			node.city ? measure('place', node.city).width : 0
		);
		return { ...node, isPair, half: SIZES.dot * (isPair ? 0.92 : 0.5), width };
	});
	const segs = run.segs.map((seg): RowSegType => ({
		...seg,
		width: seg.name ? measure('vehicle', seg.name).width : 0,
		middle: 0
	}));

	let need = PAD + 2 * LINE;
	for (const seg of segs) {
		const from = nodes[seg.index];
		const to = nodes[seg.index + 1];
		if (!from.isGhost && !to.isGhost)
			need = Math.max(need, (from.width + to.width) / 2 + GAP - from.half - to.half);
		// The vehicle's name sits between the two circles, under its icon, so it must clear both.
		need = Math.max(need, seg.width + 12);
		const next = segs.find((each) => each.index === seg.index + 1);
		if (next) need = Math.max(need, (seg.width + next.width) / 2 + GAP - 2 * to.half);
	}
	const span = Math.max(need, given ?? need);

	const x = [0];
	for (let index = 1; index < nodes.length; index += 1)
		x[index] = x[index - 1] + nodes[index - 1].half + nodes[index].half + span;
	for (const seg of segs) seg.middle = x[seg.index] + nodes[seg.index].half + span / 2;
	let left = Infinity;
	let right = -Infinity;
	function reach(at: number, half: number) {
		left = Math.min(left, at - half);
		right = Math.max(right, at + half);
	}
	for (const [index, node] of nodes.entries()) reach(x[index], Math.max(node.half, node.width / 2));
	for (const seg of segs) reach(seg.middle, Math.max(seg.width, PAD) / 2);
	// The icon nearest the row's middle goes on the centre line, and the row is as wide either side of it as its
	// longer side. For an even trip that is the middle facility or the middle vehicle.
	const centre = (left + right) / 2;
	const icons = [
		...x.filter((_, index) => !nodes[index].isGhost),
		...segs.map((seg) => seg.middle)
	];
	let anchor = icons[0] ?? 0;
	for (const at of icons) if (Math.abs(at - centre) < Math.abs(anchor - centre) - 0.01) anchor = at;
	const half = Math.max(anchor - left, right - anchor);
	const shift = anchor - half;
	for (let index = 0; index < x.length; index += 1) x[index] -= shift;
	for (const seg of segs) seg.middle -= shift;
	return { nodes, segs, x, width: 2 * half, need, span };
}

export type StripType =
	| { kind: 'none' }
	/** One facility: no line, the vehicle rides on its circle. */
	| { kind: 'single'; node: RouteNodeType; transport: { name: string; icon: string } }
	/** A row, and how far it is scaled down to fit the page. */
	| { kind: 'row'; row: RowType; scale: number };

/**
 * What a trip prints as: nothing before it has a facility, one facility alone, or one row. A row with room to spare
 * grows every line by the same amount, up to a comfortable length; one too wide for the page is scaled down.
 */
export function layoutOf(run: RouteType, measure: MeasureType, join: JoinType): StripType {
	const real = run.nodes.filter((node) => !node.isGhost);
	if (!real.length) return { kind: 'none' };
	if (real.length === 1)
		return {
			kind: 'single',
			node: real[0],
			transport: { name: run.segs[0]?.name ?? '', icon: run.segs[0]?.icon ?? '' }
		};
	const tight = solve(run, measure, join);
	let low = tight.need;
	let high = Math.max(tight.need, LONGEST);
	if (solve(run, measure, join, high).width <= AVAIL) low = high;
	for (let turn = 0; turn < 16 && high - low > 0.1 && tight.width < AVAIL; turn += 1) {
		const middle = (low + high) / 2;
		if (solve(run, measure, join, middle).width <= AVAIL) low = middle;
		else high = middle;
	}
	const row = solve(run, measure, join, low);
	return { kind: 'row', row, scale: Math.min(1, AVAIL / row.width) };
}

/** How far down a row's parts sit, from its top: the line, the two rows of text, and its foot. */
export function depthsOf(row: RowType, measure: MeasureType) {
	const real = row.nodes.filter((node) => !node.isGhost);
	const tallest = (kind: MeasureKindType, texts: string[]) =>
		Math.max(0, ...texts.filter(Boolean).map((text) => measure(kind, text).height));
	const line = SIZES.dot / 2;
	// The vehicle's name under its icon with clear space above and below it, the facilities below that.
	const vehicle = line + SIZES.mode / 2 + 4;
	const facility = Math.max(
		line + SIZES.dot / 2 + 8,
		vehicle +
			tallest(
				'vehicle',
				row.segs.map((seg) => seg.name)
			) +
			8
	);
	const height =
		facility +
		tallest(
			'name',
			real.map((node) => node.name)
		) +
		1 +
		tallest(
			'place',
			real.map((node) => node.city)
		);
	return { line, vehicle, facility, height };
}

/** The room the strip is given under the subtitle, whatever the trip: the taller of a row and one facility alone. */
export function slotOf(measure: MeasureType) {
	const name = measure('name', 'Ag').height;
	const place = measure('place', 'Ag').height;
	const vehicle = measure('vehicle', 'Ag').height;
	const row =
		Math.max(SIZES.dot + 8, SIZES.dot / 2 + SIZES.mode / 2 + 4 + vehicle + 8) + name + 1 + place;
	const single = SIZES.dot + 9 + name + place + 1;
	return Math.max(row, single);
}

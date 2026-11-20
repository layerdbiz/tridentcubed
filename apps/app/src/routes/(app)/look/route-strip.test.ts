// The cover's route strip (#247): where its circles, lines and names go. The checks are the ones Justin's
// prototype passed, run here on the layout itself with names of a known width.
import { describe, expect, it } from 'vite-plus/test';
import {
	AVAIL,
	depthsOf,
	layoutOf,
	PAD,
	runOf,
	SIZES,
	slotOf,
	solve,
	type JoinType,
	type MeasureType,
	type RowType,
	type StripLegType
} from './route-strip';

// A name is as wide as its letters: 4 for a facility's, 3.4 for a location's, 3.2 for a vehicle's.
const LETTER = { name: 4, place: 3.4, vehicle: 3.2 };
const TALL = { name: 10.5, place: 9.7, vehicle: 6.3 };
const measure: MeasureType = (kind, text) => ({
	width: text.length * LETTER[kind],
	height: TALL[kind]
});

const FACILITIES: Record<string, { city: string; icon: string }> = {
	'Bayport Container Terminal': { city: 'Pasadena, TX', icon: 'anchor' },
	'Port of New Orleans': { city: 'New Orleans, LA', icon: 'anchor' },
	'Port of Galveston': { city: 'Galveston, TX', icon: 'anchor' },
	'Port of Beaumont': { city: 'Beaumont, TX', icon: 'anchor' },
	'Englewood Yard': { city: 'Houston, TX', icon: 'rail' },
	'Port of Corpus Christi Authority': { city: 'Corpus Christi, TX', icon: 'anchor' },
	'Louis Armstrong New Orleans Airport': { city: 'Kenner, LA', icon: 'airport' }
};

function leg(
	transport: string,
	...stops: [StripLegType['stops'][number]['point'], string][]
): StripLegType {
	return {
		transport: { name: transport, icon: 'ferry' },
		stops: stops.map(([point, facility]) => ({ point, facility, ...FACILITIES[facility] }))
	};
}

const TRIPS: Record<string, StripLegType[]> = {
	one: [leg('MSC Susanna', ['Start', 'Bayport Container Terminal'])],
	pair: [
		leg('MSC Susanna', ['Start', 'Bayport Container Terminal'], ['End', 'Port of New Orleans'])
	],
	stops: [
		leg(
			'MSC Susanna',
			['Start', 'Bayport Container Terminal'],
			['Stop', 'Port of Galveston'],
			['Stop', 'Port of Beaumont'],
			['End', 'Port of New Orleans']
		)
	],
	legs2: [
		leg('Mammoet Actros', ['Start', 'Englewood Yard'], ['End', 'Bayport Container Terminal']),
		leg('MSC Susanna', ['Start', 'Bayport Container Terminal'], ['End', 'Port of New Orleans'])
	],
	legs3: [
		leg('Union Pacific 8141', ['Start', 'Port of Beaumont'], ['End', 'Englewood Yard']),
		leg('Mammoet Actros', ['Start', 'Englewood Yard'], ['End', 'Bayport Container Terminal']),
		leg(
			'MSC Susanna',
			['Start', 'Bayport Container Terminal'],
			['Stop', 'Port of Galveston'],
			['End', 'Port of New Orleans']
		)
	],
	// Too long for the page at full size.
	long: [
		leg(
			'Union Pacific 8141',
			['Start', 'Port of Corpus Christi Authority'],
			['End', 'Englewood Yard']
		),
		leg('Mammoet Actros', ['Start', 'Englewood Yard'], ['End', 'Bayport Container Terminal']),
		leg(
			'MSC Susanna',
			['Start', 'Bayport Container Terminal'],
			['Stop', 'Port of Galveston'],
			['End', 'Port of New Orleans']
		),
		leg(
			'Antonov 124',
			['Start', 'Port of New Orleans'],
			['End', 'Louis Armstrong New Orleans Airport']
		)
	]
};
const ROWS = ['pair', 'stops', 'legs2', 'legs3', 'long'];
const JOINS: JoinType[] = ['amber', 'pair', 'gradient'];

function rowOf(trip: string, join: JoinType = 'amber') {
	const strip = layoutOf(runOf(TRIPS[trip]), measure, join);
	if (strip.kind !== 'row') throw new Error(`${trip} is not a row`);
	return strip;
}

// The clear paper between each pair of neighbouring circles, edge to edge.
function runsOf(row: RowType) {
	return row.segs.map(
		(seg) =>
			row.x[seg.index + 1] -
			row.x[seg.index] -
			row.nodes[seg.index].half -
			row.nodes[seg.index + 1].half
	);
}

describe('the trip as one run', () => {
	it('draws a facility that ends one leg and starts the next once, with both its points', () => {
		const run = runOf(TRIPS.legs2);
		expect(run.nodes.map((node) => node.name)).toEqual([
			'Englewood Yard',
			'Bayport Container Terminal',
			'Port of New Orleans'
		]);
		expect(run.nodes[1].points).toEqual(['End', 'Start']);
	});

	it('gives every line its Transport Mode, a leg with Stops the same one on each', () => {
		expect(runOf(TRIPS.stops).segs.map((seg) => seg.name)).toEqual([
			'MSC Susanna',
			'MSC Susanna',
			'MSC Susanna'
		]);
		expect(runOf(TRIPS.legs3).segs.map((seg) => [seg.index, seg.name])).toEqual([
			[0, 'Union Pacific 8141'],
			[1, 'Mammoet Actros'],
			[2, 'MSC Susanna'],
			[3, 'MSC Susanna']
		]);
	});

	it('leaves out a stop with no facility picked yet, and a leg with none', () => {
		const run = runOf([
			{
				transport: { name: 'MSC Susanna', icon: 'ferry' },
				stops: [
					{ point: 'Start', facility: 'Port of Beaumont', city: 'Beaumont, TX', icon: 'anchor' },
					{ point: 'End', facility: '', city: '', icon: '' }
				]
			},
			{ transport: { name: 'Truck', icon: 'truck' }, stops: [] }
		]);
		expect(run.nodes.filter((node) => !node.isGhost).map((node) => node.name)).toEqual([
			'Port of Beaumont'
		]);
	});

	it('runs a line out of a leg that has only its Start, and into one that has only its End', () => {
		const run = runOf([
			leg('MSC Susanna', ['Start', 'Port of Beaumont']),
			leg('Mammoet Actros', ['End', 'Englewood Yard'])
		]);
		expect(run.nodes.map((node) => node.isGhost)).toEqual([false, true, true, false]);
		expect(run.segs.map((seg) => seg.fade)).toEqual(['out', 'in']);
	});
});

describe('what a trip prints as', () => {
	it('is nothing before it has a facility', () => {
		expect(layoutOf(runOf([]), measure, 'amber')).toEqual({ kind: 'none' });
	});

	it('is one facility with its Transport Mode, and no line, when there is only one', () => {
		const strip = layoutOf(runOf(TRIPS.one), measure, 'amber');
		expect(strip).toMatchObject({
			kind: 'single',
			node: { name: 'Bayport Container Terminal', points: ['Start'] },
			transport: { name: 'MSC Susanna' }
		});
	});

	it.each(ROWS)('%s: every clear piece of line is the same length', (trip) => {
		for (const join of JOINS) {
			const { row } = rowOf(trip, join);
			const runs = runsOf(row);
			for (const run of runs) expect(run).toBeCloseTo(row.span, 5);
			// The vehicle stands in the middle of its run, so the line either side of it is the same.
			for (const seg of row.segs) {
				const left = seg.middle - row.x[seg.index] - row.nodes[seg.index].half;
				expect(left).toBeCloseTo(row.span / 2, 5);
			}
			expect((row.span - PAD) / 2).toBeGreaterThanOrEqual(14);
		}
	});

	it.each(ROWS)('%s: no two names in the same row of text touch', (trip) => {
		for (const join of JOINS) {
			const { row } = rowOf(trip, join);
			for (let at = 0; at < row.nodes.length - 1; at += 1) {
				const gap = row.x[at + 1] - row.x[at] - (row.nodes[at].width + row.nodes[at + 1].width) / 2;
				expect(gap).toBeGreaterThanOrEqual(14 - 0.001);
			}
			for (let at = 0; at < row.segs.length - 1; at += 1) {
				const gap =
					row.segs[at + 1].middle -
					row.segs[at].middle -
					(row.segs[at].width + row.segs[at + 1].width) / 2;
				expect(gap).toBeGreaterThanOrEqual(14 - 0.001);
			}
			// A vehicle's name fits between its two circles.
			for (const seg of row.segs) expect(row.span).toBeGreaterThanOrEqual(seg.width + 12);
		}
	});

	it.each(ROWS)(
		'%s: an icon stands on the centre line, and the row is inside its width',
		(trip) => {
			for (const join of JOINS) {
				const { row } = rowOf(trip, join);
				const icons = [...row.x, ...row.segs.map((seg) => seg.middle)];
				const nearest = Math.min(...icons.map((at) => Math.abs(at - row.width / 2)));
				expect(nearest).toBeLessThan(0.3);
				for (const [at, node] of row.nodes.entries()) {
					expect(row.x[at] - Math.max(node.half, node.width / 2)).toBeGreaterThanOrEqual(-0.001);
					expect(row.x[at] + Math.max(node.half, node.width / 2)).toBeLessThanOrEqual(
						row.width + 0.001
					);
				}
			}
		}
	);

	it('grows every line by the same amount when there is room, up to 132', () => {
		const { row, scale } = rowOf('pair');
		expect(scale).toBe(1);
		expect(row.span).toBe(132);
		expect(row.span).toBeGreaterThan(row.need);
	});

	it('scales a long trip down as one piece to the widest the strip prints', () => {
		const { row, scale } = rowOf('long');
		expect(row.width).toBeGreaterThan(AVAIL);
		expect(scale).toBeLessThan(1);
		expect(row.width * scale).toBeCloseTo(AVAIL, 5);
		// At its tightest: nothing is added to the lines of a row that already does not fit.
		expect(row.span).toBe(row.need);
	});

	it('draws a shared facility as two circles only when the join is Pair', () => {
		const amber = solve(runOf(TRIPS.legs2), measure, 'amber');
		const pair = solve(runOf(TRIPS.legs2), measure, 'pair');
		expect(amber.nodes[1]).toMatchObject({ isPair: false, half: SIZES.dot / 2 });
		expect(pair.nodes[1]).toMatchObject({ isPair: true, half: SIZES.dot * 0.92 });
	});
});

describe('how tall the strip is', () => {
	it('puts the facility names under the circles and under the vehicle names', () => {
		const { row } = rowOf('pair');
		const depths = depthsOf(row, measure);
		expect(depths.line).toBe(20);
		expect(depths.vehicle).toBe(31);
		expect(depths.facility).toBeGreaterThanOrEqual(48);
		expect(depths.facility).toBeGreaterThanOrEqual(depths.vehicle + TALL.vehicle + 8);
		expect(depths.height).toBeCloseTo(depths.facility + TALL.name + 1 + TALL.place, 5);
	});

	it('is given the same room whatever the trip, enough for a row and for one facility', () => {
		const room = slotOf(measure);
		expect(room).toBeGreaterThanOrEqual(depthsOf(rowOf('long').row, measure).height);
		expect(room).toBeGreaterThanOrEqual(SIZES.dot + 9 + TALL.name + TALL.place + 1);
	});
});

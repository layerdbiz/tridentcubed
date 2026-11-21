// The cover's route strip (#247, final design #256): where its circles, lines and vehicle names go. The checks are
// the ones Justin's prototype passed, run here on the layout itself with names of a known width.
import { describe, expect, it } from 'vite-plus/test';
import {
	AVAIL,
	depthsOf,
	layoutOf,
	NODE_CLEAR,
	OUTER,
	OUTER_LONE,
	PAD,
	runOf,
	SIZES,
	slotOf,
	SPACE,
	START_SCALE,
	type MeasureType,
	type RowType,
	type StripLegType
} from './route-strip';

// A vehicle's name is as wide as its letters, 3.2 each, and 6.3 tall.
const LETTER = 3.2;
const TALL = 6.3;
const measure: MeasureType = (text) => ({ width: text.length * LETTER, height: TALL });

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
	// Too long for the page at its starting size.
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
		),
		leg(
			'Mammoet Actros',
			['Start', 'Louis Armstrong New Orleans Airport'],
			['Stop', 'Port of Beaumont'],
			['End', 'Port of Galveston']
		)
	]
};
const ROWS = ['one', 'pair', 'stops', 'legs2', 'legs3', 'long'];

function stripOf(legs: StripLegType[]) {
	const strip = layoutOf(runOf(legs), measure);
	if (strip.kind !== 'row') throw new Error('not a row');
	return strip;
}
function rowOf(trip: string) {
	return stripOf(TRIPS[trip]);
}

// The clear paper from one node's edge to the next's.
function clearOf(row: RowType, index: number) {
	return row.x[index + 1] - row.x[index] - row.nodes[index].half - row.nodes[index + 1].half;
}
// The lines between two facilities: neither end is off the report.
function innerOf(row: RowType) {
	return row.segs.filter(
		(seg) => !row.nodes[seg.index].isGhost && !row.nodes[seg.index + 1].isGhost
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

	it('gives a facility with no point picked the one of its place: the first the Start, the last the End', () => {
		// MSC Susanna's one facility had none picked and printed as a Stop, in orange (Justin, 2026-11-19).
		const unpicked = (facility: string) => ({
			point: '' as const,
			facility,
			city: '',
			icon: 'anchor'
		});
		const transport = { name: 'MSC Susanna', icon: 'ferry' };
		const one = runOf([{ transport, stops: [unpicked('Bayport')] }]);
		expect(one.nodes.filter((node) => !node.isGhost).map((node) => node.points)).toEqual([
			['Start']
		]);
		const three = runOf([
			{ transport, stops: [unpicked('Bayport'), unpicked('Galveston'), unpicked('New Orleans')] }
		]);
		expect(three.nodes.map((node) => node.points[0])).toEqual(['Start', 'Stop', 'End']);
	});

	it('runs a line out of a leg that has only its Start, and into one that has only its End', () => {
		const run = runOf([
			leg('MSC Susanna', ['Start', 'Port of Beaumont']),
			leg('Mammoet Actros', ['End', 'Englewood Yard'])
		]);
		expect(run.nodes.map((node) => node.isGhost)).toEqual([false, true, true, false]);
		expect(run.segs.map((seg) => seg.index)).toEqual([0, 2]);
	});
});

describe('what a trip prints as', () => {
	it('is nothing before it has a facility', () => {
		expect(layoutOf(runOf([]), measure)).toEqual({ kind: 'none' });
	});

	it('runs a line in before the first facility and out after the last, with no vehicle on either', () => {
		const { row } = rowOf('pair');
		expect(row.nodes.map((node) => node.isGhost)).toEqual([true, false, false, true]);
		expect(row.segs.map((seg) => [seg.index, seg.isBare])).toEqual([
			[0, true],
			[1, false],
			[2, true]
		]);
		// One set length, from its far end to the facility's edge, whatever the vehicle names are.
		expect(clearOf(row, 0)).toBeCloseTo(OUTER, 5);
		expect(clearOf(row, 2)).toBeCloseTo(OUTER, 5);
		expect(clearOf(rowOf('long').row, 0)).toBeCloseTo(OUTER, 5);
	});

	it('fades the line in, and ends the line out solid with the only arrowhead on its tip', () => {
		for (const trip of ROWS) {
			const { row } = rowOf(trip);
			expect(row.segs[0].fade).toBe('in');
			expect(row.segs.map((seg) => seg.hasArrow)).toEqual(
				row.segs.map((_, at) => at === row.segs.length - 1)
			);
			expect(row.segs.at(-1)?.fade).toBe('');
			for (const seg of innerOf(row)) expect(seg.fade).toBe('');
		}
	});

	it('draws one facility alone the same way: a line either side, its vehicle on both', () => {
		const { row } = rowOf('one');
		expect(row.nodes.map((node) => node.isGhost)).toEqual([true, false, true]);
		expect(row.nodes[1]).toMatchObject({ name: 'Bayport Container Terminal', points: ['Start'] });
		expect(row.segs.map((seg) => [seg.name, seg.isBare])).toEqual([
			['MSC Susanna', false],
			['MSC Susanna', false]
		]);
		// Its outer pieces, beyond each vehicle, are the shorter set length.
		const [before, after] = row.segs;
		expect(before.middle - PAD / 2 - row.x[0]).toBeCloseTo(OUTER_LONE, 5);
		expect(row.x[2] - (after.middle + PAD / 2)).toBeCloseTo(OUTER_LONE, 5);
		// And the facility stands on the centre line.
		expect(row.x[1]).toBeCloseTo(row.width / 2, 5);
	});

	it('draws a lone End the same: a line either side, its vehicle on both', () => {
		const { row } = stripOf([leg('MSC Susanna', ['End', 'Port of New Orleans'])]);
		expect(row.nodes.map((node) => node.isGhost)).toEqual([true, false, true]);
		expect(row.segs.map((seg) => seg.isBare)).toEqual([false, false]);
	});

	it.each(ROWS)(
		'%s: every line between two facilities is the same length, each with its vehicle',
		(trip) => {
			const { row } = rowOf(trip);
			for (const seg of innerOf(row)) {
				expect(seg.isBare).toBe(false);
				expect(clearOf(row, seg.index)).toBeCloseTo(row.gap, 5);
				// The vehicle stands in the middle of its line, so the piece either side of it is the same.
				const left = seg.middle - row.x[seg.index] - row.nodes[seg.index].half;
				expect(left).toBeCloseTo(row.gap / 2, 5);
			}
		}
	);

	it('stands facilities apart by the longest vehicle name with 8 either side, and by nothing else', () => {
		// What shows of a line runs from the clear paper at one facility to the clear paper at the next.
		const shown = (row: RowType) => row.gap - 2 * NODE_CLEAR;
		const longest = 'Union Pacific 8141'.length * LETTER;
		expect(shown(rowOf('legs3').row)).toBeCloseTo(longest + 2 * SPACE, 5);
		// Facility names and locations never set it: the same vehicles between other facilities stand as far apart.
		const renamed = stripOf([
			leg(
				'Union Pacific 8141',
				['Start', 'Port of Corpus Christi Authority'],
				['End', 'Englewood Yard']
			),
			leg(
				'Mammoet Actros',
				['Start', 'Englewood Yard'],
				['End', 'Louis Armstrong New Orleans Airport']
			)
		]);
		expect(shown(renamed.row)).toBeCloseTo(longest + 2 * SPACE, 5);
	});

	it('keeps a least distance for a short vehicle name: its icon with 14 of line either side', () => {
		const { row } = stripOf([leg('Ox', ['Start', 'Port of Beaumont'], ['End', 'Englewood Yard'])]);
		expect(row.gap).toBeCloseTo(PAD + 2 * (14 + NODE_CLEAR), 5);
		const nameless = stripOf([leg('', ['Start', 'Port of Beaumont'], ['End', 'Englewood Yard'])]);
		expect(nameless.row.gap).toBeCloseTo(PAD + 2 * (14 + NODE_CLEAR), 5);
	});

	it('does not stretch its lines to fill a page with room to spare', () => {
		const { row, scale } = rowOf('pair');
		expect(scale).toBe(START_SCALE);
		expect(row.width * scale).toBeLessThan(AVAIL);
		// The first build grew this trip's one line to 132.
		expect(row.gap).toBeCloseTo(PAD + 2 * (14 + NODE_CLEAR), 5);
	});

	it.each(ROWS)(
		'%s: an icon stands on the centre line, and the row is inside its width',
		(trip) => {
			const { row } = rowOf(trip);
			const icons = [
				...row.x.filter((_, at) => !row.nodes[at].isGhost),
				...row.segs.filter((seg) => !seg.isBare).map((seg) => seg.middle)
			];
			const nearest = Math.min(...icons.map((at) => Math.abs(at - row.width / 2)));
			expect(nearest).toBeLessThan(0.3);
			for (const [at, node] of row.nodes.entries()) {
				expect(row.x[at] - node.out).toBeGreaterThanOrEqual(-0.001);
				expect(row.x[at] + node.out).toBeLessThanOrEqual(row.width + 0.001);
			}
			for (const seg of row.segs) {
				expect(seg.middle - seg.width / 2).toBeGreaterThanOrEqual(-0.001);
				expect(seg.middle + seg.width / 2).toBeLessThanOrEqual(row.width + 0.001);
			}
		}
	);

	it.each(ROWS)('%s: no vehicle name touches the next one', (trip) => {
		const { row } = rowOf(trip);
		const named = row.segs.filter((seg) => !seg.isBare);
		for (let at = 0; at < named.length - 1; at += 1) {
			const gap =
				named[at + 1].middle - named[at].middle - (named[at].width + named[at + 1].width) / 2;
			expect(gap).toBeGreaterThan(0);
		}
		for (const seg of innerOf(row))
			expect(row.gap - 2 * NODE_CLEAR).toBeGreaterThanOrEqual(seg.width + 2 * SPACE - 0.001);
	});

	it('starts every trip at 125%, and scales one too wide for the page down as one piece', () => {
		expect(rowOf('legs2').scale).toBe(START_SCALE);
		const { row, scale } = rowOf('long');
		expect(row.width * START_SCALE).toBeGreaterThan(AVAIL);
		expect(scale).toBeLessThan(START_SCALE);
		expect(row.width * scale).toBeCloseTo(AVAIL, 5);
	});

	it('keeps a broken trip in one row: a leg with only its Start, then one with only its End', () => {
		const { row } = stripOf([
			leg('MSC Susanna', ['Start', 'Port of Beaumont']),
			leg('Mammoet Actros', ['End', 'Englewood Yard'])
		]);
		expect(row.nodes.map((node) => node.isGhost)).toEqual([true, false, true, true, false, true]);
		for (const at of row.x) expect(Number.isFinite(at)).toBe(true);
		for (let at = 1; at < row.x.length; at += 1)
			expect(row.x[at]).toBeGreaterThanOrEqual(row.x[at - 1]);
		// The line out of the first leg fades where the trip breaks; only the last line carries the arrowhead.
		expect(row.segs.map((seg) => [seg.fade, seg.hasArrow])).toEqual([
			['in', false],
			['out', false],
			['in', false],
			['', true]
		]);
	});

	it('stands two facilities with no line between them as far apart as any other two', () => {
		const { row } = stripOf([
			leg('MSC Susanna', ['Start', 'Port of Beaumont'], ['End', 'Englewood Yard']),
			leg('Mammoet Actros', ['Start', 'Port of Galveston'], ['End', 'Port of New Orleans'])
		]);
		expect(clearOf(row, 2)).toBeCloseTo(row.gap, 5);
		expect(row.segs.some((seg) => seg.index === 2)).toBe(false);
	});
});

describe('how tall the strip is', () => {
	it('makes room above the circles for the curved location, and puts a vehicle name under its icon', () => {
		const depths = depthsOf(measure);
		// The lettering reaches 8.1 outside the circle's border, with 1 to spare.
		expect(depths.line).toBeCloseTo(9.1 + SIZES.dot / 2, 5);
		expect(depths.vehicle).toBeCloseTo(depths.line + SIZES.mode / 2 + 4, 5);
		expect(depths.height).toBeGreaterThanOrEqual(depths.line + SIZES.dot / 2);
		expect(depths.height).toBeGreaterThanOrEqual(depths.vehicle + TALL);
	});

	it('is given the same room whatever the trip: a row at its starting size', () => {
		expect(slotOf(measure)).toBeCloseTo(depthsOf(measure).height * START_SCALE, 5);
	});
});

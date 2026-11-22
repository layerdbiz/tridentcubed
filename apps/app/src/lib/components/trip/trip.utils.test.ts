// The trip strip (#247, #256; the Stops look is #273): where its circles, lines, vehicle names and ring lettering
// go. The checks are the ones Justin's prototype passed, run here on the layout itself with text of a known width.
import { describe, expect, it } from 'vite-plus/test';
import {
	TRIP_AVAIL,
	TRIP_BAND,
	TRIP_NODE_CLEAR,
	TRIP_OUTER,
	TRIP_OUTER_LONE,
	TRIP_PAD,
	TRIP_RING,
	TRIP_SIZES,
	TRIP_SPACE,
	TRIP_START_SCALE
} from './trip.constants';
import type { TripLegType, TripMeasureType, TripRowType } from './trip.types';
import {
	toTripArc,
	toTripRun,
	tripDepthsOf,
	tripLayoutOf,
	tripRingSizeOf,
	tripSlotOf
} from './trip.utils';

// A vehicle's name is as wide as its letters, 3.2 each, and 6.3 tall. Lettering inside a ring runs 0.75 of its
// size for each letter; a point's word on its band runs 3.9 for each letter.
const LETTER = 3.2;
const TALL = 6.3;
const RING_LETTER = 0.75;
const BAND_LETTER = 3.9;
const measure: TripMeasureType = {
	vehicle: (text) => ({ width: text.length * LETTER, height: TALL }),
	ring: (text) => text.length * RING_LETTER,
	band: (text) => text.length * BAND_LETTER
};

const FACILITIES: Record<string, { city: string; icon: string }> = {
	'Bayport Container Terminal': { city: 'Pasadena, TX', icon: 'anchor' },
	'Port of New Orleans': { city: 'New Orleans, LA', icon: 'anchor' },
	'Port of Galveston': { city: 'Galveston, TX', icon: 'anchor' },
	'Port of Beaumont': { city: 'Beaumont, TX', icon: 'anchor' },
	'Englewood Yard': { city: 'Houston, TX', icon: 'rail' },
	'Port of Corpus Christi Authority': { city: 'Corpus Christi, TX', icon: 'anchor' },
	'Louis Armstrong New Orleans Airport': { city: 'Kenner, LA', icon: 'airport' },
	'George Bush Intercontinental Airport': { city: 'Houston, TX', icon: 'airport' },
	'Turning Basin Terminal': { city: 'Houston, TX', icon: 'anchor' },
	// A facility with no location yet.
	'Tampa Depot': { city: '', icon: 'warehouse' },
	'Pier 9': { city: 'Ohio', icon: 'anchor' },
	'Dock 2': { city: 'Erie', icon: 'anchor' }
};

function leg(
	transport: string,
	...stops: [TripLegType['stops'][number]['point'], string][]
): TripLegType {
	return {
		transport: { name: transport, icon: 'ferry' },
		stops: stops.map(([point, facility]) => ({ point, facility, ...FACILITIES[facility] }))
	};
}

const TRIPS: Record<string, TripLegType[]> = {
	one: [leg('MSC Susanna', ['Start', 'Bayport Container Terminal'])],
	discharge: [leg('MSC Susanna', ['End', 'Bayport Container Terminal'])],
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
	// A long name in one ring: Justin's Air Freight.
	air: [
		leg(
			'Mammoet Actros',
			['Start', 'Turning Basin Terminal'],
			['End', 'George Bush Intercontinental Airport']
		),
		leg(
			'Antonov 124',
			['Start', 'George Bush Intercontinental Airport'],
			['End', 'Louis Armstrong New Orleans Airport']
		),
		leg(
			'Scheuerle SPMT',
			['Start', 'Louis Armstrong New Orleans Airport'],
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
// The trips of two facilities or more.
const ROWS = ['pair', 'stops', 'legs2', 'legs3', 'air', 'long'];
const EVERY = ['one', 'discharge', ...ROWS];

function stripOf(legs: TripLegType[]) {
	const strip = tripLayoutOf(toTripRun(legs), measure);
	if (strip.kind !== 'row') throw new Error('not a row');
	return strip;
}
function rowOf(trip: string) {
	return stripOf(TRIPS[trip]);
}

// The clear paper from one node's edge to the next's.
function clearOf(row: TripRowType, index: number) {
	return row.x[index + 1] - row.x[index] - row.nodes[index].half - row.nodes[index + 1].half;
}
// The lines between two facilities: neither end is off the report.
function innerOf(row: TripRowType) {
	return row.segs.filter(
		(seg) => !row.nodes[seg.index].isGhost && !row.nodes[seg.index + 1].isGhost
	);
}
// The facilities on the report.
function realOf(row: TripRowType) {
	return row.nodes.filter((node) => !node.isGhost);
}

describe('the trip as one run', () => {
	it('draws a facility that ends one leg and starts the next once, with both its points', () => {
		const run = toTripRun(TRIPS.legs2);
		expect(run.nodes.map((node) => node.name)).toEqual([
			'Englewood Yard',
			'Bayport Container Terminal',
			'Port of New Orleans'
		]);
		expect(run.nodes[1].points).toEqual(['End', 'Start']);
		// Where two legs meet, the facility is a Stop.
		expect(run.nodes.map((node) => node.point)).toEqual(['Start', 'Stop', 'End']);
	});

	it('gives every line its Transport Mode, a leg with Stops the same one on each', () => {
		expect(toTripRun(TRIPS.stops).segs.map((seg) => seg.name)).toEqual([
			'MSC Susanna',
			'MSC Susanna',
			'MSC Susanna'
		]);
		expect(toTripRun(TRIPS.legs3).segs.map((seg) => [seg.index, seg.name])).toEqual([
			[0, 'Union Pacific 8141'],
			[1, 'Mammoet Actros'],
			[2, 'MSC Susanna'],
			[3, 'MSC Susanna']
		]);
	});

	it('leaves out a stop with no facility picked yet, and a leg with none', () => {
		const run = toTripRun([
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
		const one = toTripRun([{ transport, stops: [unpicked('Bayport')] }]);
		expect(one.nodes.filter((node) => !node.isGhost).map((node) => node.points)).toEqual([
			['Start']
		]);
		const three = toTripRun([
			{ transport, stops: [unpicked('Bayport'), unpicked('Galveston'), unpicked('New Orleans')] }
		]);
		expect(three.nodes.map((node) => node.points[0])).toEqual(['Start', 'Stop', 'End']);
	});

	it('runs a line out of a leg that has only its Start, and into one that has only its End', () => {
		const run = toTripRun([
			leg('MSC Susanna', ['Start', 'Port of Beaumont']),
			leg('Mammoet Actros', ['End', 'Englewood Yard'])
		]);
		expect(run.nodes.map((node) => node.isGhost)).toEqual([false, true, true, false]);
		expect(run.segs.map((seg) => seg.index)).toEqual([0, 2]);
	});
});

describe('the word on a facility’s band', () => {
	const wordsOf = (trip: string) =>
		toTripRun(TRIPS[trip])
			.nodes.filter((node) => !node.isGhost)
			.map((node) => node.word);

	it('is its point: Start, Stop or End', () => {
		expect(wordsOf('pair')).toEqual(['Start', 'End']);
		expect(wordsOf('one')).toEqual(['Start']);
		expect(wordsOf('discharge')).toEqual(['End']);
	});

	it('leaves one Stop alone without a number', () => {
		// A facility that ends one leg and starts the next is a Stop.
		expect(wordsOf('legs2')).toEqual(['Start', 'Stop', 'End']);
	});

	it('numbers the Stops in trip order when the trip has two or more', () => {
		expect(wordsOf('stops')).toEqual(['Start', 'Stop 1', 'Stop 2', 'End']);
		// Two where legs meet, then a Stop on the last leg.
		expect(wordsOf('legs3')).toEqual(['Start', 'Stop 1', 'Stop 2', 'Stop 3', 'End']);
	});
});

describe('what a trip prints as', () => {
	it('is nothing before it has a facility', () => {
		expect(tripLayoutOf(toTripRun([]), measure)).toEqual({ kind: 'none' });
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
		expect(clearOf(row, 0)).toBeCloseTo(TRIP_OUTER, 5);
		expect(clearOf(row, 2)).toBeCloseTo(TRIP_OUTER, 5);
		expect(clearOf(rowOf('long').row, 0)).toBeCloseTo(TRIP_OUTER, 5);
	});

	it.each(EVERY)('%s: has one arrowhead', (trip) => {
		const { row } = rowOf(trip);
		expect(row.segs.filter((seg) => seg.hasArrow)).toHaveLength(1);
	});

	it.each(ROWS)(
		'%s: the arrowhead points into the End, and the plain lines either side fade out',
		(trip) => {
			const { row } = rowOf(trip);
			const last = row.nodes.findLastIndex((node) => !node.isGhost);
			expect(row.nodes[last].points).toContain('End');
			const arriving = row.segs.find((seg) => seg.index + 1 === last);
			expect(arriving).toMatchObject({ hasArrow: true, isBare: false, fade: '' });
			// The head's point stands at the End's clear paper, not at its centre.
			expect(arriving?.tip).toBeCloseTo(row.nodes[last].half + TRIP_NODE_CLEAR, 5);
			// The line in before the first facility and the line out after the End stay, plain and fading.
			expect(row.segs[0]).toMatchObject({ isBare: true, fade: 'in', hasArrow: false });
			expect(row.segs.at(-1)).toMatchObject({ isBare: true, fade: 'out', hasArrow: false });
			for (const seg of innerOf(row)) expect(seg.fade).toBe('');
		}
	);

	it('puts the arrowhead on the tip of the last line when the trip has no End', () => {
		const { row } = stripOf([
			leg('MSC Susanna', ['Start', 'Bayport Container Terminal'], ['Stop', 'Port of Galveston'])
		]);
		expect(row.segs.map((seg) => seg.hasArrow)).toEqual([false, false, true]);
		// A line with the arrowhead on its tip does not fade: a fade would take the arrow away.
		expect(row.segs.at(-1)).toMatchObject({ fade: '', tip: 0 });
	});

	describe('one facility alone', () => {
		// What shows of a line beside the facility: from its far end to the facility's clear paper.
		const shownOf = (row: TripRowType, at: number) =>
			row.x[at + 1] - row.x[at] - TRIP_SIZES.dot / 2 - TRIP_NODE_CLEAR;

		it('shows a single Start’s vehicle once, leaving on the right, with a plain line on the left', () => {
			const { row } = rowOf('one');
			expect(row.nodes.map((node) => node.isGhost)).toEqual([true, false, true]);
			expect(row.nodes[1]).toMatchObject({ name: 'Bayport Container Terminal', point: 'Start' });
			expect(row.segs.map((seg) => [seg.name, seg.isBare])).toEqual([
				['', true],
				['MSC Susanna', false]
			]);
			// The arrowhead is on the tip of the vehicle's line, which does not fade.
			expect(row.segs[1]).toMatchObject({ hasArrow: true, tip: 0, fade: '' });
			expect(row.segs[0]).toMatchObject({ hasArrow: false, fade: 'in' });
		});

		it('shows a single End’s vehicle once, arriving on the left, with a plain line on the right', () => {
			const { row } = rowOf('discharge');
			expect(row.nodes.map((node) => node.isGhost)).toEqual([true, false, true]);
			expect(row.segs.map((seg) => [seg.name, seg.isBare])).toEqual([
				['MSC Susanna', false],
				['', true]
			]);
			// The arrowhead points into the facility; the plain line that runs on has none.
			expect(row.segs[0]).toMatchObject({ hasArrow: true, fade: 'in' });
			expect(row.segs[0].tip).toBeCloseTo(TRIP_SIZES.dot / 2 + TRIP_NODE_CLEAR, 5);
			expect(row.segs[1]).toMatchObject({ hasArrow: false, fade: 'out' });
		});

		it('draws a single Stop with its vehicle arriving on the left', () => {
			const { row } = stripOf([leg('MSC Susanna', ['Stop', 'Port of Galveston'])]);
			expect(row.segs.map((seg) => seg.isBare)).toEqual([false, true]);
			// With no End, the arrowhead is on the tip of the last line.
			expect(row.segs.map((seg) => seg.hasArrow)).toEqual([false, true]);
		});

		it.each(['one', 'discharge'])(
			'%s: stands on the centre line with the same length of line either side',
			(trip) => {
				const { row } = rowOf(trip);
				expect(row.x[1]).toBeCloseTo(row.width / 2, 5);
				expect(row.x[1] - row.x[0]).toBeCloseTo(row.x[2] - row.x[1], 5);
			}
		);

		it('gives a single Start’s arrow line the lone outer length less the arrowhead', () => {
			const { row } = rowOf('one');
			// Beyond the vehicle: 32, less the head's 5, so the head is the end of the line and not an addition.
			expect(row.x[2] - (row.segs[1].middle + TRIP_PAD / 2)).toBeCloseTo(
				TRIP_OUTER_LONE - TRIP_SIZES.arrow,
				5
			);
		});

		it('makes the piece beyond a single End’s vehicle half as long again: 48', () => {
			const { row } = rowOf('discharge');
			expect(row.segs[0].middle - TRIP_PAD / 2 - row.x[0]).toBeCloseTo(48, 5);
		});

		it('fades the plain line over its whole length, and an arriving vehicle’s line over half of its', () => {
			const start = rowOf('one').row;
			expect(start.segs[0].fading).toBeCloseTo(shownOf(start, 0), 5);
			const end = rowOf('discharge').row;
			expect(end.segs[1].fading).toBeCloseTo(shownOf(end, 1), 5);
			expect(end.segs[0].fading).toBeCloseTo(shownOf(end, 0) / 2, 5);
		});
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
		const shown = (row: TripRowType) => row.gap - 2 * TRIP_NODE_CLEAR;
		const longest = 'Union Pacific 8141'.length * LETTER;
		expect(shown(rowOf('legs3').row)).toBeCloseTo(longest + 2 * TRIP_SPACE, 5);
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
		expect(shown(renamed.row)).toBeCloseTo(longest + 2 * TRIP_SPACE, 5);
	});

	it('keeps a least distance for a short vehicle name: its icon with 14 of line either side', () => {
		const { row } = stripOf([leg('Ox', ['Start', 'Port of Beaumont'], ['End', 'Englewood Yard'])]);
		expect(row.gap).toBeCloseTo(TRIP_PAD + 2 * (14 + TRIP_NODE_CLEAR), 5);
		const nameless = stripOf([leg('', ['Start', 'Port of Beaumont'], ['End', 'Englewood Yard'])]);
		expect(nameless.row.gap).toBeCloseTo(TRIP_PAD + 2 * (14 + TRIP_NODE_CLEAR), 5);
	});

	it('does not stretch its lines to fill a page with room to spare', () => {
		const { row, scale } = rowOf('pair');
		expect(scale).toBe(TRIP_START_SCALE);
		expect(row.width * scale).toBeLessThan(TRIP_AVAIL);
		// The first build grew this trip's one line to 132.
		expect(row.gap).toBeCloseTo(TRIP_PAD + 2 * (14 + TRIP_NODE_CLEAR), 5);
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
			expect(row.gap - 2 * TRIP_NODE_CLEAR).toBeGreaterThanOrEqual(
				seg.width + 2 * TRIP_SPACE - 0.001
			);
	});

	it('starts every trip at 125%, and scales one too wide for the page down as one piece', () => {
		expect(rowOf('legs2').scale).toBe(TRIP_START_SCALE);
		const { row, scale } = rowOf('long');
		expect(row.width * TRIP_START_SCALE).toBeGreaterThan(TRIP_AVAIL);
		expect(scale).toBeLessThan(TRIP_START_SCALE);
		expect(row.width * scale).toBeCloseTo(TRIP_AVAIL, 5);
	});

	it('fits a narrower place when it is given one', () => {
		const strip = tripLayoutOf(toTripRun(TRIPS.legs2), measure, 200);
		if (strip.kind !== 'row') throw new Error('not a row');
		expect(strip.row.width * strip.scale).toBeCloseTo(200, 5);
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
		// The line out of the first leg fades where the trip breaks; the line that arrives at the End carries the
		// arrowhead, and the plain line after the End fades out.
		expect(row.segs.map((seg) => [seg.fade, seg.hasArrow])).toEqual([
			['in', false],
			['out', false],
			['in', true],
			['out', false]
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

describe('the lettering inside the rings', () => {
	// The clear space each side of a dividing line, in degrees.
	function padOf(size: number, middle: number) {
		return ((size * TRIP_RING.cap * TRIP_RING.clear) / middle) * (180 / Math.PI);
	}

	it('writes the facility’s name along the top and its location along the bottom, in capitals', () => {
		const [start] = realOf(rowOf('pair').row);
		expect(start.ring?.legends.map((legend) => [legend.where, legend.text])).toEqual([
			['top', 'BAYPORT CONTAINER TERMINAL'],
			['bottom', 'PASADENA, TX']
		]);
	});

	it('centres the name on the top of the ring and the location on its foot', () => {
		for (const node of realOf(rowOf('air').row)) {
			const [top, bottom] = node.ring!.legends;
			// Both legends' own lines start 175 degrees before their middle.
			expect(top.along).toBeCloseTo(175, 5);
			expect(bottom.along).toBeCloseTo(175, 5);
		}
	});

	it.each(EVERY)('%s: uses one size of lettering in every ring', (trip) => {
		const sizes = realOf(rowOf(trip).row).map((node) => node.ring?.size);
		expect(new Set(sizes).size).toBe(1);
		expect(sizes[0]).toBeGreaterThanOrEqual(TRIP_RING.text * TRIP_RING.least);
		expect(sizes[0]).toBeLessThanOrEqual(TRIP_RING.text * TRIP_RING.most);
	});

	it.each(EVERY)(
		'%s: draws two lines of the same length in every ring, none under 17.5 degrees',
		(trip) => {
			for (const node of realOf(rowOf(trip).row)) {
				const lines = node.ring!.rules.map((rule) => rule.to - rule.from);
				expect(lines).toHaveLength(2);
				expect(lines[0]).toBeCloseTo(lines[1], 5);
				expect(lines[0]).toBeGreaterThan(TRIP_RING.line - 0.05);
			}
		}
	);

	it('takes its size from the ring that needs the most room, whose lines are exactly the least', () => {
		const rings = realOf(rowOf('air').row).map((node) => node.ring!);
		const lines = rings.map((ring) => ring.rules[0].to - ring.rules[0].from);
		// The long name's ring is the neediest: its lines are the least allowed, the others' are longer.
		const neediest = Math.min(...lines);
		expect(lines.indexOf(neediest)).toBe(1);
		expect(neediest).toBeCloseTo(TRIP_RING.line, 1);
		expect(rings[0].size).toBeLessThan(TRIP_RING.text);
	});

	it('sets short names larger, and never past 140% of its starting size', () => {
		const strip = stripOf([leg('Ox', ['Start', 'Pier 9'], ['End', 'Dock 2'])]);
		expect(realOf(strip.row)[0].ring?.size).toBeCloseTo(TRIP_RING.text * TRIP_RING.most, 5);
	});

	it('keeps the legends clear of each other and of their lines', () => {
		for (const trip of EVERY)
			for (const node of realOf(rowOf(trip).row)) {
				const ring = node.ring!;
				const taken =
					ring.legends.reduce((sum, legend) => sum + legend.length, 0) +
					ring.rules.reduce((sum, rule) => sum + rule.to - rule.from, 0) +
					2 * ring.rules.length * padOf(ring.size, ring.middle);
				expect(taken).toBeCloseTo(360, 5);
			}
	});

	it('runs one line round the rest of the ring when a facility has no location', () => {
		const strip = stripOf([leg('Ox', ['Start', 'Tampa Depot'], ['End', 'Englewood Yard'])]);
		const ring = realOf(strip.row)[0].ring!;
		expect(ring.legends.map((legend) => legend.where)).toEqual(['top']);
		expect(ring.rules).toHaveLength(1);
		// One legend alone keeps to half the ring.
		expect(ring.legends[0].length).toBeLessThanOrEqual(TRIP_RING.alone);
	});

	it('works its size out from the names alone', () => {
		const nodes = toTripRun(TRIPS.air).nodes;
		expect(tripRingSizeOf(nodes, measure)).toBeCloseTo(realOf(rowOf('air').row)[0].ring!.size, 5);
	});
});

describe('the band outside a facility’s circle', () => {
	it('carries its point’s word in capitals, from just above the far left', () => {
		const [start, end] = realOf(rowOf('pair').row);
		expect(start.band?.text).toBe('START');
		expect(end.band?.text).toBe('END');
		expect(realOf(rowOf('stops').row)[1].band?.text).toBe('STOP 1');
		// The band begins its square end's padding before the lettering does.
		expect(start.band!.from).toBeLessThan(TRIP_BAND.from);
		expect(start.band!.from).toBeGreaterThan(TRIP_BAND.from - 8);
	});

	it('runs exactly as far as its lettering, with the same padding at each end', () => {
		const { band } = realOf(rowOf('pair').row)[0];
		const base = TRIP_SIZES.dot / 2 + TRIP_BAND.base;
		const span = (('START'.length * BAND_LETTER) / base) * (180 / Math.PI);
		const ends = TRIP_BAND.from - band!.from;
		expect(band!.to - band!.from).toBeCloseTo(span + 2 * ends, 5);
		expect(band!.size).toBeCloseTo(TRIP_BAND.text, 5);
	});

	it('sets a word too long for its room smaller until it fits', () => {
		const wide: TripMeasureType = { ...measure, band: (text) => text.length * 20 };
		const strip = tripLayoutOf(toTripRun(TRIPS.pair), wide);
		if (strip.kind !== 'row') throw new Error('not a row');
		const { band } = realOf(strip.row)[0];
		expect(band!.size).toBeLessThan(TRIP_BAND.text);
		expect(band!.to - band!.from).toBeLessThan(TRIP_BAND.most + 12);
	});

	it('is reached by the row: a facility reaches as far as its band', () => {
		const [start] = realOf(rowOf('pair').row);
		expect(start.out).toBeCloseTo(TRIP_SIZES.dot / 2 + TRIP_BAND.out, 5);
	});
});

describe('how tall the strip is', () => {
	it('makes room above the circles for the band, and puts a vehicle name under its icon', () => {
		const depths = tripDepthsOf(measure);
		// The band reaches 6.17 outside the circle's border, with 1 to spare.
		expect(depths.line).toBeCloseTo(TRIP_BAND.out + 1 + TRIP_SIZES.dot / 2, 5);
		expect(depths.vehicle).toBeCloseTo(depths.line + TRIP_SIZES.mode / 2 + 4, 5);
		expect(depths.height).toBeGreaterThanOrEqual(depths.line + TRIP_SIZES.dot / 2);
		expect(depths.height).toBeGreaterThanOrEqual(depths.vehicle + TALL);
	});

	it('is given the same room whatever the trip: a row at its starting size', () => {
		expect(tripSlotOf(measure)).toBeCloseTo(tripDepthsOf(measure).height * TRIP_START_SCALE, 5);
	});
});

describe('a piece of a circle as a path', () => {
	it('runs clockwise from a smaller angle to a larger one, the long way round past a half turn', () => {
		expect(toTripArc(100, 50, 0, 90)).toBe('M150,100 A50,50 0 0 1 100,150');
		expect(toTripArc(100, 50, 0, 270)).toBe('M150,100 A50,50 0 1 1 100,50');
	});

	it('runs the other way from a larger angle to a smaller one, which stands lettering on a foot upright', () => {
		expect(toTripArc(100, 50, 90, 0)).toBe('M100,150 A50,50 0 0 0 150,100');
	});
});

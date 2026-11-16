import { describe, expect, it } from 'vite-plus/test';
import { gapOf, reachOf, RESTS, scatterOf } from './map.utils';

const NAMES = [
	'US Ocean',
	'KOGA',
	'dship Carriers',
	'Oslo Caribbean Carrier',
	'UTC Overseas',
	'CEVA'
];

function apart(a: { x: number; y: number }, b: { x: number; y: number }) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('the scatter of things that share a place', () => {
	it('puts one thing on the place itself', () => {
		expect(scatterOf(['KOGA'])).toEqual([{ x: 0, y: 0 }]);
		expect(scatterOf([])).toEqual([]);
	});

	it('is the same every time it is worked out', () => {
		expect(scatterOf(NAMES)).toEqual(scatterOf(NAMES));
	});

	it('keeps a thing in its seat whatever order the list comes in', () => {
		const forward = scatterOf(NAMES);
		const backward = scatterOf(NAMES.toReversed()).toReversed();
		for (const [index, seat] of forward.entries()) {
			expect(seat.x).toBeCloseTo(backward[index].x);
			expect(seat.y).toBeCloseTo(backward[index].y);
		}
	});

	it('never seats two things on top of each other, and sits evenly round the place', () => {
		const crowd = Array.from({ length: 17 }, (_, index) => `Person ${index}`);
		const seats = scatterOf(crowd);
		for (const [index, seat] of seats.entries())
			for (const other of seats.slice(index + 1)) expect(apart(seat, other)).toBeGreaterThan(0.9);
		expect(seats.reduce((sum, seat) => sum + seat.x, 0)).toBeCloseTo(0);
		expect(seats.reduce((sum, seat) => sum + seat.y, 0)).toBeCloseTo(0);
	});

	it('is no ring: its things are at different distances from the place', () => {
		const far = scatterOf(NAMES).map((seat) => Math.hypot(seat.x, seat.y));
		expect(Math.max(...far) - Math.min(...far)).toBeGreaterThan(0.8);
	});

	it('reaches further the more it holds, and a crowd sits closer', () => {
		expect(reachOf(1)).toBe(0);
		expect(reachOf(12)).toBeGreaterThan(reachOf(4));
		expect(gapOf(17)).toBeLessThan(gapOf(4));
	});
});

describe('what the map does at each rest of the sheet', () => {
	it('stands further in, with bigger markers, the lower the sheet rests', () => {
		expect(RESTS.map((rest) => rest.size)).toEqual([0.5, 1, 1.25]);
		expect(RESTS[0].inset).toBeGreaterThan(RESTS[1].inset);
		expect(RESTS[1].inset).toBeGreaterThan(RESTS[2].inset);
		expect(RESTS[0].zoom).toBeLessThan(RESTS[1].zoom);
		expect(RESTS[1].zoom).toBeLessThan(RESTS[2].zoom);
	});
});

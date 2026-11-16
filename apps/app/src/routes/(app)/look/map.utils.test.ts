import { describe, expect, it } from 'vite-plus/test';
import { angleOf, leastRing, placesFor, zoomFor } from './map.utils';

function place(name: string, lng: number, lat: number, count: number) {
	return { name, lng, lat, items: Array.from({ length: count }, (_, index) => index) };
}

const HOUSTON = place('Houston', -95.37, 29.76, 7);
const GALVESTON = place('Galveston', -94.8, 29.3, 1);
const STAMFORD = place('Stamford', -73.54, 41.05, 1);
const LONDON = place('London', -0.13, 51.51, 1);
const PLACES = [STAMFORD, HOUSTON, LONDON, GALVESTON];

describe('the ring several things in one place sit on', () => {
	it('is nothing for one thing, and grows with how many there are', () => {
		expect(leastRing(1)).toBe(0);
		expect(leastRing(2)).toBeCloseTo(13.5);
		expect(leastRing(8)).toBeGreaterThan(leastRing(4));
	});

	it('starts straight up and goes round evenly', () => {
		expect(angleOf(0, 4)).toBeCloseTo(-Math.PI / 2);
		expect(angleOf(1, 4)).toBeCloseTo(0);
		expect(angleOf(2, 4)).toBeCloseTo(Math.PI / 2);
	});
});

describe('how close the map looks, by where the sheet rests', () => {
	it('shows every place with the sheet at its highest', () => {
		expect(placesFor(PLACES, 0)).toEqual(PLACES);
	});

	it('moves in on the part where most things are, lower', () => {
		expect(placesFor(PLACES, 1).map((each) => each.name)).toEqual(['Houston']);
		const even = [place('A', 0, 0, 2), place('B', 1, 0, 2), place('C', 40, 0, 2)];
		expect(placesFor(even, 1).map((each) => each.name)).toEqual(['A', 'B']);
	});

	it('never keeps every place when it moves in', () => {
		const two = [place('A', 0, 0, 1), place('B', 1, 0, 1)];
		expect(placesFor(two, 1)).toHaveLength(1);
	});

	it('shows the busiest place alone with the sheet at its lowest', () => {
		expect(placesFor(PLACES, 2)).toEqual([HOUSTON]);
	});

	it('has nothing to choose between with one place or none', () => {
		expect(placesFor([HOUSTON], 2)).toEqual([HOUSTON]);
		expect(placesFor([], 1)).toEqual([]);
	});

	it('may go further in the lower the sheet rests', () => {
		expect(zoomFor(9, 0)).toBe(9);
		expect(zoomFor(9, 1)).toBeGreaterThan(9);
		expect(zoomFor(9, 2)).toBeGreaterThan(zoomFor(9, 1));
	});
});

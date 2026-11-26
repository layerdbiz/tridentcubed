import { describe, expect, test } from 'vite-plus/test';
import { toPacked, type PlaceType } from './pack';

const DESKTOP = { width: 1960, height: 1400 };
const LAPTOP = { width: 1700, height: 1060 };
const TABLET = { width: 860, height: 1220 };
const PHONE = { width: 417, height: 876 };

function overlaps(a: PlaceType, b: PlaceType): boolean {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('toPacked', () => {
	test('one screen fills the room at the largest scale that fits it whole', () => {
		const packed = toPacked([{ width: 1000, height: 500 }], { width: 500, height: 500 });
		expect(packed.scale).toBe(0.5);
		expect(packed.places).toEqual([{ x: 0, y: 0, width: 1000, height: 500 }]);
	});

	test('never draws a screen above its real size', () => {
		expect(toPacked([PHONE], { width: 4000, height: 4000 }).scale).toBe(1);
	});

	test('four devices are drawn larger than in one row or one column, with none overlapping', () => {
		const room = { width: 1180, height: 820 };
		const boxes = [DESKTOP, LAPTOP, TABLET, PHONE];
		const packed = toPacked(boxes, room);

		const rowScale = room.width / boxes.reduce((sum, box) => sum + box.width, 0);
		const columnScale = room.height / boxes.reduce((sum, box) => sum + box.height, 0);
		expect(packed.scale).toBeGreaterThan(Math.max(rowScale, columnScale) * 1.3);

		for (const [index, place] of packed.places.entries()) {
			expect(place).toMatchObject(boxes[index]);
			expect(place.x + place.width).toBeLessThanOrEqual(packed.width + 0.001);
			expect(place.y + place.height).toBeLessThanOrEqual(packed.height + 0.001);
			for (const other of packed.places.slice(index + 1))
				expect(overlaps(place, other)).toBe(false);
		}
		expect(packed.width * packed.scale).toBeLessThanOrEqual(room.width + 0.5);
		expect(packed.height * packed.scale).toBeLessThanOrEqual(room.height + 0.5);
	});

	test('leaves the gap and the label line at their screen size between screens', () => {
		const packed = toPacked([PHONE, PHONE], { width: 1000, height: 600 }, 20, 24);
		const [a, b] = packed.places;
		const label = 24 / packed.scale;
		expect(a.height).toBeCloseTo(PHONE.height + label, 1);
		expect((b.x - (a.x + a.width)) * packed.scale).toBeCloseTo(20, 0);
	});

	test('keeps a phone on a tall narrow page in a column', () => {
		const packed = toPacked([PHONE, PHONE], { width: 400, height: 1800 });
		expect(packed.places[1].y).toBeGreaterThan(packed.places[0].y);
	});

	test('keeps each group of screens together in a block of its own', () => {
		// Two options in two themes: four groups of four devices, which laid out freely would mix together.
		const boxes = Array.from({ length: 4 }, () => [DESKTOP, LAPTOP, TABLET, PHONE]).flat();
		const groups = boxes.map((_, index) => Math.floor(index / 4));
		const packed = toPacked(boxes, { width: 1136, height: 820 }, 20, 24, groups);

		const blocks = [0, 1, 2, 3].map((group) => {
			const places = packed.places.filter((_, index) => groups[index] === group);
			const left = Math.min(...places.map((place) => place.x));
			const top = Math.min(...places.map((place) => place.y));
			return {
				x: left,
				y: top,
				width: Math.max(...places.map((place) => place.x + place.width)) - left,
				height: Math.max(...places.map((place) => place.y + place.height)) - top
			};
		});
		for (const [index, block] of blocks.entries()) {
			for (const other of blocks.slice(index + 1)) expect(overlaps(block, other)).toBe(false);
		}
	});
});

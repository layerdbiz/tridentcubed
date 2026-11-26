import { describe, expect, test } from 'vite-plus/test';
import { toFit, toPinch, toZoom } from './viewport';

describe('toFit', () => {
	test('scales the frames to fit whole inside the stage with a margin, centred', () => {
		expect(toFit({ width: 1000, height: 600 }, { width: 2000, height: 1000 }, 20)).toEqual({
			scale: 0.48,
			x: 20,
			y: 60
		});
	});

	test('never blows small frames up past their real size', () => {
		expect(toFit({ width: 1000, height: 1000 }, { width: 400, height: 200 }, 20)).toEqual({
			scale: 1,
			x: 300,
			y: 400
		});
	});
});

describe('toZoom', () => {
	test('keeps the point under the fingers or the pointer where it is', () => {
		// The content point under (100, 100) is (50, 50) at scale 2 with no pan; it stays under (100, 100) at 4.
		expect(toZoom({ scale: 2, x: 0, y: 0 }, 4, 100, 100)).toEqual({ scale: 4, x: -100, y: -100 });
	});

	test('stays between a twentieth and eight times', () => {
		expect(toZoom({ scale: 1, x: 0, y: 0 }, 100, 0, 0).scale).toBe(8);
		expect(toZoom({ scale: 1, x: 0, y: 0 }, 0.001, 0, 0).scale).toBe(0.05);
	});
});

describe('toPinch', () => {
	test('scales by how far the fingers spread and moves with their middle', () => {
		const start = { view: { scale: 1, x: 0, y: 0 }, x: 100, y: 100, distance: 100 };
		expect(toPinch(start, 150, 150, 200)).toEqual({ scale: 2, x: -50, y: -50 });
	});
});

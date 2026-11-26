import { expect, test } from 'vite-plus/test';
import { toPixels, toShellPoint } from './pinch';

test('a point in a frame drawn at half size lands at half the distance from its corner', () => {
	const rect = { left: 100, top: 50, width: 195, height: 422 };
	expect(toShellPoint(rect, { width: 390, height: 844 }, { clientX: 200, clientY: 400 })).toEqual({
		x: 200,
		y: 250
	});
});

test('a wheel that counts lines or pages moves as far as one that counts pixels', () => {
	expect(toPixels({ deltaMode: 0 }, 100)).toBe(100);
	expect(toPixels({ deltaMode: 1 }, 3)).toBe(48);
	expect(toPixels({ deltaMode: 2 }, 1)).toBe(800);
});

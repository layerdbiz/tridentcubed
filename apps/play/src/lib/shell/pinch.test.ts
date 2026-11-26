import { expect, test } from 'vite-plus/test';
import { toShellPoint } from './pinch';

test('a point in a frame drawn at half size lands at half the distance from its corner', () => {
	const rect = { left: 100, top: 50, width: 195, height: 422 };
	expect(toShellPoint(rect, { width: 390, height: 844 }, { clientX: 200, clientY: 400 })).toEqual({
		x: 200,
		y: 250
	});
});

import { describe, expect, it } from 'vite-plus/test';
import { toEditWords } from './edit';

describe('toEditWords', () => {
	it('names nothing for a picture left as it came', () => {
		expect(toEditWords(undefined)).toEqual([]);
		expect(toEditWords({})).toEqual([]);
		expect(toEditWords({ ratio: 'original', frame: { x: 0, y: 0, w: 1, h: 1 } })).toEqual([]);
	});

	it('names each change that shows on the picture, in one order', () => {
		expect(
			toEditWords({
				tilt: 3,
				isFlipped: true,
				turns: 1,
				frame: { x: 0.1, y: 0, w: 0.8, h: 1 }
			})
		).toEqual(['Cropped', 'Turned', 'Flipped', 'Straightened']);
		expect(toEditWords({ turns: 2 })).toEqual(['Turned']);
	});
});

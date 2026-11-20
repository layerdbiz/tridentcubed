// The photo sliders on a project's page and on its card (#250; Justin, 2026-11-20: "I can't always see the
// selected indicator. They all appear gray for some reason after you slide to a certain point"). What is checked is
// what the person sees: under every photo, however many there are, exactly one dot is lit; the row never grows past
// five dots and slides along with the photo; and a photo gets its picture just before it comes into view, never all
// of them at once.
import { describe, expect, it } from 'vite-plus/test';
import { dotsOf, Slides } from './slides.svelte';

function litOf(at: number, count: number) {
	return dotsOf(at, count)
		.filter((dot) => dot.isLit)
		.map((dot) => dot.index);
}

describe('the dots under a photo slider', () => {
	it('lights exactly one dot, the photo in view, at every photo of 36', () => {
		for (let at = 0; at < 36; at++) expect(litOf(at, 36)).toEqual([at]);
	});

	it('lights one dot at photo 9 and 10 of 10, where the project page went all grey', () => {
		expect(litOf(8, 10)).toEqual([8]);
		expect(litOf(9, 10)).toEqual([9]);
	});

	it('draws a dot for each photo up to five, and never more than five', () => {
		expect(dotsOf(0, 1)).toHaveLength(1);
		expect(dotsOf(0, 3).map((dot) => dot.index)).toEqual([0, 1, 2]);
		expect(dotsOf(0, 5)).toHaveLength(5);
		expect(dotsOf(20, 36)).toHaveLength(5);
	});

	it('slides the row along, the photo in view in the middle until an end is reached', () => {
		expect(dotsOf(0, 36).map((dot) => dot.index)).toEqual([0, 1, 2, 3, 4]);
		expect(dotsOf(2, 36).map((dot) => dot.index)).toEqual([0, 1, 2, 3, 4]);
		expect(dotsOf(20, 36).map((dot) => dot.index)).toEqual([18, 19, 20, 21, 22]);
		expect(dotsOf(35, 36).map((dot) => dot.index)).toEqual([31, 32, 33, 34, 35]);
	});

	it('makes an end dot small while more photos lie beyond it', () => {
		expect(dotsOf(0, 36).map((dot) => dot.isSmall)).toEqual([false, false, false, false, true]);
		expect(dotsOf(20, 36).map((dot) => dot.isSmall)).toEqual([true, false, false, false, true]);
		expect(dotsOf(35, 36).map((dot) => dot.isSmall)).toEqual([true, false, false, false, false]);
		expect(dotsOf(2, 5).map((dot) => dot.isSmall)).toEqual([false, false, false, false, false]);
	});

	it('still lights a dot when the photo in view is past the end, as after a photo is removed', () => {
		expect(litOf(12, 10)).toEqual([9]);
		expect(litOf(-1, 10)).toEqual([0]);
	});

	it('draws nothing for no photos', () => {
		expect(dotsOf(0, 0)).toEqual([]);
	});
});

describe('a photo slider', () => {
	const WIDTH = 390;

	it('opens on the first photo, with pictures for it and the next two only', () => {
		const slides = new Slides();

		expect(slides.at).toBe(0);
		expect([0, 1, 2, 3, 35].map((index) => slides.hasPicture(index))).toEqual([
			true,
			true,
			true,
			false,
			false
		]);
	});

	it('follows the strip to the photo in view, and fetches the next two ahead of it', () => {
		const slides = new Slides();

		slides.see(8 * WIDTH, WIDTH);

		expect(slides.at).toBe(8);
		expect(slides.hasPicture(10)).toBe(true);
		expect(slides.hasPicture(11)).toBe(false);
	});

	it('names the nearer photo while the strip is between two', () => {
		const slides = new Slides();

		slides.see(3.4 * WIDTH, WIDTH);
		expect(slides.at).toBe(3);
		slides.see(3.6 * WIDTH, WIDTH);
		expect(slides.at).toBe(4);
	});

	it('keeps the pictures already fetched when sliding back', () => {
		const slides = new Slides();

		slides.see(20 * WIDTH, WIDTH);
		slides.see(0, WIDTH);

		expect(slides.at).toBe(0);
		expect(slides.hasPicture(22)).toBe(true);
		expect(slides.hasPicture(23)).toBe(false);
	});

	it('stays where it is while the strip has no width yet', () => {
		const slides = new Slides();
		slides.see(4 * WIDTH, WIDTH);

		slides.see(0, 0);

		expect(slides.at).toBe(4);
	});
});

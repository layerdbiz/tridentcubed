import { describe, expect, test } from 'vite-plus/test';
import { BROWSER_BAR, PHONE, toBody, toLaptopBase, toLid } from './devices';

function isInside(
	inner: { x: number; y: number; width: number; height: number },
	outer: { width: number; height: number }
) {
	return (
		inner.x >= 0 &&
		inner.y >= 0 &&
		inner.x + inner.width <= outer.width &&
		inner.y + inner.height <= outer.height
	);
}

describe('toBody', () => {
	test('an iPhone 16 is its 393 × 852 screen in an even frame, the page under its status bar', () => {
		const body = toBody('phone', 393, 852);
		expect(body.screen).toMatchObject({ width: 393, height: 852 });
		expect(body.screen.y).toBe(PHONE.bezel);
		expect(body.height).toBe(852 + 2 * PHONE.bezel);
		expect(body.screen.x * 2 + 393).toBe(body.width);
		expect(body.page).toEqual({ x: 0, y: 59, width: 393, height: 793 });
	});

	test('a laptop is as wide as its base, its screen centred in the lid, the page under the notch and browser bars', () => {
		const body = toBody('laptop', 1470, 956);
		const lid = toLid(1470, 956);
		const base = toLaptopBase(lid.width);
		expect(body.width).toBe(base.width);
		expect(body.height).toBe(lid.height + base.height);
		expect(body.screen.x + 1470 / 2).toBeCloseTo(body.width / 2, 5);
		expect(body.page.height).toBe(956 - 37 - BROWSER_BAR);
	});

	test('a monitor stands taller than its panel', () => {
		const body = toBody('desktop', 1920, 1080);
		expect(body.width).toBe(1920 + 28);
		expect(body.height).toBeGreaterThan(1080 + 48 + 150);
	});

	test('a window gives the page exactly the size asked for, with its address bar above', () => {
		const body = toBody('window', 600, 800);
		expect(body.page).toEqual({ x: 0, y: BROWSER_BAR, width: 600, height: 800 });
		expect(body).toMatchObject({ width: 602, height: 800 + BROWSER_BAR + 2 });
	});

	test('every screen sits inside its body and every page inside its screen', () => {
		for (const [kind, width, height] of [
			['phone', 393, 852],
			['tablet', 820, 1180],
			['laptop', 1470, 956],
			['desktop', 1920, 1080],
			['window', 500, 500]
		] as const) {
			const body = toBody(kind, width, height);
			expect(isInside(body.screen, body)).toBe(true);
			expect(isInside(body.page, body.screen)).toBe(true);
		}
	});
});

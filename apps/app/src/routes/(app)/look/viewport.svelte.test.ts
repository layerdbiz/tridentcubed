// The pages spread out in rows (#322). Justin, 2026-11-25: on a desktop "I want to see the whole screen filled up
// with pages. However much width and height we have, I want to distribute the preview pages throughout the whole
// thing", in Preview and beside the panels in Edit; on a phone four to a row fit across, "the left and right spacing
// match the top spacing from the header". What is checked is where the pages land on the screen.
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { Viewport, ZOOM_MAX, ZOOM_MIN } from './viewport.svelte';

// The report's page size and the space between pages and rows (report-preview.svelte).
const W = 595;
const H = 842;
const GAP = 48;
const PAGE = { width: W, height: H };

type ScreenType = { width: number; height: number; left?: number; top?: number; isLeft?: boolean };

function gridOf(pages: number, columns: number) {
	const across = Math.min(columns, pages);
	const rows = Math.ceil(pages / across);
	return { width: across * (W + GAP) - GAP, height: rows * (H + GAP) - GAP };
}

function rectOf(index: number, columns: number) {
	return {
		x: (index % columns) * (W + GAP),
		y: Math.floor(index / columns) * (H + GAP),
		width: W,
		height: H
	};
}

function viewportOf(screen: ScreenType) {
	const viewport = new Viewport();
	viewport.width = screen.width;
	viewport.height = screen.height;
	viewport.left = screen.left ?? 0;
	viewport.top = screen.top ?? 0;
	viewport.isLeft = screen.isLeft ?? false;
	return viewport;
}

// The pages laid out as the preview lays them: on a desktop as many to a row as fill the room best, on a phone four.
function spread(screen: ScreenType, pages = 29) {
	const viewport = viewportOf(screen);
	const columns = viewport.isWide ? viewport.columnsFor(pages, PAGE, GAP) : Math.min(4, pages);
	viewport.content = gridOf(pages, columns);
	viewport.fitAll(false);
	const width = viewport.content.width * viewport.zoom;
	const height = viewport.content.height * viewport.zoom;
	return {
		viewport,
		columns,
		start: viewport.x,
		end: viewport.x + width,
		top: viewport.y,
		bottom: viewport.y + height
	};
}

describe('the pages spread out in rows', () => {
	// The tests run in Node, which has no animation frames; the fits ask for none when not animated.
	beforeAll(() => {
		vi.stubGlobal('requestAnimationFrame', () => 0);
		vi.stubGlobal('cancelAnimationFrame', () => {});
	});

	it('show every page at once in Preview on a desktop, filling the screen', () => {
		const { viewport, start, end, top, bottom } = spread({ width: 1700, height: 860 });
		const room = viewport.room;
		// Clear of the zoom bar at the right (20 px in, 48 px wide) and the bar at the bottom, and centred.
		expect(room.x + room.width).toBeLessThanOrEqual(1700 - 68);
		expect(room.y + room.height).toBeLessThanOrEqual(860 - 80);
		expect(start).toBeGreaterThanOrEqual(room.x - 0.001);
		expect(end).toBeLessThanOrEqual(room.x + room.width + 0.001);
		expect(top).toBeGreaterThanOrEqual(room.y - 0.001);
		expect(bottom).toBeLessThanOrEqual(room.y + room.height + 0.001);
		expect(start - room.x).toBeCloseTo(room.x + room.width - end, 5);
		expect(top - room.y).toBeCloseTo(room.y + room.height - bottom, 5);
		// It reaches the room's edges one way or the other: across or down.
		const isAcross = Math.abs(end - start - room.width) < 0.001;
		const isDown = Math.abs(bottom - top - room.height) < 0.001;
		expect(isAcross || isDown).toBe(true);
	});

	it('choose the number to a row that draws the pages biggest', () => {
		const { viewport, columns } = spread({ width: 1700, height: 860 });
		const room = viewport.room;
		const zoomAt = (across: number) => {
			const grid = gridOf(29, across);
			return Math.min(room.width / grid.width, room.height / grid.height);
		};
		for (let across = 1; across <= 29; across++)
			expect(zoomAt(across)).toBeLessThanOrEqual(zoomAt(columns));
		expect(viewport.zoom).toBeCloseTo(zoomAt(columns), 5);
	});

	it('show every page at once beside the panels in Edit on a desktop', () => {
		const { viewport, start, end, top, bottom } = spread({
			width: 1700,
			height: 860,
			left: 444,
			isLeft: true
		});
		const room = viewport.room;
		expect(start).toBe(444 + 24);
		expect(end).toBeLessThanOrEqual(1700 - 68);
		// No room left over at the right that another page to a row could take.
		expect(room.x + room.width - end).toBeLessThan((W + GAP) * viewport.zoom);
		expect(top).toBeGreaterThanOrEqual(room.y - 0.001);
		expect(bottom).toBeLessThanOrEqual(room.y + room.height + 0.001);
	});

	it('take the width beside the panels when one number to a row draws them as big as another', () => {
		// 14 pages: five or six to a row both make three rows of the same size; six reach further across.
		const { viewport, end } = spread({ width: 1700, height: 860, left: 444, isLeft: true }, 14);
		const room = viewport.room;
		expect(room.x + room.width - end).toBeLessThan((W + GAP) * viewport.zoom);
	});

	it('sit four to a row inside a phone screen, the space above them the same as at each side', () => {
		for (const width of [360, 390, 430]) {
			const { start, end, top, columns } = spread({ width, height: 664, top: 70 });
			expect(columns).toBe(4);
			expect(start).toBeGreaterThan(0);
			expect(width - end).toBeCloseTo(start, 5);
			expect(top - 70).toBeCloseTo(start, 5);
		}
	});

	it('are never drawn past their own size when the report is short', () => {
		const { viewport } = spread({ width: 2560, height: 1300 }, 2);
		expect(viewport.zoom).toBeLessThanOrEqual(1);
	});

	it('stay where they are when an open panel lights a page already on screen', () => {
		const { viewport, columns } = spread({ width: 1700, height: 860, left: 444, isLeft: true });
		const at = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
		viewport.focus(rectOf(14, columns), false);
		expect({ x: viewport.x, y: viewport.y, zoom: viewport.zoom }).toEqual(at);
	});

	it('bring a page further down up on a phone, keeping their place across', () => {
		const { viewport, start } = spread({ width: 390, height: 664, top: 70 });
		const rect = rectOf(24, 4);
		viewport.focus(rect, false);
		expect(viewport.x).toBe(start);
		expect(viewport.y + rect.y * viewport.zoom).toBeCloseTo(70 + 24, 5);
	});

	it('give way to one page centred across when they are stacked again on a phone', () => {
		const { viewport } = spread({ width: 390, height: 664, top: 70 });
		viewport.content = { width: W, height: 29 * (H + GAP) - GAP };
		viewport.fitWidth({ x: 0, y: 0, width: W, height: H }, false);
		expect(viewport.x).toBe(24);
		expect(390 - (viewport.x + W * viewport.zoom)).toBeCloseTo(24, 5);
	});

	it('keep the zoom on the slider, so its knob shows where it is', () => {
		for (const width of [360, 390, 430, 1280, 1700, 2560]) {
			const { viewport } = spread({ width, height: 800 });
			expect(viewport.zoom).toBeGreaterThanOrEqual(ZOOM_MIN);
			expect(viewport.zoom).toBeLessThanOrEqual(ZOOM_MAX);
		}
	});
});

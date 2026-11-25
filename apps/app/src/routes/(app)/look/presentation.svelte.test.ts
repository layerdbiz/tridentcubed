// Presentation (#324; Justin, 2026-11-25): the report's pages one at a time. What is checked is what the person
// sees: which page shows after a tap, a swipe, the wheel, a key or auto-play, where the page sits on the screen, and
// which page a presentation opens at.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
	EVERY,
	Presentation,
	slideRoomOf,
	slideZoomOf,
	startOf,
	tapOf,
	turnOf
} from './presentation.svelte';

const PAGE = { width: 595, height: 842 };

function presentationOf(count: number, at = 0) {
	const presentation = new Presentation();
	presentation.count = count;
	presentation.start(at);
	return presentation;
}

describe('the room the page shown fills', () => {
	it('keeps room at either side on a desktop for the bar, and fits the page whole', () => {
		const room = slideRoomOf({ width: 1440, height: 900 }, true, 0, 96);
		expect(room).toEqual({ x: 140, y: 32, width: 1160, height: 740 });
		const zoom = slideZoomOf(room, PAGE);
		expect(PAGE.height * zoom).toBeCloseTo(740);
		expect(PAGE.width * zoom).toBeLessThanOrEqual(room.width);
	});

	it('fills a phone across with a slim edge, under the status bar and over the strip', () => {
		const room = slideRoomOf({ width: 390, height: 844 }, false, 47, 110);
		expect(room).toEqual({ x: 16, y: 63, width: 358, height: 623 });
		expect(PAGE.width * slideZoomOf(room, PAGE)).toBeCloseTo(358);
	});

	it('grows the page past its own size on a big screen', () => {
		const room = slideRoomOf({ width: 3840, height: 2160 }, true, 0, 96);
		expect(slideZoomOf(room, PAGE)).toBeGreaterThan(2);
	});
});

describe('turning the page by hand', () => {
	it('shows the next page for a tap on the right half and the one before for the left half', () => {
		expect(tapOf(300, 400)).toBe(1);
		expect(tapOf(100, 400)).toBe(-1);
	});

	it('turns a page dragged past a sixth of the screen, and puts back one dragged less', () => {
		expect(turnOf(-70, 0, 390)).toBe(1);
		expect(turnOf(70, 0, 390)).toBe(-1);
		expect(turnOf(-60, 0, 390)).toBe(0);
	});

	it('turns a flicked page however short the drag, the way it was flicked', () => {
		expect(turnOf(-20, -0.6, 390)).toBe(1);
		expect(turnOf(-200, 0.6, 390)).toBe(-1);
	});
});

describe('a presentation of 14 pages', () => {
	it('turns one page at a time and stops at the first and the last', () => {
		const presentation = presentationOf(14);
		presentation.turn(-1);
		expect(presentation.at).toBe(0);
		presentation.turn(1);
		presentation.turn(1);
		expect(presentation.at).toBe(2);
		presentation.go(20);
		expect(presentation.at).toBe(13);
	});

	it('shows a tapped page at once and slides a swiped one', () => {
		const presentation = presentationOf(14);
		presentation.turn(1);
		expect(presentation.isEased).toBe(false);
		presentation.grab();
		presentation.drag(-120);
		expect(presentation.offset).toBe(-120);
		presentation.release(1);
		expect(presentation.at).toBe(2);
		expect(presentation.offset).toBe(0);
		expect(presentation.isEased).toBe(true);
	});

	it('drags only a third as far past the last page, and springs back', () => {
		const presentation = presentationOf(14, 13);
		presentation.drag(-90);
		expect(presentation.offset).toBe(-30);
		presentation.release(1);
		expect(presentation.at).toBe(13);
		expect(presentation.offset).toBe(0);
	});

	it('goes a page for each notch of the mouse wheel, however fast it turns', () => {
		const presentation = presentationOf(14);
		presentation.wheel(100, 0);
		expect(presentation.at).toBe(1);
		presentation.wheel(300, 16);
		expect(presentation.at).toBe(4);
		presentation.wheel(-100, 32);
		expect(presentation.at).toBe(3);
	});

	it('adds up the small amounts a trackpad sends, and counts afresh after a pause', () => {
		const presentation = presentationOf(14);
		for (let time = 0; time < 4; time++) presentation.wheel(30, time * 16);
		expect(presentation.at).toBe(1);
		presentation.wheel(60, 2000);
		expect(presentation.at).toBe(1);
	});

	it('takes the arrows, Page Up and Down, the space bar, Home, End and K', () => {
		const presentation = presentationOf(14);
		expect(presentation.key('ArrowRight')).toBe(true);
		expect(presentation.key(' ')).toBe(true);
		expect(presentation.at).toBe(2);
		presentation.key('ArrowUp');
		expect(presentation.at).toBe(1);
		presentation.key('End');
		expect(presentation.at).toBe(13);
		presentation.key('Home');
		expect(presentation.at).toBe(0);
		expect(presentation.key('k')).toBe(true);
		expect(presentation.isPlaying).toBe(true);
		expect(presentation.key('x')).toBe(false);
		presentation.stop();
	});

	it('shows the last page when the report loses pages while it is shown', () => {
		const presentation = presentationOf(14, 12);
		presentation.count = 9;
		expect(presentation.at).toBe(8);
	});
});

describe('auto-play', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('turns a page every four seconds and stops at the last', () => {
		const presentation = presentationOf(3);
		presentation.play();
		vi.advanceTimersByTime(EVERY - 1);
		expect(presentation.at).toBe(0);
		vi.advanceTimersByTime(1);
		expect(presentation.at).toBe(1);
		vi.advanceTimersByTime(EVERY);
		expect(presentation.at).toBe(2);
		vi.advanceTimersByTime(EVERY);
		expect(presentation.at).toBe(2);
		expect(presentation.isPlaying).toBe(false);
	});

	it('starts again from the first page when played from the last', () => {
		const presentation = presentationOf(3, 2);
		presentation.play();
		expect(presentation.at).toBe(0);
		presentation.stop();
	});

	it('counts four seconds afresh after a tap, and waits while a finger is on the page', () => {
		const presentation = presentationOf(14);
		presentation.play();
		vi.advanceTimersByTime(3000);
		presentation.turn(1);
		vi.advanceTimersByTime(3000);
		expect(presentation.at).toBe(1);
		presentation.grab();
		expect(presentation.isHeld).toBe(true);
		vi.advanceTimersByTime(10_000);
		expect(presentation.at).toBe(1);
		presentation.release(0);
		vi.advanceTimersByTime(EVERY);
		expect(presentation.at).toBe(2);
		presentation.stop();
	});

	it('fades the bar once nothing has moved for a while, unless the pointer rests on it', () => {
		const presentation = presentationOf(14);
		vi.advanceTimersByTime(3000);
		expect(presentation.isIdle).toBe(true);
		presentation.wake();
		expect(presentation.isIdle).toBe(false);
		presentation.keep(true);
		vi.advanceTimersByTime(3000);
		expect(presentation.isIdle).toBe(false);
	});
});

describe('the page a presentation opens at', () => {
	const screen = { x: 0, y: 0, width: 1440, height: 900 };
	const column = Array.from({ length: 6 }, (_, index) => ({
		x: 0,
		y: index * 890,
		width: 595,
		height: 842
	}));

	it('is the first when every page is on the screen', () => {
		expect(startOf(column, { x: 600, y: 20, zoom: 0.1 }, screen)).toBe(0);
	});

	it('is the page in the middle of the screen when the pages are stacked and read', () => {
		// Zoomed to fit across, scrolled down to the third page.
		expect(startOf(column, { x: 422, y: -1700, zoom: 1 }, screen)).toBe(2);
	});
});

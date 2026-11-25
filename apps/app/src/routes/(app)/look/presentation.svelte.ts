// Presentation (#324; Justin, 2026-11-25): the report's pages one at a time, like a slideshow, the third way to lay
// out the preview beside Stack and Spread (the zoom bar's mode menu; Present is a play button). His choices from the
// prototype: a tap or click on the right half shows the next page and on the left half the one before, at once ("I
// want it to instantly show up"); a swipe or drag always slides with the finger, "real world motion", and turns the
// page when let go past a sixth of the way or flicked. The mouse wheel anywhere turns as many pages as it is turned,
// one notch a page. Auto-play shows each page four seconds and stops at the last. The bar fades when nothing moves.
import type { Attachment } from 'svelte/attachments';
import { tapOn, type RectType } from './viewport.svelte';

export type SizeType = { width: number; height: number };
// How the preview lays its pages out: one under another (Stack), spread out in rows (Spread), or one at a time.
export type LayoutType = 'column' | 'spread' | 'present';

// How long auto-play shows each page.
export const EVERY = 4000;
// A drag let go past this share of the screen, or flicked faster than this (pixels a millisecond), turns the page.
const FAR = 1 / 6;
const FLICK = 0.35;
// A press that moves less than this is a tap.
const TAP = 6;
// One notch of a mouse wheel, in most browsers.
const NOTCH = 100;
// How long the bar stays after the last move.
const IDLE = 2500;

// The room the page shown fills, whole. On a desktop room at either side, for the presentation bar at the right; on a
// phone a slim edge, with room under the page for its number. `above` and `below` are what the screen keeps at the
// top (a phone's status bar) and at the bottom (the strip of small pages).
export function slideRoomOf(screen: SizeType, isWide: boolean, above = 0, below = 0): RectType {
	const [top, side, bottom] = isWide ? [32, 140, 32] : [16, 16, 48];
	return {
		x: side,
		y: above + top,
		width: Math.max(1, screen.width - side * 2),
		height: Math.max(1, screen.height - above - top - bottom - below)
	};
}

// As big as the room allows, whole.
export function slideZoomOf(room: RectType, page: SizeType) {
	return Math.max(0.05, Math.min(room.width / page.width, room.height / page.height));
}

// Where a drag goes when let go: 1 the next page (dragged to the left), -1 the one before, 0 back into place. A flick
// goes the way it was flicked.
export function turnOf(distance: number, flick: number, size: number) {
	if (Math.abs(flick) > FLICK) return flick < 0 ? 1 : -1;
	if (Math.abs(distance) > size * FAR) return distance < 0 ? 1 : -1;
	return 0;
}

// A tap: on the left half the page before, on the right half the next.
export function tapOf(x: number, width: number) {
	return x < width / 2 ? -1 : 1;
}

// The page a presentation opens at: the first when every page is on the screen (spread out on a desktop), otherwise
// the one nearest the middle of the screen, the page being read. `screen` is the part of the screen the pages show in.
export function startOf(
	rects: RectType[],
	view: { x: number; y: number; zoom: number },
	screen: RectType
) {
	const shown = rects.map((rect) => ({
		left: view.x + rect.x * view.zoom,
		top: view.y + rect.y * view.zoom,
		width: rect.width * view.zoom,
		height: rect.height * view.zoom
	}));
	const isAll = shown.every(
		(rect) =>
			rect.left >= screen.x - 1 &&
			rect.top >= screen.y - 1 &&
			rect.left + rect.width <= screen.x + screen.width + 1 &&
			rect.top + rect.height <= screen.y + screen.height + 1
	);
	if (isAll) return 0;
	const middle = { x: screen.x + screen.width / 2, y: screen.y + screen.height / 2 };
	let nearest = 0;
	let least = Infinity;
	for (const [index, rect] of shown.entries()) {
		const away = Math.hypot(
			rect.left + rect.width / 2 - middle.x,
			rect.top + rect.height / 2 - middle.y
		);
		if (away < least) {
			least = away;
			nearest = index;
		}
	}
	return nearest;
}

const KEY_TURNS: Record<string, number> = {
	ArrowRight: 1,
	ArrowDown: 1,
	PageDown: 1,
	' ': 1,
	ArrowLeft: -1,
	ArrowUp: -1,
	PageUp: -1
};

export class Presentation {
	// The page shown, and how many there are.
	at = $state(0);
	#count = $state(0);
	// How far a finger has taken the pages from their place, and whether the next move slides (a swipe let go).
	offset = $state(0);
	isEased = $state(false);
	isPlaying = $state(false);
	// A finger is on the page while playing: the count to the next page waits.
	isHeld = $state(false);
	// Goes up each time the count to the next page starts again, so the ring round the play button starts again too.
	round = $state(0);
	isIdle = $state(false);
	// The pointer rests on the bar, which then stays.
	isKept = false;

	#playTimer: ReturnType<typeof setTimeout> | undefined;
	#idleTimer: ReturnType<typeof setTimeout> | undefined;
	#wheel = 0;
	#wheelAt = -Infinity;

	get count() {
		return this.#count;
	}

	// Fewer pages than before (the report changed while it is shown): the last one at most.
	set count(value: number) {
		this.#count = value;
		if (this.at > value - 1) this.at = Math.max(0, value - 1);
	}

	get isFirst() {
		return this.at <= 0;
	}

	get isLast() {
		return this.at >= this.count - 1;
	}

	#clamp(to: number) {
		return Math.max(0, Math.min(this.count - 1, to));
	}

	// Open at a page, still.
	start(at: number) {
		this.at = this.#clamp(at);
		this.offset = 0;
		this.isEased = false;
		this.wake();
	}

	// Show a page: at once, or sliding on from where a finger left the pages. Past the first or the last page the
	// pages go back into place.
	go(to: number, isEased = false) {
		this.at = this.#clamp(to);
		this.offset = 0;
		this.isEased = isEased;
		this.#restart();
	}

	turn(by: number) {
		this.go(this.at + by);
	}

	// A finger comes down: anything still sliding is put in place at once, and auto-play waits.
	grab() {
		this.isEased = false;
		this.offset = 0;
		this.hold();
	}

	// The pages follow the finger; past the first or the last page only a third as far.
	drag(distance: number) {
		const isEnd = (distance > 0 && this.isFirst) || (distance < 0 && this.isLast);
		this.isEased = false;
		this.offset = isEnd ? distance / 3 : distance;
	}

	// Let go: on to the page the drag points at, or back into place, sliding either way.
	release(turn: number) {
		this.go(this.at + turn, true);
	}

	// The mouse wheel or a trackpad: as many pages as it is turned. A turn the other way, or after a second's pause,
	// counts afresh, and so does one that would go past the first or the last page.
	wheel(amount: number, time: number) {
		if (Math.sign(amount) !== Math.sign(this.#wheel) || time - this.#wheelAt > 1000)
			this.#wheel = 0;
		this.#wheelAt = time;
		this.#wheel += amount;
		const turns = Math.trunc(this.#wheel / NOTCH);
		if (!turns) return;
		this.#wheel -= turns * NOTCH;
		const to = this.#clamp(this.at + turns);
		if (to === this.at) {
			this.#wheel = 0;
			return;
		}
		this.go(to);
	}

	// A key: the arrows, Page Up and Down and the space bar turn the page, Home and End go to the first and the last,
	// K plays or pauses. Says whether the key was one of them.
	key(key: string) {
		if (key === 'Home') this.go(0);
		else if (key === 'End') this.go(this.count - 1);
		else if (key === 'k' || key === 'K') this.toggle();
		else if (KEY_TURNS[key]) this.turn(KEY_TURNS[key]);
		else return false;
		return true;
	}

	// Auto-play. Played from the last page, it starts again from the first.
	play() {
		this.isPlaying = true;
		if (this.isLast) this.go(0);
		else this.#restart();
	}

	pause() {
		this.isPlaying = false;
		this.isHeld = false;
		clearTimeout(this.#playTimer);
	}

	toggle() {
		if (this.isPlaying) this.pause();
		else this.play();
	}

	hold() {
		if (!this.isPlaying) return;
		clearTimeout(this.#playTimer);
		this.isHeld = true;
	}

	// The count to the next page, from the start: after any turn, and after a hold.
	#restart() {
		clearTimeout(this.#playTimer);
		this.isHeld = false;
		if (!this.isPlaying) return;
		this.round += 1;
		this.#playTimer = setTimeout(() => {
			if (this.isLast) this.pause();
			else this.go(this.at + 1);
		}, EVERY);
	}

	resume() {
		if (this.isPlaying) this.#restart();
	}

	// Anything moves: the bar shows, and fades again once nothing has moved for a while.
	wake() {
		this.isIdle = false;
		clearTimeout(this.#idleTimer);
		this.#idleTimer = setTimeout(() => (this.isIdle = !this.isKept), IDLE);
	}

	keep(isKept: boolean) {
		this.isKept = isKept;
		this.wake();
	}

	// Leaving: nothing left running.
	stop() {
		this.pause();
		clearTimeout(this.#idleTimer);
		this.isIdle = false;
		this.isKept = false;
		this.offset = 0;
		this.isEased = false;
	}

	// The pages under a finger or the mouse, in place of the canvas's own gestures.
	swipe: Attachment<HTMLElement> = (element) => swipeOf(this, element);

	// While presenting: the wheel anywhere on the screen, and the bar waking with any move.
	controls: Attachment<HTMLElement> = (element) => controlsOf(this, element);
}

function swipeOf(presentation: Presentation, element: HTMLElement) {
	let press:
		| {
				id: number;
				x: number;
				y: number;
				target: EventTarget | null;
				isMoved: boolean;
				samples: { x: number; t: number }[];
		  }
		| undefined;

	function down(event: PointerEvent) {
		if (
			press ||
			event.button !== 0 ||
			(event.target as HTMLElement).closest('button, input, [data-no-pan]')
		)
			return;
		element.setPointerCapture(event.pointerId);
		press = {
			id: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			target: event.target,
			isMoved: false,
			samples: [{ x: event.clientX, t: event.timeStamp }]
		};
		presentation.grab();
	}

	function move(event: PointerEvent) {
		if (!press || event.pointerId !== press.id) return;
		if (!press.isMoved && Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP)
			press.isMoved = true;
		if (!press.isMoved) return;
		presentation.drag(event.clientX - press.x);
		press.samples.push({ x: event.clientX, t: event.timeStamp });
		press.samples = press.samples.filter((sample) => event.timeStamp - sample.t < 100);
	}

	function up(event: PointerEvent) {
		if (!press || event.pointerId !== press.id) return;
		const done = press;
		press = undefined;
		if (event.type === 'pointercancel') return presentation.release(0);
		if (!done.isMoved) {
			// A tap on a contents line opens its page (#301) in place of turning one.
			if (tapOn(done.target)) return;
			const box = element.getBoundingClientRect();
			return presentation.turn(tapOf(event.clientX - box.left, box.width));
		}
		const first = done.samples[0];
		const last = done.samples.at(-1) ?? first;
		const flick = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
		presentation.release(turnOf(event.clientX - done.x, flick, element.clientWidth));
	}

	// A long press must not open the image menu, and an image must not start a native drag.
	function stop(event: Event) {
		event.preventDefault();
	}

	element.addEventListener('pointerdown', down);
	element.addEventListener('pointermove', move);
	element.addEventListener('pointerup', up);
	element.addEventListener('pointercancel', up);
	element.addEventListener('contextmenu', stop);
	element.addEventListener('dragstart', stop);
	return () => {
		element.removeEventListener('pointerdown', down);
		element.removeEventListener('pointermove', move);
		element.removeEventListener('pointerup', up);
		element.removeEventListener('pointercancel', up);
		element.removeEventListener('contextmenu', stop);
		element.removeEventListener('dragstart', stop);
	};
}

function controlsOf(presentation: Presentation, element: HTMLElement) {
	function wheel(event: WheelEvent) {
		if (event.ctrlKey || event.metaKey) return;
		event.preventDefault();
		// Counted in lines (Firefox: three to a notch) or in screens, a notch is still a page.
		const unit = event.deltaMode === 1 ? NOTCH / 3 : event.deltaMode === 2 ? NOTCH : 1;
		const amount = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
		presentation.wheel(amount * unit, event.timeStamp);
		presentation.wake();
	}

	function wake() {
		presentation.wake();
	}

	// A hidden tab waits, and starts the count again when it is shown.
	function visibility() {
		if (document.hidden) presentation.hold();
		else presentation.resume();
	}

	element.addEventListener('wheel', wheel, { passive: false });
	window.addEventListener('pointermove', wake, { passive: true });
	window.addEventListener('pointerdown', wake, { passive: true });
	document.addEventListener('visibilitychange', visibility);
	return () => {
		element.removeEventListener('wheel', wheel);
		window.removeEventListener('pointermove', wake);
		window.removeEventListener('pointerdown', wake);
		document.removeEventListener('visibilitychange', visibility);
	};
}

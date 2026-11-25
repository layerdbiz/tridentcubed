// PROTOTYPE (#161): a free canvas for the report preview, in the spirit of Svelte Flow and Figma. Drag anywhere to
// move (it glides on after you let go), scroll or two-finger swipe to pan in any direction, Ctrl or Cmd + scroll,
// pinch or double-click to zoom where you point. Everything moves one transform on a layer the browser keeps ready,
// so a drag starts at once (Justin's note 35); after a zoom settles the layer is redrawn sharp at the new size.
import type { Attachment } from 'svelte/attachments';

export type RectType = { x: number; y: number; width: number; height: number };

// Low enough for four pages to a row to fit across a phone (#322).
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 3;

// The space kept around the pages spread out in rows (#322). On a phone a slim edge, the same above as at the sides.
// On a desktop, room at the right for the zoom bar (20 px in, 48 px wide) and the same at the left so they sit
// centred, room at the bottom for the bar there, and a little at the top. Next to the panels they start just past them.
const EDGE = 16;
const EDGE_WIDE = 88;
const EDGE_TOP = 32;
const EDGE_PANELS = 24;
// Where the zoom bar moves from the phone's bottom corner to the desktop's right edge (Tailwind's `md`).
const WIDE = 768;

// A press that moves less than this is a tap.
const TAP = 6;

/**
 * A tap on something on a page that answers one (`data-tap`: a line of the Table of Contents, #301) clicks it. Such
 * a thing is not left out of the moves the way a button is, so the pages still move from a drag that starts on it,
 * and the click it would get after a press the pages took is given to it here. Whether one was tapped.
 */
export function tapOn(target: EventTarget | null) {
	const tapped = target instanceof Element ? target.closest<HTMLElement>('[data-tap]') : null;
	tapped?.click();
	return Boolean(tapped);
}

function clampZoom(zoom: number) {
	return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export class Viewport {
	x = $state(0);
	y = $state(0);
	zoom = $state(0.6);
	width = $state(0);
	height = $state(0);
	isAnimating = $state(false);
	isMoving = $state(false);
	// Off for one frame after a zoom settles, so the browser redraws the pages sharp at the new size.
	isLayered = $state(true);
	content = { width: 1, height: 1 };
	// Room taken by things floating over the canvas: the panels column on the left (desktop), the blurred header on
	// top (phone). Fits and focus centre in what is left. Nothing is kept on the right: the page centres fully and
	// the zoom bar floats over the canvas (note 27).
	left = 0;
	top = 0;
	right = 0;
	// Beside a column of panels the pages start from the left, next to it, in place of centring (Justin,
	// 2026-11-16).
	isLeft = false;

	#animationTimer: ReturnType<typeof setTimeout> | undefined;
	#sharpTimer: ReturnType<typeof setTimeout> | undefined;
	#glide = 0;

	#sharpen() {
		clearTimeout(this.#sharpTimer);
		this.#sharpTimer = setTimeout(() => {
			this.isLayered = false;
			requestAnimationFrame(() => requestAnimationFrame(() => (this.isLayered = true)));
		}, 260);
	}

	transform = $derived(`translate3d(${this.x}px, ${this.y}px, 0) scale(${this.zoom})`);

	// Ease programmatic moves (buttons, slider, following a panel); direct drags stay 1:1 with the finger.
	#animate(isAnimated: boolean) {
		cancelAnimationFrame(this.#glide);
		clearTimeout(this.#animationTimer);
		this.isAnimating = isAnimated;
		if (isAnimated) this.#animationTimer = setTimeout(() => (this.isAnimating = false), 460);
	}

	// Keep at least a corner of the pages on screen, so the report can never be lost off the edge.
	#clamp() {
		const keep = 96;
		const right = this.width - keep;
		const left = keep - this.content.width * this.zoom;
		const bottom = this.height - keep;
		const top = keep - this.content.height * this.zoom;
		this.x = Math.min(right, Math.max(left, this.x));
		this.y = Math.min(bottom, Math.max(top, this.y));
	}

	panBy(dx: number, dy: number, isAnimated = false) {
		this.#animate(isAnimated);
		this.x += dx;
		this.y += dy;
		this.#clamp();
	}

	zoomTo(
		next: number,
		cx = this.left + (this.width - this.left) / 2,
		cy = this.height / 2,
		isAnimated = true
	) {
		this.#animate(isAnimated);
		const zoom = clampZoom(next);
		if (zoom !== this.zoom) this.#sharpen();
		const px = (cx - this.x) / this.zoom;
		const py = (cy - this.y) / this.zoom;
		this.zoom = zoom;
		this.x = cx - px * zoom;
		this.y = cy - py * zoom;
		this.#clamp();
	}

	zoomBy(factor: number) {
		this.zoomTo(this.zoom * factor);
	}

	// Put the canvas exactly here, past the edges too: a presentation lays its pages a screen apart (#324).
	moveTo(x: number, y: number, zoom: number, isAnimated = false) {
		this.#animate(isAnimated);
		if (zoom !== this.zoom) this.#sharpen();
		this.x = x;
		this.y = y;
		this.zoom = zoom;
	}

	// Bring one page to the top of the view, zooming out first if it would not fit across. A page already wholly on
	// screen stays where it is, and one wholly in view across only moves up, so pages spread out in rows keep their
	// place (#322).
	focus(rect: RectType, isAnimated = true) {
		const room = this.width - this.left - this.right;
		const fits = (room - 48) / rect.width;
		const x = this.x + rect.x * this.zoom;
		const y = this.y + rect.y * this.zoom;
		const isAcross =
			this.zoom <= fits && x >= this.left && x + rect.width * this.zoom <= this.width - this.right;
		const isDown = y >= this.top && y + rect.height * this.zoom <= this.height;
		if (isAcross && isDown) return;
		this.#animate(isAnimated);
		if (this.zoom > fits) {
			this.zoom = clampZoom(fits);
			this.#sharpen();
		}
		this.#place(rect, !isAcross);
	}

	fitWidth(rect: RectType, isAnimated = true) {
		this.#animate(isAnimated);
		this.zoom = clampZoom(Math.min(1, (this.width - this.left - this.right - 48) / rect.width));
		this.#sharpen();
		this.#place(rect);
	}

	// Put one page at the top of the view, and across next to the panels or centred.
	#place(rect: RectType, isAcross = true) {
		if (isAcross) {
			const room = this.width - this.left - this.right;
			const gap = this.isLeft ? 24 : (room - rect.width * this.zoom) / 2;
			this.x = this.left + gap - rect.x * this.zoom;
		}
		this.y = this.top + 24 - rect.y * this.zoom;
		this.#clamp();
	}

	// A desktop: the zoom bar stands at the right edge and the pages spread out fill the screen both ways.
	get isWide() {
		return this.width >= WIDE;
	}

	// The room the pages spread out in rows fill (#322).
	get room(): RectType {
		const side = this.isWide ? EDGE_WIDE : EDGE;
		const before = this.isLeft ? EDGE_PANELS : side;
		const above = this.isWide ? EDGE_TOP : EDGE;
		const below = this.isWide ? EDGE_WIDE : EDGE;
		return {
			x: this.left + before,
			y: this.top + above,
			width: this.width - this.left - this.right - before - side,
			height: this.height - this.top - above - below
		};
	}

	// How many pages to a row show every page in the room as big as they can be (#322; a desktop's choice). When two
	// draw them the same size, the one with more to a row, which reaches further across the room.
	columnsFor(count: number, page: { width: number; height: number }, gap: number) {
		const room = this.room;
		let best = 1;
		let bestZoom = 0;
		for (let across = 1; across <= count; across++) {
			const rows = Math.ceil(count / across);
			const zoom = Math.min(
				room.width / (across * (page.width + gap) - gap),
				room.height / (rows * (page.height + gap) - gap)
			);
			if (zoom >= bestZoom) {
				best = across;
				bestZoom = zoom;
			}
		}
		return best;
	}

	// The pages spread out in rows fill the room (#322; Justin, 2026-11-25: "I want to see the whole screen filled up
	// with pages"): on a desktop every page at once, centred both ways (run 11), or from the left beside the panels;
	// on a phone four to a row across the width, from the top, where reading starts (run 9 note 20). Never past the
	// pages' own size.
	fitAll(isAnimated = true) {
		this.#animate(isAnimated);
		const room = this.room;
		const across = room.width / this.content.width;
		const fit = this.isWide ? Math.min(across, room.height / this.content.height) : across;
		this.zoom = clampZoom(Math.min(1, fit));
		this.#sharpen();
		const spareAcross = Math.max(0, room.width - this.content.width * this.zoom);
		const spareDown = Math.max(0, room.height - this.content.height * this.zoom);
		this.x = room.x + (this.isLeft ? 0 : spareAcross / 2);
		this.y = room.y + (this.isWide ? spareDown / 2 : 0);
	}

	glide(vx: number, vy: number) {
		let last = performance.now();
		const step = (now: number) => {
			const dt = Math.min(32, now - last);
			last = now;
			const decay = Math.pow(0.94, dt / 16);
			vx *= decay;
			vy *= decay;
			this.x += vx * dt;
			this.y += vy * dt;
			this.#clamp();
			if (Math.hypot(vx, vy) > 0.02) this.#glide = requestAnimationFrame(step);
		};
		this.#glide = requestAnimationFrame(step);
	}

	// Stop any glide or eased move, so a finger takes over at once.
	hold() {
		this.#animate(false);
	}

	gestures: Attachment<HTMLElement> = (element) => gesturesOf(this, element);
}

function gesturesOf(viewport: Viewport, element: HTMLElement) {
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { distance: number; zoom: number; mx: number; my: number } | undefined;
	let samples: { x: number; y: number; t: number }[] = [];
	// The one finger or button down, while it could still be a tap.
	let press: { x: number; y: number; target: EventTarget | null } | undefined;

	const local = (event: { clientX: number; clientY: number }) => {
		const box = element.getBoundingClientRect();
		return { x: event.clientX - box.left, y: event.clientY - box.top };
	};
	const middle = () => {
		const [a, b] = [...pointers.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
	};

	function down(event: PointerEvent) {
		if (
			event.button !== 0 ||
			(event.target as HTMLElement).closest('button, a:not([data-tap]), input, [data-no-pan]')
		)
			return;
		element.setPointerCapture(event.pointerId);
		pointers.set(event.pointerId, local(event));
		press = pointers.size === 1 ? { ...local(event), target: event.target } : undefined;
		viewport.hold();
		viewport.isMoving = true;
		samples = [{ ...local(event), t: event.timeStamp }];
		if (pointers.size === 2) {
			const mid = middle();
			pinch = { distance: mid.distance, zoom: viewport.zoom, mx: mid.x, my: mid.y };
		}
	}

	function move(event: PointerEvent) {
		const before = pointers.get(event.pointerId);
		if (!before) return;
		const now = local(event);
		pointers.set(event.pointerId, now);
		if (press && Math.hypot(now.x - press.x, now.y - press.y) > TAP) press = undefined;
		if (pointers.size === 2 && pinch) {
			const mid = middle();
			viewport.zoomTo(pinch.zoom * (mid.distance / pinch.distance), mid.x, mid.y, false);
			viewport.panBy(mid.x - pinch.mx, mid.y - pinch.my);
			pinch.mx = mid.x;
			pinch.my = mid.y;
			return;
		}
		viewport.panBy(now.x - before.x, now.y - before.y);
		samples.push({ ...now, t: event.timeStamp });
		samples = samples.filter((sample) => event.timeStamp - sample.t < 90);
	}

	function up(event: PointerEvent) {
		if (!pointers.delete(event.pointerId)) return;
		if (pointers.size < 2) pinch = undefined;
		if (pointers.size) return;
		viewport.isMoving = false;
		const tapped = event.type === 'pointerup' ? press : undefined;
		press = undefined;
		if (tapped && tapOn(tapped.target)) return;
		const first = samples[0];
		const last = samples[samples.length - 1];
		const dt = last && first ? last.t - first.t : 0;
		if (dt > 10 && event.timeStamp - last.t < 60)
			viewport.glide((last.x - first.x) / dt, (last.y - first.y) / dt);
	}

	function wheel(event: WheelEvent) {
		event.preventDefault();
		const unit = event.deltaMode === 1 ? 16 : 1;
		if (event.ctrlKey || event.metaKey) {
			const point = local(event);
			viewport.zoomTo(
				viewport.zoom * Math.exp(-event.deltaY * unit * 0.0022),
				point.x,
				point.y,
				false
			);
		} else if (event.shiftKey && !event.deltaX) viewport.panBy(-event.deltaY * unit, 0);
		else viewport.panBy(-event.deltaX * unit, -event.deltaY * unit);
	}

	// A long press must not open the image menu or select text, and an image must not start a native drag.
	function stop(event: Event) {
		event.preventDefault();
	}

	function dblclick(event: MouseEvent) {
		if ((event.target as HTMLElement).closest('button, a, input, [data-no-pan], [data-tap]'))
			return;
		const point = local(event);
		viewport.zoomTo(viewport.zoom < 0.95 ? 1 : viewport.zoom * 0.5, point.x, point.y);
	}

	element.addEventListener('pointerdown', down);
	element.addEventListener('pointermove', move);
	element.addEventListener('pointerup', up);
	element.addEventListener('pointercancel', up);
	element.addEventListener('wheel', wheel, { passive: false });
	element.addEventListener('dblclick', dblclick);
	element.addEventListener('contextmenu', stop);
	element.addEventListener('dragstart', stop);
	return () => {
		element.removeEventListener('contextmenu', stop);
		element.removeEventListener('dragstart', stop);
		element.removeEventListener('pointerdown', down);
		element.removeEventListener('pointermove', move);
		element.removeEventListener('pointerup', up);
		element.removeEventListener('pointercancel', up);
		element.removeEventListener('wheel', wheel);
		element.removeEventListener('dblclick', dblclick);
	};
}

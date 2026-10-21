// PROTOTYPE (#161): a free canvas for the report preview, in the spirit of Svelte Flow and Figma. Drag anywhere to
// move (it glides on after you let go), scroll or two-finger swipe to pan in any direction, Ctrl or Cmd + scroll,
// pinch or double-click to zoom where you point. Everything moves one transform on a layer the browser keeps ready,
// so a drag starts at once (Justin's note 35); after a zoom settles the layer is redrawn sharp at the new size.
import type { Attachment } from 'svelte/attachments';

export type RectType = { x: number; y: number; width: number; height: number };

export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 3;

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

	// Bring one page to the top of the view, zooming out first if it would not fit across.
	focus(rect: RectType, isAnimated = true) {
		this.#animate(isAnimated);
		const room = this.width - this.left - this.right;
		const fits = (room - 48) / rect.width;
		if (this.zoom > fits) {
			this.zoom = clampZoom(fits);
			this.#sharpen();
		}
		this.x = this.left + (room - rect.width * this.zoom) / 2 - rect.x * this.zoom;
		this.y = this.top + 24 - rect.y * this.zoom;
		this.#clamp();
	}

	fitWidth(rect: RectType, isAnimated = true) {
		this.zoom = clampZoom(Math.min(1, (this.width - this.left - this.right - 48) / rect.width));
		this.#sharpen();
		this.focus(rect, isAnimated);
	}

	fitAll(isAnimated = true) {
		this.#animate(isAnimated);
		const room = this.width - this.left - this.right;
		const tall = this.height - this.top;
		this.zoom = clampZoom(
			Math.min((room - 64) / this.content.width, (tall - 64) / this.content.height)
		);
		this.#sharpen();
		this.x = this.left + (room - this.content.width * this.zoom) / 2;
		this.y = this.top + (tall - this.content.height * this.zoom) / 2;
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
			(event.target as HTMLElement).closest('button, a, input, [data-no-pan]')
		)
			return;
		element.setPointerCapture(event.pointerId);
		pointers.set(event.pointerId, local(event));
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
		if ((event.target as HTMLElement).closest('button, a, input, [data-no-pan]')) return;
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

// The live canvas of one shell page (#342): its pan and scale as runes, moved by drag, wheel, pinch and the zoom
// buttons. The numbers come from viewport.ts; this class only holds them and the gesture in progress.
import {
	toFit,
	toPinch,
	toZoom,
	type PinchStartType,
	type SizeType,
	type ViewType
} from './viewport';

/** Pixels kept clear around the frames when they are fitted. */
const EDGE = 24;

export class Canvas {
	scale = $state(1);
	x = $state(0);
	y = $state(0);
	/** True while the view is the fitted one, so a resize can fit again without undoing the viewer's zoom. */
	isFitted = $state(true);
	stage: SizeType = { width: 1, height: 1 };
	content: SizeType = { width: 1, height: 1 };
	/** Pixels on the right that the open controls panel covers, left out when fitting. */
	inset = 0;
	#origin = { left: 0, top: 0 };
	#pinch: PinchStartType | null = null;
	#glide = 0;

	get view(): ViewType {
		return { scale: this.scale, x: this.x, y: this.y };
	}

	/** Where the stage sits on the screen, so screen points can be turned into stage points. */
	measure(stage: HTMLElement) {
		const rect = stage.getBoundingClientRect();
		this.#origin = { left: rect.left, top: rect.top };
		this.stage = { width: rect.width, height: rect.height };
	}

	set(view: ViewType, isFitted = false) {
		this.scale = view.scale;
		this.x = view.x;
		this.y = view.y;
		this.isFitted = isFitted;
	}

	fit() {
		this.stopGlide();
		const room = { width: Math.max(1, this.stage.width - this.inset), height: this.stage.height };
		this.set(toFit(room, this.content, EDGE), true);
	}

	/** Zoom to `next` around a point on the screen (clientX, clientY). */
	zoomAt(next: number, clientX: number, clientY: number) {
		this.stopGlide();
		this.set(toZoom(this.view, next, clientX - this.#origin.left, clientY - this.#origin.top));
	}

	/** Zoom by a factor around the stage's middle: the + and − buttons. */
	zoomBy(factor: number) {
		this.zoomAt(
			this.scale * factor,
			this.#origin.left + this.stage.width / 2,
			this.#origin.top + this.stage.height / 2
		);
	}

	panBy(dx: number, dy: number) {
		this.set({ scale: this.scale, x: this.x + dx, y: this.y + dy });
	}

	startPinch(clientX: number, clientY: number, distance: number) {
		this.stopGlide();
		this.#pinch = {
			view: this.view,
			x: clientX - this.#origin.left,
			y: clientY - this.#origin.top,
			distance
		};
	}

	movePinch(clientX: number, clientY: number, distance: number) {
		if (!this.#pinch) return;
		this.set(
			toPinch(this.#pinch, clientX - this.#origin.left, clientY - this.#origin.top, distance)
		);
	}

	endPinch() {
		this.#pinch = null;
	}

	get isPinching() {
		return this.#pinch !== null;
	}

	/** Keeps a flick moving and slows it down, as the app's Preview does. */
	glide(vx: number, vy: number) {
		this.stopGlide();
		let last = performance.now();
		const step = (now: number) => {
			const dt = Math.min(48, now - last);
			last = now;
			const fade = Math.pow(0.94, dt / 16);
			vx *= fade;
			vy *= fade;
			this.panBy(vx * dt, vy * dt);
			if (Math.hypot(vx, vy) > 0.02) this.#glide = requestAnimationFrame(step);
		};
		this.#glide = requestAnimationFrame(step);
	}

	stopGlide() {
		cancelAnimationFrame(this.#glide);
	}
}

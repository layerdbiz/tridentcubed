// Pinch to zoom ON a prototype (#361). A frame is a page of its own, so the fingers that land on it never reach the
// shell. The prototypes share the shell's address, so the shell listens inside each frame instead: two fingers
// (or Ctrl+wheel, or a Safari trackpad pinch) there are turned into screen points and zoom the whole canvas, as a
// pinch on the background does. One finger is left alone, so taps, scrolls and drags inside the prototype still work.

export type PinchTargetType = {
	scale: number;
	startPinch(clientX: number, clientY: number, distance: number): void;
	movePinch(clientX: number, clientY: number, distance: number): void;
	endPinch(): void;
	zoomAt(next: number, clientX: number, clientY: number): void;
};

type PointType = { clientX: number; clientY: number };

/** A point inside the frame, on the shell's screen: the frame is scaled with the canvas. */
export function toShellPoint(
	rect: { left: number; top: number; width: number; height: number },
	size: { width: number; height: number },
	point: PointType
): { x: number; y: number } {
	return {
		x: rect.left + point.clientX * (rect.width / Math.max(1, size.width)),
		y: rect.top + point.clientY * (rect.height / Math.max(1, size.height))
	};
}

/** Starts listening inside the frame; returns the function that stops. Does nothing for a page it cannot reach. */
export function forwardGestures(frame: HTMLIFrameElement, target: PinchTargetType): () => void {
	let win: Window | null = null;
	try {
		win = frame.contentWindow;
		void win?.document;
	} catch {
		return () => {};
	}
	if (!win) return () => {};
	const inner = win;

	let isTouchPinch = false;
	let isGesture = false;

	function toShell(point: PointType) {
		return toShellPoint(
			frame.getBoundingClientRect(),
			{ width: frame.clientWidth, height: frame.clientHeight },
			point
		);
	}

	function middle(touches: TouchList) {
		const a = toShell(touches[0]);
		const b = toShell(touches[1]);
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
	}

	function hold(event: Event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}

	function onTouchStart(event: TouchEvent) {
		if (event.touches.length < 2) return;
		hold(event);
		isTouchPinch = true;
		const point = middle(event.touches);
		target.startPinch(point.x, point.y, point.distance);
	}

	function onTouchMove(event: TouchEvent) {
		if (!isTouchPinch) return;
		hold(event);
		if (event.touches.length < 2) return;
		const point = middle(event.touches);
		target.movePinch(point.x, point.y, point.distance);
	}

	function onTouchEnd(event: TouchEvent) {
		if (!isTouchPinch || event.touches.length >= 2) return;
		isTouchPinch = false;
		target.endPinch();
	}

	// While two fingers are down, the prototype's own pointer handlers do not see them move, so it does not
	// pan or zoom itself at the same time.
	function onPointerMove(event: PointerEvent) {
		if (isTouchPinch && event.pointerType === 'touch') event.stopImmediatePropagation();
	}

	function onWheel(event: WheelEvent) {
		if (!event.ctrlKey) return;
		hold(event);
		const point = toShell(event);
		target.zoomAt(target.scale * Math.exp(-event.deltaY * 0.01), point.x, point.y);
	}

	// Safari's own pinch events: on a Mac trackpad they are the only sign of a pinch; on an iPhone they come with the
	// touches, which already do the work, so they are only stopped there.
	function onGestureStart(event: Event) {
		hold(event);
		if (isTouchPinch) return;
		isGesture = true;
		const point = toShell(event as unknown as PointType);
		target.startPinch(point.x, point.y, 1);
	}

	function onGestureChange(event: Event) {
		hold(event);
		if (!isGesture) return;
		const point = toShell(event as unknown as PointType);
		target.movePinch(point.x, point.y, (event as unknown as { scale: number }).scale);
	}

	function onGestureEnd(event: Event) {
		hold(event);
		if (!isGesture) return;
		isGesture = false;
		target.endPinch();
	}

	const options = { capture: true, passive: false };
	const listeners: [string, EventListener][] = [
		['touchstart', onTouchStart as EventListener],
		['touchmove', onTouchMove as EventListener],
		['touchend', onTouchEnd as EventListener],
		['touchcancel', onTouchEnd as EventListener],
		['pointermove', onPointerMove as EventListener],
		['wheel', onWheel as EventListener],
		['gesturestart', onGestureStart],
		['gesturechange', onGestureChange],
		['gestureend', onGestureEnd]
	];

	for (const [name, listener] of listeners) inner.addEventListener(name, listener, options);
	return () => {
		for (const [name, listener] of listeners) inner.removeEventListener(name, listener, options);
	};
}

<!-- The canvas the devices lie on (#342), like the app's Preview: fitted whole at first; drag glides on; scroll
     pans; Ctrl+wheel and pinch zoom; a tap on the background zooms 2x and again fits. Pinches that start on a
     prototype come in through its frame (pinch.ts) and land here the same way. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Canvas } from './canvas.svelte';
	import { toPixels } from './pinch';

	type StageProps = { canvas: Canvas; children: Snippet };

	let { canvas, children }: StageProps = $props();

	let stage: HTMLDivElement | undefined = $state();
	let isDragging = $state(false);

	const pointers = new Map<number, { x: number; y: number }>();
	let drag = {
		x: 0,
		y: 0,
		time: 0,
		startX: 0,
		startY: 0,
		startTime: 0,
		vx: 0,
		vy: 0,
		isMoved: false
	};

	$effect(() => {
		if (!stage) return;
		const target = stage;

		// The board lays the devices out again for the new room and fits them; here the stage only reports its size.
		const observer = new ResizeObserver(() => canvas.measure(target));
		observer.observe(target);

		// Wheel and Safari's pinch must be able to stop the page's own scroll and zoom, so they are not passive.
		function onWheel(event: WheelEvent) {
			event.preventDefault();
			canvas.measure(target);
			canvas.stopGlide();
			const dx = toPixels(event, event.deltaX);
			const dy = toPixels(event, event.deltaY);
			if (event.ctrlKey)
				canvas.zoomAt(canvas.scale * Math.exp(-dy * 0.01), event.clientX, event.clientY);
			else canvas.panBy(-dx, -dy);
		}
		let isGesture = false;
		function onGestureStart(event: Event) {
			event.preventDefault();
			if (pointers.size > 1) return;
			isGesture = true;
			const point = event as unknown as { clientX: number; clientY: number };
			canvas.measure(target);
			canvas.startPinch(point.clientX, point.clientY, 1);
		}
		function onGestureChange(event: Event) {
			event.preventDefault();
			if (!isGesture) return;
			const point = event as unknown as { clientX: number; clientY: number; scale: number };
			canvas.movePinch(point.clientX, point.clientY, point.scale);
		}
		function onGestureEnd(event: Event) {
			event.preventDefault();
			if (!isGesture) return;
			isGesture = false;
			canvas.endPinch();
		}
		const options = { passive: false };
		target.addEventListener('wheel', onWheel, options);
		target.addEventListener('gesturestart', onGestureStart, options);
		target.addEventListener('gesturechange', onGestureChange, options);
		target.addEventListener('gestureend', onGestureEnd, options);

		return () => {
			observer.disconnect();
			target.removeEventListener('wheel', onWheel);
			target.removeEventListener('gesturestart', onGestureStart);
			target.removeEventListener('gesturechange', onGestureChange);
			target.removeEventListener('gestureend', onGestureEnd);
		};
	});

	function middle() {
		const [a, b] = [...pointers.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
	}

	function onpointerdown(event: PointerEvent) {
		// Links and buttons (a device's name, its Open link) keep their own presses.
		if (!stage || (event.target as Element).closest('a, button')) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		stage.setPointerCapture(event.pointerId);
		canvas.measure(stage);
		canvas.stopGlide();
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		isDragging = true;

		if (pointers.size === 2) {
			const point = middle();
			canvas.startPinch(point.x, point.y, point.distance);
			drag.isMoved = true;
			return;
		}
		const now = performance.now();
		drag = {
			x: event.clientX,
			y: event.clientY,
			time: now,
			startX: event.clientX,
			startY: event.clientY,
			startTime: now,
			vx: 0,
			vy: 0,
			isMoved: false
		};
	}

	function onpointermove(event: PointerEvent) {
		if (!pointers.has(event.pointerId)) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (pointers.size >= 2) {
			const point = middle();
			canvas.movePinch(point.x, point.y, point.distance);
			return;
		}
		const now = performance.now();
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		const dt = Math.max(1, now - drag.time);
		drag.vx = drag.vx * 0.6 + (dx / dt) * 0.4;
		drag.vy = drag.vy * 0.6 + (dy / dt) * 0.4;
		drag.x = event.clientX;
		drag.y = event.clientY;
		drag.time = now;
		if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6)
			drag.isMoved = true;
		if (drag.isMoved) canvas.panBy(dx, dy);
	}

	function onpointerup(event: PointerEvent) {
		if (!pointers.has(event.pointerId)) return;
		pointers.delete(event.pointerId);

		if (pointers.size === 1) {
			// One finger of a pinch lifted: the other carries on as a drag from where it is.
			canvas.endPinch();
			const [rest] = [...pointers.values()];
			drag = { ...drag, x: rest.x, y: rest.y, time: performance.now(), vx: 0, vy: 0 };
			return;
		}
		if (pointers.size > 0) return;
		isDragging = false;
		canvas.endPinch();

		const isTap = !drag.isMoved && performance.now() - drag.startTime < 350;
		if (isTap && event.type === 'pointerup') {
			if (canvas.isFitted) canvas.zoomAt(canvas.scale * 2, event.clientX, event.clientY);
			else canvas.fit();
			return;
		}
		if (performance.now() - drag.time < 80 && Math.hypot(drag.vx, drag.vy) > 0.15)
			canvas.glide(drag.vx, drag.vy);
	}
</script>

<div
	class="stage"
	class:is-dragging={isDragging}
	bind:this={stage}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
	role="presentation"
>
	<div
		class="world"
		style:transform="translate({canvas.x}px, {canvas.y}px) scale({canvas.scale})"
	>
		{@render children()}
	</div>
</div>

<style>
	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		cursor: grab;
	}
	.stage.is-dragging {
		cursor: grabbing;
	}
	/* A drag that passes over a frame keeps going instead of being caught by the prototype. */
	.stage.is-dragging :global(iframe) {
		pointer-events: none;
	}
	.world {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		will-change: transform;
	}
</style>

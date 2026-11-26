<script lang="ts">
	// A photo in its box, framed by its crop (#312, glossary "Crop"; the look settled in the photo pop-up prototype
	// #286). With no crop it fills the box as `object-fit: cover` does. A crop zooms in from there around a point of
	// the photo, never leaving a gap, and the same crop draws every box the photo sits in (a square tile, the pop-up's
	// frame, a report spot), so a spot of another shape trims a little more. A cropped photo is placed in percentages
	// of its box, so the markup prints the same when the PDF draws it at another size.
	//
	// `cropping` shows the crop frame and changes `crop` (bind it): one finger or the mouse moves the photo; a pinch,
	// the wheel or a trackpad pinch zooms around the fingers or the pointer, up to 5x; a corner or an edge of the frame
	// pulls in, keeping its shape, and on letting go the frame grows back and the photo zooms to fill it with what it
	// held. The box is best given the photo's own shape (bind `shape`).
	//
	// It is the app's own for now. The old reason for that, a component from `@layerd/ui` bringing the library's global
	// styles that moved the edit panels about (#312), is gone: the form styles keep to the library's own fields (#315)
	// and its text styles to `.prose` (#371).
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { GRIPS, WHOLE } from './photo.constants';
	import type { CropType, GripType, RectType, SizeType } from './photo.types';
	import {
		framed,
		isWhole,
		keptIn,
		leastOf,
		movedBy,
		placeOf,
		pulledIn,
		toPlaceStyle,
		zoomedAt
	} from './photo.utils';

	let {
		src,
		alt = '',
		crossorigin = undefined,
		crop = $bindable(),
		cropping = false,
		shape = $bindable(),
		class: className = '',
		style = undefined,
		onerror = undefined,
		children = undefined
	}: {
		src: string;
		alt?: string;
		/** Passed to the img, so a canvas may read it (the PDF slims big photos). */
		crossorigin?: HTMLImgAttributes['crossorigin'];
		/** How the photo is framed in its box; none shows the whole photo filling it. */
		crop?: CropType;
		cropping?: boolean;
		/** The photo's own size, once it has loaded. */
		shape?: SizeType;
		/** The box's size and anything else about it. */
		class?: string;
		style?: string;
		/** The browser cannot draw the file (a HEIC in Chrome, #294), so its spot can show something else. */
		onerror?: () => void;
		/** Drawn over the photo, such as its description. */
		children?: Snippet;
	} = $props();

	const EASE_MS = 320;

	let width = $state(0);
	let height = $state(0);
	let frame = $state<RectType | null>(null);
	let isMoving = $state(false);
	let isEasing = $state(false);
	let easeTimer: ReturnType<typeof setTimeout> | undefined;

	const box = $derived({ width, height });
	const isReady = $derived(Boolean(shape) && width > 0 && height > 0);
	// A whole photo needs nothing measured; a cropped one is placed once its own size and its box's are known.
	const placeStyle = $derived(
		shape && isReady && (cropping || !isWhole(crop))
			? toPlaceStyle(placeOf(shape, box, crop ?? WHOLE), box)
			: ''
	);
	const imageClass = $derived(
		placeStyle ? 'absolute max-w-none' : 'absolute inset-0 size-full object-cover'
	);

	// The photo's own size, read when it loads (or at once, when it is already loaded).
	function readShape(image: HTMLImageElement) {
		function read() {
			if (!image.naturalWidth) return;
			if (shape?.width === image.naturalWidth && shape?.height === image.naturalHeight) return;
			shape = { width: image.naturalWidth, height: image.naturalHeight };
		}
		untrack(read);
		image.addEventListener('load', read);
		return () => image.removeEventListener('load', read);
	}

	function ease() {
		isEasing = true;
		clearTimeout(easeTimer);
		easeTimer = setTimeout(() => (isEasing = false), EASE_MS);
	}

	/** Brings back the whole photo, gliding to it. */
	export function reset() {
		ease();
		crop = undefined;
	}

	/** Zooms to `zoom` (1 to 5) around the middle of the box, as the zoom slider does. */
	export function zoomTo(zoom: number) {
		if (!shape || !isReady) return;
		crop = keptIn(shape, box, { ...(crop ?? WHOLE), zoom });
	}

	// A pointer's place in the box, in the box's own pixels.
	function pointIn(element: HTMLElement, clientX: number, clientY: number) {
		const rect = element.getBoundingClientRect();
		const ratio = rect.width / element.offsetWidth || 1;
		return { x: (clientX - rect.left) / ratio, y: (clientY - rect.top) / ratio };
	}

	function zoomAtClient(element: HTMLElement, factor: number, clientX: number, clientY: number) {
		if (!shape) return;
		crop = zoomedAt(shape, box, crop ?? WHOLE, factor, pointIn(element, clientX, clientY));
	}

	// The fingers down on the photo, and the grip of the frame being pulled with how far the finger sits from it.
	const fingers = new Map<number, { x: number; y: number }>();
	let sizing: {
		grip: GripType;
		pointerId: number;
		offsetX: number;
		offsetY: number;
		least: number;
	} | null = null;

	function onpointerdown(event: PointerEvent) {
		if (!cropping || !shape || !isReady || sizing) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		const root = event.currentTarget as HTMLElement;
		event.preventDefault();
		try {
			root.setPointerCapture(event.pointerId);
		} catch {
			// A pointer already gone cannot be held; its moves are not needed.
		}
		const grip = (event.target as HTMLElement).closest<HTMLElement>('[data-grip]')?.dataset.grip as
			| GripType
			| undefined;
		if (grip && !fingers.size) {
			const at = pointIn(root, event.clientX, event.clientY);
			const gripX = grip.includes('l') ? 0 : grip.includes('r') ? width : width / 2;
			const gripY = grip.includes('t') ? 0 : grip.includes('b') ? height : height / 2;
			sizing = {
				grip,
				pointerId: event.pointerId,
				offsetX: at.x - gripX,
				offsetY: at.y - gripY,
				least: leastOf(box, crop ?? WHOLE)
			};
			frame = { left: 0, top: 0, width, height };
			return;
		}
		fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		isMoving = true;
	}

	function onpointermove(event: PointerEvent) {
		if (!shape) return;
		const root = event.currentTarget as HTMLElement;
		if (sizing && event.pointerId === sizing.pointerId) {
			const at = pointIn(root, event.clientX, event.clientY);
			frame = pulledIn(
				sizing.grip,
				box,
				{ x: at.x - sizing.offsetX, y: at.y - sizing.offsetY },
				sizing.least
			);
			return;
		}
		const before = fingers.get(event.pointerId);
		if (!before) return;
		const now = { x: event.clientX, y: event.clientY };
		const other = [...fingers.entries()].find(([id]) => id !== event.pointerId)?.[1];
		fingers.set(event.pointerId, now);
		const ratio = root.getBoundingClientRect().width / root.offsetWidth || 1;
		if (!other) {
			crop = movedBy(
				shape,
				box,
				crop ?? WHOLE,
				(now.x - before.x) / ratio,
				(now.y - before.y) / ratio
			);
			return;
		}
		// Two fingers: the gap between them zooms around their middle, and the middle moving moves the photo.
		const gapBefore = Math.hypot(before.x - other.x, before.y - other.y);
		const gapNow = Math.hypot(now.x - other.x, now.y - other.y);
		const middleBefore = { x: (before.x + other.x) / 2, y: (before.y + other.y) / 2 };
		const middleNow = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 };
		if (gapBefore > 0) zoomAtClient(root, gapNow / gapBefore, middleNow.x, middleNow.y);
		crop = movedBy(
			shape,
			box,
			crop ?? WHOLE,
			(middleNow.x - middleBefore.x) / ratio,
			(middleNow.y - middleBefore.y) / ratio
		);
	}

	// Letting go of a grip: the frame grows back and the photo zooms in to fill it with what was framed.
	function onpointerup(event: PointerEvent) {
		if (sizing && event.pointerId === sizing.pointerId) {
			const rect = frame;
			sizing = null;
			frame = null;
			ease();
			if (shape && rect && rect.width < width * 0.995)
				crop = framed(shape, box, crop ?? WHOLE, rect);
			return;
		}
		if (!fingers.delete(event.pointerId) || fingers.size) return;
		isMoving = false;
	}

	// The wheel, a trackpad pinch (a wheel with ctrl) and Safari's gesture events zoom around the pointer. They are
	// held from the page only while cropping, so the wheel scrolls the page otherwise.
	function zoomGestures(root: HTMLElement) {
		let gestureScale = 1;
		function onwheel(event: WheelEvent) {
			if (!cropping || !isReady || sizing) return;
			event.preventDefault();
			const unit = event.deltaMode === 1 ? 16 : 1;
			zoomAtClient(
				root,
				Math.exp(-event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.0015)),
				event.clientX,
				event.clientY
			);
		}
		function ongesturestart(event: Event) {
			if (!cropping) return;
			event.preventDefault();
			gestureScale = 1;
		}
		function ongesturechange(event: Event) {
			if (!cropping || !isReady || sizing || fingers.size) return;
			event.preventDefault();
			const gesture = event as Event & { scale: number; clientX: number; clientY: number };
			zoomAtClient(root, gesture.scale / gestureScale, gesture.clientX, gesture.clientY);
			gestureScale = gesture.scale;
		}
		root.addEventListener('wheel', onwheel, { passive: false });
		root.addEventListener('gesturestart', ongesturestart);
		root.addEventListener('gesturechange', ongesturechange);
		return () => {
			root.removeEventListener('wheel', onwheel);
			root.removeEventListener('gesturestart', ongesturestart);
			root.removeEventListener('gesturechange', ongesturechange);
			clearTimeout(easeTimer);
		};
	}
</script>

<!-- The pointer is for a finger or the mouse; the zoom slider beside it does the same from the keyboard. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="photo relative select-none [-webkit-touch-callout:none] {cropping
		? 'touch-none'
		: 'overflow-hidden'} {cropping
		? isMoving
			? 'cursor-grabbing'
			: 'cursor-grab'
		: ''} {className}"
	class:is-cropping={cropping}
	class:is-easing={isEasing}
	{style}
	style:--l="{frame?.left ?? 0}px"
	style:--t="{frame?.top ?? 0}px"
	style:--r="{frame ? width - frame.left - frame.width : 0}px"
	style:--b="{frame ? height - frame.top - frame.height : 0}px"
	bind:clientWidth={width}
	bind:clientHeight={height}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
	{@attach zoomGestures}
>
	{#if cropping}
		<!-- The photo outside the frame, dimmed; a press on it moves the photo too. -->
		<span class="pointer-events-none absolute inset-0 opacity-30">
			<img
				{src}
				alt=""
				{crossorigin}
				draggable="false"
				class="photo-image pointer-events-auto {imageClass}"
				style={placeStyle}
			/>
		</span>
	{/if}
	<span class="photo-clip absolute inset-0 overflow-hidden">
		<img
			{src}
			{alt}
			{crossorigin}
			draggable="false"
			class="photo-image pointer-events-none {imageClass}"
			style={placeStyle}
			{onerror}
			{@attach readShape}
		/>
	</span>
	{#if cropping}
		<span
			class="photo-frame pointer-events-none absolute z-[2] border-[1.5px] border-dashed border-white/90"
		></span>
		{#each GRIPS as grip (grip)}
			<i
				class="photo-grip absolute z-[3] touch-none {grip.length === 2
					? 'is-corner'
					: 'is-edge'} is-{grip}"
				data-grip={grip}
				aria-hidden="true"
			></i>
		{/each}
	{/if}
	{@render children?.()}
</div>

<style>
	.is-cropping .photo-clip {
		z-index: 1;
		clip-path: inset(var(--t) var(--r) var(--b) var(--l));
	}
	.photo-frame {
		inset: var(--t) var(--r) var(--b) var(--l);
	}
	.is-easing .photo-image {
		transition:
			left 0.28s ease,
			top 0.28s ease,
			width 0.28s ease,
			height 0.28s ease;
	}
	.is-easing .photo-clip {
		transition: clip-path 0.28s ease;
	}
	.is-easing .photo-frame,
	.is-easing .photo-grip {
		transition:
			top 0.28s ease,
			right 0.28s ease,
			bottom 0.28s ease,
			left 0.28s ease;
	}

	/* The grips: each corner shows as a bold white bracket and takes hold over 48 px; each edge takes hold over a
	   36 px band without showing. */
	.is-corner {
		width: 24px;
		height: 24px;
		border: 0 solid white;
	}
	.is-corner::before {
		content: '';
		position: absolute;
		width: 48px;
		height: 48px;
	}
	.is-tl {
		left: calc(var(--l) - 3px);
		top: calc(var(--t) - 3px);
		border-left-width: 4px;
		border-top-width: 4px;
		cursor: nwse-resize;
	}
	.is-tr {
		right: calc(var(--r) - 3px);
		top: calc(var(--t) - 3px);
		border-right-width: 4px;
		border-top-width: 4px;
		cursor: nesw-resize;
	}
	.is-bl {
		left: calc(var(--l) - 3px);
		bottom: calc(var(--b) - 3px);
		border-left-width: 4px;
		border-bottom-width: 4px;
		cursor: nesw-resize;
	}
	.is-br {
		right: calc(var(--r) - 3px);
		bottom: calc(var(--b) - 3px);
		border-right-width: 4px;
		border-bottom-width: 4px;
		cursor: nwse-resize;
	}
	.is-tl::before {
		left: -25px;
		top: -25px;
	}
	.is-tr::before {
		right: -25px;
		top: -25px;
	}
	.is-bl::before {
		left: -25px;
		bottom: -25px;
	}
	.is-br::before {
		right: -25px;
		bottom: -25px;
	}
	.is-t,
	.is-b {
		left: calc(var(--l) + 24px);
		right: calc(var(--r) + 24px);
		height: 36px;
		cursor: ns-resize;
	}
	.is-l,
	.is-r {
		top: calc(var(--t) + 24px);
		bottom: calc(var(--b) + 24px);
		width: 36px;
		cursor: ew-resize;
	}
	.is-t {
		top: calc(var(--t) - 18px);
	}
	.is-b {
		bottom: calc(var(--b) - 18px);
	}
	.is-l {
		left: calc(var(--l) - 18px);
	}
	.is-r {
		right: calc(var(--r) - 18px);
	}
</style>

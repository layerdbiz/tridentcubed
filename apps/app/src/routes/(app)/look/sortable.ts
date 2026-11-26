// PROTOTYPE (#161) run 8: drag to reorder with no handle (Justin's notes 6 and 7). Items carry data-sort="<key>" and
// data-index; the part that drags (a panel's or a group's header, a whole photo) carries data-grip="<key>". A mouse
// drags once it moves a few pixels; a finger holds still for a moment first, so a swipe still scrolls and a tap still
// taps. The innermost grip wins, fields never start a drag, and the click a drag ends on is swallowed. Near the top or
// bottom of the scrolling view, the view scrolls along.
// Run 27 (Justin, 2026-11-12: "jitteriness ... shaking and blinking", everywhere things drag). It shook because the
// item never left the list: it swapped with whatever was under the finger, the swap slid that neighbour back under
// the finger, and they swapped again. Now a copy of the item is lifted out and follows the finger exactly, while the
// item itself stays in the list, faint, marking where it will land. A neighbour gives way only once the finger is
// past its middle, and never while it is still sliding, so nothing swaps back. On release the copy settles into the
// place and goes. Nothing is added to or taken from the item's own classes (taking `relative` off a photo is what
// lost its ⋮ after a drag).
// Zones (Justin, 2026-11-21: a photo dragged "from any photo group panel ... into another"). Inside its own list an
// item still gives way as it is dragged. Over another zone (an element carrying data-zone="<name>" and
// data-zone-id) nothing moves yet: the zone is marked with data-drop while the finger is over it, and on release
// the item is handed to it, at the item the finger is on or at its end. Nothing moves on the way there, so passing
// over the zones between never drops the item into them.
// Several photos (#402; Justin on #287, 2026-11-24). Holding a photo still, without dragging, starts selecting: a
// finger's hold lifts the photo as today, and let go there without a drag it is selected instead of dropped (a mouse
// held still does the same). A selected photo dragged takes the whole selection with it, shown as a stack of at most
// three with their count; it drops into any stage of any open photo panel, its own included, in the order the photos
// had, and a shut photo panel the stack rests on opens beside the one it came from.
import type { Attachment } from 'svelte/attachments';

export type ZonesType = {
	/** What the zones are called: every element with this data-zone takes a drop. */
	name: string;
	/** What the data-sort of an item starts with in any of the zones, to find the one a drop lands on. */
	items: string;
	/** A drop on another zone: where the item was in its own list, the id of the zone, and the place there. */
	ondrop: (from: number, zoneId: string, to: number | undefined) => void;
};

/** What a list of photos knows of the selection (#402). */
export type PickType = {
	/** Whether the photo at this place in the list is selected. */
	isPicked: (index: number) => boolean;
	/** The selected photos' tiles, in the order they sit. */
	tiles: () => HTMLElement[];
	/** A photo held still and let go without a drag: it is selected. */
	onhold: (index: number) => void;
	/** The selection let go on a group: its id, and the place there (none: its end). */
	ondropmany: (zoneId: string, to: number | undefined) => void;
	/** A shut photo panel the dragged selection rested on, to open. */
	onopen: (panelId: string) => void;
	/** A lift ended, dropped or not: until when the click it ends on is not a tap. */
	onend: (quietUntil: number) => void;
};

const HOLD_MS = 320;
const SLOP = 8;
const EDGE = 64;
const SETTLE_MS = 180;
// How long a dragged selection rests on a shut photo panel before it opens, and how far apart the stack's photos lie.
const OPEN_MS = 500;
const STACK = 3;
const STACK_STEP = 6;

function isSliding(node: HTMLElement) {
	return node.getAnimations().some((animation) => animation.playState === 'running');
}

function scrollerOf(node: HTMLElement) {
	for (let at = node.parentElement; at; at = at.parentElement) {
		const { overflowY } = getComputedStyle(at);
		if ((overflowY === 'auto' || overflowY === 'scroll') && at.scrollHeight > at.clientHeight)
			return at;
	}
	return undefined;
}

export function sortable(
	key: string,
	onmove: (from: number, to: number) => boolean | void,
	zones?: ZonesType,
	pick?: PickType
): Attachment<HTMLElement> {
	return (list) => {
		let from = -1;
		let item: HTMLElement | undefined;
		// The other zone the finger is over, which takes the item on release.
		let target: HTMLElement | undefined;
		// The copy that follows the finger, and where on it the finger took hold.
		let ghost: HTMLElement | undefined;
		let grab = { x: 0, y: 0 };
		let start = { x: 0, y: 0 };
		let point = { x: 0, y: 0 };
		let hold: ReturnType<typeof setTimeout> | undefined;
		let frame = 0;
		let isDragging = false;
		let scroller: HTMLElement | undefined;
		let quietUntil = 0;
		// #402: held still long enough to select; moved since the press; dragging the whole selection; the tiles it
		// takes; the shut panel it rests on.
		let isHeld = false;
		let hasMoved = false;
		let isMany = false;
		let picked: HTMLElement[] = [];
		let card: HTMLElement | undefined;
		let opening: ReturnType<typeof setTimeout> | undefined;

		// What is under the finger, seen through the copy that follows it: the copy lets the pointer through, but a library
		// field inside it takes the pointer for its own label (forms.css), and alone would be found (#388).
		function hitAt(x: number, y: number) {
			return document.elementsFromPoint(x, y).find((node) => !ghost?.contains(node));
		}

		function itemAt(x: number, y: number) {
			const hit = hitAt(x, y)?.closest<HTMLElement>(`[data-sort="${key}"]`);
			return hit && hit !== item && list.contains(hit) ? hit : undefined;
		}

		function place() {
			if (ghost)
				ghost.style.transform = `translate(${point.x - grab.x}px, ${point.y - grab.y}px) scale(1.03)`;
		}

		function reorder() {
			const over = itemAt(point.x, point.y);
			const to = Number(over?.dataset.index);
			if (!over || !item || Number.isNaN(to) || to === from) return;
			// A neighbour still sliding to its new place is left alone (the slide may be on a wrapper around it). Only a
			// slide that is running counts: one that has finished can stay listed on the element.
			const wrap = over.parentElement;
			if (isSliding(over) || (wrap && wrap !== list && isSliding(wrap))) return;
			const box = over.getBoundingClientRect();
			const own = item.getBoundingClientRect();
			// Beside it in a row (photos), the finger must pass its middle sideways; above or below, up or down.
			const isBeside = box.top < own.bottom - 4 && box.bottom > own.top + 4;
			const [at, middle] = isBeside
				? [point.x, box.left + box.width / 2]
				: [point.y, box.top + box.height / 2];
			if (to > from ? at < middle : at > middle) return;
			if (onmove(from, to) !== false) from = to;
		}

		// Marks the other zone the finger is over, and unmarks the one it left.
		function aim() {
			if (!zones) return;
			const selector = `[data-zone="${zones.name}"]`;
			const hit = hitAt(point.x, point.y)?.closest<HTMLElement>(selector);
			// A selection may drop into its own group too: it lands where it is let go.
			const next =
				hit && (isMany || hit !== list.closest(selector)) && !hit.closest('[data-frozen]')
					? hit
					: undefined;
			if (isMany) rest();
			if (next === target) return;
			target?.removeAttribute('data-drop');
			next?.setAttribute('data-drop', '');
			target = next;
		}

		// #402: a dragged selection resting on a shut photo panel opens it, beside the one it came from.
		function rest() {
			const over = hitAt(point.x, point.y)?.closest<HTMLElement>('[data-photo-card]');
			if (over === card) return;
			card?.removeAttribute('data-drop');
			clearTimeout(opening);
			card = over ?? undefined;
			if (!card) return;
			card.setAttribute('data-drop', '');
			const id = card.dataset.photoCard ?? '';
			opening = setTimeout(() => {
				card?.removeAttribute('data-drop');
				card = undefined;
				pick?.onopen(id);
			}, OPEN_MS);
		}

		// Where in the zone a drop lands: before the item the finger is on, or after it once past its middle.
		function placeIn(zone: HTMLElement) {
			if (!zones) return undefined;
			const over = hitAt(point.x, point.y)?.closest<HTMLElement>('[data-sort]');
			if (!over || !zone.contains(over) || !over.dataset.sort?.startsWith(zones.items))
				return undefined;
			const index = Number(over.dataset.index);
			if (Number.isNaN(index)) return undefined;
			const box = over.getBoundingClientRect();
			return index + (point.x > box.left + box.width / 2 ? 1 : 0);
		}

		function follow() {
			if (!isDragging) return;
			if (scroller) {
				const box = scroller.getBoundingClientRect();
				const step =
					point.y < box.top + EDGE
						? -(box.top + EDGE - point.y) / 4
						: point.y > box.bottom - EDGE
							? (point.y - (box.bottom - EDGE)) / 4
							: 0;
				if (step) {
					scroller.scrollTop += step;
					aim();
					if (!target && !isMany) reorder();
				}
			}
			frame = requestAnimationFrame(follow);
		}

		function lift() {
			// A mouse lifts by moving or by holding still, whichever comes first, and only once.
			clearTimeout(hold);
			if (!item || isDragging) return;
			isDragging = true;
			const box = item.getBoundingClientRect();
			grab = { x: point.x - box.left, y: point.y - box.top };
			// #402: a selected photo takes the selection with it, drawn as a stack of at most three, the one held on top.
			isMany = Boolean(pick?.isPicked(from));
			picked = isMany ? pick!.tiles() : [];
			if (isMany && !picked.includes(item)) picked = [item, ...picked];
			ghost = isMany ? stackOf(item, picked, box) : (item.cloneNode(true) as HTMLElement);
			ghost.removeAttribute('data-sort');
			ghost.setAttribute('aria-hidden', 'true');
			Object.assign(ghost.style, {
				position: 'fixed',
				left: '0',
				top: '0',
				width: `${box.width}px`,
				height: `${box.height}px`,
				margin: '0',
				zIndex: '400',
				pointerEvents: 'none',
				transition: 'none',
				animation: 'none',
				transformOrigin: `${grab.x}px ${grab.y}px`,
				willChange: 'transform',
				filter: 'drop-shadow(0 12px 24px rgb(15 23 42 / 0.25))'
			});
			(list.closest('.look') ?? document.body).append(ghost);
			place();
			for (const tile of isMany ? picked : [item]) tile.style.opacity = '0.3';
			scroller = scrollerOf(list);
			navigator.vibrate?.(10);
			frame = requestAnimationFrame(follow);
		}

		// The copy settles into the item's place, then goes.
		function drop() {
			const [node, copy, tiles] = [item, ghost, picked];
			ghost = undefined;
			if (!node || !copy) return;
			const box = node.getBoundingClientRect();
			copy.style.transition = `transform ${SETTLE_MS}ms ease-out`;
			copy.style.transform = `translate(${box.left}px, ${box.top}px)`;
			setTimeout(() => {
				copy.remove();
				node.style.opacity = '';
				for (const tile of tiles) tile.style.opacity = '';
			}, SETTLE_MS);
		}

		// Handed to another zone: the copy shrinks away where it was let go, since its item leaves this list.
		function hand(zone: HTMLElement) {
			const [node, copy] = [item, ghost];
			ghost = undefined;
			const to = placeIn(zone);
			if (copy) {
				copy.style.transition = `transform ${SETTLE_MS}ms ease-in, opacity ${SETTLE_MS}ms ease-in`;
				copy.style.transform = `translate(${point.x - grab.x}px, ${point.y - grab.y}px) scale(0.5)`;
				copy.style.opacity = '0';
				setTimeout(() => copy.remove(), SETTLE_MS);
			}
			if (node) node.style.opacity = '';
			// #402: the whole selection goes, in its order.
			if (isMany) {
				for (const tile of picked) tile.style.opacity = '';
				pick?.ondropmany(zone.dataset.zoneId ?? '', to);
				return;
			}
			zones?.ondrop(from, zone.dataset.zoneId ?? '', to);
		}

		function blockScroll(event: TouchEvent) {
			if (isDragging) event.preventDefault();
		}

		function swallow(event: Event) {
			event.stopPropagation();
			event.preventDefault();
		}

		// The tap a drag ends on would open or close what was dragged.
		function onclick(event: MouseEvent) {
			if (performance.now() < quietUntil) swallow(event);
		}

		function move(event: PointerEvent) {
			point = { x: event.clientX, y: event.clientY };
			const moved = Math.hypot(point.x - start.x, point.y - start.y);
			if (moved >= SLOP) hasMoved = true;
			if (!isDragging) {
				if (moved < SLOP) return;
				// A finger that moves before the hold is a scroll; a mouse that moves is a drag.
				if (event.pointerType === 'mouse') lift();
				else return end();
			}
			place();
			aim();
			if (!target && !isMany) reorder();
		}

		function end(event?: Event) {
			clearTimeout(hold);
			clearTimeout(opening);
			cancelAnimationFrame(frame);
			card?.removeAttribute('data-drop');
			card = undefined;
			// #402: held still and let go without a drag, the photo is selected and settles back. Only the click this
			// release makes is swallowed, so the taps that add the next photos count at once.
			const isPick = isDragging && isHeld && !hasMoved && event?.type === 'pointerup';
			if (isDragging) {
				quietUntil = performance.now() + (isPick ? 150 : 400);
				pick?.onend(quietUntil);
			}
			const zone = target;
			target?.removeAttribute('data-drop');
			target = undefined;
			// Only a release hands the item over: a drag that is cancelled leaves it where it was.
			if (isDragging && !isPick && zone && event?.type === 'pointerup') hand(zone);
			if (isPick) pick?.onhold(from);
			drop();
			isDragging = false;
			isHeld = false;
			hasMoved = false;
			isMany = false;
			picked = [];
			item = undefined;
			from = -1;
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', end);
			window.removeEventListener('pointercancel', end);
			window.removeEventListener('touchmove', blockScroll);
			window.removeEventListener('contextmenu', swallow);
		}

		function down(event: PointerEvent) {
			if (event.button !== 0) return;
			// A Sent or Complete project is read only (run 11).
			if (list.closest('[data-frozen]')) return;
			const target = event.target as HTMLElement;
			if (target.closest('input, select, textarea, [contenteditable], [data-no-drag]')) return;
			const grip = target.closest<HTMLElement>('[data-grip]');
			if (grip?.dataset.grip !== key) return;
			const found = grip.closest<HTMLElement>(`[data-sort="${key}"]`);
			if (!found || !list.contains(found)) return;
			item = found;
			from = Number(found.dataset.index);
			start = point = { x: event.clientX, y: event.clientY };
			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', end);
			window.addEventListener('pointercancel', end);
			if (event.pointerType !== 'mouse') {
				window.addEventListener('touchmove', blockScroll, { passive: false });
				window.addEventListener('contextmenu', swallow);
				hold = setTimeout(held, HOLD_MS);
			} else if (pick) hold = setTimeout(held, HOLD_MS);
		}

		// #402: held still. It lifts as today; let go without a drag, it is selected (`end`).
		function held() {
			isHeld = true;
			lift();
		}

		list.addEventListener('pointerdown', down);
		list.addEventListener('click', onclick, { capture: true });
		return () => {
			list.removeEventListener('pointerdown', down);
			list.removeEventListener('click', onclick, { capture: true });
			end();
			ghost?.remove();
		};
	};
}

// #402: the dragged selection: up to three of its photos, the one held on top and the next ones under it, each a
// little further up and to the right, with how many there are on the top one's corner.
function stackOf(item: HTMLElement, tiles: HTMLElement[], box: DOMRect) {
	const stack = document.createElement('div');
	const under = tiles.filter((tile) => tile !== item).slice(0, STACK - 1);
	for (const [depth, tile] of under.toReversed().entries()) {
		const layer = layerOf(tile);
		const step = (under.length - depth) * STACK_STEP;
		layer.style.transform = `translate(${step}px, ${-step}px) rotate(${step / 2}deg)`;
		stack.append(layer);
	}
	stack.append(layerOf(item));
	if (tiles.length > 1) {
		const count = document.createElement('span');
		count.textContent = String(tiles.length);
		count.className =
			'absolute -top-2.5 -right-2.5 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold text-surface shadow-md ring-2 ring-surface';
		stack.append(count);
	}
	Object.assign(stack.style, { width: `${box.width}px`, height: `${box.height}px` });
	return stack;
}

function layerOf(tile: HTMLElement) {
	const layer = tile.cloneNode(true) as HTMLElement;
	layer.removeAttribute('data-sort');
	Object.assign(layer.style, {
		position: 'absolute',
		inset: '0',
		width: '100%',
		height: '100%',
		margin: '0',
		opacity: '1',
		transition: 'none'
	});
	layer.querySelector('[data-no-drag]')?.remove();
	return layer;
}

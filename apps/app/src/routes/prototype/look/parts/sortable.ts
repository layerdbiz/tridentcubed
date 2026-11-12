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
import type { Attachment } from 'svelte/attachments';

const HOLD_MS = 320;
const SLOP = 8;
const EDGE = 64;
const SETTLE_MS = 180;

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
	onmove: (from: number, to: number) => boolean | void
): Attachment<HTMLElement> {
	return (list) => {
		let from = -1;
		let item: HTMLElement | undefined;
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

		function itemAt(x: number, y: number) {
			const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[data-sort="${key}"]`);
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
					reorder();
				}
			}
			frame = requestAnimationFrame(follow);
		}

		function lift() {
			if (!item) return;
			isDragging = true;
			const box = item.getBoundingClientRect();
			grab = { x: point.x - box.left, y: point.y - box.top };
			ghost = item.cloneNode(true) as HTMLElement;
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
			item.style.opacity = '0.3';
			scroller = scrollerOf(list);
			navigator.vibrate?.(10);
			frame = requestAnimationFrame(follow);
		}

		// The copy settles into the item's place, then goes.
		function drop() {
			const [node, copy] = [item, ghost];
			ghost = undefined;
			if (!node || !copy) return;
			const box = node.getBoundingClientRect();
			copy.style.transition = `transform ${SETTLE_MS}ms ease-out`;
			copy.style.transform = `translate(${box.left}px, ${box.top}px)`;
			setTimeout(() => {
				copy.remove();
				node.style.opacity = '';
			}, SETTLE_MS);
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
			if (!isDragging) {
				if (moved < SLOP) return;
				// A finger that moves before the hold is a scroll; a mouse that moves is a drag.
				if (event.pointerType === 'mouse') lift();
				else return end();
			}
			place();
			reorder();
		}

		function end() {
			clearTimeout(hold);
			cancelAnimationFrame(frame);
			if (isDragging) quietUntil = performance.now() + 400;
			drop();
			isDragging = false;
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
				hold = setTimeout(lift, HOLD_MS);
			}
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

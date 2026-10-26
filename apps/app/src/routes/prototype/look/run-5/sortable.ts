// PROTOTYPE (#161) run 8: drag to reorder with no handle (Justin's notes 6 and 7). Items carry data-sort="<key>" and
// data-index; the part that drags (a panel's or a group's header, a whole photo) carries data-grip="<key>". A mouse
// drags once it moves a few pixels; a finger holds still for a moment first, so a swipe still scrolls and a tap still
// taps. The innermost grip wins, fields never start a drag, and the click a drag ends on is swallowed. Near the top or
// bottom of the scrolling view, the view scrolls along.
import type { Attachment } from 'svelte/attachments';

const HOLD_MS = 320;
const SLOP = 8;
const EDGE = 64;
const LIFTED = ['scale-[1.02]', 'opacity-80', 'z-20', 'relative'];

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
		let start = { x: 0, y: 0 };
		let point = { x: 0, y: 0 };
		let hold: ReturnType<typeof setTimeout> | undefined;
		let frame = 0;
		let isDragging = false;
		let scroller: HTMLElement | undefined;
		let quietUntil = 0;

		function itemAt(x: number, y: number) {
			const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[data-sort="${key}"]`);
			return hit && list.contains(hit) ? hit : undefined;
		}

		function reorder() {
			const over = itemAt(point.x, point.y);
			const to = Number(over?.dataset.index);
			if (!over || Number.isNaN(to) || to === from) return;
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
			item.classList.add(...LIFTED);
			scroller = scrollerOf(list);
			navigator.vibrate?.(10);
			frame = requestAnimationFrame(follow);
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
			reorder();
		}

		function end() {
			clearTimeout(hold);
			cancelAnimationFrame(frame);
			if (isDragging) quietUntil = performance.now() + 400;
			item?.classList.remove(...LIFTED);
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
		};
	};
}

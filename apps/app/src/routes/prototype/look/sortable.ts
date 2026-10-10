// PROTOTYPE (#161): drag to reorder with a pointer, so it works with a finger on the phone too.
// Items carry data-sort="<key>" and data-index; the grip carries data-grip="<key>".
import type { Attachment } from 'svelte/attachments';

export function sortable(
	key: string,
	onmove: (from: number, to: number) => boolean | void
): Attachment {
	return (list) => {
		let from = -1;
		let dragged: HTMLElement | undefined;

		function itemAt(x: number, y: number) {
			const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[data-sort="${key}"]`);
			return hit && list.contains(hit) ? hit : undefined;
		}

		function move(event: PointerEvent) {
			const item = itemAt(event.clientX, event.clientY);
			const to = Number(item?.dataset.index);
			if (!item || Number.isNaN(to) || to === from) return;
			if (onmove(from, to) !== false) from = to;
		}

		function up() {
			from = -1;
			dragged?.classList.remove('opacity-60', 'scale-[0.98]');
			dragged = undefined;
			window.removeEventListener('pointermove', move);
		}

		function down(event: Event) {
			const grip = (event.target as HTMLElement).closest(`[data-grip="${key}"]`);
			const item = grip?.closest<HTMLElement>(`[data-sort="${key}"]`);
			if (!grip || !item || !list.contains(item)) return;
			event.preventDefault();
			from = Number(item.dataset.index);
			dragged = item;
			dragged.classList.add('opacity-60', 'scale-[0.98]');
			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', up, { once: true });
		}

		list.addEventListener('pointerdown', down);
		return () => {
			list.removeEventListener('pointerdown', down);
			up();
		};
	};
}

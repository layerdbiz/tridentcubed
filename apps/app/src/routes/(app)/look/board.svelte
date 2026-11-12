<script
	lang="ts"
	generics="T"
>
	// PROTOTYPE (#161): the board, the same on every page (Justin's run 12 note 7): a column per label, in the page's
	// order and colours (records.data.ts), each with its count; projects by state, customers by type, the team by
	// label, transport by Sea, Air, Rail and Road, facilities by kind. Something with two labels shows in both columns.
	// Columns run to the bottom of the screen and each scrolls on its own, fading out under the floating bar. A mouse
	// drags the board sideways from any part of a column but its cards; a finger swipes it.
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { FADE } from './look.data';
	import type { ColumnType } from './records.data';

	let {
		columns,
		card,
		keyOf
	}: {
		columns: (ColumnType & { items: T[] })[];
		card: Snippet<[T]>;
		keyOf: (item: T) => string;
	} = $props();

	const drag: Attachment<HTMLElement> = (board) => {
		let from: { x: number; left: number } | undefined;
		let isMoved = false;
		function down(event: PointerEvent) {
			if (event.pointerType !== 'mouse' || event.button !== 0) return;
			if ((event.target as HTMLElement).closest('[data-card], button, a')) return;
			from = { x: event.clientX, left: board.scrollLeft };
			isMoved = false;
		}
		function move(event: PointerEvent) {
			if (!from) return;
			const dx = event.clientX - from.x;
			if (!isMoved && Math.abs(dx) < 4) return;
			if (!isMoved) {
				isMoved = true;
				board.setPointerCapture(event.pointerId);
				board.style.scrollSnapType = 'none';
				board.style.cursor = 'grabbing';
			}
			board.scrollLeft = from.left - dx;
		}
		function up() {
			if (!from) return;
			from = undefined;
			board.style.scrollSnapType = '';
			board.style.cursor = '';
		}
		board.addEventListener('pointerdown', down);
		board.addEventListener('pointermove', move);
		board.addEventListener('pointerup', up);
		board.addEventListener('pointercancel', up);
		return () => {
			board.removeEventListener('pointerdown', down);
			board.removeEventListener('pointermove', move);
			board.removeEventListener('pointerup', up);
			board.removeEventListener('pointercancel', up);
		};
	};
</script>

<div
	class="flex h-full snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:scroll-px-0 md:px-0"
	data-swipe-ignore
	{@attach drag}
>
	{#each columns as column (column.label)}
		<div
			class="flex h-full w-80 shrink-0 snap-start flex-col rounded-t-3xl bg-slate-900/[0.035] p-2 pb-0"
		>
			<p class="flex shrink-0 items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-600">
				<span class="size-2 rounded-full {column.tone.bg}"></span>{column.label}
				<span
					class="ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold text-white tabular-nums {column
						.tone.bg}">{column.items.length}</span
				>
			</p>
			<div class="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pb-28 {FADE}">
				{#each column.items as item (keyOf(item))}
					<div
						class="touch-pan-y rounded-2xl bg-white ring-1 ring-slate-900/[0.06] transition hover:shadow-md"
						data-card
					>
						{@render card(item)}
					</div>
				{:else}
					<p class="px-2 py-4 text-center text-xs text-slate-400">Nothing here</p>
				{/each}
			</div>
		</div>
	{/each}
</div>

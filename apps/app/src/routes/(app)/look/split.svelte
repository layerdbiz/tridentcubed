<script lang="ts">
	// PROTOTYPE (#161) run 13: the dashboard's split, shared by the dashboard and every Page view (Justin, 2026-11-07:
	// a Page "uses that same pop-up panel from the bottom"). A top part, and under it a white sheet with round top
	// corners and a deep shadow that falls under the top part's cards. Drag the sheet's top (its handle, or anything
	// marked data-sheet-grip) and the top part follows; it rests at three heights, and a flick moves one rest. The
	// optional backdrop (a map, a photo) fills the whole width from the very top of the screen down behind the sheet's
	// round corners, and grows with the top part. The top part lets taps through to the backdrop: whatever in `head`
	// takes taps says so with pointer-events-auto. The sheet clips what it holds to its corners.
	// 2026-11-16 (Justin), a desktop: the picture is left as it is, with no fade to white, and runs down to a grey
	// line along the top of the lower part (`isLined`). The line is the handle: it turns blue under the pointer,
	// and dragging it up or down makes the lower part bigger or smaller, staying where it is let go.
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	let {
		head,
		backdrop,
		children,
		isWide,
		first = 0.35,
		sheetClass = '',
		backdropClass = '',
		isTight = false,
		isFlat = false,
		isLined = false,
		rest = $bindable(0),
		onsettle
	}: {
		head: Snippet;
		backdrop?: Snippet;
		children: Snippet;
		isWide: boolean;
		// The first rest, as a share of the screen's height.
		first?: number;
		sheetClass?: string;
		backdropClass?: string;
		// Tight: a shorter grip, so the sheet's heading sits higher. Flat: a plain white lower half with no rounding
		// or shadow (a desktop). Lined: a flat lower half is sized by dragging the grey line along its top.
		isTight?: boolean;
		isFlat?: boolean;
		isLined?: boolean;
		// Which of its three rests the sheet is at: 0 the highest, 2 the lowest. Whoever binds it can follow the sheet.
		rest?: number;
		// Each time the sheet is let go, wherever it comes to rest.
		onsettle?: () => void;
	} = $props();

	// How far the backdrop runs on under the sheet, past its round corners.
	const UNDER = 56;

	let innerHeight = $state(0);
	let sheetTop = $state<number>();
	let from = { y: 0, t: 0, top: 0 };
	const rests = $derived.by(() => {
		const low = Math.max(innerHeight * first, isWide ? 368 : 256);
		const high = Math.max(low, innerHeight - (isWide ? 116 : 108));
		return [low, (low + high) / 2, high];
	});
	// Where a desktop's line was let go; it stays there, with no rests to settle at.
	let held = $state<number>();
	const top = $derived(sheetTop ?? (isLined ? held : undefined) ?? rests[rest]);

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	function down(event: PointerEvent) {
		const target = event.target as HTMLElement;
		if ((isFlat && !isLined) || !target.closest('[data-sheet-handle], [data-sheet-grip]')) return;
		if (target.closest('button, a, input, select, textarea, [role="listbox"]')) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		from = { y: event.clientY, t: event.timeStamp, top };
		sheetTop = top;
	}

	function move(event: PointerEvent) {
		if (sheetTop === undefined) return;
		const [least, most] = isLined ? [160, innerHeight - 160] : [rests[0], rests[2]];
		sheetTop = clamp(from.top + event.clientY - from.y, least, most);
	}

	function up(event: PointerEvent) {
		if (sheetTop === undefined) return;
		if (isLined) {
			held = sheetTop;
			sheetTop = undefined;
			onsettle?.();
			return;
		}
		const at = sheetTop;
		const speed = (event.clientY - from.y) / Math.max(1, event.timeStamp - from.t);
		const nearest = rests.reduce(
			(best, value, index) => (Math.abs(value - at) < Math.abs(rests[best] - at) ? index : best),
			0
		);
		rest =
			speed > 0.5
				? Math.max(
						nearest,
						rests.findIndex((value) => value > at + 1)
					)
				: speed < -0.5
					? Math.min(
							nearest,
							rests.findLastIndex((value) => value < at - 1)
						)
					: nearest;
		if (rest < 0) rest = nearest;
		sheetTop = undefined;
		onsettle?.();
	}

	const drag: Attachment<HTMLElement> = (node) => {
		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
		};
	};

	const motion = $derived(sheetTop === undefined ? 'duration-300 ease-out' : 'duration-0');
</script>

<svelte:window bind:innerHeight />

<div class="relative flex h-full min-h-0 flex-col">
	{#if backdrop}
		<div
			class="absolute inset-x-0 top-0 overflow-hidden transition-[height] {motion} {backdropClass}"
			style="height: {top + UNDER}px"
		>
			{@render backdrop()}
		</div>
	{/if}
	<section
		class="pointer-events-none relative z-10 flex shrink-0 flex-col transition-[height] {motion}"
		style="height: {top}px"
	>
		{@render head()}
	</section>
	<section
		class="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-white {isFlat
			? ''
			: 'rounded-t-[40px] shadow-[0_-24px_70px_-8px_rgb(15_23_42/0.28)]'} {sheetClass}"
		{@attach drag}
	>
		{#if isLined}
			<!-- A desktop's handle: a grey line that turns blue under the pointer and drags up and down. -->
			<div
				class="group/line absolute inset-x-0 top-0 z-20 flex h-2 cursor-row-resize touch-none items-start"
				data-sheet-handle
				title="Drag to resize"
				aria-hidden="true"
			>
				<span
					class="w-full transition-[height,background-color] group-hover/line:h-0.5 group-hover/line:bg-primary {sheetTop ===
					undefined
						? 'h-px bg-slate-200'
						: 'h-0.5 bg-primary'}"
				></span>
			</div>
		{:else if !isFlat}
			<div
				class="flex {isTight
					? 'h-4'
					: 'h-6'} shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
				data-sheet-handle
				aria-hidden="true"
			>
				<span class="h-1.5 w-10 rounded-full bg-slate-300"></span>
			</div>
		{/if}
		{@render children()}
	</section>
</div>

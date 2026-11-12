<script lang="ts">
	// PROTOTYPE (#161) run 13: the dashboard's split, shared by the dashboard and every Page view (Justin, 2026-11-07:
	// a Page "uses that same pop-up panel from the bottom"). A top part, and under it a white sheet with round top
	// corners and a deep shadow that falls under the top part's cards. Drag the sheet's top (its handle, or anything
	// marked data-sheet-grip) and the top part follows; it rests at three heights, and a flick moves one rest. The
	// optional backdrop (a map, a photo) fills the whole width from the very top of the screen down behind the sheet's
	// round corners, and grows with the top part. The top part lets taps through to the backdrop: whatever in `head`
	// takes taps says so with pointer-events-auto. The sheet clips what it holds to its corners.
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
		hasFade = false
	}: {
		head: Snippet;
		backdrop?: Snippet;
		children: Snippet;
		isWide: boolean;
		// The first rest, as a share of the screen's height.
		first?: number;
		sheetClass?: string;
		backdropClass?: string;
		// Run 22 variants. Tight: a shorter grip, so the sheet's heading sits higher. Flat: a plain white lower half
		// with no rounding, shadow or drag (a desktop). Fade: the top half fades to white at its bottom (a desktop).
		isTight?: boolean;
		isFlat?: boolean;
		hasFade?: boolean;
	} = $props();

	// How far the backdrop runs on under the sheet, past its round corners.
	const UNDER = 56;

	let innerHeight = $state(0);
	let rest = $state(0);
	let sheetTop = $state<number>();
	let from = { y: 0, t: 0, top: 0 };
	const rests = $derived.by(() => {
		const low = Math.max(innerHeight * first, isWide ? 368 : 256);
		const high = Math.max(low, innerHeight - (isWide ? 116 : 108));
		return [low, (low + high) / 2, high];
	});
	const top = $derived(sheetTop ?? rests[rest]);

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	function down(event: PointerEvent) {
		const target = event.target as HTMLElement;
		if (isFlat || !target.closest('[data-sheet-handle], [data-sheet-grip]')) return;
		if (target.closest('button, a, input, select, textarea, [role="listbox"]')) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		from = { y: event.clientY, t: event.timeStamp, top };
		sheetTop = top;
	}

	function move(event: PointerEvent) {
		if (sheetTop === undefined) return;
		sheetTop = clamp(from.top + event.clientY - from.y, rests[0], rests[2]);
	}

	function up(event: PointerEvent) {
		if (sheetTop === undefined) return;
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
	{#if hasFade}
		<div
			class="pointer-events-none absolute inset-x-0 z-[5] h-44 bg-linear-to-t from-white via-white/70 to-transparent {backdropClass}"
			style="top: {top - 176}px"
		></div>
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
		{#if !isFlat}
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

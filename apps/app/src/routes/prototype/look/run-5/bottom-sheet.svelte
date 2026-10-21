<script lang="ts">
	// PROTOTYPE (#161): every sheet on the phone (Justin's note 14). It slides up from the bottom; drag it down (or
	// flick it) or tap outside to close; dragging up only stretches a little and springs back. No close button. From
	// md up it is a centred dialog.
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let { label, onclose, children }: { label: string; onclose: () => void; children: Snippet } =
		$props();

	let offset = $state(0);
	let isDragging = $state(false);
	let start = 0;
	let samples: { y: number; t: number }[] = [];

	function down(event: PointerEvent) {
		if ((event.target as HTMLElement).closest('button, a, input, select, textarea, label')) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		isDragging = true;
		start = event.clientY;
		samples = [{ y: event.clientY, t: event.timeStamp }];
	}

	function move(event: PointerEvent) {
		if (!isDragging) return;
		const dy = event.clientY - start;
		// Up is a rubber band: it gives a little, then stops.
		offset = dy >= 0 ? dy : -18 * (1 - Math.exp(dy / 60));
		samples.push({ y: event.clientY, t: event.timeStamp });
		samples = samples.filter((sample) => event.timeStamp - sample.t < 100);
	}

	function up(event: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		const first = samples[0];
		const speed = first ? (event.clientY - first.y) / Math.max(1, event.timeStamp - first.t) : 0;
		if (offset > 110 || speed > 0.6) onclose();
		else offset = 0;
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<button
	type="button"
	class="fixed inset-0 z-[110] bg-slate-950/30"
	aria-label="Close"
	onclick={onclose}
	transition:fade={{ duration: 180 }}
></button>
<div
	class="fixed inset-x-0 bottom-0 z-[111] touch-none rounded-t-[28px] bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgb(15_23_42/0.18)] md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[26rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px] md:pt-5 {isDragging
		? ''
		: 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'}"
	style="transform: translateY({offset}px)"
	role="dialog"
	aria-label={label}
	tabindex="-1"
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
	transition:fly={{ y: 320, duration: 260 }}
>
	<span class="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-slate-200 md:hidden"></span>
	{@render children()}
</div>

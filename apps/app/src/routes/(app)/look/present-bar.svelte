<script lang="ts">
	// Presentation's bar (#324; Justin's comment, 2026-11-25): where the zoom bar stands, which a presentation hides.
	// Leave (Esc too), full screen where the browser has it, and play or pause, with a ring filling up to the next
	// page while it plays. It fades when nothing moves and comes back with any move, tap or key.
	import { EVERY, type Presentation } from './presentation.svelte';

	let {
		presentation,
		isFull,
		canFull,
		onexit,
		onfull
	}: {
		presentation: Presentation;
		isFull: boolean;
		canFull: boolean;
		onexit: () => void;
		onfull: () => void;
	} = $props();

	const hover = 'hover:bg-white/10';
</script>

<div
	class="flex w-12 flex-col items-center gap-1 rounded-full bg-black pt-1.5 pb-1 text-white shadow-xl shadow-black/25 transition-opacity duration-500 {presentation.isIdle
		? 'pointer-events-none opacity-0'
		: ''}"
	data-no-pan
	role="group"
	aria-label="Presentation"
	onpointerenter={() => presentation.keep(true)}
	onpointerleave={() => presentation.keep(false)}
>
	<button
		type="button"
		class="flex size-9 items-center justify-center rounded-full {hover}"
		aria-label="Leave the presentation (Esc)"
		title="Leave the presentation (Esc)"
		onclick={onexit}><span class="icon-[mdi--close] size-5"></span></button
	>
	{#if canFull}
		<button
			type="button"
			class="flex size-9 items-center justify-center rounded-full {hover}"
			aria-label={isFull ? 'Leave full screen' : 'Full screen'}
			title={isFull ? 'Leave full screen' : 'Full screen'}
			onclick={onfull}
			><span class="{isFull ? 'icon-[mdi--fullscreen-exit]' : 'icon-[mdi--fullscreen]'} size-5"
			></span></button
		>
	{/if}
	<div class="relative flex size-11 items-center justify-center">
		<svg
			class="pointer-events-none absolute -inset-0.5 size-12 -rotate-90"
			viewBox="0 0 48 48"
			aria-hidden="true"
		>
			{#key presentation.round}
				<circle
					class="fill-none stroke-white {presentation.isPlaying ? 'ring-fill' : 'opacity-0'}"
					style:animation-duration="{EVERY}ms"
					style:animation-play-state={presentation.isHeld ? 'paused' : 'running'}
					cx="24"
					cy="24"
					r="22"
					stroke-width="2.5"
					stroke-linecap="round"
					pathLength="100"
					stroke-dasharray="100"
					stroke-dashoffset="100"
				/>
			{/key}
		</svg>
		<button
			type="button"
			class="flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30 hover:brightness-110"
			aria-label={presentation.isPlaying ? 'Pause' : 'Play'}
			title={presentation.isPlaying ? 'Pause (K)' : 'Play (K)'}
			onclick={() => presentation.toggle()}
			><span class="{presentation.isPlaying ? 'icon-[mdi--pause]' : 'icon-[mdi--play]'} size-5"
			></span></button
		>
	</div>
</div>

<style>
	.ring-fill {
		animation-name: ring-fill;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}

	@keyframes ring-fill {
		to {
			stroke-dashoffset: 0;
		}
	}
</style>

<script lang="ts">
	// Presentation's bar (#324; Justin's comment, 2026-11-25): where the zoom bar stands, which a presentation hides.
	// Leave (Esc too), full screen where the browser has it, and play or pause, with a ring filling up to the next
	// page while it plays. It fades when nothing moves and comes back with any move, tap or key.
	import { Button } from '@layerd/ui';
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
	<Button
		ghost
		invert
		sm
		icon="icon-[mdi--close]"
		aria-label="Leave the presentation (Esc)"
		title="Leave the presentation (Esc)"
		onclick={onexit}
	/>
	{#if canFull}
		<Button
			ghost
			invert
			sm
			icon={isFull ? 'icon-[mdi--fullscreen-exit]' : 'icon-[mdi--fullscreen]'}
			aria-label={isFull ? 'Leave full screen' : 'Full screen'}
			title={isFull ? 'Leave full screen' : 'Full screen'}
			onclick={onfull}
		/>
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
		<Button
			primary
			heavy
			md
			icon={presentation.isPlaying ? 'icon-[mdi--pause]' : 'icon-[mdi--play]'}
			aria-label={presentation.isPlaying ? 'Pause' : 'Play'}
			title={presentation.isPlaying ? 'Pause (K)' : 'Play (K)'}
			onclick={() => presentation.toggle()}
		/>
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

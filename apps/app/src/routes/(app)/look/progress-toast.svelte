<script lang="ts">
	// The download's toast (#240; Justin, 2026-11-18: "in like a toast type pop-up"): what is happening, a percent
	// and a bar, from the click on Download until the file is saved (progress.svelte.ts). The bar's sheen keeps
	// moving while it waits on the printer. A failure keeps it open with the reason, Try Again and Close.
	import { fly } from 'svelte/transition';
	import type { Progress } from './progress.svelte';

	let { progress }: { progress: Progress } = $props();
</script>

{#if progress.isOpen}
	<div
		class="pointer-events-auto w-full max-w-sm rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"
		role="status"
		aria-live="polite"
		transition:fly={{ y: 16, duration: 200 }}
	>
		{#if progress.problem}
			<div class="flex items-start gap-2.5">
				<span class="mt-0.5 icon-[mdi--alert-circle-outline] size-5 shrink-0 text-amber-400"></span>
				<p class="font-medium">{progress.problem}</p>
			</div>
			<div class="mt-3 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-full px-3.5 py-1.5 font-medium text-white/70 hover:bg-white/10 hover:text-white"
					onclick={() => progress.close()}>Close</button
				>
				<button
					type="button"
					class="rounded-full bg-primary px-3.5 py-1.5 font-medium text-white hover:brightness-110"
					onclick={() => progress.retry()}>Try Again</button
				>
			</div>
		{:else}
			<div class="flex items-baseline justify-between gap-3">
				<p class="truncate font-medium">{progress.label}</p>
				<p class="text-white/70 tabular-nums">{progress.percent}%</p>
			</div>
			<div
				class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15"
				role="progressbar"
				aria-label="Download PDF"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={progress.percent}
			>
				<div
					class="bar h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
					class:is-moving={progress.isBusy}
					style="width: {progress.value}%"
				></div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.bar {
		position: relative;
		overflow: hidden;
	}

	/* A band of light that runs along the filled part while the download is under way. */
	.bar.is-moving::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.45), transparent);
		transform: translateX(-100%);
		animation: sheen 1.4s linear infinite;
	}

	@keyframes sheen {
		to {
			transform: translateX(100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bar.is-moving::after {
			animation: none;
		}
	}
</style>

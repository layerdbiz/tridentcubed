<script lang="ts">
	// PROTOTYPE (#161): the percent ring from the app prototype; it fills as the work gets done.
	import type { Snippet } from 'svelte';

	let {
		percent,
		size = 72,
		stroke = 8,
		tone,
		children
	}: {
		percent: number;
		size?: number;
		stroke?: number;
		tone?: string;
		children?: Snippet;
	} = $props();

	const ringTone = $derived(tone ?? (percent >= 100 ? 'stroke-success' : 'stroke-primary'));
	const radius = $derived((size - stroke) / 2);
	const length = $derived(2 * Math.PI * radius);
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center"
	style="width: {size}px; height: {size}px"
>
	<svg
		class="absolute inset-0 -rotate-90"
		viewBox="0 0 {size} {size}"
		aria-hidden="true"
	>
		<circle
			class="fill-none stroke-slate-200"
			cx={size / 2}
			cy={size / 2}
			r={radius}
			stroke-width={stroke}
		/>
		<circle
			class="fill-none transition-[stroke-dashoffset] duration-500 ease-out {ringTone}"
			cx={size / 2}
			cy={size / 2}
			r={radius}
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={length}
			stroke-dashoffset={length * (1 - Math.min(100, percent) / 100)}
		/>
	</svg>
	{#if children}
		{@render children()}
	{:else}
		<span
			class="relative font-semibold text-slate-800 tabular-nums"
			style="font-size: {Math.max(10, size / 4.6)}px">{percent}%</span
		>
	{/if}
</span>

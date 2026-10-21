<script lang="ts">
	// PROTOTYPE (#161): a team's faces, owner first and on top; everyone else tucks in behind, in order.
	import { personOf } from './look.data';

	let {
		names,
		size = 32,
		isMuted = false,
		max = 4
	}: { names: string[]; size?: number; isMuted?: boolean; max?: number } = $props();

	const shown = $derived(names.filter(Boolean).slice(0, max));
	const more = $derived(names.filter(Boolean).length - shown.length);
</script>

<span class="flex items-center">
	{#each shown as name, index (name)}
		<img
			src={personOf(name).photo}
			alt={name}
			title={index === 0 ? `${name} (owner)` : name}
			class="relative shrink-0 rounded-full object-cover {index === 0
				? 'ring-2 ring-primary ring-offset-2 ring-offset-white'
				: 'ring-2 ring-white'} {isMuted ? 'grayscale' : ''}"
			style="width: {size}px; height: {size}px; z-index: {shown.length - index}; margin-left: {index
				? -size * 0.32
				: 0}px"
		/>
	{/each}
	{#if more > 0}
		<span
			class="relative flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-white"
			style="width: {size}px; height: {size}px; margin-left: {-size * 0.32}px">+{more}</span
		>
	{/if}
</span>

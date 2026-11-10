<script lang="ts">
	// PROTOTYPE (#161): a team's faces, owner first and on top; everyone else tucks in behind, in order. Each face has
	// its presence dot (Justin's note 9).
	import Avatar from './avatar.svelte';

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
		<span
			class="relative"
			title={index === 0 ? `${name} (owner)` : name}
			style="z-index: {shown.length - index}; margin-left: {index ? -size * 0.32 : 0}px"
		>
			<Avatar
				{name}
				{size}
				{isMuted}
				ring={index === 0 ? 'ring-primary ring-offset-2 ring-offset-white' : 'ring-white'}
			/>
		</span>
	{/each}
	{#if more > 0}
		<span
			class="relative flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-white"
			style="width: {size}px; height: {size}px; margin-left: {-size * 0.32}px">+{more}</span
		>
	{/if}
</span>

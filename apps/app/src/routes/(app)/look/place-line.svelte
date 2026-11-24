<script lang="ts">
	// Where a record is, on one line: the map marker in the record's colour, then the place. With no place yet the
	// line still shows, grey, saying so (Justin, 2026-11-16: a new record left blank space where its details go; a
	// row keeps its look, and what is missing reads as still to do). `isLight` for over a photo. A Transport Mode
	// has no place of its own (a ship is wherever its trip puts it), so its line says nothing (`isPlaced` false).
	// Only the city and state ever show (#320): never a street, and never a person's address.
	import { cityStateOf } from './location';

	let {
		place,
		tone = 'text-primary',
		isLight = false,
		isPlaced = true
	}: { place: string; tone?: string; isLight?: boolean; isPlaced?: boolean } = $props();

	const shown = $derived(cityStateOf(place));
</script>

<span
	class="flex max-w-full min-w-0 items-center gap-0.5 text-xs {isLight
		? 'text-white/85'
		: 'text-slate-500'}"
>
	{#if shown}
		<span class="icon-[mdi--map-marker] size-3.5 shrink-0 {tone}"></span><span class="truncate"
			>{shown}</span
		>
	{:else if isPlaced}
		<span class="icon-[mdi--map-marker-outline] size-3.5 shrink-0 opacity-50"></span><span
			class="truncate opacity-60">No location yet</span
		>
	{/if}
</span>

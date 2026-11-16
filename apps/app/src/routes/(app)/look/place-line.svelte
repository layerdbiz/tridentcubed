<script lang="ts">
	// Where a record is, on one line: the map marker in the record's colour, then the place. With no place yet the
	// line still shows, grey, saying so (Justin, 2026-11-16: a new record left blank space where its details go; a
	// row keeps its look, and what is missing reads as still to do). `isLight` for over a photo.
	let {
		place,
		tone = 'text-primary',
		isLight = false
	}: { place: string; tone?: string; isLight?: boolean } = $props();
</script>

<span
	class="flex max-w-full min-w-0 items-center gap-0.5 text-xs {isLight
		? 'text-white/85'
		: 'text-slate-500'}"
>
	{#if place}
		<span class="icon-[mdi--map-marker] size-3.5 shrink-0 {tone}"></span><span class="truncate"
			>{place}</span
		>
	{:else}
		<span class="icon-[mdi--map-marker-outline] size-3.5 shrink-0 opacity-50"></span><span
			class="truncate opacity-60">No location yet</span
		>
	{/if}
</span>

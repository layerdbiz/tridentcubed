<script lang="ts">
	// PROTOTYPE (#161): a record's labels as small grey chips on one line; what does not fit is cut, never wrapped, so
	// a row stays at three lines (Justin's run 12 note 10). `isWrapped` lets them wrap where there is room (a page).
	// `isLight` for over a photo (a Page's picture, run 13).
	let {
		labels,
		isWrapped = false,
		isLight = false
	}: { labels: string[]; isWrapped?: boolean; isLight?: boolean } = $props();
</script>

{#if labels.length}
	<span class="flex gap-1 {isWrapped ? 'flex-wrap' : 'overflow-hidden'}">
		{#each labels as label (label)}
			<span
				class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap {isLight
					? 'bg-white/20 text-white backdrop-blur'
					: 'bg-slate-100 text-slate-600'}">{label}</span
			>
		{/each}
	</span>
{/if}

<script lang="ts">
	// PROTOTYPE (#161): a record's labels as small grey chips on one line; what does not fit is cut, never wrapped, so
	// a row stays at three lines (Justin's run 12 note 10). `isWrapped` lets them wrap where there is room (a page).
	let { labels, isWrapped = false }: { labels: string[]; isWrapped?: boolean } = $props();
</script>

{#if labels.length}
	<span class="flex gap-1 {isWrapped ? 'flex-wrap' : 'overflow-hidden'}">
		{#each labels as label (label)}
			<span
				class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-slate-600"
				>{label}</span
			>
		{/each}
	</span>
{/if}

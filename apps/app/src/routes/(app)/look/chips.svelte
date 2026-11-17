<script lang="ts">
	// PROTOTYPE (#161): a record's labels as small grey chips on one line; what does not fit is cut, never wrapped, so
	// a row stays at three lines (Justin's run 12 note 10). `isWrapped` lets them wrap where there is room (a page).
	// `isLight` for over a photo (a Page's picture, run 13).
	// 2026-11-16 (Justin): with no labels yet the line is not left blank: one chip in a dashed outline says what
	// is still to do (`placeholder`; empty words leave the line out).
	let {
		labels,
		isWrapped = false,
		isLight = false,
		placeholder = 'To do'
	}: { labels: string[]; isWrapped?: boolean; isLight?: boolean; placeholder?: string } = $props();
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
{:else if placeholder}
	<span
		class="shrink-0 rounded-full border border-dashed px-2 py-px text-[10px] font-medium whitespace-nowrap {isLight
			? 'border-white/50 text-white/75'
			: 'border-slate-300 text-slate-400'}">{placeholder}</span
	>
{/if}

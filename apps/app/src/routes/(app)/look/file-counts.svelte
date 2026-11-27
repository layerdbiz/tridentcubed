<script lang="ts">
	// #350: how many photos, videos, PDFs and spreadsheets something holds, each kind its own coloured icon and a
	// number (the Icon Row Justin picked on the File Count Icons prototype, in colour). A kind with none is left out,
	// and with none of any it draws nothing. Each is the library Chip, bare, its icon the library Icon; the colours are
	// the app's (counts.ts). `isLight` over a photo, `isBig` on a project's own page.
	import { Chip, Icon } from '@layerd/ui';
	import { FILE_KINDS, type CountType } from './counts';

	let {
		count,
		isLight = false,
		isBig = false
	}: { count: CountType; isLight?: boolean; isBig?: boolean } = $props();

	const shown = $derived(FILE_KINDS.filter((each) => count[each.kind] > 0));
</script>

{#if shown.length}
	<span
		class="flex shrink-0 items-center tabular-nums {isBig ? 'gap-4' : 'gap-2.5'} {isLight
			? 'text-white/90'
			: 'text-slate-600'}"
	>
		{#each shown as each (each.kind)}
			{@const number = count[each.kind]}
			<Chip
				title="{number} {number === 1 ? each.one : each.many}"
				class="gap-1 p-0 font-medium {isBig ? 'text-sm' : 'text-xs'}"
			>
				<Icon
					icon={each.icon}
					class="{isBig ? 'size-[18px]' : 'size-[15px]'} {isLight ? each.toneOnPhoto : each.tone}"
				/>{number}
			</Chip>
		{/each}
	</span>
{/if}

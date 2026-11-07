<script lang="ts">
	// PROTOTYPE (#161) run 12: a customer, team member, transport or facility as a card, the same on all four pages:
	// its icon with the projects badge, its name, labels and place, and the ⋮ at the top right. A tap opens its page.
	import Chips from './chips.svelte';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import RecordMark from './record-mark.svelte';
	import type { RecordType } from './records.data';

	let { look, record }: { look: LookState; record: RecordType } = $props();
</script>

<article class="relative rounded-3xl bg-white ring-1 ring-slate-900/[0.07]">
	<button
		class="flex w-full flex-col items-center gap-2 p-4 pt-5 text-center"
		onclick={() => look.openRecord(record.page, record.key)}
	>
		<RecordMark
			{record}
			size={60}
		/>
		<span class="w-full truncate font-semibold text-slate-900">{record.key}</span>
		<span class="flex max-w-full justify-center">
			<Chips labels={record.sub ? [...record.labels, record.sub] : record.labels} />
		</span>
		{#if record.location}
			<span class="flex max-w-full items-center gap-0.5 text-xs text-slate-500"
				><span class="icon-[mdi--map-marker] size-3.5 shrink-0 {record.tone.text}"></span><span
					class="truncate">{record.location}</span
				></span
			>
		{/if}
	</button>
	<div class="absolute top-1.5 right-1.5">
		<MoreMenu
			{look}
			page={record.page}
			id={record.key}
			isOpenable
		/>
	</div>
</article>

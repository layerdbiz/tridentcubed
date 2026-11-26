<script lang="ts">
	// PROTOTYPE (#161) run 12: one customer, team member, transport or facility as a row, the same on all four pages
	// and on the board (Justin's run 12 notes 6, 10 and 19). Never more than three lines: the name, its labels, and
	// where it is; its projects are the badge on its icon. The ⋮ sits top right and the › under it, as on a project's
	// row; a tap opens its own page.
	import { Stack } from '@layerd/ui';
	import { facesOf, logoOf } from './marks';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import PlaceLine from './place-line.svelte';
	import RecordMark from './record-mark.svelte';
	import type { RecordType } from './records.data';
	import Chips from './chips.svelte';

	let {
		look,
		record,
		size = 44
	}: { look: LookState; record: RecordType; size?: number } = $props();
</script>

<div class="relative">
	<button
		class="flex min-h-[100px] w-full items-center gap-3 py-2.5 pr-12 pl-4 text-left transition active:bg-slate-50"
		onclick={() => look.openRecord(record.page, record.key)}
	>
		<RecordMark
			{record}
			{size}
		/>
		<span class="min-w-0 flex-1 space-y-1">
			<span class="flex items-center justify-between gap-2">
				<span class="truncate font-medium text-slate-900">{record.key}</span>
				{#if record.people.length}
					<Stack
						items={facesOf(record.people)}
						size={22}
						max={3}
					/>
				{:else if record.logos.length}
					<Stack
						class="shrink-0"
						items={record.logos.slice(0, 3).map((name) => ({
							...logoOf(name, { shape: 'circle' }),
							id: name,
							ring: 'ring-2 ring-white'
						}))}
						size={22}
					/>
				{/if}
			</span>
			<!-- The label line and the place line keep their height when empty, so every row is as tall as the next. -->
			<span class="flex h-[19px] items-center">
				<Chips labels={record.sub ? [...record.labels, record.sub] : record.labels} />
			</span>
			<span class="flex h-4 min-w-0 items-center">
				<PlaceLine
					place={record.location}
					tone={record.tone.text}
					isPlaced={record.page !== 'transport'}
				/>
			</span>
		</span>
	</button>
	<div class="absolute top-2 right-1.5">
		<MoreMenu
			{look}
			page={record.page}
			id={record.key}
			isOpenable
		/>
	</div>
	<span
		class="pointer-events-none absolute right-3.5 bottom-3 icon-[mdi--chevron-right] size-5 text-slate-300"
	></span>
</div>

<script lang="ts">
	// PROTOTYPE (#161) run 5: the dashboard cards, one per page: Projects, Customers, Team, and since 2026-10-25
	// Transport and Facilities. The bare icon sits on the left (no badge behind it, note 4) and the number over the label to its
	// right. A filled question mark by the label explains the card (note 5): a popover on hover with a mouse, a bottom
	// sheet on a phone. Bigger on a desktop (note 34). Five do not fit a phone, so the row scrolls sideways and the
	// picked card scrolls into view; the popover is fixed, so the row cannot clip it. Run 11 (2026-10-26 19:22): the
	// row has room above and below, so the picked card's shadow is not cut off, and only that card has one; the list's
	// sheet casts its shadow under the rest. Run 12 (2026-11-07, note 13): each card's number is the same count the
	// chart ends on and the list shows (records.data.ts). Run 13 (Justin, 2026-11-07 22:21): back to how they were, the
	// ? right after the label and what changed up on the chart again; no hover effect and no shadow or glow at all.
	// #376: the ? is the library's Help, the same ? as every input's: a pop-up by it with a mouse, a sheet on a phone.
	import { DATASETS, PAGES, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { countOf } from './records.data';
	import { Help, Tabs } from '@layerd/ui';

	let { look }: { look: LookState } = $props();

	const SETS = PAGES;
	const HELP: Record<string, string> = {
		projects:
			'Every project in the workspace, whatever its state. The green number on the chart is how many more there are than at the start of the time range.',
		customers:
			'Companies Trident Cubed works for. A customer counts once, however many projects they have; the badge on its logo counts its projects.',
		team: 'Everyone on the Trident Cubed team who can sign in. A purple ring marks an admin, a blue ring a manager and a grey ring a Team user.',
		transport:
			"The ships, barges, planes, trains and trucks in the organization's list. Each is typed in once and picked in any project; later a tracking service adds ships and planes to the same list.",
		facilities:
			"The ports, airports, rail yards and depots in the organization's list, picked in a project's Facility drop-down or added there. The map shows where they are."
	};

	let row: HTMLDivElement | undefined = $state();

	// The picked card, whether tapped or picked from the menu, scrolls to the middle of the row so it shows in full
	// and the cards beside it show too (run 14, note 10). No snapping, which would pull it back to the row's edge. Only
	// the row scrolls: scrollIntoView would also slide the whole page sideways.
	function reveal(dataset: DatasetType) {
		const card = row?.querySelector<HTMLElement>(`[data-set="${dataset}"]`);
		if (!row || !card) return;
		const box = card.getBoundingClientRect();
		const left =
			row.scrollLeft +
			box.left -
			row.getBoundingClientRect().left -
			(row.clientWidth - box.width) / 2;
		row.scrollTo({ left, behavior: 'smooth' });
	}
	$effect(() => {
		reveal(look.dataset);
	});
</script>

<div
	class="-mx-4 -my-4 scroll-px-4 overflow-x-auto px-4 py-4 md:mx-0 md:scroll-px-0 md:px-0"
	bind:this={row}
>
	<!-- Every card is as wide as the widest needs (Transport Mode on one line), and on a wide screen they share the
	     row equally; when they cannot all fit, the row scrolls rather than a card squeezing its words out (2026-11-10). -->
	<!-- Stat Cards B (run 22): on a desktop the cards wrap onto a second row when they cannot all fit, so none is cut
	     off at the edge. -->
	<!-- #382: the cards are the library's Tabs, so the arrow keys move from card to card. Each card is a box rather
	     than a button, since it holds the ? button, whose taps and keys open its help and leave the picked card be. -->
	<Tabs
		class="grid gap-2 2xl:gap-3 {look.variant('stats') === 'B'
			? 'w-max min-w-full auto-cols-fr grid-flow-col md:w-full md:auto-cols-auto md:grid-flow-row md:grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))]'
			: 'w-max min-w-full auto-cols-fr grid-flow-col'}"
		label="What to count"
		options={SETS}
		value={look.dataset}
		onpick={(dataset) => {
			look.pick(dataset);
			reveal(dataset);
		}}
	>
		{#snippet option({ value: dataset, isOn, props })}
			{@const info = DATASETS[dataset]}
			{@const words = info.label.split(' ')}
			<div
				{...props}
				data-set={dataset}
				class="relative flex cursor-pointer items-center gap-2 rounded-2xl p-2.5 pr-3.5 select-none md:gap-2 md:rounded-3xl md:px-3 md:py-4 2xl:gap-3 2xl:px-4 2xl:py-5 {isOn
					? 'bg-primary text-white'
					: 'bg-white text-slate-700'}"
			>
				<span
					class="{info.icon} size-7 shrink-0 md:size-7 2xl:size-10 {isOn
						? 'text-white'
						: 'text-primary'}"
				></span>
				<span class="min-w-0 flex-1">
					<span
						class="block text-lg leading-tight font-semibold tabular-nums md:text-2xl 2xl:text-3xl"
						>{countOf(look, dataset)}</span
					>
					<!-- Run 14 (note 2): the name stays on one line (Transport Mode); the card is as wide as it needs. -->
					<span
						class="block text-[11px] leading-tight font-medium whitespace-nowrap md:text-[13px] 2xl:text-[15px] {isOn
							? 'text-white/85'
							: 'text-slate-500'}"
					>
						{words.slice(0, -1).join(' ')}
						<!-- The library's ? is 1.3 times its type, so its own type keeps it 18px, 20px on a wide screen. -->
						<span class="whitespace-nowrap"
							>{words.at(-1)}<span
								class="ml-0.5 inline-flex align-middle text-[14px] md:ml-1 2xl:text-[15.5px] {isOn
									? 'text-white'
									: 'text-slate-300'}"
								><Help
									label={info.label}
									text={HELP[dataset]}
								/></span
							></span
						>
					</span>
				</span>
			</div>
		{/snippet}
	</Tabs>
</div>

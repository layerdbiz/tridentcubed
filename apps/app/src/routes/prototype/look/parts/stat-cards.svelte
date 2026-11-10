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
	import { scale } from 'svelte/transition';
	import BottomSheet from './bottom-sheet.svelte';
	import { DATASETS, PAGES, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { countOf } from './records.data';

	let { look }: { look: LookState } = $props();

	const SETS = PAGES;
	const HELP: Record<string, string> = {
		projects:
			'Every project in the workspace, whatever its state. The green number on the chart is how many more there are than at the start of the time range.',
		customers:
			'Companies Trident Cubed works for. A customer counts once, however many projects they have; the badge on its logo counts its projects.',
		team: 'Everyone on the Trident Cubed team who can sign in. A blue ring marks an admin and a violet ring a manager.',
		transport:
			"The ships, barges, planes, trains and trucks in the organization's list. Each is typed in once and picked in any project; later a tracking service adds ships and planes to the same list.",
		facilities:
			"The ports, airports, rail yards and depots in the organization's list, picked in a project's Facility drop-down or added there. The map shows where they are."
	};

	let hovered = $state<DatasetType>();
	let tip = $state({ x: 0, y: 0 });
	let row: HTMLDivElement | undefined = $state();

	function hover(event: PointerEvent, dataset: DatasetType) {
		const card = (event.currentTarget as HTMLElement)
			.closest('[role="tab"]')!
			.getBoundingClientRect();
		tip = { x: Math.min(card.left, window.innerWidth - 272), y: card.bottom + 8 };
		hovered = dataset;
	}

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
	let sheet = $state<DatasetType>();
	// A mouse gets the popover on hover; a finger gets the sheet.
	const hasHover =
		typeof window !== 'undefined' &&
		window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	function ask(event: MouseEvent, dataset: DatasetType) {
		event.stopPropagation();
		if (!hasHover) sheet = dataset;
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (sheet = hovered = undefined)} />

<div
	class="-mx-4 -my-4 flex scroll-px-4 gap-2 overflow-x-auto px-4 py-4 md:mx-0 md:scroll-px-0 md:gap-3 md:px-0"
	role="tablist"
	aria-label="What to count"
	bind:this={row}
>
	{#each SETS as dataset (dataset)}
		{@const info = DATASETS[dataset]}
		{@const words = info.label.split(' ')}
		{@const isOn = look.dataset === dataset}
		<div
			role="tab"
			tabindex="0"
			aria-selected={isOn}
			data-set={dataset}
			class="relative flex w-max min-w-28 shrink-0 cursor-pointer items-center gap-2 rounded-2xl p-2.5 pr-3.5 select-none md:w-auto md:min-w-44 md:flex-1 md:gap-3 md:rounded-3xl md:px-4 md:py-5 {isOn
				? 'bg-primary text-white'
				: 'bg-white text-slate-700'}"
			onclick={() => {
				look.pick(dataset);
				reveal(dataset);
			}}
			onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && look.pick(dataset)}
		>
			<span class="{info.icon} size-7 shrink-0 md:size-10 {isOn ? 'text-white' : 'text-primary'}"
			></span>
			<span class="min-w-0 flex-1">
				<span class="block text-lg leading-tight font-semibold tabular-nums md:text-3xl"
					>{countOf(look, dataset)}</span
				>
				<!-- Run 14 (note 2): the name stays on one line (Transport Mode); the card is as wide as it needs. -->
				<span
					class="block text-[11px] leading-tight font-medium whitespace-nowrap md:text-[15px] {isOn
						? 'text-white/85'
						: 'text-slate-500'}"
				>
					{words.slice(0, -1).join(' ')}
					<span class="whitespace-nowrap"
						>{words.at(-1)}<button
							type="button"
							class="relative -my-1 -mr-1 -ml-0.5 inline-flex p-1 align-middle md:ml-0 {isOn
								? 'text-white'
								: 'text-slate-300'}"
							aria-label="What does {info.label} count?"
							onclick={(event) => ask(event, dataset)}
							onpointerenter={(event) => hasHover && hover(event, dataset)}
							onpointerleave={() => hasHover && (hovered = undefined)}
							><span class="icon-[mdi--help-circle] size-3.5 md:size-5"></span></button
						></span
					>
				</span>
			</span>
		</div>
	{/each}
</div>

{#if hovered}
	<div
		class="pointer-events-none fixed z-50 w-64 rounded-2xl bg-slate-900 p-3 text-xs leading-relaxed text-white/90 shadow-xl"
		style="left: {tip.x}px; top: {tip.y}px"
		role="tooltip"
		transition:scale={{ start: 0.96, duration: 140 }}
	>
		<b class="mb-0.5 block text-sm text-white">{DATASETS[hovered].label}</b>{HELP[hovered]}
	</div>
{/if}

{#if sheet}
	{@const info = DATASETS[sheet]}
	<BottomSheet
		label="About {info.label}"
		onclose={() => (sheet = undefined)}
	>
		<div class="flex items-center gap-3">
			<span class="{info.icon} size-9 text-primary"></span>
			<p>
				<b class="block text-lg text-slate-900">{info.label}</b>
				<span class="text-sm text-slate-500">{countOf(look, sheet)} right now</span>
			</p>
		</div>
		<p class="mt-4 text-[15px] leading-relaxed text-slate-600">{HELP[sheet]}</p>
	</BottomSheet>
{/if}

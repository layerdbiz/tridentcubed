<script lang="ts">
	// PROTOTYPE (#161) run 5: the dashboard cards, one per page: Projects, Clients, Team, and since 2026-10-25 Transport
	// and Facilities. The bare icon sits on the left (no badge behind it, note 4) and the number over the label to its
	// right. A filled question mark by the label explains the card (note 5): a popover on hover with a mouse, a bottom
	// sheet on a phone. Bigger on a desktop (note 34). Five do not fit a phone, so the row scrolls sideways and the
	// picked card scrolls into view; the popover is fixed, so the row cannot clip it.
	import { scale } from 'svelte/transition';
	import BottomSheet from './bottom-sheet.svelte';
	import { CLIENTS, DATASETS, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { TEAM } from './team.data';

	let { look }: { look: LookState } = $props();

	const SETS: DatasetType[] = ['projects', 'clients', 'team', 'transport', 'facilities'];
	const HELP: Record<string, string> = {
		projects:
			'Every project in the workspace, whatever its status. The chart counts the ones still open, and the list below shows them all.',
		clients:
			'Companies Trident Cubed works for. A client counts once, however many projects they have. The chart counts clients with a project still open.',
		team: 'Everyone on the Trident Cubed team who can sign in. The chart counts the people working on a project that is still open.',
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

	// A page picked from the menu brings its card into view.
	$effect(() => {
		row
			?.querySelector(`[data-set="${look.dataset}"]`)
			?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
	});
	let sheet = $state<DatasetType>();
	// A mouse gets the popover on hover; a finger gets the sheet.
	const hasHover =
		typeof window !== 'undefined' &&
		window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	function countOf(dataset: DatasetType) {
		if (dataset === 'projects') return look.projects.length;
		if (dataset === 'clients') return CLIENTS.length;
		if (dataset === 'transport') return look.transports.length;
		if (dataset === 'facilities') return look.facilities.length;
		return TEAM.length;
	}

	function ask(event: MouseEvent, dataset: DatasetType) {
		event.stopPropagation();
		if (!hasHover) sheet = dataset;
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (sheet = hovered = undefined)} />

<div
	class="-mx-4 flex snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 md:mx-0 md:scroll-px-0 md:gap-3 md:px-0"
	role="tablist"
	aria-label="What to count"
	bind:this={row}
>
	{#each SETS as dataset (dataset)}
		{@const info = DATASETS[dataset]}
		{@const isOn = look.dataset === dataset}
		<div
			role="tab"
			tabindex="0"
			aria-selected={isOn}
			data-set={dataset}
			class="relative flex w-[calc((100%-1rem)/2.6)] shrink-0 cursor-pointer snap-start items-center gap-2 rounded-2xl p-2.5 transition duration-200 select-none md:w-auto md:min-w-44 md:flex-1 md:gap-3 md:rounded-3xl md:px-4 md:py-5 {isOn
				? 'bg-primary text-white shadow-lg shadow-primary/30'
				: 'bg-white text-slate-700 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_24px_-18px_rgb(15_23_42/0.3)] hover:-translate-y-0.5'}"
			onclick={() => look.pick(dataset)}
			onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && look.pick(dataset)}
		>
			<span class="{info.active} size-7 shrink-0 md:size-10 {isOn ? 'text-white' : 'text-primary'}"
			></span>
			<span class="min-w-0 flex-1">
				<span class="block text-lg leading-tight font-semibold tabular-nums md:text-3xl"
					>{countOf(dataset)}</span
				>
				<span
					class="flex items-center gap-0.5 text-[11px] font-medium md:gap-1 md:text-[15px] {isOn
						? 'text-white/85'
						: 'text-slate-500'}"
				>
					<span class="truncate">{info.label}</span>
					<button
						type="button"
						class="relative -m-1 flex shrink-0 items-center justify-center p-1 {isOn
							? 'text-white hover:text-white/85'
							: 'text-slate-300 hover:text-slate-500'}"
						aria-label="What does {info.label} count?"
						onclick={(event) => ask(event, dataset)}
						onpointerenter={(event) => hasHover && hover(event, dataset)}
						onpointerleave={() => hasHover && (hovered = undefined)}
						><span class="icon-[mdi--help-circle] size-3.5 md:size-5"></span></button
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
			<span class="{info.active} size-9 text-primary"></span>
			<p>
				<b class="block text-lg text-slate-900">{info.label}</b>
				<span class="text-sm text-slate-500">{countOf(sheet)} right now</span>
			</p>
		</div>
		<p class="mt-4 text-[15px] leading-relaxed text-slate-600">{HELP[sheet]}</p>
	</BottomSheet>
{/if}

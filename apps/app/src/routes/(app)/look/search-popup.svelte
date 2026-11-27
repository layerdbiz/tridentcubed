<script lang="ts">
	// The menu's search (#345), opened from the search icon beside the logo in the menu, or Ctrl K (⌘ K on a Mac). Round
	// 2 (Justin, 2026-11-26, with a picture): a plain search that fills in as you type, in one group per page, a page
	// with nothing found left out. Before anything is typed, Recents, then each page's latest (search.ts). Each row is
	// the thing's own avatar (a logo, a face, initials), its name, a line under it, and on the right a project's status
	// or how many projects a record is on. Round 3 (Justin, 2026-11-27): no yellow on the typed words. No filter chips, no key hints, no Esc or Enter
	// labels: a close X at the top right, and the list fades at its top and bottom as every list does (the library Scroller).
	// Arrow keys still move, Enter opens and Escape closes. It is the library Dialog's full kind, as What's New is
	// (Justin, 2026-11-27): the whole screen on a phone, with no grab handle and nothing of the page behind it showing,
	// a 36rem box from md up, the search field staying put while the results scroll.
	import { Avatar, Button, Chip, Dialog } from '@layerd/ui';
	import { PAGE_ICONS, STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { logoOf } from './marks';
	import RecordMark from './record-mark.svelte';
	import { openItem } from './records.data';
	import { searchOf, type SearchRowType } from './search';

	let { look, onclose }: { look: LookState; onclose: () => void } = $props();

	let query = $state('');
	let active = $state(0);
	let list: HTMLElement | undefined = $state();
	const groups = $derived(searchOf(look, query));
	// Every row in the order shown, so the arrow keys run on from one group into the next.
	const rows = $derived(groups.flatMap((group) => group.rows));
	// Where each group's rows start among them all.
	const starts = $derived(
		groups.map((_, index) =>
			groups.slice(0, index).reduce((total, group) => total + group.rows.length, 0)
		)
	);

	function open(row: SearchRowType) {
		onclose();
		openItem(look, row);
	}

	function move(by: number) {
		if (rows.length === 0) return;
		active = (active + by + rows.length) % rows.length;
		list?.querySelector(`#search-result-${active}`)?.scrollIntoView({ block: 'nearest' });
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') move(1);
		else if (event.key === 'ArrowUp') move(-1);
		else if (event.key === 'Enter' && rows[active]) open(rows[active]);
		else return;
		event.preventDefault();
	}
</script>

<Dialog
	label="Search"
	variant="full"
	fade="y"
	{onclose}
>
	{#snippet header()}
		<div
			class="-mx-5 flex shrink-0 items-center gap-3 border-b border-slate-100 pt-3 pr-3 pb-3 pl-5 md:pt-0"
		>
			<span class="icon-[mdi--magnify] size-7 shrink-0 text-primary"></span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="min-w-0 flex-1 border-0 bg-transparent p-1 text-lg text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
				type="text"
				inputmode="search"
				placeholder="Search"
				aria-label="Search"
				aria-controls="search-results"
				aria-activedescendant={rows[active] ? `search-result-${active}` : undefined}
				autocomplete="off"
				enterkeyhint="search"
				autofocus
				bind:value={query}
				oninput={() => (active = 0)}
				{onkeydown}
			/>
			<Button
				ghost
				icon="icon-[mdi--close]"
				aria-label="Close search"
				onclick={onclose}
			/>
		</div>
	{/snippet}
	<div
		id="search-results"
		class="pt-2 pb-10"
		role="listbox"
		aria-label="Search results"
		bind:this={list}
	>
		{#each groups as group, number (group.title)}
			<p
				class="px-2 pt-3 pb-1.5 text-xs font-bold tracking-widest text-slate-500 uppercase"
				role="presentation"
			>
				{group.title}
			</p>
			{#each group.rows as row, index (`${row.page}-${row.id ?? row.name}`)}
				{@const at = starts[number] + index}
				<button
					type="button"
					id="search-result-{at}"
					class="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition {at ===
					active
						? 'bg-primary/[0.07]'
						: 'hover:bg-slate-900/[0.04]'}"
					role="option"
					aria-selected={at === active}
					onpointermove={() => (active = at)}
					onclick={() => open(row)}
				>
					{#if row.record}
						<RecordMark
							record={row.record}
							size={40}
							hasBadge={false}
						/>
					{:else}
						<Avatar
							{...logoOf(row.project?.client ?? '', {
								shape: 'circle',
								fallback: PAGE_ICONS.projects
							})}
							size={40}
						/>
					{/if}
					<span class="min-w-0 flex-1">
						<span class="block truncate text-[15px] text-slate-900">{row.name}</span>
						{#if row.line}<span class="block truncate text-sm text-slate-500">{row.line}</span>{/if}
					</span>
					{#if row.project}
						<Chip
							class="flex gap-1.5 py-1 pr-3 pl-2.5 text-xs font-semibold {STATUS[row.project.status]
								.pill}"
							><span class="size-2 rounded-full {STATUS[row.project.status].dot}"
							></span>{row.side}</Chip
						>
					{:else if row.side}
						<span class="shrink-0 text-xs text-slate-400">{row.side}</span>
					{/if}
				</button>
			{/each}
		{:else}
			<p class="px-3 py-10 text-center text-sm text-slate-400">
				{query.trim() ? `Nothing found for “${query.trim()}”.` : 'Nothing here yet.'}
			</p>
		{/each}
	</div>
</Dialog>

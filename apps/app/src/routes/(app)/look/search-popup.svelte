<script lang="ts">
	// The menu's search (#345; Justin, 2026-11-25: "a search icon that will open up a pop-up ... you can search for
	// anything"). Opened from Search in the menu, or Ctrl K (⌘ K on a Mac) on a desktop. A desktop gets a pop-up near
	// the top of the screen; a phone the whole screen, so its keyboard never covers the results. Before anything is
	// typed it lists the Recents; then what search.ts finds, names first. Arrow keys move, Enter opens, Escape closes.
	import type { Attachment } from 'svelte/attachments';
	import { fade, fly } from 'svelte/transition';
	import { PAGE_ICONS, STATUS, type RecentType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { recentOf, recordOf } from './records.data';
	import { searchOf } from './search';

	let { look, onclose }: { look: LookState; onclose: () => void } = $props();

	// More than this is a sign to type more.
	const MOST = 50;

	let query = $state('');
	let active = $state(0);
	let list: HTMLElement | undefined = $state();
	const isTyped = $derived(query.trim().length > 0);
	const results = $derived(isTyped ? searchOf(look, query).slice(0, MOST) : recentOf(look));

	// Typing starts again at the best result.
	$effect(() => {
		void query;
		active = 0;
	});

	// Opens in the browser's top layer, over the floating bar, as the sheets do; Safari 16 has no popovers. The field
	// takes the cursor once the pop-up shows (a hidden field cannot), straight away, so a phone opens its keyboard.
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
		node.querySelector('input')?.focus();
	};

	function open(item: RecentType) {
		onclose();
		if (item.page === 'projects') {
			if (look.projects.some((project) => project.id === item.id)) look.open(item.id!);
		} else if (look.has(item.page, item.name)) look.openRecord(item.page, item.name);
		else look.say(`${item.name} is no longer there`);
	}

	function toneOf(item: RecentType) {
		if (item.page === 'projects') {
			const project = look.projects.find((one) => one.id === item.id);
			return project ? STATUS[project.status].tone : 'text-slate-400';
		}
		return recordOf(look, item.page, item.name)?.tone.text ?? 'text-slate-400';
	}

	function move(by: number) {
		if (results.length === 0) return;
		active = (active + by + results.length) % results.length;
		list?.querySelectorAll('[data-result]')[active]?.scrollIntoView({ block: 'nearest' });
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
		else if (event.key === 'ArrowDown') move(1);
		else if (event.key === 'ArrowUp') move(-1);
		else if (event.key === 'Enter' && results[active]) open(results[active]);
		else return;
		event.preventDefault();
	}
</script>

<div
	popover="manual"
	class="fixed z-[110] m-0 size-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0"
	style="inset: 0"
	{@attach lift}
>
	<button
		type="button"
		class="fixed inset-0 z-[110] hidden bg-slate-950/30 md:block"
		aria-label="Close search"
		tabindex="-1"
		onclick={onclose}
		transition:fade={{ duration: 150 }}
	></button>
	<div
		class="fixed inset-0 z-[111] flex flex-col bg-white pt-[env(safe-area-inset-top)] md:inset-x-auto md:top-[12vh] md:bottom-auto md:left-1/2 md:max-h-[70vh] md:w-[36rem] md:-translate-x-1/2 md:overflow-hidden md:rounded-[28px] md:pt-0 md:shadow-[0_2px_6px_rgb(15_23_42/0.06),0_32px_80px_-16px_rgb(15_23_42/0.4)]"
		role="dialog"
		aria-modal="true"
		aria-label="Search"
		transition:fly={{ y: -12, duration: 180 }}
	>
		<div class="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3">
			<span class="icon-[mdi--magnify] size-6 shrink-0 text-slate-400"></span>
			<input
				class="min-w-0 flex-1 border-0 bg-transparent p-1 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
				type="search"
				placeholder="Search projects, customers, team…"
				aria-label="Search"
				aria-controls="search-results"
				aria-activedescendant={results[active] ? `search-result-${active}` : undefined}
				autocomplete="off"
				enterkeyhint="go"
				bind:value={query}
				{onkeydown}
			/>
			<button
				type="button"
				class="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-slate-900/[0.04] md:hidden"
				onclick={onclose}>Cancel</button
			>
			<kbd
				class="hidden shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-sans text-xs text-slate-500 md:block"
				>Esc</kbd
			>
		</div>
		<div
			id="search-results"
			class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
			role="listbox"
			aria-label={isTyped ? 'Results' : 'Recents'}
			bind:this={list}
		>
			{#if !isTyped && results.length}
				<p class="px-3 pt-1 pb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
					Recents
				</p>
			{/if}
			{#each results as item, index (`${item.page}-${item.id ?? item.name}`)}
				<button
					type="button"
					id="search-result-{index}"
					class="flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition {index ===
					active
						? 'bg-slate-900/[0.06]'
						: 'hover:bg-slate-900/[0.04]'}"
					role="option"
					aria-selected={index === active}
					data-result
					onpointermove={() => (active = index)}
					onclick={() => open(item)}
				>
					<span
						class="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full {toneOf(
							item
						)}"
						><span class="absolute inset-0 bg-current opacity-[0.12]"></span><span
							class="{PAGE_ICONS[item.page]} relative size-[55%]"
						></span></span
					>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm text-slate-800">{item.name}</span>
						<span class="block truncate text-xs text-slate-400">{item.note}</span>
					</span>
				</button>
			{:else}
				<p class="px-3 py-8 text-center text-sm text-slate-400">
					{isTyped ? `Nothing found for “${query.trim()}”.` : 'Type to search.'}
				</p>
			{/each}
		</div>
	</div>
</div>

<script lang="ts">
	// PROTOTYPE (#161) run 20: the prototype selector (Justin, 2026-11-11). All that shows is a very small arrow
	// fixed at the top centre, so it never changes how the app reads. A tap opens the list of parts in sections;
	// each row picks that part's letter, and the app changes behind the list at once. It is not part of the design
	// being judged: it is dark, sits over everything, and goes when the prototype does.
	import type { LookState } from './look.state.svelte';
	import { PART_GROUPS, partsOf, type PartSectionType, type PartType } from './variants.data';

	let { look }: { look: LookState } = $props();

	let isOpen = $state(false);
	let root: HTMLDivElement | undefined = $state();
	// Sections and sub-sections with something to choose start open; the rest are folded until asked for.
	function hasChoice(parts: PartType[]) {
		return parts.some((part) => part.variants.length > 1);
	}

	let folded = $state<string[]>([
		...PART_GROUPS.filter((group) => !hasChoice(partsOf(group))).map((group) => group.id),
		...PART_GROUPS.flatMap((group) =>
			(group.sections ?? [])
				.filter((section) => !hasChoice(section.parts))
				.map((section) => `${group.id}/${section.id}`)
		)
	]);
	const changed = $derived(Object.keys(look.variants).length);

	function fold(id: string) {
		folded = folded.includes(id) ? folded.filter((item) => item !== id) : [...folded, id];
	}

	function onpointerdown(event: PointerEvent) {
		if (isOpen && root && !root.contains(event.target as Node)) isOpen = false;
	}
</script>

<!-- A section's name (capitals) or a sub-section's (plain), with a line saying where in the app it is. -->
{#snippet heading(
	item: PartSectionType,
	key: string,
	parts: PartType[],
	isFolded: boolean,
	isSub: boolean
)}
	{@const picked = parts.filter((part) => look.variants[part.id]).length}
	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-white/5 {isSub
			? 'py-1'
			: 'py-1.5'}"
		aria-expanded={!isFolded}
		onclick={() => fold(key)}
	>
		<span class="min-w-0 flex-1">
			<span
				class="block {isSub
					? 'text-[13px] font-semibold text-white/80'
					: 'text-[11px] font-semibold tracking-[0.14em] text-white/60 uppercase'}"
				>{item.label}</span
			>
			{#if item.note}
				<span class="block text-[10px] leading-snug text-white/35">{item.note}</span>
			{/if}
		</span>
		{#if picked}<span class="size-1.5 shrink-0 rounded-full bg-primary"></span>{/if}
		<span
			class="icon-[mdi--chevron-down] size-4 shrink-0 text-white/50 transition {isFolded
				? '-rotate-90'
				: ''}"
		></span>
	</button>
{/snippet}

{#snippet rows(parts: PartType[])}
	{#each parts as part (part.id)}
		{@const current = look.variant(part.id)}
		<div class="flex items-center gap-2 rounded-lg px-2 py-1">
			<span class="min-w-0 flex-1">
				<span class="block text-[13px] leading-snug text-white/90">{part.label}</span>
				{#if part.note}
					<span class="block text-[10px] leading-snug text-white/40">{part.note}</span>
				{/if}
			</span>
			<span
				class="flex shrink-0 gap-1"
				role="radiogroup"
				aria-label={part.label}
			>
				{#each part.variants as letter (letter)}
					<button
						type="button"
						role="radio"
						aria-checked={current === letter}
						class="flex size-7 items-center justify-center rounded-full text-xs font-semibold transition {current ===
						letter
							? 'bg-primary text-white'
							: 'bg-white/10 text-white/60 hover:bg-white/20'}"
						onclick={() => look.pickVariant(part.id, letter)}>{letter}</button
					>
				{/each}
			</span>
		</div>
	{/each}
{/snippet}

<svelte:window
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
/>

<div
	bind:this={root}
	class="fixed top-[env(safe-area-inset-top)] left-1/2 z-[300] -translate-x-1/2 font-sans"
>
	<button
		type="button"
		class="mx-auto flex h-3.5 w-9 items-center justify-center rounded-b-lg transition {isOpen
			? 'bg-slate-900 text-white'
			: changed
				? 'bg-slate-900/70 text-white'
				: 'bg-slate-900/10 text-slate-500 hover:bg-slate-900/20'}"
		aria-label="Prototypes"
		aria-expanded={isOpen}
		title="Prototypes"
		onclick={() => (isOpen = !isOpen)}
		><span class="icon-[mdi--chevron-down] size-4 transition {isOpen ? 'rotate-180' : ''}"
		></span></button
	>
	{#if isOpen}
		<div
			class="absolute top-full left-1/2 mt-1.5 max-h-[78dvh] w-[min(21rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-slate-900 p-2 text-white shadow-[0_20px_50px_-12px_rgb(0_0_0/0.6)]"
			role="dialog"
			aria-label="Prototypes"
		>
			<div class="flex items-center justify-between px-2 pt-1 pb-2">
				<p class="text-sm font-semibold">Prototypes</p>
				<button
					type="button"
					class="rounded-full px-2.5 py-1 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
					disabled={!changed}
					onclick={() => look.resetVariants()}>Reset all</button
				>
			</div>
			{#each PART_GROUPS as group (group.id)}
				{@const isFolded = folded.includes(group.id)}
				{@render heading(group, group.id, partsOf(group), isFolded, false)}
				{#if !isFolded}
					<div class="pb-1.5">
						{@render rows(group.parts)}
						{#each group.sections ?? [] as section (section.id)}
							{@const key = `${group.id}/${section.id}`}
							{@const isShut = folded.includes(key)}
							<div class="mt-0.5 ml-2 border-l border-white/10 pl-1.5">
								{@render heading(section, key, section.parts, isShut, true)}
								{#if !isShut}{@render rows(section.parts)}{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

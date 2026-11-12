<script lang="ts">
	// PROTOTYPE (#161) run 20: the prototype selector (Justin, 2026-11-11). All that shows is a very small arrow
	// fixed at the top centre, so it never changes how the app reads. A tap opens the list of parts in sections;
	// each row picks that part's letter, and the app changes behind the list at once. It is not part of the design
	// being judged: it is dark, sits over everything, and goes when the prototype does.
	import type { LookState } from './look.state.svelte';
	import { PART_GROUPS } from './variants.data';

	let { look }: { look: LookState } = $props();

	let isOpen = $state(false);
	let root: HTMLDivElement | undefined = $state();
	// Sections with something to choose start open; the rest are folded until asked for.
	let folded = $state<string[]>(
		PART_GROUPS.filter((group) => group.parts.every((part) => part.variants.length < 2)).map(
			(group) => group.id
		)
	);
	const changed = $derived(Object.keys(look.variants).length);

	function fold(id: string) {
		folded = folded.includes(id) ? folded.filter((item) => item !== id) : [...folded, id];
	}

	function onpointerdown(event: PointerEvent) {
		if (isOpen && root && !root.contains(event.target as Node)) isOpen = false;
	}
</script>

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
				{@const picked = group.parts.filter((part) => look.variant(part.id) !== 'A').length}
				<button
					type="button"
					class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase hover:bg-white/5"
					aria-expanded={!isFolded}
					onclick={() => fold(group.id)}
				>
					<span class="flex-1">{group.label}</span>
					{#if picked}<span class="size-1.5 rounded-full bg-primary"></span>{/if}
					<span class="icon-[mdi--chevron-down] size-4 transition {isFolded ? '-rotate-90' : ''}"
					></span>
				</button>
				{#if !isFolded}
					<div class="pb-1">
						{#each group.parts as part (part.id)}
							{@const current = look.variant(part.id)}
							<div class="flex items-center gap-2 rounded-lg px-2 py-1">
								<span class="min-w-0 flex-1">
									<span class="block truncate text-[13px] text-white/90">{part.label}</span>
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
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

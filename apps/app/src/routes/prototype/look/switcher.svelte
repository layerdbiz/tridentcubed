<script lang="ts">
	// PROTOTYPE (#161): the look switcher, tucked into a small tab at the top edge so it stays out of the way of the
	// page title under it. Tapping the tab pops a picker of the looks, each with the page on screen; the arrow keys
	// still step through them. This branch is never merged, so the bar is not gated to dev builds: the preview needs it.
	let {
		looks,
		current,
		name,
		onchange
	}: {
		looks: { id: string; label: string }[];
		current: string;
		name: string;
		onchange: (id: string) => void;
	} = $props();

	const index = $derived(looks.findIndex((look) => look.id === current));
	let isOpen = $state(false);

	function step(by: number) {
		onchange(looks[(index + by + looks.length) % looks.length].id);
	}

	function pick(id: string) {
		onchange(id);
		isOpen = false;
	}

	function onkeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, [contenteditable]')) return;
		if (event.key === 'ArrowLeft') step(-1);
		if (event.key === 'ArrowRight') step(1);
		if (event.key === 'Escape') isOpen = false;
	}
</script>

<svelte:window {onkeydown} />

<button
	class="fixed top-0 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-0.5 rounded-b-xl border border-t-0 border-dashed border-fuchsia-400 bg-slate-950/90 px-2.5 pt-[max(0.125rem,env(safe-area-inset-top))] pb-0.5 text-[11px] leading-4 font-bold text-white shadow-lg backdrop-blur"
	aria-label="Pick a look"
	aria-expanded={isOpen}
	title="Look {index + 1} of {looks.length}"
	onclick={() => (isOpen = !isOpen)}
	>{looks[index]?.label}<span
		class="icon-[mdi--chevron-down] size-3.5 transition-transform {isOpen ? 'rotate-180' : ''}"
	></span></button
>

{#if isOpen}
	<button
		class="fixed inset-0 z-[99] cursor-default"
		aria-label="Close the look picker"
		onclick={() => (isOpen = false)}
	></button>
	<div
		class="fixed top-[max(1.5rem,calc(env(safe-area-inset-top)+1.25rem))] left-1/2 z-[100] w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-dashed border-fuchsia-400 bg-slate-950/95 p-1.5 text-white shadow-2xl backdrop-blur"
		role="listbox"
		aria-label="Looks"
	>
		{#each looks as look (look.id)}
			{@const isCurrent = look.id === current}
			<button
				class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm {isCurrent
					? 'bg-white/15'
					: 'hover:bg-white/10'}"
				role="option"
				aria-selected={isCurrent}
				onclick={() => pick(look.id)}
			>
				<b class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10"
					>{look.label}</b
				>
				<span class="min-w-0 flex-1 truncate">
					Prototype {look.label}{#if isCurrent && name}<span class="text-white/50">
							· {name}</span
						>{/if}
				</span>
				{#if isCurrent}<span class="icon-[mdi--check] size-4 text-fuchsia-300"></span>{/if}
			</button>
		{/each}
	</div>
{/if}

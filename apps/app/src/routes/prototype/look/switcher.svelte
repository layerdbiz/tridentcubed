<script lang="ts">
	// PROTOTYPE (#161): floating switcher from /prototype, fixed at the top centre over the page, so it adds no space
	// and no scroll to the layout under it. It reads like a page title: the look's letter, then the page on screen.
	// This branch is never merged, so the bar is not gated to dev builds: the Vercel preview needs it.
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

	function step(by: number) {
		onchange(looks[(index + by + looks.length) % looks.length].id);
	}

	function onkeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, [contenteditable]')) return;
		if (event.key === 'ArrowLeft') step(-1);
		if (event.key === 'ArrowRight') step(1);
	}
</script>

<svelte:window {onkeydown} />

<div
	class="fixed top-[max(0.5rem,env(safe-area-inset-top))] left-1/2 z-[100] flex max-w-[calc(100vw-7.5rem)] -translate-x-1/2 items-center gap-1 rounded-full border border-dashed border-fuchsia-400 bg-slate-950/90 px-1.5 py-1 text-xs text-white shadow-xl backdrop-blur md:max-w-md"
	title="Look {index + 1} of {looks.length}"
>
	<button
		class="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
		aria-label="Previous look"
		onclick={() => step(-1)}><span class="icon-[mdi--chevron-left] size-5"></span></button
	>
	<span class="min-w-0 truncate px-1"
		><b>{looks[index]?.label}</b>{#if name}<span class="text-white/50"> · </span>{name}{/if}</span
	>
	<button
		class="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
		aria-label="Next look"
		onclick={() => step(1)}><span class="icon-[mdi--chevron-right] size-5"></span></button
	>
</div>

<script lang="ts">
	// PROTOTYPE (#161): floating variant switcher from /prototype. Top centre, clear of the bottom bar and the preview controls.
	// This branch is never merged, so the bar is not gated to dev builds: the Vercel preview needs it.
	let {
		variants,
		current,
		names,
		onchange
	}: {
		variants: string[];
		current: string;
		names: Record<string, string>;
		onchange: (variant: string) => void;
	} = $props();

	function step(by: number) {
		const index = variants.indexOf(current);
		onchange(variants[(index + by + variants.length) % variants.length]);
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
	class="fixed top-2 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full border border-dashed border-fuchsia-400 bg-slate-950/90 px-1.5 py-1 text-xs text-white shadow-xl backdrop-blur"
>
	<button
		class="flex size-7 items-center justify-center rounded-full hover:bg-white/15"
		aria-label="Previous variant"
		onclick={() => step(-1)}><span class="icon-[mdi--chevron-left] size-5"></span></button
	>
	<span class="px-1 whitespace-nowrap"><b>{current}</b> · {names[current]}</span>
	<button
		class="flex size-7 items-center justify-center rounded-full hover:bg-white/15"
		aria-label="Next variant"
		onclick={() => step(1)}><span class="icon-[mdi--chevron-right] size-5"></span></button
	>
</div>

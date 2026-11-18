<script lang="ts">
	// One collapsible panel of the menu (#212; Justin, 2026-11-18): Recents and Online. Its heading is a button with one
	// chevron, which points right while the panel is shut and turns down as it slides open. `words` fades the heading
	// with the rest of the menu's words while the sidebar is folded to icons.
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	let {
		title,
		isOpen,
		ontoggle,
		words = '',
		children
	}: {
		title: string;
		isOpen: boolean;
		ontoggle: () => void;
		words?: string;
		children: Snippet;
	} = $props();
</script>

<button
	type="button"
	class="mt-2 flex w-full items-center gap-1 rounded-xl px-4 py-2 text-left transition hover:bg-slate-900/[0.04] {words}"
	aria-expanded={isOpen}
	onclick={ontoggle}
>
	<span class="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{title}</span>
	<span
		class="icon-[mdi--chevron-right] size-4 shrink-0 text-slate-400 transition-transform duration-200 {isOpen
			? 'rotate-90'
			: ''}"
	></span>
</button>
{#if isOpen}
	<div
		class="space-y-0.5"
		transition:slide={{ duration: 180 }}
	>
		{@render children()}
	</div>
{/if}

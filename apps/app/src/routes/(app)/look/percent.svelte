<script lang="ts">
	// A project's or a panel's percent with its state under it (#305), as the page header, the project bar and each
	// panel's card show it. Given `onclick` it is a button whose tap lists the empty inputs that keep it under 100%
	// (LookState.showEmpty), read out as "40% of Items: show its empty inputs"; without, it only shows them.
	import type { ClassValue } from 'svelte/elements';

	let {
		percent,
		status,
		whose,
		tone,
		percentTone = 'text-slate-900',
		title,
		disabled = false,
		class: className = '',
		onclick
	}: {
		percent: number;
		status: string;
		/** Whose percent, in words: "this project", "Items". */
		whose: string;
		/** The state's colour. */
		tone: string;
		/** The percent's colour: a panel switched off is quiet. */
		percentTone?: string;
		title?: string;
		disabled?: boolean;
		class?: ClassValue;
		onclick?: () => void;
	} = $props();
</script>

{#snippet shown()}
	<span class="block text-lg leading-tight font-semibold tabular-nums {percentTone}"
		>{percent}%</span
	>
	<span class="block text-[10px] font-semibold tracking-[0.12em] uppercase {tone}">{status}</span>
{/snippet}

{#if onclick}
	<button
		type="button"
		class={['shrink-0 rounded-lg text-right enabled:cursor-pointer', className]}
		{disabled}
		{title}
		aria-label="{percent}% of {whose}: show its empty inputs"
		{onclick}>{@render shown()}</button
	>
{:else}
	<span
		class={['shrink-0 text-right', className]}
		{title}>{@render shown()}</span
	>
{/if}

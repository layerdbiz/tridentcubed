<script lang="ts">
	// PROTOTYPE (#161): one group of a group repeater, shared by the photo groups, the time log days and the transport
	// stops (Justin, 2026-10-25): a header that opens and closes it, and drags it when the list can be reordered (no
	// handle, run 8 note 7). Its bottom row holds the caller's `actions` on the left and Delete at the far right (run 8
	// note 10, in place of the ⋮ menu); the caller's `ondelete` asks first (LookState.confirm).
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	let {
		title,
		meta = '',
		note = '',
		icon = '',
		tone = 'bg-primary/10 text-primary',
		isOpen,
		ontoggle,
		ondelete,
		deleteLabel = 'Delete',
		sortKey = '',
		index = 0,
		actions,
		children
	}: {
		title: string;
		meta?: string;
		note?: string;
		icon?: string;
		tone?: string;
		isOpen: boolean;
		ontoggle: () => void;
		ondelete: () => void;
		deleteLabel?: string;
		sortKey?: string;
		index?: number;
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<div
	class="rounded-2xl bg-slate-900/[0.03] transition"
	data-sort={sortKey || undefined}
	data-index={index}
>
	<button
		type="button"
		class="flex w-full min-w-0 items-center gap-2.5 py-3 pr-3 pl-3 text-left select-none [-webkit-touch-callout:none]"
		aria-expanded={isOpen}
		data-grip={sortKey || undefined}
		title={sortKey ? 'Hold and drag to reorder' : undefined}
		onclick={ontoggle}
	>
		{#if icon}
			<span class="flex size-8 shrink-0 items-center justify-center rounded-xl {tone}"
				><span class="{icon} size-5"></span></span
			>
		{/if}
		<span class="min-w-0 flex-1">
			<span class="block truncate text-sm font-semibold text-slate-800">{title}</span>
			{#if note}<span class="block truncate text-[11px] text-slate-400">{note}</span>{/if}
		</span>
		{#if meta}<span class="shrink-0 text-xs text-slate-400">{meta}</span>{/if}
		<span
			class="icon-[mdi--chevron-down] size-5 shrink-0 text-slate-400 transition {isOpen
				? 'rotate-180'
				: ''}"
		></span>
	</button>
	{#if isOpen}
		<div
			class="space-y-3 px-4 pb-3"
			transition:slide={{ duration: 180 }}
		>
			{@render children()}
			<div class="-mx-1 flex flex-wrap items-center gap-2">
				{@render actions?.()}
				<button
					type="button"
					class="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
					onclick={ondelete}
					><span class="icon-[mdi--trash-can-outline] size-[18px]"></span>{deleteLabel}</button
				>
			</div>
		</div>
	{/if}
</div>

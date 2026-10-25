<script lang="ts">
	// PROTOTYPE (#161): one group of a group repeater, shared by the photo groups, the time log days and the transport
	// stops (Justin, 2026-10-25): a header that opens and closes it, a grip when the list can be dragged, and a ⋮ menu
	// that tucks Delete away. The caller's `ondelete` asks first (LookState.confirm).
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import Menu from './menu.svelte';

	let {
		title,
		meta = '',
		note = '',
		icon = '',
		isOpen,
		ontoggle,
		ondelete,
		deleteLabel = 'Delete',
		sortKey = '',
		index = 0,
		children
	}: {
		title: string;
		meta?: string;
		note?: string;
		icon?: string;
		isOpen: boolean;
		ontoggle: () => void;
		ondelete: () => void;
		deleteLabel?: string;
		sortKey?: string;
		index?: number;
		children: Snippet;
	} = $props();
</script>

<div
	class="rounded-2xl bg-slate-900/[0.03] transition"
	data-sort={sortKey || undefined}
	data-index={index}
>
	<div class="flex items-center gap-1 py-2 pr-1 pl-2">
		{#if sortKey}
			<span
				class="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500"
				data-grip={sortKey}
				title="Drag to reorder"><span class="icon-[mdi--drag] size-5"></span></span
			>
		{/if}
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-2.5 py-1 pl-1 text-left"
			aria-expanded={isOpen}
			onclick={ontoggle}
		>
			{#if icon}
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
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
		<Menu
			label="More for {title}"
			value=""
			options={[
				{ id: 'delete', label: deleteLabel, icon: 'icon-[mdi--trash-can-outline]', isDanger: true }
			]}
			onpick={ondelete}
		>
			{#snippet trigger(_, isMenuOpen)}
				<span
					class="flex size-8 items-center justify-center rounded-full transition {isMenuOpen
						? 'bg-slate-900/[0.06] text-slate-700'
						: 'text-slate-400 hover:bg-slate-900/[0.05] hover:text-slate-600'}"
					><span class="icon-[mdi--dots-vertical] size-5"></span></span
				>
			{/snippet}
		</Menu>
	</div>
	{#if isOpen}
		<div
			class="space-y-3 px-4 pb-4"
			transition:slide={{ duration: 180 }}
		>
			{@render children()}
		</div>
	{/if}
</div>

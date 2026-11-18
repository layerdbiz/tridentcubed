<script lang="ts">
	// PROTOTYPE (#161): one group of a group repeater, shared by the photo groups, the time log days and the transport
	// stops (Justin, 2026-10-25): a header that opens and closes it, and drags it when the list can be reordered (no
	// handle, run 8 note 7). Its bottom row holds the caller's `actions` on the left and Delete at the far right (run 8
	// note 10, in place of the ⋮ menu); the caller's `ondelete` asks first (LookState.confirm).
	// 2026-11-16 (Justin): under its name every section says how much of it is filled in, the way a panel does
	// ("1 of 3 complete"), from the `values` its caller says count (tally.ts). No line describes it any more.
	// Its header is not a button: a Sent or Complete project switches its panels' fields off, and a button would
	// go off with them, so its sections could not be opened to read (Justin, 2026-11-16).
	// #215 (Justin, 2026-11-18): a section that can be left out of the report has a switch in its header, as a panel
	// that can be left out does (`onenable`). Switched off it keeps what it holds, greys, and says it is left out.
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { toTally } from './tally';

	let {
		title,
		meta = '',
		values,
		icon = '',
		tone = 'bg-primary/10 text-primary',
		isOpen,
		ontoggle,
		ondelete,
		isEnabled = true,
		onenable,
		deleteLabel = 'Delete',
		sortKey = '',
		index = 0,
		actions,
		image,
		children
	}: {
		title: string;
		meta?: string;
		// What counts toward the section being complete: each one that holds something is one done.
		values?: unknown[];
		icon?: string;
		tone?: string;
		isOpen: boolean;
		ontoggle: () => void;
		// Left out for a section that is always there (the Team, the Trip).
		ondelete?: () => void;
		// Whether it is in the report, and what its switch does; with no `onenable` it has no switch.
		isEnabled?: boolean;
		onenable?: () => void;
		deleteLabel?: string;
		sortKey?: string;
		index?: number;
		actions?: Snippet;
		// A picture in place of the icon: a transport's own photo.
		image?: string;
		children: Snippet;
	} = $props();
</script>

<div
	class="rounded-2xl bg-slate-900/[0.03] transition"
	data-sort={sortKey || undefined}
	data-index={index}
>
	<div
		role="button"
		tabindex="0"
		class="flex w-full min-w-0 cursor-pointer items-center gap-2.5 py-3 pr-3 pl-3 text-left select-none [-webkit-touch-callout:none]"
		aria-expanded={isOpen}
		data-grip={sortKey || undefined}
		title={sortKey ? 'Hold and drag to reorder' : undefined}
		onclick={ontoggle}
		onkeydown={(event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			ontoggle();
		}}
	>
		{#if image}
			<img
				src={image}
				alt=""
				draggable="false"
				class="size-8 shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-900/10"
			/>
		{:else if icon}
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-xl {isEnabled
					? tone
					: 'bg-slate-100 text-slate-300'}"><span class="{icon} size-5"></span></span
			>
		{/if}
		<span class="min-w-0 flex-1">
			<span
				class="block truncate text-sm font-semibold {isEnabled
					? 'text-slate-800'
					: 'text-slate-400'}">{title}</span
			>
			{#if !isEnabled}<span class="block truncate text-xs text-slate-500"
					>Left out of the report</span
				>
			{:else if values}<span class="block truncate text-xs text-slate-500">{toTally(values)}</span
				>{/if}
		</span>
		{#if meta}<span class="shrink-0 text-xs text-slate-400">{meta}</span>{/if}
		{#if onenable}
			<!-- Its own button inside the header: a tap or a key on it switches, and does not open the section or
			     start a drag. A Sent or Complete project's fields are off, and this goes off with them. -->
			<button
				type="button"
				role="switch"
				aria-checked={isEnabled}
				aria-label="{isEnabled ? 'Leave out' : 'Put back'} {title}"
				title={isEnabled ? 'In the report' : 'Left out of the report'}
				class="flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50 {isEnabled
					? 'justify-end bg-primary'
					: 'justify-start bg-slate-300'}"
				data-no-drag
				onclick={(event) => {
					event.stopPropagation();
					onenable();
				}}
				onkeydown={(event) => event.stopPropagation()}
				><span class="size-4 rounded-full bg-white shadow"></span></button
			>
		{/if}
		<span
			class="icon-[mdi--chevron-down] size-5 shrink-0 text-slate-400 transition {isOpen
				? 'rotate-180'
				: ''}"
		></span>
	</div>
	{#if isOpen}
		<div
			class="space-y-3 px-4 pb-3"
			transition:slide={{ duration: 180 }}
		>
			{@render children()}
			<div class="-mx-1 flex flex-wrap items-center gap-2">
				{@render actions?.()}
				{#if ondelete}
					<button
						type="button"
						class="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
						onclick={ondelete}
						><span class="icon-[mdi--trash-can-outline] size-[18px]"></span>{deleteLabel}</button
					>
				{/if}
			</div>
		</div>
	{/if}
</div>

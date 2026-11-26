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
	// #305: `section` is its id in tally.ts, so an entry of the empty-inputs list finds its inputs (focus.ts).
	// #389: the folding itself is the library's Accordion (header, grip, controls, slide, foot row with Delete); this
	// file keeps what is the app's own: the icon, the name and its tally, the meta and the in-the-report switch.
	// 2026-11-26 (Justin): a library piece's look is set from outside, so the panel groups' look is given here: the
	// faint box, the grey chevron and the red Delete (until #384 picks the Delete's Button type).
	import type { Snippet } from 'svelte';
	import { Accordion, Avatar, Switch } from '@layerd/ui';
	import { toTally } from './tally';

	// The Delete at a group's foot: red words and bin on no box, faintly red behind under a pointer.
	const DELETE_LOOK = {
		unstyled: true,
		icon: 'icon-[mdi--trash-can-outline] size-[18px]',
		class:
			'ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10'
	};

	let {
		title,
		meta = '',
		values,
		icon = '',
		number,
		tone = 'bg-primary/10 text-primary',
		isOpen,
		ontoggle,
		ondelete,
		isEnabled = true,
		onenable,
		deleteLabel = 'Delete',
		sortKey = '',
		index = 0,
		section = '',
		actions,
		image,
		children
	}: {
		title: string;
		meta?: string;
		// What counts toward the section being complete: each one that holds something is one done.
		values?: unknown[];
		icon?: string;
		// Its number in a round badge, in place of the icon: a stage of the Operations panel (Justin, 2026-11-19).
		// None (a stage left out of the report) shows the icon.
		number?: number;
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
		// The section's id in tally.ts (`sectionsOf`).
		section?: string;
		actions?: Snippet;
		// A picture in place of the icon: a transport's own photo.
		image?: string;
		children: Snippet;
	} = $props();
</script>

<Accordion
	class="rounded-2xl bg-slate-900/[0.03] transition"
	icon="icon-[mdi--chevron-down] text-slate-400"
	deleteButton={DELETE_LOOK}
	open={isOpen}
	{ontoggle}
	grip={sortKey || undefined}
	controls={onenable ? enable : undefined}
	{actions}
	{ondelete}
	{deleteLabel}
	data-sort={sortKey || undefined}
	data-index={index}
	data-section={section || undefined}
>
	{#snippet head()}
		{#if image}
			<Avatar
				src={image}
				alt=""
				size={32}
				ring="ring-1 ring-slate-900/10"
			/>
		{:else if number}
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums {tone}"
				>{number}</span
			>
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
	{/snippet}
	{@render children()}
</Accordion>

<!-- The in-the-report switch, in the header's controls, where a tap or a key on it never opens the section or starts a
     drag. A Sent or Complete project's fields are off, and this goes off with them. -->
{#snippet enable()}
	<Switch
		size="sm"
		checked={isEnabled}
		label="{isEnabled ? 'Leave out' : 'Put back'} {title}"
		title={isEnabled ? 'In the report' : 'Left out of the report'}
		onchange={onenable}
	/>
{/snippet}

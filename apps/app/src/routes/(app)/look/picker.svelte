<script
	module
	lang="ts"
>
	export type PickType = {
		id: string;
		label: string;
		note?: string;
		image?: string;
		icon?: string;
		// A plain colour in place of an icon: Start blue, Stop amber, End green.
		dot?: string;
		// A choice that takes something away reads red.
		isDanger?: boolean;
	};
</script>

<script lang="ts">
	// PROTOTYPE (#161) run 21: the one dropdown with a picture on its left (Justin, 2026-11-11: "we probably need a
	// component for that ... it shouldn't be different every time"). Whatever is picked shows as what it is: a person
	// is the same Avatar the rest of the app draws, online dot and ring included; a customer is its logo
	// (ClientLogo); anything else is its own image, an icon or a dot of colour. The list shows the same marks. Given
	// `values` it picks several and stays open. The list itself is menu.svelte.
	// Run 28 (Justin, 2026-11-12: "this needs to happen for every select menu in the entire app"): it is the only
	// dropdown a form uses. A list of more than five can be typed into, to narrow it. `onadd` puts "Add new" at the
	// top of the list. `onedit` puts a pencil on each choice and on the field once something is picked, to open it.
	// In the list one icon marks each choice, grey until it is the one under the pointer or the one picked.
	// Run 29 (his second round of notes): the field is always one line, the pencil shows only in the open list, and
	// a short field never cuts its word.
	import type { Snippet } from 'svelte';
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import Menu from './menu.svelte';

	let {
		label,
		options,
		value = '',
		values,
		kind = 'plain',
		icon = 'icon-[mdi--chevron-right]',
		placeholder = 'Choose',
		many = 'people',
		hasLabel = true,
		isCompact = false,
		isDisabled = false,
		isRequired = true,
		isSearchable,
		onpick,
		onadd,
		addLabel,
		onedit,
		inset
	}: {
		label: string;
		options: PickType[];
		value?: string;
		// Given, several can be picked.
		values?: string[];
		// What the options are: people by name, customers by name, or anything with its own image or icon.
		kind?: 'person' | 'customer' | 'plain';
		// The icon for a plain option with no image of its own, and for the empty field.
		icon?: string;
		placeholder?: string;
		// What several picks are called: "3 people".
		many?: string;
		// False for a second row of the same fields, which the first row's labels already name.
		hasLabel?: boolean;
		// A narrow field beside another: a small mark and less room between.
		isCompact?: boolean;
		isDisabled?: boolean;
		// Shows the amber dot while nothing is picked.
		isRequired?: boolean;
		// A field to type in at the top of the list. Left out, a list of more than five has one.
		isSearchable?: boolean;
		onpick: (id: string) => void;
		// Puts "Add new" at the top of the list.
		onadd?: () => void;
		// What "Add new" names, when it is not the label: a field called Start adds a Facility.
		addLabel?: string;
		// Opens a choice to edit it: a pencil on each one in the open list.
		onedit?: (id: string) => void;
		// A control of its own inside the field, at its left, in place of the mark: a facility's Start, Stop or End.
		// A tap on it is its own; a tap anywhere else on the field opens this dropdown.
		inset?: Snippet;
	} = $props();

	// The panels' soft field: filled, borderless, lit when open.
	const FIELD =
		'w-full rounded-xl border-0 bg-slate-900/[0.04] px-2 py-1.5 text-sm text-slate-900 transition';
	const LABEL = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';
	const LIT = 'bg-primary/10 text-primary';
	const QUIET =
		'bg-slate-100 text-slate-400 group-hover/option:bg-primary/10 group-hover/option:text-primary';

	const picked = $derived(values ?? (value ? [value] : []));
	// How wide the inset is, so the field's words start after it.
	let insetWidth = $state(0);

	function optionOf(id: string) {
		return options.find((option) => option.id === id);
	}
</script>

<!-- What something is, as a round mark: the same in the field and in the list. `isLit` is the field's own mark, or
     the choice picked; the rest of a list is grey until pointed at. -->
{#snippet face(id: string, size: number, isLit: boolean)}
	{@const option = optionOf(id)}
	{#if kind === 'person'}
		<Avatar
			name={id}
			{size}
		/>
	{:else if kind === 'customer'}
		<ClientLogo
			name={id}
			{size}
			shape="circle"
		/>
	{:else if option?.image}
		<img
			src={option.image}
			alt=""
			draggable="false"
			class="shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-900/10"
			style="width: {size}px; height: {size}px"
		/>
	{:else if option?.dot}
		<span
			class="flex shrink-0 items-center justify-center"
			style="width: {size}px; height: {size}px"
			><span class="size-3 rounded-full {option.dot}"></span></span
		>
	{:else if option?.isDanger}
		<span
			class="flex shrink-0 items-center justify-center text-danger"
			style="width: {size}px; height: {size}px"><span class="{option.icon} size-[60%]"></span></span
		>
	{:else}
		<span
			class="flex shrink-0 items-center justify-center rounded-full transition {isLit
				? LIT
				: QUIET}"
			style="width: {size}px; height: {size}px"
			><span class="{option?.icon || icon} size-[60%]"></span></span
		>
	{/if}
{/snippet}

{#snippet field(isOpen: boolean)}
	<span
		class="{FIELD} flex min-h-[44px] items-center text-left {isCompact
			? 'gap-1.5'
			: 'gap-2.5'} {isOpen ? 'bg-white ring-2 ring-primary/40' : ''} {isDisabled
			? 'opacity-60'
			: ''}"
		style:padding-left={inset ? `${insetWidth + 14}px` : undefined}
	>
		{#if inset}
			<!-- The inset sits over this space, as a button of its own. -->
		{:else if picked.length}
			<span class="flex shrink-0 items-center pl-0.5">
				{#each picked.slice(0, 5) as id, index (id)}
					<span
						class="relative flex"
						style="margin-left: {index ? -8 : 0}px; z-index: {10 - index}"
						>{@render face(id, isCompact ? 16 : 28, true)}</span
					>
				{/each}
			</span>
		{:else if !isCompact}
			<span
				class="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.05] text-slate-400"
				><span class="{icon} size-4"></span></span
			>
		{/if}
		{#if picked.length}
			<span class="min-w-0 flex-1 {isCompact ? 'whitespace-nowrap' : 'truncate'}"
				>{picked.length === 1
					? (optionOf(picked[0])?.label ?? picked[0])
					: `${picked.length} ${many}`}</span
			>
		{:else}
			<span class="min-w-0 flex-1 truncate text-slate-400">{placeholder}</span>
		{/if}
		<span class="mr-1 icon-[mdi--chevron-down] size-4 shrink-0 text-slate-400"></span>
	</span>
{/snippet}

<div>
	{#if hasLabel}
		<p class={LABEL}>
			{label}
			{#if isRequired && !picked.length}<span
					class="size-1.5 rounded-full bg-warning"
					title="Not picked yet"
				></span>{/if}
		</p>
	{/if}
	{#if isDisabled}
		{@render field(false)}
	{:else}
		<div class="relative">
			<Menu
				{label}
				{value}
				{values}
				{options}
				{onpick}
				{onadd}
				{addLabel}
				{onedit}
				isSearchable={isSearchable ?? options.length > 5}
				align="left"
				isWide
			>
				{#snippet mark(option, isOn)}{@render face(option.id, 28, isOn)}{/snippet}
				{#snippet trigger(_, isOpen)}{@render field(isOpen)}{/snippet}
			</Menu>
			{#if inset}
				<div
					class="absolute top-1/2 left-1.5 -translate-y-1/2"
					bind:clientWidth={insetWidth}
				>
					{@render inset()}
				</div>
			{/if}
		</div>
	{/if}
</div>

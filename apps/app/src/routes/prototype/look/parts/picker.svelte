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
	};
</script>

<script lang="ts">
	// PROTOTYPE (#161) run 21: the one dropdown with a picture on its left (Justin, 2026-11-11: "we probably need a
	// component for that ... it shouldn't be different every time"). Whatever is picked shows as what it is: a person
	// is the same Avatar the rest of the app draws, online dot and ring included; a customer is its logo
	// (ClientLogo); anything else is its own image, or an icon. The list shows the same marks. Given `values` it
	// picks several and stays open; given `onadd` it ends with "Add new". The list itself is menu.svelte.
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import Menu, { type OptionType } from './menu.svelte';

	let {
		label,
		options,
		value = '',
		values,
		kind = 'plain',
		icon = 'icon-[mdi--chevron-right]',
		placeholder = 'Choose…',
		many = 'people',
		isDisabled = false,
		isRequired = true,
		onpick,
		onadd
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
		isDisabled?: boolean;
		// Shows the amber dot while nothing is picked.
		isRequired?: boolean;
		onpick: (id: string) => void;
		// Adds "Add new" as the last choice.
		onadd?: () => void;
	} = $props();

	const ADD = '__add';
	// The panels' soft field: filled, borderless, lit when open.
	const FIELD =
		'w-full rounded-xl border-0 bg-slate-900/[0.04] px-2 py-1.5 text-sm text-slate-900 transition';
	const LABEL = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';

	const picked = $derived(values ?? (value ? [value] : []));
	const list = $derived<OptionType[]>([
		...options,
		...(onadd ? [{ id: ADD, label: `Add new ${label}…` }] : [])
	]);

	function optionOf(id: string) {
		return options.find((option) => option.id === id);
	}

	function pick(id: string) {
		if (id === ADD) onadd?.();
		else onpick(id);
	}
</script>

<!-- What something is, as a round mark: the same in the field and in the list. -->
{#snippet face(id: string, size: number)}
	{@const option = optionOf(id)}
	{#if id === ADD}
		<span
			class="flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
			style="width: {size}px; height: {size}px"
			><span class="icon-[mdi--plus] size-[60%]"></span></span
		>
	{:else if kind === 'person'}
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
	{:else}
		<span
			class="flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
			style="width: {size}px; height: {size}px"
			><span class="{option?.icon || icon} size-[60%]"></span></span
		>
	{/if}
{/snippet}

{#snippet field(isOpen: boolean)}
	<span
		class="{FIELD} flex min-h-[44px] items-center gap-2.5 text-left {isOpen
			? 'bg-white ring-2 ring-primary/40'
			: ''} {isDisabled ? 'opacity-60' : ''}"
	>
		{#if picked.length}
			<span class="flex shrink-0 items-center pl-0.5">
				{#each picked.slice(0, 5) as id, index (id)}
					<span
						class="relative flex"
						style="margin-left: {index ? -8 : 0}px; z-index: {10 - index}"
						>{@render face(id, 28)}</span
					>
				{/each}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate"
					>{picked.length === 1
						? (optionOf(picked[0])?.label ?? picked[0])
						: `${picked.length} ${many}`}</span
				>
				{#if picked.length === 1 && optionOf(picked[0])?.note}
					<span class="block truncate text-[11px] text-slate-400">{optionOf(picked[0])?.note}</span>
				{/if}
			</span>
		{:else}
			<span
				class="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.05] text-slate-400"
				><span class="{icon} size-4"></span></span
			>
			<span class="flex-1 truncate text-slate-400">{placeholder}</span>
		{/if}
		<span class="mr-1 icon-[mdi--chevron-down] size-4 shrink-0 text-slate-400"></span>
	</span>
{/snippet}

<div>
	<p class={LABEL}>
		{label}
		{#if isRequired && !picked.length}<span
				class="size-1.5 rounded-full bg-warning"
				title="Not picked yet"
			></span>{/if}
	</p>
	{#if isDisabled}
		{@render field(false)}
	{:else}
		<Menu
			{label}
			{value}
			{values}
			options={list}
			onpick={pick}
			align="left"
			isWide
		>
			{#snippet mark(option)}{@render face(option.id, 28)}{/snippet}
			{#snippet trigger(_, isOpen)}{@render field(isOpen)}{/snippet}
		</Menu>
	{/if}
</div>

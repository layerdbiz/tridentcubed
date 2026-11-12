<script
	module
	lang="ts"
>
	export type OptionType = {
		id: string;
		label: string;
		// A second, quieter line under the label: a facility's city.
		note?: string;
		icon?: string;
		// A round picture in place of an icon: a face or a logo.
		image?: string;
		dot?: string;
		count?: number;
		// A delete in a ⋮ menu reads red.
		isDanger?: boolean;
	};
</script>

<script lang="ts">
	// PROTOTYPE (#161): a small dropdown menu (view and status pickers, each photo's ⋮ menu, and the list every
	// dropdown field opens, picker.svelte). Closes on a pick, outside tap or Escape. `isWide` fills its row. The list
	// opens in the browser's top layer (a popover), placed under its button, or over it when there is no room below,
	// so no scrolling or rounded box around the button cuts it off (the ⋮ of each project in the dashboard's lists,
	// 2026-10-26). Run 28 (Justin, 2026-11-12, for every dropdown in the app): `isSearchable` puts a field at the
	// top to type in, which narrows the list; `onadd` puts "Add new" right under it; `onedit` puts a pencil at the
	// far right of every choice, which opens that thing to edit it.
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { scale } from 'svelte/transition';

	let {
		options,
		value,
		label,
		onpick,
		trigger,
		mark,
		align = 'right',
		isWide = false,
		values,
		isSearchable = false,
		onadd,
		addLabel = '',
		onedit,
		top
	}: {
		options: OptionType[];
		value: string;
		label: string;
		onpick: (id: string) => void;
		trigger: Snippet<[OptionType | undefined, boolean]>;
		// Draws what stands at the left of an option, in place of its icon or image (picker.svelte's faces and logos).
		// The second argument says the option is the one picked.
		mark?: Snippet<[OptionType, boolean]>;
		align?: 'left' | 'right';
		isWide?: boolean;
		// Given, the menu picks several: every id in it is ticked, and a pick does not close the list (run 19).
		values?: string[];
		isSearchable?: boolean;
		onadd?: () => void;
		addLabel?: string;
		onedit?: (id: string) => void;
		// Drawn at the head of the open list, above the search.
		top?: Snippet;
	} = $props();

	let isOpen = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let place = $state('');
	let query = $state('');
	const current = $derived(options.find((option) => option.id === value));
	const shown = $derived.by(() => {
		const words = query.trim().toLowerCase();
		if (!words) return options;
		return options.filter((option) =>
			`${option.label} ${option.note ?? ''}`.toLowerCase().includes(words)
		);
	});

	function onpointerdown(event: PointerEvent) {
		if (isOpen && root && !root.contains(event.target as Node)) isOpen = false;
	}

	function toggle() {
		if (isOpen || !root) return (isOpen = false);
		const box = root.getBoundingClientRect();
		const tall = options.length * 44 + 16 + (isSearchable ? 48 : 0) + (onadd ? 44 : 0);
		const below = innerHeight - box.bottom - 24;
		const above = box.top - 24;
		const isUp = below < tall && above > below;
		const x = align === 'right' ? `right: ${innerWidth - box.right}px` : `left: ${box.left}px`;
		const y = isUp ? `bottom: ${innerHeight - box.top + 8}px` : `top: ${box.bottom + 8}px`;
		// Run 14 (note 5): never taller than the room on its side, or 360px; longer lists scroll inside it.
		const most = Math.max(140, Math.min(isUp ? above : below, 360));
		place = `${x}; ${y}; min-width: ${isWide ? box.width : 192}px; max-width: ${innerWidth - 16}px; max-height: ${most}px`;
		query = '';
		isOpen = true;
	}

	function pick(id: string) {
		onpick(id);
		if (!values) isOpen = false;
	}

	// In the top layer, and closed by any scroll outside it, which would leave it behind. Its own scroll keeps it open.
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover();
		const close = (event: Event) => {
			if (!node.contains(event.target as Node)) isOpen = false;
		};
		document.addEventListener('scroll', close, { capture: true, passive: true });
		return () => document.removeEventListener('scroll', close, { capture: true });
	};

	// With a mouse the search field is ready to type in at once; on a phone it waits for a tap, so the keyboard does
	// not cover the list the moment it opens.
	const ready: Attachment<HTMLInputElement> = (node) => {
		if (matchMedia('(pointer: fine)').matches) node.focus({ preventScroll: true });
	};
</script>

<svelte:window
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
	onresize={() => (isOpen = false)}
/>

<div
	class="relative {isWide ? 'w-full' : ''}"
	bind:this={root}
>
	<button
		type="button"
		class="flex items-center {isWide ? 'w-full' : ''}"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-label={label}
		onclick={toggle}>{@render trigger(current, isOpen)}</button
	>
	{#if isOpen}
		<div
			popover="manual"
			class="fixed m-0 flex flex-col overflow-hidden rounded-2xl border-0 bg-white text-left shadow-[0_2px_6px_rgb(15_23_42/0.06),0_20px_44px_-12px_rgb(15_23_42/0.28)]"
			style="inset: auto; {place}"
			transition:scale={{ start: 0.95, duration: 140 }}
			{@attach lift}
		>
			{#if top}
				<div class="shrink-0 border-b border-slate-900/[0.06] p-1.5">{@render top()}</div>
			{/if}
			{#if isSearchable}
				<label
					class="flex shrink-0 items-center gap-2 border-b border-slate-900/[0.06] px-3.5 py-2.5 text-slate-400"
				>
					<span class="icon-[mdi--magnify] size-[18px] shrink-0"></span>
					<input
						class="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
						type="search"
						placeholder="Search"
						aria-label="Search {label}"
						autocomplete="off"
						bind:value={query}
						onkeydown={(event) => {
							if (event.key !== 'Enter') return;
							event.preventDefault();
							if (shown[0]) pick(shown[0].id);
						}}
						{@attach ready}
					/>
				</label>
			{/if}
			<div
				class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
				role="listbox"
				aria-label={label}
			>
				{#if onadd}
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-primary transition hover:bg-primary/[0.08]"
						onclick={() => {
							isOpen = false;
							onadd();
						}}
					>
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10"
							><span class="icon-[mdi--plus] size-[18px]"></span></span
						>
						<span class="flex-1">Add new {addLabel || label}</span>
					</button>
				{/if}
				{#each shown as option (option.id)}
					{@const isOn = values ? values.includes(option.id) : option.id === value}
					<div class="group/option flex items-center">
						<button
							type="button"
							role="option"
							aria-selected={isOn}
							class="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition {option.isDanger
								? 'font-medium text-danger hover:bg-danger/10'
								: isOn
									? 'bg-primary/[0.08] font-medium text-slate-900'
									: 'text-slate-600 hover:bg-slate-900/[0.04]'}"
							onclick={() => pick(option.id)}
						>
							{#if mark}{@render mark(option, isOn)}{:else}
								{#if option.image}<img
										src={option.image}
										alt=""
										class="size-7 shrink-0 rounded-full bg-slate-200 object-cover"
									/>{/if}
								{#if option.icon}<span
										class="{option.icon} size-[18px] shrink-0 {option.isDanger
											? ''
											: 'text-slate-500'}"
									></span>{/if}
								{#if option.dot}<span class="size-2.5 shrink-0 rounded-full {option.dot}"
									></span>{/if}
							{/if}
							<!-- One line: the name, and what places it (a city) in grey at the right. -->
							<span class="min-w-0 flex-1 truncate">{option.label}</span>
							{#if option.note}<span
									class="max-w-[45%] shrink-0 truncate text-xs font-normal text-slate-400"
									>{option.note}</span
								>{/if}
							{#if option.count !== undefined}<span class="text-xs text-slate-400 tabular-nums"
									>{option.count}</span
								>{/if}
							{#if isOn}<span class="icon-[mdi--check] size-4 shrink-0 text-primary"></span>{/if}
						</button>
						{#if onedit}
							<button
								type="button"
								class="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-900/[0.05] hover:text-primary"
								aria-label="Edit {option.label}"
								title="Edit"
								onclick={() => {
									isOpen = false;
									onedit(option.id);
								}}><span class="icon-[mdi--pencil-outline] size-[18px]"></span></button
							>
						{/if}
					</div>
				{:else}
					<p class="px-3 py-2 text-sm text-slate-400">Nothing matches</p>
				{/each}
			</div>
		</div>
	{/if}
</div>

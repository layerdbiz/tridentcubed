<script lang="ts">
	/**
	 * @tags ui, menu
	 */
	// The menu list (#297): the list the app's dropdown opens (its picker), and its account menu, ⋮ menus, list menus
	// and cards' menus. Moved here from the app unchanged (Justin, 2026-11-24): it sits beside the toggle rather than
	// on the toggle's own menu, which opens in place and would be cut off inside scrolling boxes. It keeps the app's
	// slate shades so nothing looks different; trading them for theme colours belongs to "UI library cleanup" (#33).
	//
	// It draws its own outer box, not the base component: the app shows one per row's ⋮, and built on the base
	// component a swipe between the dashboard's lists took about twice the script time on a slowed phone (measured on
	// #297). Its props are its own for the same reason; none of the base props would do anything here.
	//
	// Closes on a pick, a tap outside or Escape. `isWide` fills its row, and its list is as wide as the row. The list
	// opens in the browser's top layer (a popover), placed under its button, or over it when there is no room below, so
	// no scrolling or rounded box around the button cuts it off (the ⋮ of each project in the dashboard's lists,
	// 2026-10-26), and never reaches past the edge of the screen, so the pencil at the right of a choice always shows
	// (Justin, 2026-11-24: a facility's list ran off the phone's edge and took its pencils with it). `isSearchable` puts a field
	// at the top to type in, which narrows the list; `onadd` puts "Add new" right under it; `onedit` puts a pencil at
	// the far right of every choice, which opens that thing to edit it (run 28, Justin, 2026-11-12, for every dropdown
	// in the app).
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { scale } from 'svelte/transition';
	import { Avatar } from '@layerd/ui';

	export interface MenuOptionType {
		id: string;
		label: string;
		// A second, quieter line under the label: a facility's city, a contact's title.
		note?: string;
		icon?: string;
		// A round picture in place of an icon: a face or a logo, and how it fills its circle (a logo `contain`).
		image?: string;
		fit?: 'cover' | 'contain';
		dot?: string;
		count?: number;
		// A delete in a ⋮ menu reads red.
		isDanger?: boolean;
	}

	export interface MenuProps {
		options: MenuOptionType[];
		value: string;
		// The list's name, read out for its button, its list and its search field.
		label: string;
		onpick: (id: string) => void;
		// What the button shows, told the picked choice and whether the list is open.
		trigger: Snippet<[MenuOptionType | undefined, boolean]>;
		// Draws what stands at the left of a choice, in place of its icon or image (a picker's faces and logos).
		// The second argument says the choice is the one picked.
		mark?: Snippet<[MenuOptionType, boolean]>;
		align?: 'left' | 'right';
		// Which way it opens when it fits either way: under its button, or over it (#376: a toolbar at the foot of a
		// box, the photo pop-up's More, whose list would otherwise fall below the box on a tall screen).
		opens?: 'down' | 'up';
		isWide?: boolean;
		// Given, the menu picks several: every id in it is ticked, and a pick does not close the list (run 19).
		values?: string[];
		isSearchable?: boolean;
		onadd?: () => void;
		addLabel?: string;
		onedit?: (id: string) => void;
	}

	let {
		options,
		value,
		label,
		onpick,
		trigger,
		mark,
		align = 'right',
		opens = 'down',
		isWide = false,
		values,
		isSearchable = false,
		onadd,
		addLabel = '',
		onedit
	}: MenuProps = $props();

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

	// Where the list goes: under its button, or over it when there is more room there. Only the part of the screen
	// in view counts, so with a phone's keyboard up the list stays above the keyboard. Nothing when the button has
	// left the view.
	function placeOf() {
		if (!root) return '';
		const box = root.getBoundingClientRect();
		const view = window.visualViewport;
		const [viewTop, viewHeight] = [view?.offsetTop ?? 0, view?.height ?? innerHeight];
		if (box.bottom < viewTop || box.top > viewTop + viewHeight) return '';
		const rows = options.reduce((sum, option) => sum + (option.note ? 52 : 44), 0);
		const tall = rows + 16 + (isSearchable ? 48 : 0) + (onadd ? 44 : 0);
		const below = viewTop + viewHeight - box.bottom - 24;
		const above = box.top - viewTop - 24;
		const need = Math.min(tall, 220);
		const isUp = opens === 'up' ? above >= need || above > below : below < need && above > below;
		const x = align === 'right' ? `right: ${innerWidth - box.right}px` : `left: ${box.left}px`;
		const y = isUp ? `bottom: ${innerHeight - box.top + 8}px` : `top: ${box.bottom + 8}px`;
		// Run 14 (note 5): never taller than the room on its side, or 360px; longer lists scroll inside it.
		const most = Math.max(140, Math.min(isUp ? above : below, 360));
		// Never wider than the room from its button's edge to the screen's, keeping 8px clear.
		const room = Math.min(
			innerWidth - 16,
			align === 'right' ? box.right - 8 : innerWidth - box.left - 8
		);
		const across = isWide
			? `width: ${Math.min(Math.max(box.width, 192), room)}px`
			: `min-width: ${Math.min(192, room)}px; max-width: ${room}px`;
		return `${x}; ${y}; ${across}; max-height: ${most}px`;
	}

	function toggle() {
		if (isOpen || !root) return (isOpen = false);
		place = placeOf();
		query = '';
		isOpen = true;
	}

	// The page moved or the keyboard came up under an open list: the list follows its button. It closes only once
	// the button is out of view, and never while its search field is being typed in. (It used to close on any
	// scroll or change of size, and a tap in the search field does both on a phone, so the field could never be
	// typed in: Cezary's vessel search, 2026-11-16.)
	function follow() {
		if (!isOpen) return;
		const next = placeOf();
		if (next) place = next;
		else if (!root?.contains(document.activeElement) || document.activeElement?.tagName !== 'INPUT')
			isOpen = false;
	}

	function pick(id: string) {
		onpick(id);
		if (!values) isOpen = false;
	}

	// In the top layer. A scroll outside it, a turned phone or the keyboard coming up moves it with its button.
	// Safari 16 and older (2022) has no popovers: calling one there threw, and the whole screen turned to "Whoops"
	// (the client's Safari report, 2026-11-18). There the list stays an ordinary fixed box, kept on top by its z-index.
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
		const onscroll = (event: Event) => {
			if (!node.contains(event.target as Node)) follow();
		};
		document.addEventListener('scroll', onscroll, { capture: true, passive: true });
		window.visualViewport?.addEventListener('resize', follow);
		window.visualViewport?.addEventListener('scroll', follow);
		return () => {
			document.removeEventListener('scroll', onscroll, { capture: true });
			window.visualViewport?.removeEventListener('resize', follow);
			window.visualViewport?.removeEventListener('scroll', follow);
		};
	};

	// With a mouse the search field is ready to type in at once. On a phone it waits for a tap, so opening a list
	// never brings the keyboard up (Justin, 2026-11-16): the list is there to tap or scroll, and the field is there
	// for the times it is long.
	const ready: Attachment<HTMLInputElement> = (node) => {
		if (matchMedia('(pointer: fine)').matches) node.focus({ preventScroll: true });
	};
</script>

<svelte:window
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
	onresize={follow}
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
			class="fixed z-[120] m-0 flex flex-col overflow-hidden rounded-2xl border-0 bg-white text-left shadow-[0_2px_6px_rgb(15_23_42/0.06),0_20px_44px_-12px_rgb(15_23_42/0.28)]"
			style="inset: auto; {place}"
			transition:scale={{ start: 0.95, duration: 140 }}
			{@attach lift}
		>
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
			<!-- `flex-auto`, not `flex-1`: Safari before this year's (17.4 to 26.4 tested) gives a list that starts from
			     nothing no height inside a floating box, so every dropdown opened empty (2026-11-18). -->
			<div
				class="min-h-0 flex-auto overflow-y-auto overscroll-contain p-1.5"
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
								{#if option.image}<Avatar
										src={option.image}
										size={28}
										fit={option.fit}
									/>{/if}
								{#if option.icon}<span
										class="{option.icon} size-[18px] shrink-0 {option.isDanger
											? ''
											: 'text-slate-500'}"
									></span>{/if}
								{#if option.dot}<span class="size-2.5 shrink-0 rounded-full {option.dot}"
									></span>{/if}
							{/if}
							<!-- The name, and under it what places it (a facility's city, a contact's title) in grey: two
							     lines, so a long name never pushes the pencil out of view (Justin, 2026-11-24). -->
							{#if option.note}
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate">{option.label}</span>
									<span class="truncate text-xs font-normal text-slate-400">{option.note}</span>
								</span>
							{:else}
								<span class="min-w-0 flex-1 truncate">{option.label}</span>
							{/if}
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

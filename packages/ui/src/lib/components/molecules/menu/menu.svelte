<script lang="ts">
	/**
	 * @tags ui, menu
	 */
	// The menu list (#297): the list the app's dropdown opens (its picker), and its account menu, ⋮ menus, list menus
	// and cards' menus. Moved here from the app unchanged (Justin, 2026-11-24): it sits beside the toggle rather than
	// on the toggle's own menu, which opens in place and would be cut off inside scrolling boxes.
	//
	// Its look is set from outside (Justin, 2026-11-26): it is the base component, and `color`, `appearance`, their
	// shorthands and `class` land on its list, the box that shows, which is the theme's surface until it is given a
	// look; its greys are the theme's. The app shows one per row's ⋮, so it takes the base component's light path. It
	// hangs from a button that shows the place's `trigger`, or from the library Button given through `button` (#386).
	//
	// Closes on a pick, a tap outside or Escape. `isWide` fills its row, and its list is as wide as the row. The list
	// opens in the browser's top layer (a popover), placed under its button, or over it when there is no room below, so
	// no scrolling or rounded box around the button cuts it off (the ⋮ of each project in the dashboard's lists,
	// 2026-10-26), and never reaches past the edge of the screen, so the pencil at the right of a choice always shows
	// (Justin, 2026-11-24: a facility's list ran off the phone's edge and took its pencils with it). `isSearchable` puts a field
	// at the top to type in, which narrows the list; `onadd` puts "Add new" right under it; `onedit` puts a pencil at
	// the far right of every choice, which opens that thing to edit it (run 28, Justin, 2026-11-12, for every dropdown
	// in the app).
	//
	// `opens` 'left' or 'right' puts the list beside its button (#390, the report preview's zoom bar), centred on it
	// or lined up with its top or bottom edge (`align`), kept on the screen, `offset` away from it. Given a look (the
	// zoom bar's dark one), every choice is drawn in that look's words, the hint under its name a quieter shade of
	// them, and the picked choice wears the look's two colours swapped, read off the list as it opens; a look with no
	// fill of its own tints the picked choice with its words instead.
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { scale } from 'svelte/transition';
	import {
		Avatar,
		Button,
		Component,
		type ButtonProps,
		type ComponentProps,
		type ComponentReturn
	} from '@layerd/ui';

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

	export interface MenuProps extends Omit<ComponentProps, 'label' | 'value' | 'children'> {
		options: MenuOptionType[];
		value: string;
		// The list's name, read out for its button, its list and its search field.
		label: string;
		onpick: (id: string) => void;
		// What the button shows, told the picked choice and whether the list is open.
		trigger?: Snippet<[MenuOptionType | undefined, boolean]>;
		// In place of `trigger`, the menu hangs from the library Button: its look, or any other Button prop, set from
		// outside (#386, the list menus' round icons).
		button?: Partial<ButtonProps>;
		// Draws what stands at the left of a choice, in place of its icon or image (a picker's faces and logos).
		// The second argument says the choice is the one picked.
		mark?: Snippet<[MenuOptionType, boolean]>;
		// Which of its edges lines up with the same edge of its button: left or right for a list under or over its
		// button (right unless told), top, bottom or its middle for one beside it (the middle unless told).
		align?: 'left' | 'right' | 'top' | 'bottom' | 'center';
		// Which way it opens: under its button, or over it when it fits either way (#376: a toolbar at the foot of a
		// box, the photo pop-up's More, whose list would otherwise fall below the box on a tall screen); or beside it,
		// on its left or right (#390).
		opens?: 'down' | 'up' | 'left' | 'right';
		// How far from its button the list stands, in pixels.
		offset?: number;
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
		button,
		mark,
		align,
		opens = 'down',
		offset = 8,
		isWide = false,
		values,
		isSearchable = false,
		onadd,
		addLabel = '',
		onedit,
		...props
	}: MenuProps = $props();

	let isOpen = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let place = $state('');
	let query = $state('');
	// The look's two colours, read off the open list, for the picked choice to wear swapped; empty with no look.
	let swap = $state('');
	// How tall the open list is, once it shows; 0 until then, when its height is reckoned from its choices.
	let height = 0;
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

	// Where the list goes: under its button, or over it when there is more room there, or beside it. Only the part
	// of the screen in view counts, so with a phone's keyboard up the list stays above the keyboard. Nothing when the
	// button has left the view.
	function placeOf() {
		if (!root) return '';
		const box = root.getBoundingClientRect();
		const view = window.visualViewport;
		const [viewTop, viewHeight] = [view?.offsetTop ?? 0, view?.height ?? innerHeight];
		if (box.bottom < viewTop || box.top > viewTop + viewHeight) return '';
		const rows = options.reduce((sum, option) => sum + (option.note ? 52 : 44), 0);
		const tall = height || rows + 16 + (isSearchable ? 48 : 0) + (onadd ? 44 : 0);
		if (opens === 'left' || opens === 'right') return besideOf(box, viewTop, viewHeight, tall);
		const below = viewTop + viewHeight - box.bottom - 24;
		const above = box.top - viewTop - 24;
		const need = Math.min(tall, 220);
		const isUp = opens === 'up' ? above >= need || above > below : below < need && above > below;
		const edge = align === 'left' ? 'left' : 'right';
		const x = edge === 'right' ? `right: ${innerWidth - box.right}px` : `left: ${box.left}px`;
		const y = isUp
			? `bottom: ${innerHeight - box.top + offset}px`
			: `top: ${box.bottom + offset}px`;
		// Run 14 (note 5): never taller than the room on its side, or 360px; longer lists scroll inside it.
		const most = Math.max(140, Math.min(isUp ? above : below, 360));
		// Never wider than the room from its button's edge to the screen's, keeping 8px clear.
		const room = Math.min(
			innerWidth - 16,
			edge === 'right' ? box.right - 8 : innerWidth - box.left - 8
		);
		const across = isWide
			? `width: ${Math.min(Math.max(box.width, 192), room)}px`
			: `min-width: ${Math.min(192, room)}px; max-width: ${room}px`;
		return `${x}; ${y}; ${across}; max-height: ${most}px`;
	}

	// Beside its button (#390): its middle on the button's middle, or its top or bottom on the button's, and never
	// past the top or bottom of the screen in view, keeping 8px clear; as wide as the room on its side allows.
	function besideOf(box: DOMRect, viewTop: number, viewHeight: number, tall: number) {
		const [first, last] = [viewTop + 8, viewTop + viewHeight - 8];
		const most = Math.max(140, Math.min(last - first, 360));
		const shown = Math.min(tall, most);
		const x =
			opens === 'left'
				? `right: ${innerWidth - box.left + offset}px`
				: `left: ${box.right + offset}px`;
		const y =
			align === 'bottom'
				? `bottom: ${innerHeight - Math.min(box.bottom, last)}px`
				: `top: ${Math.round(
						Math.max(
							first,
							Math.min(align === 'top' ? box.top : box.top + (box.height - shown) / 2, last - shown)
						)
					)}px`;
		const room = Math.min(
			innerWidth - 16,
			opens === 'left' ? box.left - offset - 8 : innerWidth - box.right - offset - 8
		);
		return `${x}; ${y}; min-width: ${Math.min(192, room)}px; max-width: ${room}px; max-height: ${most}px`;
	}

	function toggle() {
		if (isOpen || !root) return (isOpen = false);
		height = 0;
		swap = '';
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
		// Its real height, now it shows: a list beside its button centres on it exactly. Read once, as it opens, not
		// followed: what it reads here never runs this again.
		untrack(() => {
			height = node.offsetHeight;
			if (height && (opens === 'left' || opens === 'right')) place = placeOf() || place;
			swap = /\btheme-/.test(node.className) ? swapOf(node) : '';
		});
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

	// The look's words and fill, read off the open list, for the picked choice to wear swapped. A look with no fill
	// of its own (ghost, or a see-through one) gives nothing, and the picked choice is tinted with the words instead.
	function swapOf(node: HTMLElement) {
		const { color, backgroundColor } = getComputedStyle(node);
		if (!color || !backgroundColor || /^transparent$|,\s*0\)$|\/\s*0\)$/.test(backgroundColor))
			return '';
		return `--menu-ink: ${color}; --menu-paper: ${backgroundColor};`;
	}
</script>

<svelte:window
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
	onresize={follow}
/>

<Component {...props}>
	{#snippet component({ props: own }: { props: ComponentReturn })}
		{@const { class: look = '', ...rest } = own}
		<div
			{...rest}
			class="relative {isWide ? 'w-full' : ''}"
			bind:this={root}
		>
			{@render inside(look)}
		</div>
	{/snippet}
</Component>

{#snippet inside(look: string)}
	<!-- Given a look, what is inside is drawn in its words; with none, in the theme's greys and blue. -->
	{@const hasLook = /\btheme-/.test(look)}
	{#if button}
		<Button
			{...button}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			aria-label={button['aria-label'] ?? label}
			onclick={toggle}
		/>
	{:else}
		<button
			type="button"
			class="flex items-center {isWide ? 'w-full' : ''}"
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			aria-label={label}
			onclick={toggle}>{@render trigger?.(current, isOpen)}</button
		>
	{/if}
	{#if isOpen}
		<div
			popover="manual"
			class="fixed z-[120] m-0 flex flex-col overflow-hidden rounded-2xl border-0 {hasLook
				? ''
				: 'bg-surface'} text-left shadow-menu {look}"
			style="inset: auto; {place}; {swap}"
			transition:scale={{ start: 0.95, duration: 140 }}
			{@attach lift}
		>
			{#if isSearchable}
				<label
					class="flex shrink-0 items-center gap-2 border-b px-3.5 py-2.5 {hasLook
						? 'border-current/10 text-current/60'
						: 'border-secondary/[0.06] text-base-400'}"
				>
					<span class="icon-[mdi--magnify] size-[18px] shrink-0"></span>
					<input
						class="w-full min-w-0 border-0 bg-transparent p-0 text-sm outline-none focus:ring-0 {hasLook
							? 'text-current placeholder:text-current/50'
							: 'text-secondary placeholder:text-base-400'}"
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
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition {hasLook
							? 'text-current hover:bg-current/10'
							: 'text-primary hover:bg-primary/[0.08]'}"
						onclick={() => {
							isOpen = false;
							onadd();
						}}
					>
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-full {hasLook
								? 'bg-current/10'
								: 'bg-primary/10'}"><span class="icon-[mdi--plus] size-[18px]"></span></span
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
								: hasLook
									? isOn
										? swap
											? 'bg-(--menu-ink) font-medium text-(--menu-paper)'
											: 'bg-current/15 font-medium text-current'
										: 'text-current hover:bg-current/10'
									: isOn
										? 'bg-primary/[0.08] font-medium text-secondary'
										: 'text-secondary-400 hover:bg-secondary/[0.04]'}"
							onclick={() => pick(option.id)}
						>
							{#if mark}{@render mark(option, isOn)}{:else}
								{#if option.image}<Avatar
										src={option.image}
										size={28}
										fit={option.fit}
									/>{/if}
								{#if option.icon}<span
										class="{option.icon} size-[18px] shrink-0 {option.isDanger || hasLook
											? ''
											: 'text-base-500'}"
									></span>{/if}
								{#if option.dot}<span class="size-2.5 shrink-0 rounded-full {option.dot}"
									></span>{/if}
							{/if}
							<!-- The name, and under it what places it (a facility's city, a contact's title) in grey: two
							     lines, so a long name never pushes the pencil out of view (Justin, 2026-11-24). -->
							{#if option.note}
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate">{option.label}</span>
									<span
										class="truncate text-xs font-normal {hasLook
											? 'text-current/60'
											: 'text-base-400'}">{option.note}</span
									>
								</span>
							{:else}
								<span class="min-w-0 flex-1 truncate">{option.label}</span>
							{/if}
							{#if option.count !== undefined}<span
									class="text-xs tabular-nums {hasLook ? 'text-current/60' : 'text-base-400'}"
									>{option.count}</span
								>{/if}
							{#if isOn}<span
									class="icon-[mdi--check] size-4 shrink-0 {hasLook ? '' : 'text-primary'}"
								></span>{/if}
						</button>
						{#if onedit}
							<button
								type="button"
								class="flex size-9 shrink-0 items-center justify-center rounded-full transition {hasLook
									? 'text-current/60 hover:bg-current/10 hover:text-current'
									: 'text-base-400 hover:bg-secondary/[0.05] hover:text-primary'}"
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
					<p class="px-3 py-2 text-sm {hasLook ? 'text-current/60' : 'text-base-400'}">
						Nothing matches
					</p>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

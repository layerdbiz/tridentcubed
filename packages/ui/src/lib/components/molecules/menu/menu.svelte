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
	//
	// `isRow` stands the choices in a row of library Buttons, each its icon alone, named by its label (read out, and
	// shown on a hover), the picked one heavy and the others ghost, any Button prop given through `choiceButton` (the
	// zoom bar's Slide-out Row, Justin, 2026-11-26: Stack, Spread and Present). The row slides out of its button's
	// side, its choices following one after another from the one nearest the button, and slides back in the same way.
	// It has no fill or shadow of its own, so a row is only its buttons until it is given a look from outside.
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { quintOut } from 'svelte/easing';
	import { fly, scale } from 'svelte/transition';
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
		// outside (#386, the list menus' round icons); or a function of the picked choice and whether the list is open
		// that gives them (the zoom bar's mode button, its icon the mode the pages are in, lit while its row is out).
		button?:
			| Partial<ButtonProps>
			| ((current: MenuOptionType | undefined, isOpen: boolean) => Partial<ButtonProps>);
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
		// Stands the choices in a row of library Buttons, each its icon alone.
		isRow?: boolean;
		// Any Button prop for every choice in a row: its size, or a look in place of the heavy and the ghost.
		choiceButton?: Partial<ButtonProps>;
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
		isRow = false,
		choiceButton = {},
		values,
		isSearchable = false,
		onadd,
		addLabel = '',
		onedit,
		...props
	}: MenuProps = $props();

	// What is inside the list is drawn in: the theme's greys and blue with no look given (`plain`), the look's own
	// words when it is given one (`worn`), whose picked choice wears the look's two colours swapped once they are
	// read (`SWAPPED`), or a tint of its words when they cannot be.
	const TONES = {
		plain: {
			box: 'bg-surface',
			search: 'border-secondary/[0.06] text-base-400',
			field: 'text-secondary placeholder:text-base-400',
			add: 'text-primary hover:bg-primary/[0.08]',
			addMark: 'bg-primary/10',
			choice: 'text-secondary-400 hover:bg-secondary/[0.04]',
			picked: 'bg-primary/[0.08] font-medium text-secondary',
			icon: 'text-base-500',
			quiet: 'text-base-400',
			tick: 'text-primary',
			pencil: 'text-base-400 hover:bg-secondary/[0.05] hover:text-primary'
		},
		worn: {
			box: '',
			search: 'border-current/10 text-current/60',
			field: 'text-current placeholder:text-current/50',
			add: 'text-current hover:bg-current/10',
			addMark: 'bg-current/10',
			choice: 'text-current hover:bg-current/10',
			picked: 'bg-current/15 font-medium text-current',
			icon: '',
			quiet: 'text-current/60',
			tick: '',
			pencil: 'text-current/60 hover:bg-current/10 hover:text-current'
		}
	};
	const SWAPPED = 'bg-(--menu-ink) font-medium text-(--menu-paper)';
	// How far a row's choices come from, and which edge of the row it slides out from, for each way it opens: a row
	// on the left of its button slides out leftwards, its choices coming from the button's side.
	const SLIDES = {
		left: { x: 24, y: 0, edges: (gone: number) => `0 0 0 ${gone}%` },
		right: { x: -24, y: 0, edges: (gone: number) => `0 ${gone}% 0 0` },
		down: { x: 0, y: -24, edges: (gone: number) => `0 0 ${gone}% 0` },
		up: { x: 0, y: 24, edges: (gone: number) => `${gone}% 0 0 0` }
	};
	const ROW_SPEED = { duration: 240, easing: quintOut };

	let isOpen = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let place = $state('');
	let query = $state('');
	// The look's two colours, read off the open list, for the picked choice to wear swapped; empty with no look.
	let swap = $state('');
	// How tall the open list is, once it shows; 0 until then, when its height is reckoned from its choices.
	let height = 0;
	const current = $derived(options.find((option) => option.id === value));
	const isBeside = $derived(opens === 'left' || opens === 'right');
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
		// A list beside its button is measured once it shows; one under or over it keeps the reckoning, so which way
		// it opens never changes on a scroll. A row is one button high.
		const tall =
			(isBeside && height) || (isRow ? 44 : rows + 16 + (isSearchable ? 48 : 0) + (onadd ? 44 : 0));
		if (isBeside) return besideOf(box, viewTop, viewHeight, tall);
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
		const across = isWide ? `width: ${Math.min(Math.max(box.width, 192), room)}px` : widthOf(room);
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
		const bottom = Math.min(box.bottom, last);
		const wanted =
			align === 'top'
				? box.top
				: align === 'bottom'
					? bottom - shown
					: box.top + (box.height - shown) / 2;
		const top = Math.max(first, Math.min(wanted, last - shown));
		// Lined up at the bottom, its foot is set exactly while it fits; otherwise its top keeps it on the screen.
		const y =
			align === 'bottom' && top === wanted
				? `bottom: ${innerHeight - bottom}px`
				: `top: ${Math.round(top)}px`;
		const room = Math.min(
			innerWidth - 16,
			opens === 'left' ? box.left - offset - 8 : innerWidth - box.right - offset - 8
		);
		return `${x}; ${y}; ${widthOf(room)}; max-height: ${most}px`;
	}

	// A list is at least 192px wide; a row is only as wide as its choices. Neither is wider than the room it has.
	function widthOf(room: number) {
		return isRow
			? `max-width: ${room}px`
			: `min-width: ${Math.min(192, room)}px; max-width: ${room}px`;
	}

	// How the list comes and goes: a list grows from a little smaller, and a row slides out of its button's side.
	function reveal(node: Element) {
		if (!isRow) return scale(node, { start: 0.95, duration: 140 });
		const { edges } = SLIDES[opens];
		return {
			...ROW_SPEED,
			css: (t: number) => `clip-path: inset(${edges((1 - t) * 100)} round 999px)`
		};
	}

	// A row's choice comes out after the ones nearer its button, 30ms apart.
	function delayOf(index: number) {
		return (opens === 'left' ? options.length - 1 - index : index) * 30;
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
			if (height && isBeside) place = placeOf() || place;
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
		const isClear = /^transparent$|^rgba\((?:[^,]*,){3}\s*0\)$|\/\s*0%?\)$/.test(backgroundColor);
		if (!color || !backgroundColor || isClear) return '';
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
	{@const tone = /\btheme-/.test(look) ? TONES.worn : TONES.plain}
	{#if button}
		{@const own = typeof button === 'function' ? button(current, isOpen) : button}
		<Button
			{...own}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			aria-label={own['aria-label'] ?? label}
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
			class="fixed z-[120] m-0 flex overflow-hidden border-0 text-left {isRow
				? 'rounded-full'
				: `flex-col rounded-2xl ${tone.box} shadow-menu`} {look}"
			style="inset: auto; {place}; {swap}"
			transition:reveal
			{@attach lift}
		>
			{#if isRow}
				{@const { x, y } = SLIDES[opens]}
				<div
					class="flex gap-0.5 p-1"
					role="listbox"
					aria-label={label}
					aria-orientation="horizontal"
				>
					{#each options as option, index (option.id)}
						{@const isOn = values ? values.includes(option.id) : option.id === value}
						<span
							class="flex"
							in:fly|global={{ ...ROW_SPEED, x, y, delay: delayOf(index) }}
							out:fly|global={{ ...ROW_SPEED, x, y }}
						>
							<Button
								appearance={isOn ? 'heavy' : 'ghost'}
								{...choiceButton}
								icon={option.icon}
								role="option"
								aria-selected={isOn}
								aria-label={option.label}
								title={option.label}
								onclick={() => pick(option.id)}
							/>
						</span>
					{/each}
				</div>
			{:else}
				{#if isSearchable}
					<label class="flex shrink-0 items-center gap-2 border-b px-3.5 py-2.5 {tone.search}">
						<span class="icon-[mdi--magnify] size-[18px] shrink-0"></span>
						<input
							class="w-full min-w-0 border-0 bg-transparent p-0 text-sm outline-none focus:ring-0 {tone.field}"
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
							class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition {tone.add}"
							onclick={() => {
								isOpen = false;
								onadd();
							}}
						>
							<span
								class="flex size-7 shrink-0 items-center justify-center rounded-full {tone.addMark}"
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
									: !isOn
										? tone.choice
										: tone === TONES.worn && swap
											? SWAPPED
											: tone.picked}"
								onclick={() => pick(option.id)}
							>
								{#if mark}{@render mark(option, isOn)}{:else}
									{#if option.image}<Avatar
											src={option.image}
											size={28}
											fit={option.fit}
										/>{/if}
									{#if option.icon}<span
											class="{option.icon} size-[18px] shrink-0 {option.isDanger ? '' : tone.icon}"
										></span>{/if}
									{#if option.dot}<span class="size-2.5 shrink-0 rounded-full {option.dot}"
										></span>{/if}
								{/if}
								<!-- The name, and under it what places it (a facility's city, a contact's title) in grey: two
							     lines, so a long name never pushes the pencil out of view (Justin, 2026-11-24). -->
								{#if option.note}
									<span class="flex min-w-0 flex-1 flex-col">
										<span class="truncate">{option.label}</span>
										<span class="truncate text-xs font-normal {tone.quiet}">{option.note}</span>
									</span>
								{:else}
									<span class="min-w-0 flex-1 truncate">{option.label}</span>
								{/if}
								{#if option.count !== undefined}<span class="text-xs tabular-nums {tone.quiet}"
										>{option.count}</span
									>{/if}
								{#if isOn}<span class="icon-[mdi--check] size-4 shrink-0 {tone.tick}"></span>{/if}
							</button>
							{#if onedit}
								<button
									type="button"
									class="flex size-9 shrink-0 items-center justify-center rounded-full transition {tone.pencil}"
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
						<p class="px-3 py-2 text-sm {tone.quiet}">Nothing matches</p>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

<script lang="ts">
	/**
	 * @tags forms, select, dropdown, icon, label, search, lookup
	 * @layout horizontal
	 */
	// The Select (glossary): the one dropdown, whatever its list holds (#298, Justin, 2026-11-24: one component with props
	// that switch things on, never a component per kind). The app's dropdown (its picker) merged into it. Each switch is
	// a prop of its own and they combine freely: `isSearchable` (on unless told not: every dropdown has search, Justin,
	// 2026-11-16), a picture beside each choice (a choice's own icon, picture or dot, or whatever `mark` draws, such as
	// a face or a logo), `multiple` to pick several, `onadd` for Add new, `onedit` for a pencil that opens a choice.
	// The list is the library's Menu, which floats above every scrolling box.
	//
	// `isTyped` makes the field one to type into: the known choices holding the words show at once, and words typed and
	// never picked are kept as the value. `lookup` takes any Lookup (glossary), such as places from an outside service,
	// and makes the field typed too, adding the lookup's choices once typing pauses. `oninput` hears the words, `onpick`
	// a choice.
	//
	// The field is the library's notched one (#284: the label sits on the border): the same box as every input, the
	// pick's picture at its start (a choice's own, or what `mark` draws, or the field's `icon` while nothing is picked)
	// and a chevron at its end; one that cannot be picked from says why, its label on the border. Its `variant` leaves
	// out the start (`text icon`) or the end (`icon text`). `start` puts a control of its own where the picture was, such
	// as a facility's Start, Stop or End chip with its own menu, and `hasLabel` keeps the label off the border of a
	// second row of the same fields (#388). The app's grey panel look went with that, its last panel moved (#57).
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import '../forms.css';
	import {
		Avatar,
		Component,
		type ComponentReturn,
		createFormField,
		type FieldProps,
		Help,
		Icon,
		LookupState,
		type LookupType,
		Menu,
		type MenuOptionType,
		type SelectOptionType
	} from '@layerd/ui';

	const uid = $props.id();

	export type SelectProps = FieldProps<string | string[]> & {
		options?: SelectOptionType[];
		placeholder?: string;
		required?: HTMLSelectAttributes['required'];
		disabled?: HTMLSelectAttributes['disabled'];
		multiple?: HTMLSelectAttributes['multiple'];
		autocomplete?: HTMLSelectAttributes['autocomplete'];
		/** A field at the top of the list to type in, which narrows it. On unless told not to. */
		isSearchable?: boolean;
		/** Draws the picture of a choice, told its value and size: a face, a logo. Without it, the choice's own. */
		mark?: Snippet<[string, number]>;
		/** What several picks are called: "3 people". Without it, their names. */
		many?: string;
		/** Hears each pick: with `multiple`, the choice tapped, on or off. */
		onpick?: (value: string) => void;
		/** Puts Add new at the top of the list. */
		onadd?: () => void;
		/** What Add new names, when it is not the label: a field called Start adds a Facility. */
		addLabel?: string;
		/** Puts a pencil on each choice in the list, which opens it to edit. */
		onedit?: (value: string) => void;
		/** Typed into: the words are the value, and the known choices holding them are offered as they are typed. */
		isTyped?: boolean;
		/** Finds choices for what is typed; the field is then typed into (glossary: Lookup). */
		lookup?: LookupType;
		/** Hears the words typed into a typed field. */
		oninput?: (text: string) => void;
		/** A control of its own at the start of the field, in place of the pick's picture: a facility's Start, Stop or End. */
		start?: Snippet;
		/** False for a second row of the same fields, which the first row's label already names: the label stays off the
		 * border, and says what the field is inside it while nothing is picked. */
		hasLabel?: boolean;
	};

	let {
		variant = 'icon text icon',
		label = 'Select',
		help = undefined,
		icon = undefined,
		iconEnd = undefined,
		name = undefined,
		id = undefined,
		options = [],
		placeholder = undefined,
		disabled = false,
		required = false,
		multiple = false,
		value = $bindable(multiple ? [] : ''),
		autocomplete = undefined,
		isSearchable = true,
		mark: ownMark = undefined,
		many = undefined,
		onpick = undefined,
		onadd = undefined,
		addLabel = undefined,
		onedit = undefined,
		isTyped = false,
		lookup = undefined,
		oninput = undefined,
		start = undefined,
		hasLabel = true,
		class: className = undefined,
		'aria-describedby': ariaDescribedby = undefined,
		'aria-invalid': ariaInvalid = undefined,
		children = undefined,
		...props
	}: SelectProps = $props();

	// A choice's mark: lit for the field's own pick and the one picked in the list, the rest grey until pointed at.
	const LIT = 'bg-primary/10 text-primary';
	const QUIET =
		'bg-neutral-200 text-base-400 group-hover/option:bg-primary/10 group-hover/option:text-primary';
	// How many known choices a typed field's list shows.
	const KNOWN = 5;

	const asking = new LookupState(() => lookup);
	// A typed field's list is open: the field is in use and something is typed.
	let isListed = $state(false);
	let blurTimer: ReturnType<typeof setTimeout> | undefined;
	// How wide the start control is, so the field's words start after it.
	let startWidth = $state(0);
	// How tall the pick's picture is drawn: the field's --pick-size, which follows its font, measured once it shows.
	let pickSize = $state(0);

	const isTyping = $derived(isTyped || Boolean(lookup));
	const selected = $derived.by(() => {
		if (Array.isArray(value)) return value.map(String);
		return value == null || value === '' ? [] : [String(value)];
	});
	const menuOptions = $derived(
		options.map((option): MenuOptionType => ({
			id: option.value,
			label: option.label,
			note: option.note,
			icon: option.icon,
			image: option.image,
			fit: option.fit,
			dot: option.dot
		}))
	);
	const shown = $derived.by(() => {
		if (selected.length === 1) return labelOf(selected[0]);
		if (many && selected.length > 1) return `${selected.length} ${many}`;
		return selected.map(labelOf).join(', ');
	});
	// The mark of a choice with no picture of its own.
	const choiceIcon = $derived(icon ?? 'icon-[mdi--chevron-right]');
	// The field's start and end.
	const hasStart = $derived(variant === 'icon text' || variant === 'icon text icon');
	const hasEnd = $derived(variant === 'text icon' || variant === 'icon text icon');
	// A field with nothing to pick says why, with its label on the border.
	const isHinted = $derived(disabled && !selected.length && Boolean(placeholder));

	// A press on the field leaves the focus where it is, and the click opens the list. Focus floats the label to
	// the border and shows its ?, which would slide under a pointer still pressed on an empty field and take the click
	// (#57); the list's search takes the focus once it is open.
	const holdFocus: Attachment<HTMLElement> = (node) => {
		const hold = (event: MouseEvent) => event.preventDefault();
		node.addEventListener('mousedown', hold);
		return () => node.removeEventListener('mousedown', hold);
	};

	// A typed field's words, and what shows for them: the known choices holding them, then what a lookup found.
	const text = $derived(typeof value === 'string' ? value.trim().toLowerCase() : '');
	const known = $derived(
		text
			? options.filter((option) => option.label.toLowerCase().includes(text)).slice(0, KNOWN)
			: []
	);
	const found = $derived(
		asking.found.filter((option) => !known.some((item) => item.value === option.value))
	);
	const hasList = $derived(
		isListed && Boolean(text) && (known.length > 0 || found.length > 0 || asking.isAsking)
	);

	const fieldState = $derived.by(() =>
		createFormField({
			uid,
			type: 'select',
			label,
			name,
			id,
			value,
			icon,
			iconEnd
		})
	);

	function optionOf(choice: string) {
		return options.find((option) => option.value === choice);
	}

	function labelOf(choice: string) {
		return optionOf(choice)?.label ?? choice;
	}

	// Whether the field has a picture for a pick: one it is given to draw, the choice's own, or its icon.
	function hasPicture(choice: string) {
		const option = optionOf(choice);
		return Boolean(ownMark || icon || option?.image || option?.dot || option?.icon);
	}

	function pick(choice: string) {
		if (multiple)
			value = selected.includes(choice)
				? selected.filter((item) => item !== choice)
				: [...selected, choice];
		else value = choice;
		onpick?.(choice);
	}

	function type(event: Event) {
		const words = (event.currentTarget as HTMLInputElement).value;
		value = words;
		oninput?.(words);
		isListed = true;
		const typed = words.trim().toLowerCase();
		asking.type(
			words,
			options.some((option) => option.label.trim().toLowerCase() === typed)
		);
	}

	function choose(option: SelectOptionType) {
		value = option.value;
		isListed = false;
		asking.clear();
		onpick?.(option.value);
	}

	function leave() {
		clearTimeout(blurTimer);
		blurTimer = setTimeout(() => (isListed = false), 180);
	}
</script>

<!-- What a choice is, as a round picture: the same in the field and in the list. `isLit` is the field's own, or the
     choice picked; the rest of a list is grey until pointed at. -->
{#snippet face(choice: string, size: number, isLit: boolean)}
	{@const option = optionOf(choice)}
	{#if ownMark}
		{@render ownMark(choice, size)}
	{:else if option?.image}
		<Avatar
			src={option.image}
			{size}
			fit={option.fit}
			ring="ring-1 ring-secondary/10"
		/>
	{:else if option?.dot}
		<span
			class="flex shrink-0 items-center justify-center"
			style="width: {size}px; height: {size}px"
			><span class="size-3 rounded-full {option.dot}"></span></span
		>
	{:else}
		<span
			class="flex shrink-0 items-center justify-center rounded-full transition {isLit
				? LIT
				: QUIET}"
			style="width: {size}px; height: {size}px"
			><span class="{option?.icon || choiceIcon} size-[60%]"></span></span
		>
	{/if}
{/snippet}

<!-- A typed field's list, in the flow under the field so no scrolling box or sheet can cut it off: the known choices,
     then what a lookup found, each with a line that places it, and who found them. -->
{#snippet choices()}
	{#if hasList}
		<ul
			id="{uid}-choices"
			class="mt-1.5 overflow-hidden rounded-2xl bg-surface p-1 text-left shadow-list ring-1 ring-secondary/[0.06]"
			role="listbox"
			aria-label={label}
		>
			{#each known as option (option.value)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-base-600 hover:bg-secondary/[0.04]"
						role="option"
						aria-selected={option.value === value}
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => choose(option)}
					>
						<span class="{option.icon || choiceIcon} size-[18px] shrink-0 text-primary"></span>
						<span class="min-w-0 flex-1 truncate">{option.label}</span>
						{#if option.note}<span class="shrink-0 text-[11px] text-base-400">{option.note}</span
							>{/if}
					</button>
				</li>
			{/each}
			{#each found as option (option.value)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-base-600 hover:bg-secondary/[0.04]"
						role="option"
						aria-selected="false"
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => choose(option)}
					>
						<span class="{option.icon || choiceIcon} size-[18px] shrink-0 text-base-400"></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate">{option.label}</span>
							{#if option.note && option.note !== option.label}
								<span class="block truncate text-[11px] text-base-400">{option.note}</span>
							{/if}
						</span>
					</button>
				</li>
			{/each}
			{#if asking.isAsking && !found.length}
				<li class="px-3 py-2 text-xs text-base-400">Looking it up…</li>
			{/if}
			{#if found.length && lookup?.credit}
				<li class="px-3 pt-1 pb-1.5 text-right text-[10px] text-base-400">
					Powered by <a
						class="underline"
						href={lookup.credit.href}
						target="_blank"
						rel="noreferrer">{lookup.credit.name}</a
					>
				</li>
			{/if}
		</ul>
	{/if}
{/snippet}

<!-- The field that is typed into. -->
{#snippet typedField()}
	<input
		id="{uid}-input"
		value={typeof value === 'string' ? value : ''}
		placeholder=" "
		{disabled}
		{required}
		name={fieldState.field.name}
		autocomplete="off"
		role="combobox"
		aria-label={label}
		aria-expanded={hasList && (known.length > 0 || found.length > 0)}
		aria-controls="{uid}-choices"
		aria-autocomplete="list"
		aria-describedby={ariaDescribedby}
		aria-invalid={ariaInvalid}
		oninput={type}
		onfocus={() => (isListed = true)}
		onblur={leave}
		onkeydown={(event) => event.key === 'Escape' && (isListed = false)}
	/>
{/snippet}

<!-- The list a tap opens. -->
{#snippet menu(trigger: Snippet<[MenuOptionType | undefined, boolean]>)}
	<Menu
		{label}
		value={multiple ? '' : (selected[0] ?? '')}
		values={multiple ? selected : undefined}
		options={menuOptions}
		onpick={pick}
		{onadd}
		addLabel={addLabel ?? ''}
		{onedit}
		{isSearchable}
		{trigger}
		align="left"
		isWide
	>
		{#snippet mark(option, isOn)}{@render face(option.id, 28, isOn)}{/snippet}
	</Menu>
{/snippet}

{#snippet iconStartEl()}
	{#if icon}
		<Icon
			{icon}
			class="icon start"
		/>
	{/if}
{/snippet}

{#snippet iconEndEl()}
	<Icon
		icon={iconEnd ?? 'icon-[mdi--chevron-down]'}
		class="icon end"
	/>
{/snippet}

<!-- The pick's picture at the start: one for each of several picks, or the field's icon, quiet, while nothing is
     picked. -->
{#snippet pickEl()}
	{#if selected.length && selected.some(hasPicture)}
		<span
			class="select-pick"
			bind:clientHeight={pickSize}
		>
			{#each selected.slice(0, 5) as choice, index (choice)}
				<span
					class="relative flex"
					style="margin-left: {index ? -Math.round((pickSize || 32) / 4) : 0}px; z-index: {10 -
						index}">{@render face(choice, pickSize || 32, true)}</span
				>
			{/each}
		</span>
	{:else if !selected.length && icon}
		<span class="select-pick"
			><span
				class="flex aspect-square h-full shrink-0 items-center justify-center rounded-full bg-base-900/5 text-base-400"
				><span class="{icon} size-1/2"></span></span
			></span
		>
	{/if}
{/snippet}

{#snippet optionItems()}
	{#if !multiple}
		<option
			value=""
			disabled={required}
			hidden={required}
		></option>
	{/if}
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
	{#if children}
		{@render children()}
	{/if}
{/snippet}

<!-- What the field shows: the pick's picture, unless a control of its own sits there, and the pick; a second row's
     empty field says its label, which stays off the border. -->
{#snippet picked()}
	<span
		class="select-trigger {selected.length ? '' : 'is-placeholder'}"
		{@attach holdFocus}
	>
		{#if hasStart && !start}{@render pickEl()}{/if}
		<span class="select-trigger-value"
			>{isHinted ? placeholder : shown || (hasLabel ? '' : label)}</span
		>
	</span>
{/snippet}

{#snippet selectEl()}
	{#if isTyping}
		{@render typedField()}
	{:else if children}
		<!-- The browser's own dropdown, for choices written as <option>s. -->
		{#if multiple}
			<select
				bind:value
				name={fieldState.field.name}
				id={fieldState.field.id}
				aria-describedby={ariaDescribedby}
				aria-invalid={ariaInvalid}
				aria-required={required || undefined}
				{autocomplete}
				{disabled}
				{required}
				multiple
			>
				{@render optionItems()}
			</select>
		{:else}
			<select
				bind:value
				name={fieldState.field.name}
				id={fieldState.field.id}
				aria-describedby={ariaDescribedby}
				aria-invalid={ariaInvalid}
				aria-required={required || undefined}
				{autocomplete}
				{disabled}
				{required}
			>
				{@render optionItems()}
			</select>
		{/if}
	{:else}
		<!-- Hidden, so a form still sends what is picked under its name. -->
		{#if multiple}
			<select
				class="select-native"
				bind:value
				name={fieldState.field.name}
				id={fieldState.field.id}
				aria-required={required || undefined}
				{autocomplete}
				{disabled}
				{required}
				multiple
				tabindex="-1"
				aria-hidden="true"
			>
				{@render optionItems()}
			</select>
		{:else}
			<select
				class="select-native"
				bind:value
				name={fieldState.field.name}
				id={fieldState.field.id}
				aria-required={required || undefined}
				{autocomplete}
				{disabled}
				{required}
				tabindex="-1"
				aria-hidden="true"
			>
				{@render optionItems()}
			</select>
		{/if}
		{#if disabled}
			<div class="select-menu">{@render picked()}</div>
		{:else}
			<div class="select-menu">{@render menu(picked)}</div>
		{/if}
	{/if}
{/snippet}

<Component
	{...props}
	class={className}
>
	{#snippet component({ props }: { props: ComponentReturn })}
		<div class="select-root">
			<fieldset
				{...props}
				class={`field ${props.class} ${isHinted ? 'field-filled' : fieldState.className} ${hasLabel ? '' : 'field-unlabelled'}`.trim()}
				style:--start-width={start ? `${startWidth}px` : undefined}
			>
				<legend
					><span>{fieldState.labelText}</span>{#if help && hasLabel}<Help
							label={fieldState.labelText}
							text={help}
						/>{/if}</legend
				>
				<label for={isTyping ? `${uid}-input` : fieldState.field.id}>
					{#if start}
						<!-- Over the field's button, as a control of its own. -->
						<span
							class="select-start"
							bind:clientWidth={startWidth}>{@render start()}</span
						>
					{:else if hasStart && (isTyping || children)}
						{@render iconStartEl()}
					{/if}
					{@render selectEl()}
					{#if hasEnd}
						{@render iconEndEl()}
					{/if}
				</label>
			</fieldset>
			{@render choices()}
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	.select-root {
		@apply relative w-full;
	}

	fieldset select {
		@apply cursor-pointer;
		appearance: none;
	}

	fieldset select:disabled {
		@apply cursor-not-allowed;
	}

	.select-native {
		@apply pointer-events-none absolute size-px overflow-hidden opacity-0;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* The Menu fills the field, so a tap anywhere on it opens the list. */
	fieldset .select-menu {
		@apply relative z-0 col-span-full row-start-1 size-full;
	}

	fieldset .select-menu > :global(div),
	fieldset .select-menu > :global(div > button) {
		@apply size-full;
	}

	fieldset .select-trigger {
		@apply flex size-full items-center text-left text-[1em];
		@apply ps-(--input-pad-start) pe-(--input-pad-end);

		color: var(--field-color);
		border-radius: calc(var(--field-radius) - var(--field-edge));
	}

	fieldset .select-trigger-value {
		@apply block w-full truncate;
	}

	/* The pick's picture and a start control are one size, which follows the field's font, the same small way in from
	   the box's outer edge as from its top and bottom (#388): a fixed size outgrew a smaller box. forms.css measures
	   the insides from the border's outer edge (`--notch-indent`), and the border thickens inward while in use, so
	   these take its width (`--field-edge`) off to stay put. */
	fieldset {
		--pick-size: 2em;
		--pick-inset: 0.5em;
	}

	/* The pick's picture sits in the field's own button, so a tap on it opens the list too, and an empty field's label
	   rests after it. */
	fieldset:has(.select-pick) {
		--prefix-width: calc(
			var(--pick-size) + var(--pick-inset) + var(--icon-gap) - var(--notch-indent)
		);
	}

	fieldset .select-trigger:has(.select-pick) {
		gap: var(--icon-gap);
		padding-inline-start: calc(var(--pick-inset) - var(--field-edge));
	}

	fieldset .select-pick {
		@apply flex h-(--pick-size) shrink-0 items-center;
	}

	/* A control of its own at the start, such as a facility's Start chip (#388): over the field's button, as tall as the
	   pick's picture and as far in, and the words and an empty field's label rest after it. Its own button fills it. */
	fieldset:has(.select-start) {
		--prefix-width: calc(
			var(--start-width, 0px) + var(--pick-inset) + var(--icon-gap) - var(--notch-indent)
		);
	}

	fieldset .select-start {
		@apply z-2 col-start-1 row-start-1 flex h-(--pick-size) self-center justify-self-start;
		margin-inline-start: calc(var(--pick-inset) - var(--field-edge));
	}

	fieldset .select-start > :global(*),
	fieldset .select-start > :global(* > button) {
		@apply h-full;
	}

	/* The chevron lets a tap through to the button under it. */
	fieldset :global(.icon.end) {
		@apply pointer-events-none;
	}

	fieldset .select-trigger.is-placeholder .select-trigger-value {
		@apply text-base-400/70;
	}
</style>

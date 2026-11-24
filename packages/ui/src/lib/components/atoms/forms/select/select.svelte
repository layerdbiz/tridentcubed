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
	// Two looks. The notched field is the library's own (#284: the label sits on the border). `variant="soft"` is the
	// app's panel field (label above, filled and borderless, lit while open), kept so nothing in the app looks different
	// until its panels move onto the notched field one at a time (#57). Like the Menu it draws its own box rather than
	// the base component, since a panel holds many of them; and its Help ? hides while it is empty by the app's rule
	// on `has-help` and `data-empty` (look.css).
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import '../forms.css';
	import {
		Component,
		type ComponentReturn,
		createFormField,
		type FieldProps,
		type FormFieldVariant,
		Help,
		Icon,
		LookupState,
		type LookupType,
		Menu,
		type MenuOptionType,
		type SelectOptionType
	} from '@layerd/ui';

	const uid = $props.id();

	export type SelectProps = Omit<FieldProps<string | string[]>, 'variant' | 'inset'> & {
		/** The notched field's icon arrangement, or `soft`, the app's panel field. */
		variant?: FormFieldVariant | 'soft';
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
		/**
		 * The classes of a soft field typed into, in place of the panel's: the app's record forms draw a white box with
		 * an edge (until #57 moves them onto the notched field).
		 */
		inputClass?: string;
		/** A control of its own at the start of a soft field, in place of the picture: a facility's Start, Stop or End. */
		start?: Snippet;
		/** False for a second row of the same fields, which the first row's labels already name (soft). */
		hasLabel?: boolean;
	};

	let {
		variant = 'text icon',
		label = 'Select',
		help = undefined,
		icon = undefined,
		iconEnd = undefined,
		name = undefined,
		id = undefined,
		options = [],
		placeholder = 'Choose',
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
		inputClass = undefined,
		start = undefined,
		hasLabel = true,
		class: className = undefined,
		'aria-describedby': ariaDescribedby = undefined,
		'aria-invalid': ariaInvalid = undefined,
		children = undefined,
		...props
	}: SelectProps = $props();

	// The soft field's look, as the app drew it: filled, borderless, lit while open.
	const FIELD =
		'w-full rounded-xl border-0 bg-slate-900/[0.04] px-2 py-1.5 text-sm text-slate-900 transition';
	const TYPED =
		'w-full rounded-xl border-0 bg-slate-900/[0.04] px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-primary/40 disabled:bg-transparent disabled:px-0 disabled:text-slate-500';
	const LABEL = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';
	const LIT = 'bg-primary/10 text-primary';
	const QUIET =
		'bg-slate-100 text-slate-400 group-hover/option:bg-primary/10 group-hover/option:text-primary';
	// How many known choices a typed field's list shows.
	const KNOWN = 5;

	const asking = new LookupState(() => lookup);
	// A typed field's list is open: the field is in use and something is typed.
	let isListed = $state(false);
	let blurTimer: ReturnType<typeof setTimeout> | undefined;
	// How wide the start control is, so the field's words start after it.
	let startWidth = $state(0);

	const isSoft = $derived(variant === 'soft');
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
			dot: option.dot
		}))
	);
	const shown = $derived.by(() => {
		if (selected.length === 1) return labelOf(selected[0]);
		if (many && selected.length > 1) return `${selected.length} ${many}`;
		return selected.map(labelOf).join(', ');
	});
	const softIcon = $derived(icon ?? 'icon-[mdi--chevron-right]');

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
	{:else}
		<span
			class="flex shrink-0 items-center justify-center rounded-full transition {isLit
				? LIT
				: QUIET}"
			style="width: {size}px; height: {size}px"
			><span class="{option?.icon || softIcon} size-[60%]"></span></span
		>
	{/if}
{/snippet}

<!-- A typed field's list, in the flow under the field so no scrolling box or sheet can cut it off: the known choices,
     then what a lookup found, each with a line that places it, and who found them. -->
{#snippet choices()}
	{#if hasList}
		<ul
			id="{uid}-choices"
			class="mt-1.5 overflow-hidden rounded-2xl bg-white p-1 text-left shadow-[0_2px_6px_rgb(15_23_42/0.06),0_12px_28px_-12px_rgb(15_23_42/0.25)] ring-1 ring-slate-900/[0.06]"
			role="listbox"
			aria-label={label}
		>
			{#each known as option (option.value)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-900/[0.04]"
						role="option"
						aria-selected={option.value === value}
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => choose(option)}
					>
						<span class="{option.icon || softIcon} size-[18px] shrink-0 text-primary"></span>
						<span class="min-w-0 flex-1 truncate">{option.label}</span>
						{#if option.note}<span class="shrink-0 text-[11px] text-slate-400">{option.note}</span
							>{/if}
					</button>
				</li>
			{/each}
			{#each found as option (option.value)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-900/[0.04]"
						role="option"
						aria-selected="false"
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => choose(option)}
					>
						<span class="{option.icon || softIcon} size-[18px] shrink-0 text-slate-400"></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate">{option.label}</span>
							{#if option.note && option.note !== option.label}
								<span class="block truncate text-[11px] text-slate-400">{option.note}</span>
							{/if}
						</span>
					</button>
				</li>
			{/each}
			{#if asking.isAsking && !found.length}
				<li class="px-3 py-2 text-xs text-slate-400">Looking it up…</li>
			{/if}
			{#if found.length && lookup?.credit}
				<li class="px-3 pt-1 pb-1.5 text-right text-[10px] text-slate-400">
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

<!-- The field that is typed into. A soft one shows it is required by its amber dot alone and never stops a form being
     sent, as the app's fields never have. -->
{#snippet typedField(classes: string)}
	<input
		id="{uid}-input"
		class={classes}
		value={typeof value === 'string' ? value : ''}
		placeholder={isSoft ? placeholder : ' '}
		{disabled}
		required={isSoft ? undefined : required}
		name={isSoft ? name : fieldState.field.name}
		autocomplete="off"
		role="combobox"
		aria-label={isSoft ? undefined : label}
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

<!-- SOFT: the app's panel field. -->
{#snippet softField(isOpen: boolean)}
	<span
		class="{FIELD} flex min-h-[44px] items-center gap-2.5 text-left {isOpen
			? 'bg-white ring-2 ring-primary/40'
			: ''} {disabled ? 'opacity-60' : ''}"
		style:padding-left={start ? `${startWidth + 14}px` : undefined}
	>
		{#if start}
			<!-- The start control sits over this space, as a button of its own. -->
		{:else if selected.length}
			<span class="flex shrink-0 items-center pl-0.5">
				{#each selected.slice(0, 5) as choice, index (choice)}
					<span
						class="relative flex"
						style="margin-left: {index ? -8 : 0}px; z-index: {10 - index}"
						>{@render face(choice, 28, true)}</span
					>
				{/each}
			</span>
		{:else}
			<span
				class="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.05] text-slate-400"
				><span class="{softIcon} size-4"></span></span
			>
		{/if}
		{#if selected.length}
			<span class="min-w-0 flex-1 truncate">{shown}</span>
		{:else}
			<span class="min-w-0 flex-1 truncate text-slate-400">{placeholder}</span>
		{/if}
		<span class="mr-1 icon-[mdi--chevron-down] size-4 shrink-0 text-slate-400"></span>
	</span>
{/snippet}

<!-- The list a tap opens, the same for both looks. -->
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

{#snippet softTrigger(_: MenuOptionType | undefined, isOpen: boolean)}
	{@render softField(isOpen)}
{/snippet}

{#if isSoft}
	<div
		class={[help && hasLabel && 'has-help', className]}
		data-empty={selected.length ? undefined : ''}
	>
		{#if hasLabel}
			{#if isTyping}
				<span class={LABEL}>
					<label for="{uid}-input">{label}</label>
					{#if help}<Help
							{label}
							text={help}
						/>{/if}
					{#if required && !selected.length}<span
							class="size-1.5 rounded-full bg-warning"
							title="Not filled in yet"
						></span>{/if}
				</span>
			{:else}
				<p class={LABEL}>
					{label}
					{#if help}<Help
							{label}
							text={help}
						/>{/if}
					{#if required && !selected.length}<span
							class="size-1.5 rounded-full bg-warning"
							title="Not picked yet"
						></span>{/if}
				</p>
			{/if}
		{/if}
		{#if isTyping}
			<div class="relative">
				{@render typedField(inputClass ?? TYPED)}
				{@render choices()}
			</div>
		{:else if disabled}
			{@render softField(false)}
		{:else}
			<div class="relative">
				{@render menu(softTrigger)}
				{#if start}
					<div
						class="absolute top-1/2 left-1.5 -translate-y-1/2"
						bind:clientWidth={startWidth}
					>
						{@render start()}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- NOTCHED: the library's own field. -->
	{#snippet iconStartEl()}
		{#if icon}
			<Icon
				{icon}
				class="icon start"
			/>
		{/if}
	{/snippet}

	{#snippet iconEndEl()}
		{#if fieldState.trailingIcon}
			<Icon
				icon={fieldState.trailingIcon}
				class="icon end"
			/>
		{/if}
	{/snippet}

	{#snippet optionItems()}
		{#if placeholder && !multiple}
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

	{#snippet notchedTrigger()}
		<span class="select-trigger {selected.length ? '' : 'is-placeholder'}">
			<span class="select-trigger-value">{shown}</span>
		</span>
	{/snippet}

	{#snippet selectEl()}
		{#if isTyping}
			{@render typedField('')}
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
				<div class="select-menu">{@render notchedTrigger()}</div>
			{:else}
				<div class="select-menu">{@render menu(notchedTrigger)}</div>
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
					class={`field ${props.class} ${fieldState.className}`.trim()}
				>
					<legend
						><span>{fieldState.labelText}</span>{#if help}<Help
								label={fieldState.labelText}
								text={help}
							/>{/if}</legend
					>
					<label for={isTyping ? `${uid}-input` : fieldState.field.id}>
						{#if variant === 'icon text' || variant === 'icon text icon'}
							{@render iconStartEl()}
						{/if}
						{@render selectEl()}
						{#if variant === 'text icon' || variant === 'icon text icon'}
							{@render iconEndEl()}
						{/if}
					</label>
				</fieldset>
				{@render choices()}
			</div>
		{/snippet}
	</Component>
{/if}

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
		@apply flex size-full items-center rounded-(--field-radius) text-left text-[1em] text-base-900;
		@apply ps-(--input-pad-start) pe-(--input-pad-end);
	}

	fieldset:has(.start) .select-trigger {
		padding-inline-start: calc(var(--input-pad-start) + var(--notch-padding));
	}

	fieldset .select-trigger-value {
		@apply block w-full truncate;
	}

	fieldset .select-trigger.is-placeholder .select-trigger-value {
		@apply text-base-400/70;
	}
</style>

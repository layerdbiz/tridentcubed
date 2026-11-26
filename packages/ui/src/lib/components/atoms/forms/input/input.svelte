<script lang="ts">
	/**
	 * @tags forms, input, textfield, icon, label
	 * @layout horizontal
	 */
	import type { HTMLInputAttributes } from 'svelte/elements';
	import '../forms.css';
	import {
		Component,
		type ComponentReturn,
		createFormField,
		type FieldActionType,
		Help,
		Icon,
		type TextFieldProps,
		toGeneratedClass,
		toGeneratedState
	} from '@layerd/ui';

	const uid = $props.id();

	export type InputProps = TextFieldProps<
		HTMLInputAttributes['value'],
		HTMLInputAttributes['inputmode'],
		HTMLInputAttributes['autocomplete'],
		HTMLInputAttributes['autocorrect'],
		HTMLInputAttributes['autocapitalize']
	> & {
		type?: HTMLInputAttributes['type'];
		pattern?: HTMLInputAttributes['pattern'];
		min?: HTMLInputAttributes['min'];
		max?: HTMLInputAttributes['max'];
		step?: HTMLInputAttributes['step'];
		/** A button at the end (#393), such as one that opens the link typed in. Not with a Generated value. */
		action?: FieldActionType;
		/** What is wrong with the value, on a line under the box: the input is marked invalid and described by it. */
		error?: string;
	};

	let {
		variant = 'text',
		label = 'Text',
		help = undefined,
		generated = undefined,
		onreset = undefined,
		icon = undefined,
		iconEnd = undefined,
		name = undefined,
		id = undefined,
		type = 'text',
		value = $bindable(),
		placeholder = ' ',
		disabled = false,
		required = false,
		readonly = false,
		pattern = undefined,
		min = undefined,
		max = undefined,
		step = undefined,
		action = undefined,
		error = undefined,
		minlength = undefined,
		maxlength = undefined,
		inputmode = undefined,
		autocomplete = undefined,
		autocorrect = 'off',
		autocapitalize = 'off',
		spellcheck = false,
		persist = false,
		'aria-describedby': ariaDescribedby = undefined,
		'aria-invalid': ariaInvalid = undefined,
		...props
	}: InputProps = $props();

	let inputNode = $state<HTMLInputElement | null>(null);
	// The error line's id joins whatever already describes the input.
	const errorId = $derived(error ? `${uid}-error` : undefined);
	const describedBy = $derived([ariaDescribedby, errorId].filter(Boolean).join(' ') || undefined);
	// What is being typed, kept while the input has the focus: emptied, it stays empty under the caret, and the app's
	// value comes back once the focus leaves.
	let draft = $state<string>();

	const generatedState = $derived(toGeneratedState(value, generated));
	const shown = $derived(draft ?? generatedState.shown);

	const fieldState = $derived.by(() =>
		createFormField({
			uid,
			type: `input ${type}`,
			label,
			name,
			id,
			value: shown,
			icon,
			iconEnd
		})
	);

	// The input shows at once what its owner kept of what was typed: only the digits, or a date it will not let be
	// emptied. With a Generated value, an emptied input stays empty under the caret instead.
	function handleInput(event: Event): void {
		const node = event.currentTarget as HTMLInputElement;
		const text = node.value;
		value = text;
		const kept = value == null ? '' : String(value);
		const shownNow = kept === text || (generated !== undefined && !kept) ? text : kept;
		if (shownNow !== text) node.value = shownNow;
		if (generated !== undefined) draft = shownNow;
	}

	// A date, time or month with a Generated value has no calendar button (the wand sits there), so a click opens it.
	function openPicker(): void {
		if (generated === undefined || !/^(date|datetime-local|month|time|week)$/.test(String(type)))
			return;
		try {
			inputNode?.showPicker?.();
		} catch {
			// Some browsers open it only on a real tap; the field still takes typing.
		}
	}

	// The reset empties the value, so the app's comes back; the input keeps the focus it had.
	function reset(): void {
		draft = undefined;
		value = '';
		onreset?.();
	}

	function setPersistedValue(nextValue: unknown): void {
		value =
			nextValue === null || nextValue === undefined
				? ''
				: (nextValue as HTMLInputAttributes['value']);
	}
</script>

<!-- INPUT STATE EMOJIS
-----------------------------------------------------------------------------------------------------
Use thse emojis for comments about the state of the input in the examples below.

1. Content: ⬜ empty, ⬛ value, 💬 placeholder-shown, 🤖 autofill
2. Interaction: ⚪ blur, 🟡 hover, 🔵 focus, 🔵👁️ focus-visible, 🔵📦 focus-within, 🟣 active
3. Validation: ✅ valid, ✅👤 user-valid, ❌ invalid, ❌👤 user-invalid
4. Constraints: 🔒 required, 🔲 optional, 📖 readonly, 🚫 disabled, ↗️ open
-->

{#snippet iconStartEl()}
	{#if icon}
		<Icon
			{icon}
			class="icon start"
		/>
	{/if}
{/snippet}

{#snippet generatedEl()}
	{#if generatedState.isTyped}
		<button
			type="button"
			class="generated"
			aria-label="Bring back the app's {fieldState.labelText}"
			title="Bring back the app's value"
			onmousedown={(event) => event.preventDefault()}
			onclick={reset}><span class="icon-mark icon-[mdi--refresh]"></span></button
		>
	{:else}
		<span
			class="generated"
			title="Made by the app"><span class="icon-mark icon-[mdi--auto-fix]"></span></span
		>
	{/if}
{/snippet}

<!-- The action at the end: a link out, or a button that keeps the input's focus. -->
{#snippet actionEl(item: FieldActionType)}
	{#if item.href}
		<a
			class="action"
			href={item.href}
			target="_blank"
			rel="noopener"
			aria-label={item.label}
			title={item.title ?? item.label}><span class="icon-mark {item.icon}"></span></a
		>
	{:else}
		<button
			type="button"
			class="action"
			aria-label={item.label}
			title={item.title ?? item.label}
			onmousedown={(event) => event.preventDefault()}
			onclick={() => item.onclick?.()}><span class="icon-mark {item.icon}"></span></button
		>
	{/if}
{/snippet}

<!-- What sits at the end of a variant with no end icon: the Generated mark, or the action. -->
{#snippet endEl()}
	{#if generated !== undefined}
		{@render generatedEl()}
	{:else if action}
		{@render actionEl(action)}
	{/if}
{/snippet}

{#snippet iconEndEl()}
	{#if generated !== undefined}
		{@render generatedEl()}
	{:else if action}
		{@render actionEl(action)}
	{:else if fieldState.trailingIcon}
		<Icon
			icon={fieldState.trailingIcon}
			class="icon end"
		/>
	{/if}
{/snippet}

{#snippet inputEl()}
	<input
		bind:this={inputNode}
		{type}
		value={shown}
		{placeholder}
		name={fieldState.field.name}
		id={fieldState.field.id}
		aria-labelledby="{fieldState.field.id}-label"
		aria-describedby={describedBy}
		aria-invalid={error ? true : ariaInvalid}
		aria-required={required || undefined}
		{disabled}
		{required}
		{readonly}
		{pattern}
		{min}
		{max}
		{step}
		{minlength}
		{maxlength}
		{inputmode}
		{autocomplete}
		{autocorrect}
		{autocapitalize}
		{spellcheck}
		oninput={handleInput}
		onblur={() => (draft = undefined)}
		onclick={openPicker}
	/>
{/snippet}

{#snippet textVariant()}
	{@render inputEl()}
	{@render endEl()}
{/snippet}

{#snippet iconTextVariant()}
	{@render iconStartEl()}
	{@render inputEl()}
	{@render endEl()}
{/snippet}

{#snippet textIconVariant()}
	{@render inputEl()}
	{@render iconEndEl()}
{/snippet}

{#snippet iconTextIconVariant()}
	{@render iconStartEl()}
	{@render inputEl()}
	{@render iconEndEl()}
{/snippet}

<Component
	{...props}
	{persist}
	persistContext={{ tag: 'input', type: type ?? undefined }}
	persistGetValue={() => value}
	persistSetValue={setPersistedValue}
>
	{#snippet component({ props }: { props: ComponentReturn })}
		<!-- The label sits on the border in the legend, apart from the field, which is named by it. -->
		<fieldset
			{...props}
			class={`field ${props.class} ${fieldState.className} ${toGeneratedClass(generatedState)} ${error ? 'field-invalid' : ''}`.trim()}
		>
			<legend
				><span id="{fieldState.field.id}-label">{fieldState.labelText}</span>{#if help}<Help
						label={fieldState.labelText}
						text={help}
					/>{/if}</legend
			>
			<label for={fieldState.field.id}>
				{#if variant === 'icon text'}
					{@render iconTextVariant()}
				{:else if variant === 'text icon'}
					{@render textIconVariant()}
				{:else if variant === 'icon text icon'}
					{@render iconTextIconVariant()}
				{:else}
					{@render textVariant()}
				{/if}
			</label>
		</fieldset>
		<!-- Under the box, as its next sibling: a parent that lays its children out sees two of them. -->
		{#if error}<p
				id={errorId}
				class="field-error"
			>
				{error}
			</p>{/if}
	{/snippet}
</Component>

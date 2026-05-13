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
		Icon,
		type TextFieldProps
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
	};

	let {
		variant = 'text',
		label = 'Text',
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
		minlength = undefined,
		maxlength = undefined,
		inputmode = undefined,
		autocomplete = undefined,
		autocorrect = 'off',
		autocapitalize = 'off',
		spellcheck = false,
		'aria-describedby': ariaDescribedby = undefined,
		'aria-invalid': ariaInvalid = undefined,
		...props
	}: InputProps = $props();

	const fieldState = $derived.by(() =>
		createFormField({
			uid,
			type: `input ${type}`,
			label,
			name,
			id,
			value,
			icon,
			iconEnd
		})
	);
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
		<Icon icon={icon} class="icon start" />
	{/if}
{/snippet}

{#snippet iconEndEl()}
	{#if fieldState.trailingIcon}
		<Icon icon={fieldState.trailingIcon} class="icon end" />
	{/if}
{/snippet}

{#snippet inputEl()}
	<input
		{type}
		bind:value
		{placeholder}
		name={fieldState.field.name}
		id={fieldState.field.id}
		aria-describedby={ariaDescribedby}
		aria-invalid={ariaInvalid}
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
	/>
{/snippet}

{#snippet textVariant()}
	{@render inputEl()}
{/snippet}

{#snippet iconTextVariant()}
	{@render iconStartEl()}
	{@render inputEl()}
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

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<fieldset {...props} class={`${props.class} ${fieldState.className}`.trim()}>
			<legend>{fieldState.labelText}</legend>
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
	{/snippet}
</Component>

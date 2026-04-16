<script lang="ts">
	/**
	 * @tags forms, select, dropdown, icon, label
	 * @layout horizontal
	 */
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import '../forms.css';
	import { Component, type ComponentReturn, Icon } from '@layerd/ui';
	import {
		createFormField,
		type FieldProps
	} from '../field.svelte.ts';

	const uid = $props.id();

	export type SelectOptionItemType = {
		type?: 'option';
		label: string;
		value: string;
		disabled?: boolean;
		placeholder?: boolean;
	};

	export type SelectOptionGroupType = {
		type: 'group';
		label: string;
		disabled?: boolean;
		options: SelectOptionItemType[];
	};

	export type SelectItemType = SelectOptionItemType | SelectOptionGroupType;

	export type SelectProps = FieldProps<HTMLSelectAttributes['value']> & {
		options?: SelectItemType[];
		placeholder?: string;
		required?: HTMLSelectAttributes['required'];
		disabled?: HTMLSelectAttributes['disabled'];
		multiple?: HTMLSelectAttributes['multiple'];
		autocomplete?: HTMLSelectAttributes['autocomplete'];
	};

	let {
		variant = 'text icon',
		label = 'Select',
		icon = undefined,
		iconEnd = undefined,
		name = undefined,
		id = undefined,
		options = [],
		placeholder = 'Select an option',
		disabled = false,
		required = false,
		multiple = false,
		value = $bindable(multiple ? [] : ''),
		autocomplete = undefined,
		'aria-describedby': ariaDescribedby = undefined,
		'aria-invalid': ariaInvalid = undefined,
		children = undefined,
		...props
	}: SelectProps = $props();

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

	function getItemKey(item: SelectItemType, index: number): string {
		if (item.type === 'group') {
			return `group-${item.label}-${index}`;
		}

		return `option-${item.value}-${index}`;
	}

	function getOptionKey(item: SelectOptionItemType, index: number): string {
		return `option-${item.value}-${index}`;
	}
</script>

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

{#snippet optionItems()}
	{#if placeholder && !multiple}
		<option value="" disabled={required} hidden={required}></option>
	{/if}

	{#each options as item, index (getItemKey(item, index))}
		{#if item.type === 'group'}
			<optgroup label={item.label} disabled={item.disabled}>
				{#each item.options as option, optionIndex (getOptionKey(option, optionIndex))}
					<option value={option.value} disabled={option.disabled}>{option.label}</option>
				{/each}
			</optgroup>
		{:else}
			<option value={item.value} disabled={item.disabled || item.placeholder} hidden={item.placeholder}>
				{item.label}
			</option>
		{/if}
	{/each}

	{#if children}
		{@render children()}
	{/if}
{/snippet}

{#snippet selectEl()}
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
{/snippet}

{#snippet textVariant()}
	{@render selectEl()}
{/snippet}

{#snippet iconTextVariant()}
	{@render iconStartEl()}
	{@render selectEl()}
{/snippet}

{#snippet textIconVariant()}
	{@render selectEl()}
	{@render iconEndEl()}
{/snippet}

{#snippet iconTextIconVariant()}
	{@render iconStartEl()}
	{@render selectEl()}
	{@render iconEndEl()}
{/snippet}

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<fieldset {...props} class={`${props.class} ${fieldState.className}`.trim()}>
			<legend>{fieldState.labelText}</legend>
			<label for={fieldState.field.id}>
				{#if variant === 'icon text'}
					{@render iconTextVariant()}
				{:else if variant === 'icon text icon'}
					{@render iconTextIconVariant()}
				{:else if variant === 'text'}
					{@render textVariant()}
				{:else}
					{@render textIconVariant()}
				{/if}
			</label>
		</fieldset>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	fieldset select {
		@apply cursor-pointer;
		appearance: none;
	}

	fieldset select:disabled {
		@apply cursor-not-allowed;
	}
</style>
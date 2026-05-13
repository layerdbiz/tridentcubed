<script lang="ts">
	/**
	 * @tags forms, select, dropdown, icon, label
	 * @layout horizontal
	 */
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import '../forms.css';
	import {
		Component,
		type ComponentReturn,
		createFormField,
		type FieldProps,
		Icon
	} from '@layerd/ui';

	const uid = $props.id();
	type SelectValueType = string | string[];

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

	export type SelectProps = FieldProps<SelectValueType> & {
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

	let rootNode = $state<HTMLDivElement | null>(null);
	let triggerNode = $state<HTMLButtonElement | null>(null);
	let isOpen = $state(false);

	const usesCustomPicker = $derived.by(() => !children);

	const flatOptions = $derived.by(() => {
		const flattened: SelectOptionItemType[] = [];

		for (const item of options) {
			if (item.type === 'group') {
				for (const option of item.options) {
					if (!option.placeholder) {
						flattened.push(option);
					}
				}
				continue;
			}

		if (!item.placeholder) {
			flattened.push(item);
		}
		}

		return flattened;
	});

	const selectedValues = $derived.by(() => {
		if (Array.isArray(value)) {
			return value.map((item) => String(item));
		}

		if (value == null || value === '') {
			return [];
		}

		return [String(value)];
	});

	const selectedLabels = $derived.by(() =>
		flatOptions
			.filter((option) => selectedValues.includes(option.value))
			.map((option) => option.label)
	);

	const displayValue = $derived.by(() => {
		if (!selectedLabels.length) {
			return '';
		}

		return multiple ? selectedLabels.join(', ') : selectedLabels[0];
	});

	const isPlaceholder = $derived.by(() => selectedLabels.length === 0);

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

	function isSelected(optionValue: string): boolean {
		return selectedValues.includes(optionValue);
	}

	function closePicker(focusTrigger = false): void {
		isOpen = false;

		if (focusTrigger) {
			triggerNode?.focus();
		}
	}

	function togglePicker(): void {
		if (disabled || !usesCustomPicker) return;

		isOpen = !isOpen;
	}

	function selectOption(optionValue: string): void {
		if (disabled || !usesCustomPicker) return;

		if (multiple) {
			const nextValues = isSelected(optionValue)
				? selectedValues.filter((selectedValue) => selectedValue !== optionValue)
				: [...selectedValues, optionValue];

			value = flatOptions
				.filter((option) => nextValues.includes(option.value))
				.map((option) => option.value);

			return;
		}

		value = optionValue;
		closePicker(true);
	}

	function handleTriggerKeydown(event: KeyboardEvent): void {
		if (disabled || !usesCustomPicker) return;

		if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			isOpen = true;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			closePicker(true);
		}
	}

	function handleWindowClick(event: MouseEvent): void {
		if (!isOpen || !rootNode) return;

		if (event.target instanceof Node && !rootNode.contains(event.target)) {
			closePicker();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (!isOpen || !usesCustomPicker) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			closePicker(true);
		}
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />

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
	{#if !usesCustomPicker}
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
		{#if multiple}
			<select
				class="select-native"
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
				aria-describedby={ariaDescribedby}
				aria-invalid={ariaInvalid}
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

		<button
			bind:this={triggerNode}
			type="button"
			class={`select-trigger ${isPlaceholder ? 'is-placeholder' : ''}`.trim()}
			aria-describedby={ariaDescribedby}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
			aria-controls={`${fieldState.field.id}-picker`}
			{disabled}
			onclick={togglePicker}
			onkeydown={handleTriggerKeydown}
		>
			<span class="select-trigger-value">{displayValue}</span>
		</button>

		{#if isOpen}
			<div id={`${fieldState.field.id}-picker`} class="select-panel" role="listbox" aria-multiselectable={multiple || undefined}>
				{#each options as item, index (getItemKey(item, index))}
					{#if item.type === 'group'}
						<div class="select-group">
							<div class="select-group-label">{item.label}</div>
							{#each item.options as option, optionIndex (getOptionKey(option, optionIndex))}
								<button
									type="button"
									class={`select-option ${isSelected(option.value) ? 'is-selected' : ''}`.trim()}
									role="option"
									aria-selected={isSelected(option.value)}
									disabled={item.disabled || option.disabled || option.placeholder}
									onclick={() => selectOption(option.value)}
								>
									{option.label}
								</button>
							{/each}
						</div>
					{:else}
						<button
							type="button"
							class={`select-option ${isSelected(item.value) ? 'is-selected' : ''}`.trim()}
							role="option"
							aria-selected={isSelected(item.value)}
							disabled={item.disabled || item.placeholder}
							onclick={() => selectOption(item.value)}
						>
							{item.label}
						</button>
					{/if}
				{/each}
			</div>
		{/if}
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
		<div bind:this={rootNode} class="select-root">
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
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	.select-root {
		@apply relative w-full;
	}

	.select-root:has(.select-panel) {
		@apply z-50;
	}

	fieldset select {
		@apply cursor-pointer;
		appearance: none;
	}

	fieldset select:disabled {
		@apply cursor-not-allowed;
	}

	.select-native {
		@apply absolute size-px overflow-hidden opacity-0 pointer-events-none;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}

	fieldset .select-trigger {
		@apply relative z-0 col-span-full row-start-1 flex size-full items-center rounded-(--field-radius) border-0 bg-transparent text-left text-[1em] text-base-900 outline-0;
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

	fieldset .select-panel {
		@apply absolute z-30 overflow-auto rounded-(--field-radius) border border-base-200 bg-white shadow-sm;
		left: 0;
		right: 0;
		top: calc(100% + 0.375em);
		max-height: min(18rem, 50vh);
	}

	fieldset .select-group + .select-group {
		@apply border-t border-base-100;
	}

	fieldset .select-group-label {
		@apply px-3 py-2 text-xs font-semibold uppercase tracking-wide text-base-500;
	}

	fieldset .select-option {
		@apply block w-full bg-white px-3 py-3 text-left text-base-900;
	}

	fieldset .select-option:hover:not(:disabled),
		fieldset .select-option:focus-visible {
		@apply bg-base-50 outline-0;
	}

	fieldset .select-option.is-selected {
		@apply font-semibold;
	}

	fieldset .select-option:disabled {
		@apply cursor-not-allowed opacity-50;
	}
</style>
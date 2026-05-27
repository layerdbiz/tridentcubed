<script lang="ts">
	/**
	 * @tags forms, textarea, textfield, icon, label
	 * @layout horizontal
	 */
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import '../forms.css';
	import { Component, type ComponentReturn, Icon } from '@layerd/ui';
	import { createFormField, type TextFieldProps } from '../field.svelte.ts';
	import { TextareaAutosize } from 'runed';

	const uid = $props.id();

	export type TextareaProps = TextFieldProps<
		HTMLTextareaAttributes['value'],
		HTMLTextareaAttributes['inputmode'],
		HTMLTextareaAttributes['autocomplete'],
		never,
		HTMLTextareaAttributes['autocapitalize']
	> & {
		rows?: HTMLTextareaAttributes['rows'];
		wrap?: HTMLTextareaAttributes['wrap'];
	};

	let {
		variant = 'text',
		label = 'Textarea',
		icon = undefined,
		iconEnd = undefined,
		name = undefined,
		id = undefined,
		value = $bindable(''),
		placeholder = ' ',
		disabled = false,
		required = false,
		readonly = false,
		minlength = undefined,
		maxlength = undefined,
		rows = 4,
		wrap = undefined,
		inputmode = undefined,
		autocomplete = undefined,
		autocapitalize = 'off',
		spellcheck = false,
		persist = false,
		'aria-describedby': ariaDescribedby = undefined,
		'aria-invalid': ariaInvalid = undefined,
		...props
	}: TextareaProps = $props();

	let fieldsetNode = $state<HTMLFieldSetElement | null>(null);
	let textareaNode = $state<HTMLTextAreaElement | null>(null);

	function syncFieldHeight() {
		if (!fieldsetNode || !textareaNode) return;

		fieldsetNode.style.setProperty('--input-height', `${textareaNode.offsetHeight}px`);
	}

	const fieldState = $derived.by(() =>
		createFormField({
			uid,
			type: 'textarea',
			label,
			name,
			id,
			value,
			icon,
			iconEnd
		})
	);

	function handleInput(event: Event): void {
		value = (event.currentTarget as HTMLTextAreaElement).value;
	}

	function setPersistedValue(nextValue: unknown): void {
		value =
			nextValue === null || nextValue === undefined
				? ''
				: String(nextValue);
	}

	$effect(() => {
		if (!textareaNode) return;

		const autosize = new TextareaAutosize({
			element: () => textareaNode || undefined,
			input: () => String(value ?? '')
		});

		syncFieldHeight();

		const resizeObserver = new ResizeObserver(() => {
			syncFieldHeight();
		});

		resizeObserver.observe(textareaNode);

		return () => {
			resizeObserver.disconnect();
		};
	});
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

{#snippet textareaFieldEl()}
	<textarea
		bind:this={textareaNode}
		{value}
		{placeholder}
		name={fieldState.field.name}
		id={fieldState.field.id}
		aria-describedby={ariaDescribedby}
		aria-invalid={ariaInvalid}
		aria-required={required || undefined}
		{disabled}
		{required}
		{readonly}
		{minlength}
		{maxlength}
		{rows}
		{wrap}
		{inputmode}
		{autocomplete}
		{autocapitalize}
		{spellcheck}
		oninput={handleInput}
	></textarea>
{/snippet}

{#snippet textVariant()}
	{@render textareaFieldEl()}
{/snippet}

{#snippet iconTextVariant()}
	{@render iconStartEl()}
	{@render textareaFieldEl()}
{/snippet}

{#snippet textIconVariant()}
	{@render textareaFieldEl()}
	{@render iconEndEl()}
{/snippet}

{#snippet iconTextIconVariant()}
	{@render iconStartEl()}
	{@render textareaFieldEl()}
	{@render iconEndEl()}
{/snippet}

<Component
	{...props}
	persist={persist}
	persistContext={{ tag: 'textarea' }}
	persistGetValue={() => value}
	persistSetValue={setPersistedValue}
>
	{#snippet component({ props }: { props: ComponentReturn })}
		<fieldset bind:this={fieldsetNode} {...props} class={`${props.class} ${fieldState.className} textarea`.trim()}>
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

<style lang="postcss">
	@reference "#ui.css";

	:global {
		fieldset.textarea {
			--input-height: 8.5em;
			--textarea-padding-top: 0.75em;
			--textarea-padding-bottom: 0.75em;
			--textarea-icon-offset: 0.75em;
			--legend-float-y: 2em;
			height: var(--input-height);
			min-height: var(--input-height);
		}

		fieldset.textarea textarea {
			@apply min-h-(--input-height);
			padding-top: var(--textarea-padding-top);
			padding-bottom: var(--textarea-padding-bottom);
			resize: none;
		}

		fieldset.textarea .icon.start,
		fieldset.textarea .icon.end {
			@apply self-start;
			margin-top: var(--textarea-icon-offset);
		} 
	}
</style>
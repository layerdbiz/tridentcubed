<script lang="ts">
	/**
	 * @tags forms, textarea, textfield, icon, label
	 * @layout horizontal
	 */
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import '../forms.css';
	import { Component, type ComponentReturn, Help, Icon } from '@layerd/ui';
	import {
		createFormField,
		type TextFieldProps,
		toGeneratedClass,
		toGeneratedState
	} from '../field.svelte.ts';
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
		help = undefined,
		generated = undefined,
		onreset = undefined,
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

	// What is being typed, kept while the textarea has the focus: emptied, it stays empty under the caret, and the
	// app's value comes back once the focus leaves.
	let draft = $state<string>();

	const generatedState = $derived(toGeneratedState(value, generated));
	const shown = $derived(draft ?? generatedState.shown);

	const fieldState = $derived.by(() =>
		createFormField({
			uid,
			type: 'textarea',
			label,
			name,
			id,
			value: shown,
			icon,
			iconEnd
		})
	);

	function handleInput(event: Event): void {
		const text = (event.currentTarget as HTMLTextAreaElement).value;
		if (generated !== undefined) draft = text;
		value = text;
	}

	// The reset empties the value, so the app's comes back; the textarea keeps the focus it had.
	function reset(): void {
		draft = undefined;
		value = '';
		onreset?.();
	}

	function setPersistedValue(nextValue: unknown): void {
		value = nextValue === null || nextValue === undefined ? '' : String(nextValue);
	}

	$effect(() => {
		if (!textareaNode) return;

		const autosize = new TextareaAutosize({
			element: () => textareaNode || undefined,
			input: () => shown
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

{#snippet iconEndEl()}
	{#if generated !== undefined}
		{@render generatedEl()}
	{:else if fieldState.trailingIcon}
		<Icon
			icon={fieldState.trailingIcon}
			class="icon end"
		/>
	{/if}
{/snippet}

{#snippet textareaFieldEl()}
	<textarea
		bind:this={textareaNode}
		value={shown}
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
		onblur={() => (draft = undefined)}></textarea>
{/snippet}

{#snippet textVariant()}
	{@render textareaFieldEl()}
	{#if generated !== undefined}{@render generatedEl()}{/if}
{/snippet}

{#snippet iconTextVariant()}
	{@render iconStartEl()}
	{@render textareaFieldEl()}
	{#if generated !== undefined}{@render generatedEl()}{/if}
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
	{persist}
	persistContext={{ tag: 'textarea' }}
	persistGetValue={() => value}
	persistSetValue={setPersistedValue}
>
	{#snippet component({ props }: { props: ComponentReturn })}
		<fieldset
			bind:this={fieldsetNode}
			{...props}
			class={`${props.class} ${fieldState.className} ${toGeneratedClass(generatedState)} textarea`.trim()}
		>
			<legend
				><span>{fieldState.labelText}</span>{#if help}<Help
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

		/* One selector, not a list: a nested list flattens to :is(:global ...),
		   which Svelte rejects. */
		fieldset.textarea :is(.icon.start, .icon.end, .generated) {
			@apply self-start;
			margin-top: var(--textarea-icon-offset);
		}
	}
</style>

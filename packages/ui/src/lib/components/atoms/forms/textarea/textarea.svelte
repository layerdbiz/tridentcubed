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

	let textareaNode = $state<HTMLTextAreaElement | null>(null);

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

	// The textarea grows with its words, and the box with it (#394): the box is as tall as what is in it.
	new TextareaAutosize({
		element: () => textareaNode ?? undefined,
		input: () => shown
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
		aria-labelledby="{fieldState.field.id}-label"
		aria-describedby={ariaDescribedby}
		aria-invalid={ariaInvalid}
		aria-required={required || undefined}
		{disabled}
		{required}
		{readonly}
		{minlength}
		{maxlength}
		{rows}
		style:--textarea-rows={rows}
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
		<!-- The label sits on the border in the legend, apart from the field, which is named by it. -->
		<fieldset
			{...props}
			class={`field ${props.class} ${fieldState.className} ${toGeneratedClass(generatedState)} textarea`.trim()}
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
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	/* The box is as tall as the textarea in it, which grows with its words (#394): its inside sits in the flow, from
	   the border's middle row down, where an input's is laid over a box of fixed height. An empty one's label rests on
	   the first line. Each rule is a step more specific than forms.css's own, so it never hangs on which loads first. */
	:global {
		fieldset.field.textarea {
			--textarea-padding-top: 0.75em;
			--textarea-padding-bottom: 0.75em;
			--textarea-line: 1.5em;
			--textarea-icon-offset: 0.75em;
			--legend-float-y: calc(
				var(--textarea-padding-top) + var(--textarea-line) / 2 + (var(--legend-ratio) - 1) *
					0.625em + 0.5px
			);
			height: auto;
		}

		/* While in use the border is a pixel thicker each side and the legend a pixel taller: the margins take both
		   back, so the box keeps its height and nothing under it moves. */
		fieldset.field.textarea > label {
			position: relative;
			inset: auto;
			margin-top: calc(var(--label-rise) + 1px - var(--field-edge));
			margin-bottom: calc(1px - var(--field-edge));
		}

		/* At least its rows tall, empty too: the size it is measured at has no rows of its own. */
		fieldset.textarea textarea {
			min-height: calc(
				var(--textarea-rows) * var(--textarea-line) + var(--textarea-padding-top) +
					var(--textarea-padding-bottom)
			);
			padding-top: var(--textarea-padding-top);
			padding-bottom: var(--textarea-padding-bottom);
			line-height: var(--textarea-line);
			resize: none;
		}

		/* The icons and the wand sit on the first line, not in the middle: as specific as forms.css's own rules for
		   them, and after them. One selector, not a list: a nested list flattens to :is(:global ...), which Svelte
		   rejects. */
		fieldset.field.textarea > label > :is(.icon.start, .icon.end, .generated) {
			@apply self-start;
			margin-top: var(--textarea-icon-offset);
		}
	}
</style>

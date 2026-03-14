<!-- https://play.tailwindcss.com/TqeaknIMOD?file=css -->

<script lang="ts">
	/**
	 * @tags forms, input, textfield, icon, label
	 * @layout horizontal
	 */
	import { Component, type ComponentProps, type ComponentReturn, Text, Icon } from '@layerd/ui';
	import { TextareaAutosize } from 'runed';

	export interface InputProps extends ComponentProps {
		// Input properties
		type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search' | 'number' | 'date' | 'datetime-local' | 'month' | 'week' | string;
		value?: string;
		placeholder?: string;
		label?: string;
		name?: string;
		id?: string;
		required?: boolean;
		disabled?: boolean;
		readonly?: boolean;
		pattern?: string;
		min?: string;
		max?: string;
		step?: string;
		inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
		minlength?: number;
		maxlength?: number;
		textarea?: boolean;
		autocomplete?:
			| 'on'
			| 'off'
			| 'email'
			| 'username'
			| 'current-password'
			| 'new-password'
			| 'name'
			| 'tel'
			| 'url'
			| AutoFill;
		autocorrect?: 'on' | 'off';
		autocapitalize?: 'on' | 'off' | 'words' | 'characters';
		spellcheck?: boolean;

		// Validation properties
		error?: string;
		isValid?: boolean;

		// Event handlers
		onblur?: (event?: Event) => void;
		oninput?: (event?: Event) => void;
		onkeyup?: (event?: KeyboardEvent) => void;

		// Icon properties - HYBRID APPROACH (handled by Icon component)
		/**
		 * Icon configuration - supports multiple formats:
		 * - String: "person" or "icon-[mdi--person]"
		 * - Object: { name: "person", theme: "mdi", class: "custom" }
		 */
		icon?:
			| string
			| {
					name?: string;
					theme?: 'mdi' | 'heroicons' | 'carbon' | 'solar' | string;
					class?: string;
			  };

		// Variants
		variant?: 'label' | 'icon' | 'icon label' | 'label icon' | 'icon label icon';
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = ' ', // Add space to make :placeholder-shown work
		label = 'Input Label',
		name = undefined,
		id = undefined,
		required = false,
		disabled = false,
		readonly = false,
		pattern = undefined,
		min = undefined,
		max = undefined,
		step = undefined,
		inputmode = undefined,
		minlength = undefined,
		maxlength = undefined,
		textarea = false,
		spellcheck = false,
		error = undefined,
		isValid = true,
		onblur = undefined,
		oninput = undefined,
		onkeyup = undefined,
		icon = undefined,
		variant = 'label',
		children = undefined,
		...props
	}: InputProps = $props();

	// Generate unique id if not provided
	const fallbackId = `input-${Math.random().toString(36).substr(2, 9)}`;
	const inputId = $derived(id || fallbackId);

	// Auto-generate name from label if not provided
	const inputName = $derived(name || label.toLowerCase().replace(/\s+/g, ''));
	const legendClass = $derived(
		[
			'px-1.25',
			'text-base-300-600',
			'pointer-events-none',
			'mx-3',
			'origin-top-left',
			variant === 'label' ? 'translate-x-0' : 'translate-x-8',
			'translate-y-[125%]',
			'font-medium',
			'leading-5',
			'transition-all',
			'duration-200',
			'will-change-[color,transform,font-size]'
		].join(' ')
	);

	// Error state management
	let isShaking = $state(false);
	let hasError = $state(false);

	// Update error state reactively
	$effect(() => {
		hasError = !isValid && !!error;
	});

	// Trigger shake animation when error changes
	$effect(() => {
		if (hasError) {
			isShaking = true;
			setTimeout(() => {
				isShaking = false;
			}, 600); // Match CSS animation duration
		}
	});

	// Handle input changes to immediately clear errors when valid
	function handleInput(event: Event) {
		// Call user-provided oninput handler if exists
		if (oninput) {
			oninput();
		}

		// For textareas with patterns, manually validate since HTML5 pattern doesn't work on textarea
		if (textarea && pattern) {
			const target = event.target as HTMLTextAreaElement;
			const regex = new RegExp(`^${pattern}$`);
			const isPatternValid = regex.test(target.value);

			// Set custom validity for textarea pattern validation
			if (target.value && !isPatternValid) {
				target.setCustomValidity('Please match the requested format.');
			} else {
				target.setCustomValidity('');
			}
		}

		// If there was an error but field is now valid, clear error state immediately
		if (hasError && isValid) {
			hasError = false;
		}
	}

	// Also handle keyup specifically to ensure immediate clearing
	function handleKeyup(event: KeyboardEvent) {
		// For textareas with patterns, manually validate since HTML5 pattern doesn't work on textarea
		if (textarea && pattern) {
			const target = event.target as HTMLTextAreaElement;
			const regex = new RegExp(`^${pattern}$`);
			const isPatternValid = regex.test(target.value);

			// Set custom validity for textarea pattern validation
			if (target.value && !isPatternValid) {
				target.setCustomValidity('Please match the requested format.');
			} else {
				target.setCustomValidity('');
			}
		}

		// Clear error state immediately when field becomes valid
		if (hasError && isValid) {
			hasError = false;
		}

		onkeyup?.(event);
	}

	// Handle blur events for pattern validation
	function handleBlur(event: Event) {
		// For textareas with patterns, manually validate since HTML5 pattern doesn't work on textarea
		if (textarea && pattern) {
			const target = event.target as HTMLTextAreaElement;
			const regex = new RegExp(`^${pattern}$`);
			const isPatternValid = regex.test(target.value);

			// Set custom validity for textarea pattern validation
			if (target.value && !isPatternValid) {
				target.setCustomValidity('Please match the requested format.');
			} else {
				target.setCustomValidity('');
			}
		}

		// Call user-provided onblur handler if exists
		if (onblur) {
			onblur(event);
		}
	}

	// Textarea autosize setup
	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	// Initialize TextareaAutosize when textarea is enabled
	$effect(() => {
		if (textarea && textareaEl) {
			new TextareaAutosize({
				element: () => textareaEl || undefined,
				input: () => value
			});
		}
	});
</script>

<!-- ⬜ default ⬛ prop 🟪 snippet 🟦 children -->

<!-- Snippets 
::::::::::::::::::::::::::::::::::::::::::::: -->

<!-- Leading Icon -->
{#snippet leadingIcon()}
	{#if icon}
		<Icon
			{icon}
			class="input-icon input-icon--leading top-0.75 absolute left-4 text-2xl"
		/>
	{/if}
{/snippet}

<!-- Trailing Icon -->
{#snippet trailingIcon()}
	{#if icon}
		<Icon
			{icon}
			class="input-icon input-icon--trailing top-0.75 absolute right-4 text-2xl"
		/>
	{/if}
{/snippet}

<!-- Variants 
::::::::::::::::::::::::::::::::::::::::::::: -->

<!-- Icon -->
{#snippet iconVariant()}
	{@render leadingIcon()}
	{@render inputElement('pl-12')}
{/snippet}

<!-- Label -->
{#snippet labelVariant()}
	{@render inputElement('pl-5')}
{/snippet}

<!-- Icon Label -->
{#snippet iconLabelVariant()}
	{@render leadingIcon()}
	{@render inputElement('pl-12')}
{/snippet}

<!-- Label Icon -->
{#snippet labelIconVariant()}
	{@render inputElement('pl-5 pr-12')}
	{@render trailingIcon()}
{/snippet}

<!-- Icon Label Icon -->
{#snippet iconLabelIconVariant()}
	{@render leadingIcon()}
	{@render inputElement('pl-12 pr-12')}
	{@render trailingIcon()}
{/snippet}

<!-- Input Element -->
{#snippet inputElement(className: string)}
	{#if textarea}
		<textarea
			bind:this={textareaEl}
			bind:value
			{placeholder}
			name={inputName}
			id={inputId}
			{required}
			{disabled}
			{readonly}
			{minlength}
			{maxlength}
			autocomplete="off"
			autocapitalize="off"
			{spellcheck}
			onblur={handleBlur}
			oninput={handleInput}
			onkeyup={handleKeyup}
			class="
				-mt-1.25 mb-1.25
				text-base-900-50
				
				placeholder:text-base-400-600
				block
				min-h-32
				w-full
				resize-none
				border-0
				bg-transparent
				px-4
				py-2
				outline-none
				autofill:[-webkit-box-shadow:0_0_0_30px_var(--color-base-50)_inset_!important]
				autofill:[-webkit-text-fill-color:var(--color-base-900)_!important]
				autofill:[transition:background-color_5000s_ease-in-out_0s_!important]

				dark:autofill:[-webkit-box-shadow:0_0_0_30px_var(--color-base-900)_inset_!important]
				dark:autofill:[-webkit-text-fill-color:var(--color-base-50)_!important]
				{className}
			"
		></textarea>
	{:else}
		<input
			{type}
			bind:value
			{placeholder}
			name={inputName}
			id={inputId}
			{required}
			{disabled}
			{readonly}
			{pattern}
			{min}
			{max}
			{step}
			{inputmode}
			{minlength}
			{maxlength}
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			{spellcheck}
			onblur={handleBlur}
			oninput={handleInput}
			onkeyup={handleKeyup}
			class="
				-mt-1.25 mb-1.25
				text-base-900-50
				placeholder:text-base-400-600
				block
				w-full
				border-0
				bg-transparent
				px-4
				py-2
				outline-none
				autofill:[-webkit-box-shadow:0_0_0_30px_var(--color-base-50)_inset_!important]
				autofill:[-webkit-text-fill-color:var(--color-base-900)_!important]
				autofill:[transition:background-color_5000s_ease-in-out_0s_!important]
				
				dark:autofill:[-webkit-box-shadow:0_0_0_30px_var(--color-base-900)_inset_!important]
				dark:autofill:[-webkit-text-fill-color:var(--color-base-50)_!important]
				{className}
			"
		/>
	{/if}
{/snippet}

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	{...props}
	class="input-wrapper {props.class}"
>
	{#snippet component({ props }: { props: ComponentReturn })}
		<fieldset
			{...props}
			class:input-error={hasError}
			class:input-shake={isShaking}
			class="
					border-base-200-700
					text-base-300-700
					bg-base-200-700
					shadow-base-100-700
					group relative min-w-24
					rounded-xl
					border-sm
					shadow-[inset_0_0_0_999rem]
			"
		>
			<legend class={legendClass}>
				{label}
			</legend>
			{#if variant === 'icon'}
				{@render iconVariant()}
			{:else if variant === 'icon label'}
				{@render iconLabelVariant()}
			{:else if variant === 'label icon'}
				{@render labelIconVariant()}
			{:else if variant === 'icon label icon'}
				{@render iconLabelIconVariant()}
			{:else}
				{@render labelVariant()}
			{/if}
		</fieldset>

		<!-- Error Message -->
		{#if hasError}
			<div class="mt-2 px-4">
				<p class="text-sm text-rose-500">{error}</p>
			</div>
		{/if}
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	fieldset {
		/* Error state styles - Base error styling that applies always */
		&.input-error {
			@apply border-rose-500 bg-rose-500 text-rose-700 shadow-rose-100;
		}

		/* Shake animation */
		&.input-shake {
			animation: shake 0.22s ease-in-out;
		}

		/* icon, border: focused + value */
		@variant focus-within {
			@apply border-primary text-primary bg-transparent opacity-100 shadow-none;

			/* Base icon styling */
			:global(.input-icon) {
				@apply text-primary transition-colors duration-200;
			}
			/* icon, border: focused + value */
			@variant has-[input:not(:placeholder-shown),textarea:not(:placeholder-shown)] {
				@apply border-primary text-primary bg-transparent opacity-100 shadow-none;

				/* Base icon styling */
				:global(.input-icon) {
					@apply text-primary transition-colors duration-200;
				}
			}

			/* Override error styles when focused - keep error state */
			&.input-error {
				@apply border-rose-500 bg-rose-50 text-rose-500 shadow-rose-100;
				/* Base icon styling */
				:global(.input-icon) {
					@apply text-rose-500 transition-colors duration-200;
				}
			}
		}

		/* icon, border: unfocused + value */
		@variant has-[input:not(:placeholder-shown),textarea:not(:placeholder-shown)] {
			@apply text-primary-700 border-primary-700 bg-transparent shadow-none;

			/* Override for error state when unfocused + value */
			&.input-error {
				@apply border-rose-500 bg-rose-50 text-rose-600 shadow-rose-100;
			}
			/* Base icon styling */
			:global(.input-icon) {
				@apply text-primary transition-colors duration-200;
			}
		}

		/* Base icon styling */
		:global(.input-icon) {
			@apply text-base/50 transition-colors duration-200;
		}

		/* Error state icon styling */
		&.input-error :global(.input-icon) {
			@apply text-rose-500;
		}

		/* Error state input text colors */
		&.input-error input,
		&.input-error textarea {
			@apply text-rose-900 placeholder:text-rose-400;
		}

		legend {
			@variant group-focus-within {
				/* label: focused */
				@apply text-primary translate-x-0 translate-y-0 text-xs;

				/* label: focused */
				@variant group-has-[input:not(:placeholder-shown),textarea:not(:placeholder-shown)] {
					@apply text-primary translate-x-0 translate-y-0 text-xs;
				}
			}

			/* label: unfocused + value */
			@variant group-has-[input:not(:placeholder-shown),textarea:not(:placeholder-shown)] {
				@apply text-primary-500 translate-x-0 translate-y-0 text-xs;
			}
		}
	}

	/* Error state legend styling - MOVED OUTSIDE and AFTER fieldset to have higher specificity */
	fieldset.input-error legend {
		@apply text-rose-500;

		/* Keep legend rose even when focused if there's an error */
		@variant group-focus-within {
			@apply translate-x-0 translate-y-0 text-xs text-rose-500;
		}

		/* Keep legend rose when has value */
		@variant group-has-[input:not(:placeholder-shown),textarea:not(:placeholder-shown)] {
			@apply translate-x-0 translate-y-0 text-xs text-rose-500;
		}
		/* Base icon styling */
		:global(.input-icon) {
			/* @apply text-rose-500 transition-colors duration-200; */
		}
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		10%,
		30%,
		50%,
		70%,
		90% {
			transform: translateX(-4px);
		}
		20%,
		40%,
		60%,
		80% {
			transform: translateX(4px);
		}
	}
</style>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, type ComponentProps, Icon } from '@layerd/ui';

	export interface InputNewProps extends ComponentProps {
		children?: Snippet;
		variant?: 'text' | 'icon text' | 'text icon' | 'icon text icon';
		icon?: string;
		label?: string;
	}

	let { variant = 'text', label = 'text', icon = undefined, children = undefined, ...props }: InputNewProps = $props();
</script>

<!-- INPUT STATE EMOJIS
-----------------------------------------------------------------------------------------------------
Use thse emojis for comments about the state of the input in the examples below.

1. Content: ⬜ empty, ⬛ value, 💬 placeholder-shown, 🤖 autofill
2. Interaction: ⚪ blur, 🟡 hover, 🔵 focus, 🔵👁️ focus-visible, 🔵📦 focus-within, 🟣 active
3. Validation: ✅ valid, ✅👤 user-valid, ❌ invalid, ❌👤 user-invalid
4. Constraints: 🔒 required, 🔲 optional, 📖 readonly, 🚫 disabled, ↗️ open
-->

<!-- Variant: Text -->
<fieldset>
  <legend>Text</legend>
  <label>
    <input
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      type="text"
      placeholder=" "
      name="name"
      minlength="2"
      maxlength="50"
      required
      spellcheck="false"
    />
  </label>
</fieldset>

<!-- Variant: Icon + Text -->
<fieldset>
  <legend>Icon + Text</legend>
  <label>
		<Icon name="home" class="start" />
    <input
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      type="text"
      placeholder=" "
      name="name"
      minlength="2"
      maxlength="50"
      required
      spellcheck="false" 
    />
  </label>
</fieldset>

<!-- Variant: Text + Icon -->
<fieldset>
  <legend>Text + Icon</legend>
  <label>
    <input
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      type="text"
      placeholder=" "
      name="name"
      minlength="2"
      maxlength="50"
      required
      spellcheck="false" 
			/>
			<Icon name="home" class="end" />
  </label>
</fieldset>

<!-- Variant: Icon + Text + Icon -->
<fieldset>
  <legend>Icon + Text + Icon</legend>
  <label>
		<Icon name="home" class="start" />
    <input
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      type="text"
      placeholder=" "
      name="name"
      minlength="2"
      maxlength="50"
      required
      spellcheck="false" 
    />
		<Icon icon="icon-[carbon--user]" class="icon end" />
  </label>
</fieldset>

<style lang="postcss">
	@reference "#ui.css";

	/* Notch / border model
	************************************************************/
	/*
		This keeps InputNew's border mechanics intact.
		1. Empty fields show the shell through the input outline.
		2. Focused or filled fields shift the shell to the fieldset border.
		3. The legend stays transparent so the notch remains native.
		4. Token changes drive color, while the existing focus-width math drives geometry.
	*/

	/* Field theme hooks and active tokens
	************************************************************/
	fieldset {
		/* Theme
		███████████████████████████████████████████████████████████████████████ */
		/* Keep internal tokens distinct from public --input-* override hooks. */
		--input-state-initial: var(--color-base-400);
		--input-state-hover: var(--color-base-500);
		--input-state-filled: var(--color-base-500);
		--input-state-focus: var(--color-info);
		--input-state-valid: var(--color-base-500);
		--input-state-invalid: var(--color-danger);
		--input-state-disabled: vvar(--color-base-200);
		--input-state-surface:  var(--color-white);
		--input-state-surface-disabled: var(--color-base-50);
		--input-state-value: var(--color-base-900);
		--input-state-value-disabled: var(--color-base-300);
		--input-state-border-size: 1px;
		--input-state-focus-border-size: 2px;

		/* Active tokens
		███████████████████████████████████████████████████████████████████████ */
		--bg: var(--input-state-surface);
		--border: var(--input-state-initial);
		--label: var(--input-state-initial);
		--value: var(--input-state-value);
		--icon: var(--input-state-initial);

		/* Geometry
		███████████████████████████████████████████████████████████████████████ */
		--border-width: var(--input-state-border-size);
		--border-focus-width: var(--input-state-focus-border-size);
		--radius: 0.75rem;
		--notch-padding: 0.25rem;
		--notch-indent: 0.75rem;
		--input-pad-y: 1rem;
		--input-height: 48px;
		--focus-offset: calc(var(--border-focus-width) - var(--border-width));
		--icon-size: 24px;
		--icon-gap: 0.5rem;
		--prefix-width: 0px;
		--suffix-width: 0px;
		--content-start: calc(var(--notch-indent) + var(--notch-padding));
		--content-end: var(--notch-indent);
		--input-pad-start: calc(var(--content-start) + var(--prefix-width));
		--input-pad-end: calc(var(--content-end) + var(--suffix-width));
		--legend-start: calc(var(--content-start) - var(--notch-padding));
		--legend-initial-offset-x: var(--prefix-width);

		@apply relative mb-6 block w-full rounded-xl pointer-events-none h-(--input-height);
		border: var(--border-width) solid transparent;

		&:has(:global(.start)) {
			--prefix-width: calc(var(--icon-size) + var(--icon-gap));
		}

		&:has(:global(.end)) {
			--suffix-width: calc(var(--icon-size) + var(--icon-gap));
		}
	}

	/* Base styles
	************************************************************/
	fieldset legend {
		@apply ml-(--legend-start) px-(--notch-padding) text-(--label) 
		leading-0 text-sm pointer-events-none relative z-2 bg-transparent font-medium whitespace-nowrap origin-top-left ;
		transition:
			translate 180ms ease,
			scale 180ms ease,
			opacity 180ms ease,
			color 180ms ease;
	}

	fieldset label {
		@apply absolute inset-0 z-1 block pointer-events-auto;
	}

	fieldset :global(.icon.start),
	fieldset :global(.icon.end) {
		@apply text-(--icon) absolute top-1/2 z-2 block shrink-0 leading-none transition-colors;
		translate: 0 -50%;
		inline-size: var(--icon-size);
		block-size: var(--icon-size);
	}

	fieldset :global(.start) {
		left: var(--content-start);
	}

	fieldset :global(.end) {
		right: var(--content-end);
	}

	fieldset input {
		@apply py-(--input-pad-y) pl-(--input-pad-start) pr-(--input-pad-end) 
		h-full w-full border-0 bg-transparent outline-none relative z-1 rounded-[calc(var(--radius)-1px)] transition-colors text-(--value);

		&::placeholder {
			color: transparent;
		}
	}

	fieldset:has(:global(.start)) label input {
		padding-inline-start: calc(var(--input-pad-start) + var(--notch-padding));
	}

	/* Geometry only
	************************************************************/
	fieldset:has(input:placeholder-shown) {
		border-color: transparent;

		legend {
			translate: var(--legend-initial-offset-x) 22px;
			scale: 1.35;
			opacity: 0.5;
		}

		input {
			outline: 1px solid var(--border);
		}
	}

	fieldset:is(:has(input:focus), :has(input:not(:placeholder-shown))) {
		border-color: var(--border);

		legend {
			translate: 0 0;
			scale: 1;
			opacity: 1;
		}

		input {
			outline: 0;
		}
	}

	fieldset:has(input:focus) {
		border-color: var(--border);
		border-width: var(--border-focus-width);

		label {
			top: calc(var(--focus-offset) * -1);
			left: calc(var(--focus-offset) * -1);
			width: calc(100% + (var(--focus-offset) * 2));
			height: calc(100% + (var(--focus-offset) * 2));
		}

		legend {
			top: -0.5px;
			margin-left: calc(var(--legend-start) - var(--border-width));
		}
	}

	/* States (tokens only)
	************************************************************/
	/* 🟡⚪ Hover + Blur + Empty */
	fieldset:hover:not(:has(input:disabled)):not(:has(input:focus)):not(:has(input:not(:placeholder-shown))) {
		--border: var(--input-state-hover);
		--label: var(--input-state-hover);
		--icon: var(--input-state-hover);
	}

	/* 🔵📦 Focus + Focus Within */
	fieldset:has(input:focus) {
		--border: var(--input-state-focus);
		--label: var(--input-state-focus);
		--icon: var(--input-state-focus);
	}

	/* ⬛⚪ Value + Blur */
	fieldset:not(:has(input:focus)):has(input:not(:placeholder-shown)) {
		--border: var(--input-state-filled);
		--label: var(--input-state-filled);
		--icon: var(--input-state-filled);
	}

	/* ⬛⚪✅👤 Value + Blur + User Valid */
	fieldset:not(:has(input:focus)):has(input:is(:valid, :user-valid):not(:placeholder-shown)) {
		--border: var(--input-state-valid);
		--label: var(--input-state-valid);
		--icon: var(--input-state-valid);
	}

	/* ⚪❌👤🔒 Blur + User Invalid + Required */
	fieldset:not(:has(input:focus)):has(input:required:user-invalid) {
		--border: var(--input-state-invalid);
		--label: var(--input-state-invalid);
		--icon: var(--input-state-invalid);
	}

	/* ❌ Keep invalid labels fully opaque in every state */
	fieldset:has(input:required:user-invalid) legend {
		opacity: 1;
	}

	/* ⚪🚫 Disabled */
	fieldset:has(input:disabled) {
		--bg: var(--input-state-surface-disabled);
		--border: var(--input-state-disabled);
		--label: var(--input-state-disabled);
		--icon: var(--input-state-disabled);
		--value: var(--input-state-value-disabled);

		label {
			pointer-events: none;
		}

		input {
			cursor: not-allowed;
		}
	}
</style>
<script lang="ts">
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface InputNewProps extends ComponentProps {
		label?: string;
	}

	let { label = undefined, ...props }: InputNewProps = $props();
</script>

<form class="p-10">
  <fieldset class="group floating-label">
    <legend>Name</legend>
    <i role="img" aria-hidden="true"></i> 
    <input 
      autocomplete="off" 
      autocorrect="off" 
      autocapitalize="off" 
      type="text" 
      placeholder=" " 
      name="name" 
      required="" 
      minlength="2" 
      maxlength="50" 
      spellcheck="false" />
  </fieldset>
</form>

<style lang="postcss">
	@reference "#ui.css";

	/* Base layout */
	:root { }

	/* BASE STYLES + CSS VARS SETUP
	************************************************************/
	fieldset { 
		/* Color States: icons, label, border */
		--initial: var(--color-gray-400);
		--focused: var(--color-blue-500);
		--valid: var(--color-blue-700);
		--invalid: var(--color-rose-500);

		/* Initial State */
		--bg: var(--color-white);
		--border: var(--color-gray-300);
		--borderSize: var(--border-width-2);
		--label: var(--color-gray-300);
		--value: var(--color-black);
		--icon: var(--color-gray-400);
		--inset: var(--bg) inset 0 0 0 999rem;
		
		@apply bg-(--border) shadow-(--inset) border-(--border) 
		border-2 relative min-w-72 rounded-xl; 
	}

	legend { 
		@apply text-(--label)
		pointer-events-none mx-3 px-1.5 leading-5 font-medium origin-top-left translate-x-8 translate-y-[125%] transition-all duration-200; 
	}

	i { 
		@apply text-(--icon) bg-(--icon) 
		absolute left-4 top-0.75 size-6 text-2xl transition-colors block; 
	}

	input { 
		@apply text-(--value)  
		-mt-1.25 mb-1.25 block w-full border-0 bg-transparent px-4 py-2 pl-12 outline-none; 
	}

	/* FOCUS-WITHIN (parent) — geometry/visibility only */
	@variant focus-within {
		fieldset { @apply bg-transparent; }
		legend { @apply translate-x-0 translate-y-0 text-xs bg-transparent; }
	}

	/* VALUE PRESENT (not placeholder-shown) — geometry/visibility only */
	@variant has-[input:not(:placeholder-shown)] {
		fieldset { @apply bg-transparent; }
		legend { @apply translate-x-0 translate-y-0 text-xs bg-transparent; }
	}


	/* STATES (TOKENS ONLY; EVERY STATE SETS ALL TOKENS)
	************************************************************/
	/* Focus within */
	@variant focus-within {
		fieldset { --border: var(--focused); --bg: transparent; }
		legend   { --label: var(--focused); }
		i        { --icon: var(--focused); }
		input    { --value: var(--value); }
	}

	/* Value present (not placeholder-shown) */
	@variant has-[input:not(:placeholder-shown)] {
		fieldset { --border: var(--focused); --bg: transparent; }
		legend   { --label: var(--focused); }
		i        { --icon: var(--focused); }
		input    { --value: var(--value); }
	}

	/* Invalid (HTML constraint) — stay neutral initially */
	@variant has-[input:invalid] {
		fieldset { --border: var(--initial); --bg: var(--color-white); }
		legend   { --label: var(--initial); }
		i        { --icon: var(--initial); }
		input    { --value: var(--value); }
	}

	/* User-invalid (after interaction) */
	@variant has-[input:user-invalid] {
		fieldset { --border: var(--invalid); --bg: var(--color-white); }
		legend   { --label: var(--invalid); }
		i        { --icon: var(--invalid); }
		input    { --value: var(--value); }
	}

	/* Valid */
	@variant has-[input:valid] {
		fieldset { --border: var(--valid); --bg: transparent; }
		legend   { --label: var(--valid); }
		i        { --icon: var(--valid); }
		input    { --value: var(--value); }
	}

	/* User-valid (after interaction) */
	@variant has-[input:user-valid] {
		fieldset { --border: var(--valid); --bg: transparent; }
		legend   { --label: var(--valid); }
		i        { --icon: var(--valid); }
		input    { --value: var(--value); }
	}

	/* Error/Success win over focus color when combined (and fix focused+invalid) */
	@variant focus-within {
		/* focused + user-invalid -> red */
		@variant has-[input:user-invalid] {
			fieldset { --border: var(--invalid); --bg: transparent; }
			legend   { --label: var(--invalid); }
			i        { --icon: var(--invalid); }
			input    { --value: var(--value); }
		}
		/* focused + user-valid -> green */
		@variant has-[input:user-valid] {
			fieldset { --border: var(--valid); --bg: transparent; }
			legend   { --label: var(--valid); }
			i        { --icon: var(--valid); }
			input    { --value: var(--value); }
		}
		/* focused + (plain) invalid -> use VALID colors (your requirement) */
		@variant has-[input:invalid] {
			fieldset { --border: var(--valid); --bg: transparent; }
			legend   { --label: var(--valid); }
			i        { --icon: var(--valid); }
			input    { --value: var(--value); }
		}
	}
</style>
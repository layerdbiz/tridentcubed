<!-- https://play.tailwindcss.com/TqeaknIMOD?file=css -->

<!-- INPUT STATE EMOJIS
1. Content: ⬜ empty, ⬛ value, 💬 placeholder-shown, 🤖 autofill
2. Interaction: ⚪ blur, 🟡 hover, 🔵 focus, 🔵👁️ focus-visible, 🔵📦 focus-within, 🟣 active
3. Validation: ✅ valid, ✅👤 user-valid, ❌ invalid, ❌👤 user-invalid
4. Constraints: 🔒 required, 🔲 optional, 📖 readonly, 🚫 disabled, ↗️ open
-->

<!-- 🧭 Examples
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ -->

<!-- ⬜💬⚪🔲 Empty + Placeholder Shown + Blur + Optional -->
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
		minlength="2" 
		spellcheck="false" />
</fieldset>

<!-- ⬜💬⚪🔒 Empty + Placeholder Shown + Blur + Required -->
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
		minlength="2"
		maxlength="50" 
		required
		spellcheck="false" />
</fieldset>

<style lang="postcss">
	@reference "#ui.css";

	/* Notch / border model
	************************************************************/
	/*
		This field does not use a simple painted background plus border.

		How it works:
		1. The fieldset background is set to the current border color.
		2. A very large inset shadow paints the inner surface color back inside the field.
		3. The native fieldset + legend relationship creates the notch cutout for the floating label.

		Why this matters:
		- The legend stays transparent so it can sit on top of any page/theme background.
		- We do not hardcode a legend background color just to fake the cutout.
		- If the fieldset stops using the border-colored shell plus inset fill, the notch breaks.

		In short: the "border" is really the outer shell, and the white input surface is recreated
		inside that shell with the inset fill so the notch can remain native and transparent.
	*/

	/* Field theme hooks and active tokens
	************************************************************/
	fieldset {
		/* Theme
		███████████████████████████████████████████████████████████████████████ */
		--field-rest: var(--input-color-rest, var(--color-base-300));
		--field-filled: var(--input-color-filled, var(--input-color-valid, var(--color-base-600)));
		--field-focus: var(--input-color-focus, var(--color-info));
		--field-valid: var(--input-color-valid, var(--color-base-600));
		--field-invalid: var(--input-color-invalid, var(--color-danger));
		--field-surface: var(--input-surface, var(--color-white));
		--field-value: var(--input-value-color, var(--color-base-950));
		--field-border-size: var(--input-border-size, var(--border-width-sm, 1px));

		/* Active tokens
		███████████████████████████████████████████████████████████████████████ */
		--bg: var(--field-surface);
		--border: var(--field-rest);
		--label: var(--field-rest);
		--value: var(--field-value);
		--icon: var(--field-rest);

		/*
			The border width stays constant in every state so the notch geometry and content layout
			never move. State changes are communicated through color, not border thickness.
		*/
		--inset: var(--bg) inset 0 0 0 999rem;
	}

	/* BASE STYLES + CSS VARS SETUP
	************************************************************/
	fieldset {
		/*
			The fieldset itself carries the shell color. The inset shadow paints the inner surface back in.
			Because the native border width stays constant, the legend notch stays stable and the
			content does not jump when the field changes state.
		*/
		@apply bg-(--border) shadow-(--inset) border-(--border)
		relative min-w-18 rounded-xl;
		border-width: var(--field-border-size);
	}

	/* FOCUS-WITHIN / FILLED — geometry only
	************************************************************/
	fieldset:is(:focus-within, :has(input:not(:placeholder-shown))) {
		@apply bg-transparent;
	}

	fieldset:is(:focus-within, :has(input:not(:placeholder-shown))) legend {
		@apply translate-x-0 translate-y-0 text-xs bg-transparent;
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

	/* STATES (TOKENS ONLY)
	************************************************************/
	/* 🔵📦 Focus + Focus Within */
	fieldset:focus-within {
		--bg: var(--field-surface);
		--border: var(--field-focus);
		--label: var(--field-focus);
		--icon: var(--field-focus);
	}

	/* ⬛⚪ Value + Blur */
	fieldset:not(:focus-within):has(input:not(:placeholder-shown)) {
		--bg: var(--field-surface);
		--border: var(--field-filled);
		--label: var(--field-filled);
		--icon: var(--field-filled);
	}

	/* ⬛⚪✅👤 Value + Blur + User Valid */
	fieldset:not(:focus-within):has(input:is(:valid, :user-valid):not(:placeholder-shown)) {
		--bg: var(--field-surface);
		--border: var(--field-valid);
		--label: var(--field-valid);
		--icon: var(--field-valid);
	}

	/* ⚪❌👤🔒 Blur + User Invalid + Required */
	fieldset:not(:focus-within):has(input:required:user-invalid) {
		--bg: var(--field-surface);
		--border: var(--field-invalid);
		--label: var(--field-invalid);
		--icon: var(--field-invalid);
	}
</style>
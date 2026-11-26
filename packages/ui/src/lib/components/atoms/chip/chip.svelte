<script lang="ts">
	/**
	 * @tags ui, chip, label
	 */
	// The chip (#381): a word or two in a pill, a record's label, a project's status, a choice to switch on or off.
	// The app's hand-built chips and pills are this one. Given `tag="button"` and an `onclick` it is a button, and
	// `aria-pressed` says whether it is on.
	//
	// Its look is set from outside (Justin, 2026-11-26): it is the base component, so `color`, `appearance`, their
	// shorthands, `size` and `class` land on the pill. With no colour it is bare and wears its place's words' colour.
	// Its box (a pill in the line, its words and any icon centred in a row), padding and type sit on the base size
	// ladder, in the components layer, so any class a place gives beats them. It repeats in every dashboard row, so it takes the base component's light path: one element, its words.
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface ChipProps extends ComponentProps {
		/** Its words; `children` in their place draws more (an icon beside them). */
		label?: string;
	}

	let { class: className = '', ...props }: ChipProps = $props();
</script>

<Component
	tag="span"
	{...props}
	class="chip shrink-0 rounded-full whitespace-nowrap {className}"
/>

<style lang="postcss">
	@reference "#ui.css";

	/* Its box, padding and type on the base size ladder, in the components layer, where a place's own class beats them. */
	@layer components {
		:global(.chip) {
			display: inline-flex;
			align-items: center;
			gap: 0.375em;
			padding: 0.25em 0.75em;
			font-size: 0.75rem;
			font-weight: 600;
		}
		:global(.chip:where(.xxs)) {
			font-size: 0.5625rem;
		}
		:global(.chip:where(.xs)) {
			font-size: 0.625rem;
		}
		:global(.chip:where(.sm)) {
			font-size: 0.6875rem;
		}
		:global(.chip:where(.lg)) {
			font-size: 0.875rem;
		}
		:global(.chip:where(.xl)) {
			font-size: 1rem;
		}
		:global(.chip:where(.xxl)) {
			font-size: 1.125rem;
		}
	}
</style>

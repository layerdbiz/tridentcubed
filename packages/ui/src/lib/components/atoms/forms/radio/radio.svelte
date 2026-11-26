<script
	lang="ts"
	generics="T"
>
	/**
	 * @tags forms, radio
	 * @layout horizontal
	 */
	// A pick-one group (#382): a row of choices where exactly one is picked, such as how many photos share a report
	// page. The row is a radio group, named by `label` or by the `aria-labelledby` of a label shown beside it; each
	// choice is drawn by its owner in the `option` snippet, on a button that wears the `props` it is given, so every
	// row keeps its own look, and a disabled fieldset round it disables them all (the base `disabled` would only stop
	// the pointer, so it is not offered). A tap or a click picks; the arrow keys move along the row and pick as they
	// go; only the picked choice is reached with Tab.
	import type { Snippet } from 'svelte';
	import {
		Component,
		createPickOptions,
		type ComponentProps,
		type PickOptionType
	} from '@layerd/ui';

	export interface RadioProps<T> extends Omit<
		ComponentProps,
		'value' | 'label' | 'disabled' | 'children'
	> {
		/** The choices' values, in order. */
		options: readonly T[];
		/** The picked choice's value (bindable), matched with ===: an object kept in `$state` is a copy, so keep it in `$state.raw`. */
		value?: T;
		/** What the group picks, read out by a screen reader, when no label beside it names it. */
		label?: string;
		/** Draws one choice on a button that wears `props`. */
		option: Snippet<[PickOptionType<T>]>;
		/** Called with a choice's value each time it is picked. */
		onpick?: (value: T) => void;
	}

	let {
		options,
		value = $bindable(),
		label = undefined,
		option,
		onpick = undefined,
		...props
	}: RadioProps<T> = $props();

	function pick(next: T): void {
		value = next;
		onpick?.(next);
	}

	const choices = $derived(createPickOptions(options, value, 'radio', pick));
</script>

<Component
	{...props}
	role="radiogroup"
	aria-label={label}
>
	{#each choices as choice (choice.value)}
		{@render option(choice)}
	{/each}
</Component>

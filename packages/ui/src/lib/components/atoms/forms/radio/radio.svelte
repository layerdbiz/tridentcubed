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
	// row keeps its own look, and a disabled fieldset round it disables them all. A tap or a click picks; the arrow
	// keys move along the row and pick as they go; only the picked choice is reached with Tab. The root override is for
	// the group and its choices.
	import type { Snippet } from 'svelte';
	import {
		Component,
		createPickProps,
		type ComponentProps,
		type ComponentReturn,
		type PickOptionType
	} from '@layerd/ui';

	export interface RadioProps<T> extends Omit<ComponentProps, 'value' | 'label'> {
		/** The choices' values, in order. */
		options: readonly T[];
		/** The picked choice's value (bindable). */
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

	const each = $derived(createPickProps(options, value, 'radio', pick));
</script>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<div
			{...props}
			role="radiogroup"
			aria-label={label}
		>
			{#each options as item, index (item)}
				{@render option({ value: item, index, isOn: item === value, props: each[index] })}
			{/each}
		</div>
	{/snippet}
</Component>

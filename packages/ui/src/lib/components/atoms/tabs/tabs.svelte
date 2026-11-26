<script
	lang="ts"
	generics="T"
>
	/**
	 * @tags ui, tabs
	 * @layout horizontal
	 */
	// A row of tabs (#382), one picked: the app's install how-to, dashboard count cards, Photo and Map, presentation's
	// page strip and the bottom bar's Page, Edit and Preview. The row is a tablist named by `label`; each option is
	// drawn by its owner in the `option` snippet, on an element that wears the `props` it is given (a button, or a
	// card that holds a button of its own), so every row keeps its own look. A tap or a click picks; Left and Right move
	// along the row and pick as they go; only the picked tab is reached with Tab. `children` draw first inside the
	// row, for anything that sits behind the tabs, such as a highlight that slides under the picked one. The root
	// override is for the tablist and its options.
	import type { Snippet } from 'svelte';
	import {
		Component,
		createPickProps,
		type ComponentProps,
		type ComponentReturn,
		type PickOptionType
	} from '@layerd/ui';

	export interface TabsProps<T> extends Omit<ComponentProps, 'value' | 'label'> {
		/** The tabs' values, in order. */
		options: readonly T[];
		/** The picked tab's value (bindable). */
		value?: T;
		/** What the row picks, read out by a screen reader. */
		label: string;
		/** Draws one tab on an element that wears `props`. */
		option: Snippet<[PickOptionType<T>]>;
		/** Called with a tab's value each time it is picked. */
		onpick?: (value: T) => void;
	}

	let {
		options,
		value = $bindable(),
		label,
		option,
		onpick = undefined,
		children = undefined,
		...props
	}: TabsProps<T> = $props();

	function pick(next: T): void {
		value = next;
		onpick?.(next);
	}

	const each = $derived(createPickProps(options, value, 'tab', pick));
</script>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<div
			{...props}
			role="tablist"
			aria-label={label}
		>
			{@render children?.()}
			{#each options as item, index (item)}
				{@render option({ value: item, index, isOn: item === value, props: each[index] })}
			{/each}
		</div>
	{/snippet}
</Component>

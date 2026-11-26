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
	// card that holds a button of its own, whose taps and keys stay that button's), so every row keeps its own look. A
	// tap or a click picks; Left and Right move along the row and pick as they go; only the picked tab is reached with
	// Tab. `children` draw first inside the row, for anything that sits behind the tabs, such as a highlight that
	// slides under the picked one. A disabled fieldset round the row disables button tabs; the base `disabled` would
	// only stop the pointer, so it is not offered.
	import type { Snippet } from 'svelte';
	import {
		Component,
		createPickOptions,
		type ComponentProps,
		type PickOptionType
	} from '@layerd/ui';

	export interface TabsProps<T> extends Omit<ComponentProps, 'value' | 'label' | 'disabled'> {
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

	const tabs = $derived(createPickOptions(options, value, 'tab', pick));
</script>

<Component
	{...props}
	role="tablist"
	aria-label={label}
>
	{@render children?.()}
	{#each tabs as tab (tab.value)}
		{@render option(tab)}
	{/each}
</Component>

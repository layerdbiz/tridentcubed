<script lang="ts">
	/**
	 * @tags forms, input, textfield, list
	 * @layout horizontal
	 */
	// The compact field (#387): the library box with no label of its own, for a long list of small boxes under one
	// heading row, such as the app's Items (Quantity, Description) and Time Log (Time, Activity). The heading row's
	// words name it for screen readers (`labelledby`, the ids of the heading and of anything else that names its row);
	// `label` names it when nothing on the screen does. Everything else an `<input>` takes is handed to it.
	//
	// It is one `<input>`, not the base component: built on the base component, a list of rows took about twice the
	// script time of a swipe on a slowed phone (measured on #297), and a list here can run to fifty rows of two fields.
	// Its props are the input's own for the same reason; none of the base props would do anything here. Its look is the
	// notched box's (forms.css), so the two sit together in one panel.
	import type { HTMLInputAttributes } from 'svelte/elements';
	import '../forms.css';

	export interface CompactProps extends Omit<HTMLInputAttributes, 'value' | 'children'> {
		value?: HTMLInputAttributes['value'];
		/** The ids of the words that name it, such as its column in the heading row and its row's number. */
		labelledby?: string;
		/** Its name when nothing on the screen names it. */
		label?: string;
	}

	let {
		value = $bindable(),
		labelledby = undefined,
		label = undefined,
		class: className = undefined,
		...props
	}: CompactProps = $props();
</script>

<input
	{...props}
	bind:value
	class={['field-compact', className]}
	aria-labelledby={labelledby}
	aria-label={labelledby ? undefined : label}
/>

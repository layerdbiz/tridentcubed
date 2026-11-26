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
	// It is the base component (Justin, 2026-11-26), drawn as one `<input>`: the base component's light path keeps a
	// list of fifty rows of two fields as quick as plain inputs. Its look is the notched box's (forms.css), so the two
	// sit together in one panel, and `color`, `appearance`, `size` and `class` from outside land on the input.
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Component, type ComponentProps, type ComponentRenderArgs } from '@layerd/ui';
	import '../forms.css';

	export interface CompactProps
		extends
			Omit<
				HTMLInputAttributes,
				| 'value'
				| 'children'
				| 'size'
				| 'color'
				| 'content'
				| 'disabled'
				| 'checked'
				| 'style'
				| 'class'
			>,
			Omit<ComponentProps, 'label' | 'children' | 'value'> {
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

<Component
	{...props}
	class={['field-compact', className].filter(Boolean).join(' ')}
>
	{#snippet component({ props: root }: ComponentRenderArgs)}
		<input
			{...root}
			bind:value
			aria-labelledby={labelledby}
			aria-label={labelledby ? undefined : label}
		/>
	{/snippet}
</Component>

<script lang="ts">
	/**
	 * @tags ui, list, row
	 */
	// The list row (#383): a picture or icon at the left (`start`), a line or two of words, and a mark at the end
	// (`end`), the same in every list: Recents, Online, the Activity's sign-ins, a project's team, Change Status and
	// Add. The app's six hand-built rows are this one. Given `tag="button"` and an `onclick` it is a button. `label` is
	// its first line, or a snippet that draws it (a name with the device beside it); `note` its quieter second line;
	// `children` whatever goes under them (a third line).
	//
	// Its look is set from outside (Justin, 2026-11-26): it is the base component, so `color`, `appearance`, their
	// shorthands, `size` and `class` land on the row. `labelClass`, `noteClass` and `textClass` give its lines and the
	// box round them their looks; the second line is the theme's quieter grey and smaller until it is given one. Its
	// width, the gap between its parts and its type on the base size ladder sit in the components layer, so any class
	// a place gives beats them; the gap and the second line are in em, so `size` grows the whole row. Lists
	// draw it many times, so it takes the base component's light path, with no whitespace between its parts: every
	// space would be one more node in every row (#379, measured).
	import type { Snippet } from 'svelte';
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface ListRowProps extends Omit<ComponentProps, 'label' | 'children'> {
		/** Its first line, or a snippet that draws it. */
		label?: string | Snippet;
		/** Its quieter second line. */
		note?: string;
		/** What stands at its left: a picture, an icon, a dot. */
		start?: Snippet;
		/** The mark at its end: a chevron, a tick, a device. */
		end?: Snippet;
		/** What goes under its lines: a third line. */
		children?: Snippet;
		/** Classes for the box round its lines. */
		textClass?: string;
		/** Classes for its first line, when it is words. */
		labelClass?: string;
		/** Classes for its second line, in place of the theme's quieter grey. */
		noteClass?: string;
	}

	let {
		label = undefined,
		note = undefined,
		start = undefined,
		end = undefined,
		children = undefined,
		textClass = '',
		labelClass = '',
		noteClass = 'text-[0.75em] text-base-500',
		class: className = '',
		...props
	}: ListRowProps = $props();
</script>

<Component
	tag="div"
	{...props}
	class="list-row flex min-w-0 items-center text-left {className}"
	>{#if start}{@render start()}{/if}<span class="min-w-0 flex-1 {textClass}"
		>{#if typeof label === 'function'}{@render label()}{:else if label}<span
				class="block truncate {labelClass}">{label}</span
			>{/if}{#if note}<span class="block truncate {noteClass}">{note}</span
			>{/if}{#if children}{@render children()}{/if}</span
	>{#if end}{@render end()}{/if}</Component
>

<style lang="postcss">
	@reference "#ui.css";

	/* Its width, the gap between its parts and its type on the base size ladder, in the components layer, where a
	   place's own class beats them. */
	@layer components {
		:global(.list-row) {
			width: 100%;
			gap: 0.75em;
		}
		:global(.list-row:where(.xxs)) {
			font-size: 0.75rem;
		}
		:global(.list-row:where(.xs)) {
			font-size: 0.8125rem;
		}
		:global(.list-row:where(.sm)) {
			font-size: 0.875rem;
		}
		:global(.list-row:where(.lg)) {
			font-size: 1.125rem;
		}
		:global(.list-row:where(.xl)) {
			font-size: 1.25rem;
		}
		:global(.list-row:where(.xxl)) {
			font-size: 1.375rem;
		}
	}
</style>

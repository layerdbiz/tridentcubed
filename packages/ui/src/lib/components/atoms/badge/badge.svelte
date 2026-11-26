<script
	lang="ts"
	module
>
	// What a count shows: the number, or its most and a plus above that.
	function toCountText(count: number, max: number): string {
		return count > max ? `${max}+` : String(Math.max(0, Math.floor(count)));
	}
</script>

<script lang="ts">
	/**
	 * @tags ui, badge, count
	 */
	// The badge (#381): a count in a small round mark, a board column's number of cards, a record's number of
	// projects. The app's hand-built count badges are this one. Above its `max` (99 unless told) it shows the most and
	// a plus, so it never grows past three characters.
	//
	// Its look is set from outside (Justin, 2026-11-26): it is the base component, so `color` and `appearance`
	// (primary and heavy unless told), their shorthands, `size` and `class` land on the badge. It is at least as wide
	// as it is tall, so one digit makes a circle, its count in the middle. Its box, padding, height and type sit on the
	// base size ladder, in the components layer, so any class or style a place gives beats them. It repeats in every dashboard row, so it takes
	// the base component's light path: one element and its count.
	import { Component, toLook, type ComponentProps } from '@layerd/ui';

	export interface BadgeProps extends Omit<ComponentProps, 'label' | 'children'> {
		/** The count it shows. */
		count: number;
		/** The most it shows; above it, that and a plus ("9+"). */
		max?: number;
	}

	let {
		count,
		max = 99,
		color = 'primary',
		appearance = 'heavy',
		class: className = '',
		...props
	}: BadgeProps = $props();

	// A colour or appearance given as a shorthand (`neutral`, `lite`) wins over the defaults, as on any base component.
	const look = $derived(toLook(props, { color, appearance }));
</script>

<Component
	tag="span"
	{...props}
	color={look.color}
	appearance={look.appearance}
	class="badge shrink-0 rounded-full font-bold tabular-nums {className}"
	label={toCountText(count, max)}
/>

<style lang="postcss">
	@reference "#ui.css";

	/* Its box and size on the base size ladder, in the components layer, where a place's own class or style beats it. */
	@layer components {
		:global(.badge) {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: 1.75em;
			height: 1.75em;
			padding: 0 0.45em;
			font-size: 0.75rem;
		}
		:global(.badge:where(.xxs)) {
			font-size: 0.5625rem;
		}
		:global(.badge:where(.xs)) {
			font-size: 0.625rem;
		}
		:global(.badge:where(.sm)) {
			font-size: 0.6875rem;
		}
		:global(.badge:where(.lg)) {
			font-size: 0.875rem;
		}
		:global(.badge:where(.xl)) {
			font-size: 1rem;
		}
		:global(.badge:where(.xxl)) {
			font-size: 1.125rem;
		}
	}
</style>

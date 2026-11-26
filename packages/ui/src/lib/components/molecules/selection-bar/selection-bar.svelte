<script lang="ts">
	/**
	 * @tags selection, bar, actions, toolbar
	 * @layout horizontal
	 */
	// The Selection bar (UI glossary, #402): while things are selected it takes the menu bar's place, at its exact size,
	// with icons for what can be done to all of them at once and an X at its far right that ends the selection
	// (Justin, 2026-11-24). How many are selected stands on its left, where the menu bar has its page's name. Where it
	// sits is its owner's, given as `class`, so it can take the place of whatever bar the owner has.
	//
	// Its look is set from outside (Justin, 2026-11-26), like the Button's: it is the base component, so it wears the
	// `color` it is given (primary unless told) in its `appearance` (heavy unless told), the shorthands (`accent`,
	// `lite`) as well, and `size` (or `sm`, `lg`...) scales it, since its measures are in em. Its icons and its X are
	// the library Button, reached through `actionButton` and `closeButton`, and take the bar's own words colour.
	import {
		Button,
		Component,
		type ButtonProps,
		type ComponentProps,
		type ComponentReturn
	} from '@layerd/ui';

	/** One thing the Selection bar does to everything selected: its name, read out and shown on hover, and its icon. */
	export interface SelectionActionType {
		label: string;
		icon: string;
		onclick: () => void;
	}

	export interface SelectionBarProps extends Omit<ComponentProps, 'label'> {
		/** How many are selected, shown as "3 Selected"; none leaves the count out and spreads the icons. */
		count?: number;
		/** What can be done to all of them at once, in the order shown. */
		actions?: SelectionActionType[];
		/** Ends the selection: its X. */
		onclose?: () => void;
		/** What the bar is called, read out: "Selection". */
		label?: string;
		/** Any Button prop for each of its icons. */
		actionButton?: Partial<ButtonProps>;
		/** Any Button prop for its X. */
		closeButton?: Partial<ButtonProps>;
	}

	let {
		count = undefined,
		actions = [],
		onclose = undefined,
		label = 'Selection',
		actionButton = {},
		closeButton = {},
		color = 'primary',
		appearance = 'heavy',
		...props
	}: SelectionBarProps = $props();

	// A colour or appearance given as a shorthand (`accent`, `lite`) wins over the defaults, as on any base component.
	const COLORS = ['base', 'neutral', 'primary', 'secondary', 'accent', 'danger'] as const;
	const APPEARANCES = ['heavy', 'lite', 'outline', 'ghost', 'glass', 'gradient'] as const;
	const themed = $derived({
		...props,
		color: COLORS.find((each) => props[each] === true) ?? color,
		appearance: APPEARANCES.find((each) => props[each] === true) ?? appearance
	});
	const hasCount = $derived(count !== undefined);

	const ICON =
		'flex h-[2.75em] w-[3em] shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-current/15 active:bg-current/25 *:size-[1.75em]';
</script>

<Component {...themed}>
	{#snippet component({ props: root }: { props: ComponentReturn })}
		<nav
			{...root}
			class={['selection-bar flex h-[3.5em] items-center rounded-full px-[0.375em]', root.class]}
			aria-label={label}
		>
			{#if hasCount}
				<span
					class="min-w-0 flex-1 truncate pl-[0.875em] text-[0.9375em] font-semibold tabular-nums"
					>{count} Selected</span
				>
			{/if}
			<div class={['flex items-center', !hasCount && 'flex-1 justify-evenly']}>
				{#each actions as action (action.label)}
					<Button
						unstyled
						class={ICON}
						icon={action.icon}
						aria-label={action.label}
						title={action.label}
						onclick={action.onclick}
						{...actionButton}
					/>
				{/each}
			</div>
			<Button
				unstyled
				class={[ICON, hasCount && 'ml-[0.25em]'].filter(Boolean).join(' ')}
				icon="icon-[mdi--close]"
				aria-label="End selection"
				title="End selection"
				onclick={onclose}
				{...closeButton}
			/>
		</nav>
	{/snippet}
</Component>

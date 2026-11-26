<script
	lang="ts"
	module
>
	// How much of the bar is filled, as a share of its width: never below nothing, never past all of it.
	function toShare(value: number, max: number): number {
		if (!(max > 0) || !Number.isFinite(value)) return 0;
		return Math.min(Math.max((value / max) * 100, 0), 100);
	}
</script>

<script lang="ts">
	/**
	 * @tags ui, progress
	 */
	// The progress bar (#380): how much of something is done, a project's, a panel's, an upload's. The app's six
	// hand-built bars and the Toast's own are this one. A screen reader hears it as a progress bar with its value.
	//
	// Its look is set from outside (Justin, 2026-11-26): it is the base component, and its track, the box that shows,
	// takes `class` and `size` (or `sm`, `lg`...), which sets its height on the base ladder. `color` and `appearance`
	// (primary and heavy unless told), with their shorthands, colour the filled part, which is a base component too.
	// `track` and `fill` colour the two in place of the theme's, the way a project's bar takes its state's colour,
	// until the state colours can be worn as a `color` (#33). It repeats in every dashboard row, so both parts take
	// the base component's light path. The fill moves in half a second; `[--progress-speed:300ms]` in `class` changes
	// that. `isMoving` runs a band of light along the filled part while the work is under way (the Toast's upload).
	import {
		Component,
		toLook,
		withoutLook,
		type ComponentProps,
		type ComponentReturn
	} from '@layerd/ui';

	export interface ProgressBarProps extends Omit<ComponentProps, 'value' | 'label' | 'children'> {
		/** How much is done, out of `max`. */
		value: number;
		/** The most it can be: 100 unless told. */
		max?: number;
		/** What it measures, read out by a screen reader. */
		label: string;
		/** A class that colours the track, in place of the theme's neutral. */
		track?: string;
		/** A class that colours the filled part, in place of its `color` and `appearance`. */
		fill?: string;
		/** Runs a band of light along the filled part while the work is under way. */
		isMoving?: boolean;
	}

	let {
		value,
		max = 100,
		label,
		track = 'bg-neutral-200',
		fill = undefined,
		isMoving = false,
		color = 'primary',
		appearance = 'heavy',
		...props
	}: ProgressBarProps = $props();

	const share = $derived(toShare(value, max));

	// The track takes everything but the look; the filled part takes the look, or nothing with a `fill` class. A
	// colour or appearance given as a shorthand (`accent`, `lite`) wins over the defaults, as on any base component.
	const look = $derived(toLook(props, { color, appearance }));
	const rest = $derived(withoutLook(props));
</script>

<Component
	{...rest}
	tag="span"
	>{#snippet component({ props: root }: { props: ComponentReturn })}<span
			{...root}
			class="progress-bar block h-(--progress-h) overflow-hidden rounded-full {track} {root.class}"
			role="progressbar"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={Math.floor((share * max) / 100)}
			><Component
				{...fill ? {} : look}
				tag="span"
				class="progress-fill relative block h-full overflow-hidden rounded-full transition-[width,background-color] duration-(--progress-speed,500ms) ease-out {fill ??
					''}"
				style="width: {share}%"
				data-moving={isMoving ? '' : undefined}
			/></span
		>{/snippet}</Component
>

<style lang="postcss">
	@reference "#ui.css";

	/* Its height on the base size ladder and the band of light, in the components layer, where a place's own class
	   beats them. */
	@layer components {
		/* The track's height on the base size ladder. */
		:global(.progress-bar) {
			--progress-h: 0.5rem;
		}
		:global(.progress-bar:where(.xxs)) {
			--progress-h: 0.125rem;
		}
		:global(.progress-bar:where(.xs)) {
			--progress-h: 0.25rem;
		}
		:global(.progress-bar:where(.sm)) {
			--progress-h: 0.375rem;
		}
		:global(.progress-bar:where(.lg)) {
			--progress-h: 0.75rem;
		}
		:global(.progress-bar:where(.xl)) {
			--progress-h: 1rem;
		}
		:global(.progress-bar:where(.xxl)) {
			--progress-h: 1.25rem;
		}

		/* A band of light that runs along the filled part while the work is under way. */
		:global(.progress-fill[data-moving])::after {
			content: '';
			position: absolute;
			inset: 0;
			background: linear-gradient(
				90deg,
				transparent,
				color-mix(in oklab, var(--color-surface) 45%, transparent),
				transparent
			);
			transform: translateX(-100%);
			animation: progress-sheen 1.4s linear infinite;
		}

		@media (prefers-reduced-motion: reduce) {
			:global(.progress-fill[data-moving])::after {
				animation: none;
			}
		}
	}

	@keyframes -global-progress-sheen {
		to {
			transform: translateX(100%);
		}
	}
</style>

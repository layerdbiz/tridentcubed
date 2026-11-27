<script lang="ts">
	/**
	 * @tags ui, glow, banner
	 */
	// The glow: a dark box lit from inside by soft light in two of the theme's colours, slowly drifting, for a moment
	// that should stand out, such as a new release at the top of What's New (Justin, 2026-11-27: "a dark background
	// with a gradient glow fading from some colour"). What it holds sits above the light, in the theme's on-shade.
	//
	// Its look is set from outside (Justin, 2026-11-26): it is the base component, and the box that shows takes
	// `class`, `size` and everything else given. `color` (or its shorthand, `accent`) is the main light, primary unless
	// told, and `blend` the second, any of the theme's colours, the status ones too; the dark is the theme's shade.
	// Given new colours, the light moves to them over a moment, as What's New's head does when the list scrolls to an
	// older release (Justin, 2026-11-27). The light stands still, and changes at once, for anyone who asks for less
	// motion. Only the light is cut to the box's shape: what it holds
	// may reach past its edge, as a wave pulled a pixel down over the seam does (Justin, 2026-11-27), and its own
	// margins stay inside it.
	import type { Snippet } from 'svelte';
	import {
		Component,
		toLook,
		withoutLook,
		type ComponentProps,
		type ComponentReturn
	} from '@layerd/ui';

	/** A colour of the theme a glow can be made of. */
	export type GlowColorType =
		| 'base'
		| 'neutral'
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'info'
		| 'success'
		| 'warning'
		| 'danger';

	export interface GlowProps extends Omit<ComponentProps, 'children'> {
		/** The second light, mixed into the first: the theme's colour of that name; the main one's unless told. */
		blend?: GlowColorType;
		/** Whether the light drifts. It never does for anyone who asks for less motion. */
		isMoving?: boolean;
		children?: Snippet;
	}

	let {
		blend = undefined,
		isMoving = true,
		color = 'primary',
		children,
		...props
	}: GlowProps = $props();

	// A colour given as a shorthand (`accent`) wins over the default, as on any base component.
	const main = $derived(toLook(props, { color }).color ?? 'primary');
	const rest = $derived(withoutLook(props));
	const lights = $derived(
		`--glow-a: var(--color-${main}-500); --glow-b: var(--color-${blend ?? main}-400); --glow-c: var(--color-${main}-300);`
	);
</script>

<Component
	{...rest}
	tag="div"
	>{#snippet component({ props: root }: { props: ComponentReturn })}<div
			{...root}
			class="glow relative isolate bg-shade text-on-shade {root.class}"
			style="{lights} {root.style ?? ''}"
			data-moving={isMoving ? '' : undefined}
		>
			<span
				class="glow-lights absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
				aria-hidden="true"
				><span class="glow-light glow-a"></span><span class="glow-light glow-b"></span><span
					class="glow-light glow-c"
				></span></span
			>
			<div class="relative flow-root">{@render children?.()}</div>
		</div>{/snippet}</Component
>

<style lang="postcss">
	@reference "#ui.css";

	/* The three colours, known to the browser as colours so a change of them can move from one to the next. */
	@property --glow-a {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}
	@property --glow-b {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}
	@property --glow-c {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	/* The light, in the components layer, where a place's own class beats it. */
	@layer components {
		:global(.glow) {
			box-shadow: inset 0 1px 0 color-mix(in oklab, var(--color-on-shade) 14%, transparent);
			transition:
				--glow-a 700ms ease,
				--glow-b 700ms ease,
				--glow-c 700ms ease;
		}
		:global(.glow-light) {
			position: absolute;
			z-index: -1;
			border-radius: 9999px;
			filter: blur(2.25em);
			pointer-events: none;
		}
		:global(.glow-a) {
			inset: -55% auto auto -20%;
			width: 75%;
			aspect-ratio: 1;
			background: radial-gradient(circle, var(--glow-a) 0%, transparent 68%);
			opacity: 0.9;
		}
		:global(.glow-b) {
			inset: auto -20% -65% auto;
			width: 80%;
			aspect-ratio: 1;
			background: radial-gradient(circle, var(--glow-b) 0%, transparent 66%);
			opacity: 0.85;
		}
		:global(.glow-c) {
			inset: -35% auto auto 38%;
			width: 40%;
			aspect-ratio: 1;
			background: radial-gradient(circle, var(--glow-c) 0%, transparent 70%);
			opacity: 0.45;
		}
		:global(.glow[data-moving] .glow-a) {
			animation: glow-drift 9s ease-in-out infinite alternate;
		}
		:global(.glow[data-moving] .glow-b) {
			animation: glow-drift 11s ease-in-out -4s infinite alternate-reverse;
		}
		:global(.glow[data-moving] .glow-c) {
			animation: glow-drift 13s ease-in-out -2s infinite alternate;
		}

		@media (prefers-reduced-motion: reduce) {
			:global(.glow) {
				transition: none;
			}
			:global(.glow[data-moving] .glow-light) {
				animation: none;
			}
		}
	}

	@keyframes -global-glow-drift {
		0% {
			transform: translate(0, 0) scale(1);
		}
		50% {
			transform: translate(8%, 6%) scale(1.08);
		}
		100% {
			transform: translate(-6%, 10%) scale(0.95);
		}
	}
</style>

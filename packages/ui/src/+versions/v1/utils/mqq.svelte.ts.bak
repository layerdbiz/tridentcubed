/**
 * Media Query Utilities - Max-Width Breakpoints
 *
 * Provides reactive media query utilities using max-width logic:
 * - sm: 0-639px (small screens only)
 * - md: 0-767px (small to medium screens)
 * - lg: 0-1023px (small to large screens)
 * - xl: 0-1279px (small to extra large screens)
 * - portrait/vertical: Device orientation is portrait
 * - landscape/horizontal: Device orientation is landscape
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { mq, useMediaQuery } from '@layerd/ui';
 *
 *   // Custom media query
 *   const isPortrait = useMediaQuery('(orientation: portrait)');
 * </script>
 *
 * {#if mq.sm}
 *   <p>Screen is 0-639px wide (mobile only)</p>
 * {/if}
 *
 * {#if !mq.sm}
 *   <p>Screen is 640px+ (desktop)</p>
 * {/if}
 *
 * {#if mq.portrait}
 *   <p>Portrait orientation detected</p>
 * {/if}
 *
 * {#if mq.vertical}
 *   <p>Same as portrait - vertical orientation</p>
 * {/if}
 *
 * {#if isPortrait.matches}
 *   <p>Custom media query usage</p>
 * {/if}
 * ```
 */

import { useResizeObserver } from "runed";

/**
 * Creates a reactive media query state using runed's resize observer
 * This should only be called within component context for custom media queries
 */
export function useMediaQuery(query: string) {
	// If we're not in browser, return static false
	if (typeof window === "undefined") {
		return { matches: false };
	}

	let matches = $state(window.matchMedia(query).matches);

	// Use runed's useResizeObserver to watch for viewport changes
	useResizeObserver(
		() => document.documentElement,
		() => {
			matches = window.matchMedia(query).matches;
		},
	);

	return {
		get matches() {
			return matches;
		},
	};
}

/**
 * Simple reactive viewport state using native Svelte reactivity
 * No runed dependencies to avoid effect orphan issues
 */
class ViewportState {
	width = $state(typeof window !== "undefined" ? window.innerWidth : 0);
	height = $state(typeof window !== "undefined" ? window.innerHeight : 0);
	#listener: (() => void) | null = null;

	constructor() {
		// Set up native resize listener in constructor (safe for module level)
		if (typeof window !== "undefined") {
			this.#listener = () => {
				this.width = window.innerWidth;
				this.height = window.innerHeight;
			};
			window.addEventListener("resize", this.#listener);
		}
	}

	destroy() {
		if (this.#listener && typeof window !== "undefined") {
			window.removeEventListener("resize", this.#listener);
		}
	}
}

const viewport = new ViewportState();

/**
 * Tailwind CSS Breakpoints (in pixels for easier calculations)
 */
export const BREAKPOINTS = {
	sm: 640, // 40rem
	md: 768, // 48rem
	lg: 1024, // 64rem
	xl: 1280, // 80rem
} as const;

/**
 * Pre-configured media query utilities with max-width logic
 * These can be used in templates: {#if mq.sm}
 * Uses native resize listener for reactivity
 *
 * BREAKING CHANGE: Now uses max-width logic (opposite of Tailwind)
 * - mq.sm → 0-639px (small screens ONLY)
 * - mq.md → 0-767px (small to medium screens)
 * - mq.lg → 0-1023px (small to large screens)
 * - mq.xl → 0-1279px (small to extra large screens)
 */
export const mq = {
	get sm() {
		return viewport.width < BREAKPOINTS.sm;
	},
	get md() {
		return viewport.width < BREAKPOINTS.md;
	},
	get lg() {
		return viewport.width < BREAKPOINTS.lg;
	},
	get xl() {
		return viewport.width < BREAKPOINTS.xl;
	},
	get portrait() {
		return viewport.height > viewport.width;
	},
	get vertical() {
		return viewport.height > viewport.width; // Alias for portrait
	},
	get landscape() {
		return viewport.width > viewport.height;
	},
	get horizontal() {
		return viewport.width > viewport.height; // Alias for landscape
	},
};

// Individual exports for backwards compatibility (now using max-width)
export const sm = {
	get matches() {
		return viewport.width < BREAKPOINTS.sm;
	},
};
export const md = {
	get matches() {
		return viewport.width < BREAKPOINTS.md;
	},
};
export const lg = {
	get matches() {
		return viewport.width < BREAKPOINTS.lg;
	},
};
export const xl = {
	get matches() {
		return viewport.width < BREAKPOINTS.xl;
	},
};

/**
 * Utility to check if screen is smaller than a breakpoint
 */
export const useMaxWidth = (breakpoint: keyof typeof BREAKPOINTS) => {
	return useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`);
};

/**
 * Utility to check if screen is between two breakpoints
 */
export const useBetween = (
	min: keyof typeof BREAKPOINTS,
	max: keyof typeof BREAKPOINTS,
) => {
	const minWidth = BREAKPOINTS[min];
	const maxWidth = BREAKPOINTS[max] - 1;
	const combinedQuery =
		`(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;
	return useMediaQuery(combinedQuery);
};

/**
 * Predefined screen size threshold
 */
const SCREEN_THRESHOLD = 768; // md breakpoint

/**
 * Responsive value selector based on screen size
 * Returns the first value for small screens (0-768px), second value for large screens (769px+)
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { screens } from '@layerd/ui';
 * </script>
 *
 * <Globe
 *   altitude={screens(0.15, 0)}
 *   size={screens(2, 4)}
 *   position={{
 *     latitude: screens(21, 36)
 *   }}
 * />
 * ```
 *
 * @param smallScreenValue - Value to return when viewport is <= 768px
 * @param largeScreenValue - Value to return when viewport is > 768px
 * @returns The appropriate value based on current viewport width
 */
export function screens<T>(smallScreenValue: T, largeScreenValue: T): T {
	return viewport.width <= SCREEN_THRESHOLD
		? smallScreenValue
		: largeScreenValue;
}

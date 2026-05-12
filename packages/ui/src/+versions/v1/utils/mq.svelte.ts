import { MediaQuery } from "svelte/reactivity";

// Standard browser check - works in any environment (SvelteKit, Vite, etc.)
// Svelte core doesn't provide a built-in browser detection
const isBrowser = typeof window !== "undefined";

export const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	xxl: 1536,
} as const;

// Cache MediaQuery instances - plain Map is correct here since:
// 1. We don't need reactive iteration over the cache
// 2. The MediaQuery instances themselves are reactive
// 3. SvelteMap would cause state_unsafe_mutation when .set() is called in getters
const _cache = new Map<string, MediaQuery>();

function _mq(query: string): { readonly current: boolean } {
	if (!isBrowser) return { current: false };
	let existing = _cache.get(query);
	if (!existing) {
		existing = new MediaQuery(query);
		_cache.set(query, existing);
	}
	return existing;
}

// Media query strings for each breakpoint
const QUERIES = {
	sm: `(max-width: ${BREAKPOINTS.md - 1}px)`,
	md: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${
		BREAKPOINTS.lg - 1
	}px)`,
	lg: `(min-width: ${BREAKPOINTS.lg}px) and (max-width: ${
		BREAKPOINTS.xl - 1
	}px)`,
	xl: `(min-width: ${BREAKPOINTS.xl}px) and (max-width: ${
		BREAKPOINTS.xxl - 1
	}px)`,
	xxl: `(min-width: ${BREAKPOINTS.xxl}px)`,
} as const;

export const mq = {
	// sm: 0–767px (mobile)
	get sm() {
		if (!isBrowser) return false;
		return _mq(QUERIES.sm).current;
	},
	// md: 768–1023px
	get md() {
		if (!isBrowser) return false;
		return _mq(QUERIES.md).current;
	},
	// lg: 1024–1279px
	get lg() {
		if (!isBrowser) return false;
		return _mq(QUERIES.lg).current;
	},
	// xl: 1280–1535px
	get xl() {
		if (!isBrowser) return false;
		return _mq(QUERIES.xl).current;
	},
	// xxl: 1536px+
	get xxl() {
		if (!isBrowser) return false;
		return _mq(QUERIES.xxl).current;
	},

	get portrait() {
		if (!isBrowser) return false;
		return _mq("(orientation: portrait)").current;
	},
	get vertical() {
		if (!isBrowser) return false;
		return _mq("(orientation: portrait)").current;
	},
	get landscape() {
		if (!isBrowser) return true;
		return _mq("(orientation: landscape)").current;
	},
	get horizontal() {
		if (!isBrowser) return true;
		return _mq("(orientation: landscape)").current;
	},
};

export function useMediaQuery(query: string) {
	return _mq(query);
}

export function useMinWidth(breakpoint: keyof typeof BREAKPOINTS) {
	return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
}

export function useMaxWidth(breakpoint: keyof typeof BREAKPOINTS) {
	return useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`);
}

export function useBetween(
	min: keyof typeof BREAKPOINTS,
	max: keyof typeof BREAKPOINTS,
) {
	return useMediaQuery(
		`(min-width: ${BREAKPOINTS[min]}px) and (max-width: ${
			BREAKPOINTS[max] - 1
		}px)`,
	);
}

export function screens<T>(
	base: T,
	sm?: T,
	md?: T,
	lg?: T,
	xl?: T,
	xxl?: T,
): T {
	if (mq.xxl && xxl !== undefined) return xxl;
	if (mq.xl && xl !== undefined) return xl;
	if (mq.lg && lg !== undefined) return lg;
	if (mq.md && md !== undefined) return md;
	if (mq.sm && sm !== undefined) return sm;
	return base;
}

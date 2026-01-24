import { MediaQuery } from "svelte/reactivity";

const isBrowser = typeof window !== "undefined";

export const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
} as const;

const _cache = new Map<string, MediaQuery>();

function _mq(query: string) {
	if (!isBrowser) return { current: false } as const;
	let existing = _cache.get(query);
	if (!existing) {
		existing = new MediaQuery(query);
		_cache.set(query, existing);
	}
	return existing;
}

export const mq = {
	// "small device" bucket (0–767)
	get sm() {
		return _mq(`(max-width: ${BREAKPOINTS.md - 1}px)`).current;
	},
	// "everything else" bucket (768+)
	get md() {
		return _mq(`(min-width: ${BREAKPOINTS.md}px)`).current;
	},

	get lg() {
		return _mq(`(min-width: ${BREAKPOINTS.lg}px)`).current;
	},
	get xl() {
		return _mq(`(min-width: ${BREAKPOINTS.xl}px)`).current;
	},

	get portrait() {
		return _mq("(orientation: portrait)").current;
	},
	get vertical() {
		return _mq("(orientation: portrait)").current;
	},
	get landscape() {
		return _mq("(orientation: landscape)").current;
	},
	get horizontal() {
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

export function screens<T>(base: T, sm?: T, md?: T, lg?: T, xl?: T): T {
	if (mq.xl && xl !== undefined) return xl;
	if (mq.lg && lg !== undefined) return lg;
	if (mq.md && md !== undefined) return md;
	if (mq.sm && sm !== undefined) return sm;
	return base;
}

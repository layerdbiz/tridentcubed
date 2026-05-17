import { MediaQuery } from "svelte/reactivity";

export const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	xxl: 1536,
} as const;

export type MqBucketType = keyof typeof BREAKPOINTS;

export const MQ_STORAGE_KEY = "layerd:mq";
export const MQ_DEFAULT_BUCKET: MqBucketType = "sm";

export const MQ_QUERY_MAP = {
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
} as const satisfies Record<MqBucketType, string>;

export const MQ_BUCKET_PRIORITY = [
	"xxl",
	"xl",
	"lg",
	"md",
	"sm",
] as const satisfies readonly MqBucketType[];

// Standard browser check - works in any environment (SvelteKit, Vite, etc.)
// Svelte core doesn't provide a built-in browser detection
const _isBrowser = typeof window !== "undefined";

// Configuration to enable or disable data-mq updates
let _updateHtmlAttributes = true;

// Function to configure the MQ utility
export function configureMqUtility(options: { updateHtmlAttributes?: boolean } = {}): void {
	if (options.updateHtmlAttributes !== undefined) {
		_updateHtmlAttributes = options.updateHtmlAttributes;
	}
}

export function isMqBucket(value: string | null): value is MqBucketType {
	return value !== null && MQ_BUCKET_PRIORITY.includes(value as MqBucketType);
}

// Read the bucket written to data-mq by the Mq head bootstrap script.
// Module scripts (type="module") are deferred, so the inline head script has
// already had a chance to seed the attribute before this module evaluates.
export function readHtmlMqBucket(): MqBucketType | null {
	if (!_isBrowser) return null;
	const attr = document.documentElement.getAttribute("data-mq");
	return isMqBucket(attr) ? attr : null;
}

export function readLocalMqBucket(): MqBucketType | null {
	if (!_isBrowser) return null;
	try {
		const storedValue = window.localStorage.getItem(MQ_STORAGE_KEY);
		return isMqBucket(storedValue) ? storedValue : null;
	} catch {
		return null;
	}
}

export function readBootstrapMqBucket(): MqBucketType | null {
	return readHtmlMqBucket() ?? readLocalMqBucket();
}

export function resolveMqBucket(): MqBucketType {
	if (!_isBrowser) return MQ_DEFAULT_BUCKET;

	if (typeof window.matchMedia === "function") {
		for (const bucket of MQ_BUCKET_PRIORITY) {
			if (window.matchMedia(MQ_QUERY_MAP[bucket]).matches) {
				return bucket;
			}
		}
	}

	const width = window.innerWidth || document.documentElement.clientWidth || 0;
	if (width >= BREAKPOINTS.xxl) return "xxl";
	if (width >= BREAKPOINTS.xl) return "xl";
	if (width >= BREAKPOINTS.lg) return "lg";
	if (width >= BREAKPOINTS.md) return "md";
	return MQ_DEFAULT_BUCKET;
}

function readInitialMqBucket(): MqBucketType {
	return readBootstrapMqBucket() ?? resolveMqBucket();
}

// Single reactive source of truth for the active MQ bucket.
// Initialized from the bootstrapped bucket so the first reactive read is
// already useful on both the server fallback and the hydrated client.
let _mqBucket: MqBucketType = $state(readInitialMqBucket());

// Ready state: false until the exact breakpoint is resolved.
// In SSR mode, stays false initially so base/content is the initial projection.
// After client init, becomes true when breakpoint is confirmed.
let _mqReady: boolean = $state(false);

// Loading state: true while the visual loading overlay should be visible.
// Controlled by <Mq /> duration and effect logic, not by breakpoint resolution.
let _mqLoading: boolean = $state(false);

// Called by the Mq component on mount and on every resize to keep the
// reactive bucket, the data-mq attribute, and localStorage in sync.
export function _setMqBucket(bucket: MqBucketType): void {
	if (_mqBucket !== bucket) {
		_mqBucket = bucket;
	}
	if (_isBrowser && _updateHtmlAttributes) {
		document.documentElement.setAttribute("data-mq", bucket);
		document.documentElement.setAttribute("data-mq-init", "1");
		try {
			localStorage.setItem(MQ_STORAGE_KEY, bucket);
		} catch {
			/* ignore */
		}
	}
}

// Set MQ ready state (breakpoint is resolved and exact projection can take over).
export function _setMqReady(ready: boolean): void {
	_mqReady = ready;
}

// Set MQ loading state (visual overlay is visible).
export function _setMqLoading(loading: boolean): void {
	_mqLoading = loading;
}

// Orientation queries are not bucket-based so they still use MediaQuery.
const _orientationCache = new Map<string, MediaQuery>();

function _mq(query: string): { readonly current: boolean } {
	if (!_isBrowser) return { current: false };
	let existing = _orientationCache.get(query);
	if (!existing) {
		existing = new MediaQuery(query);
		_orientationCache.set(query, existing);
	}
	return existing;
}

export const mq = {
	get bucket() {
		return _mqBucket;
	},

	// SSR canonical projection state.
	// True before exact breakpoint is ready (SSR or client startup).
	// False after MQ resolves.
	get base() {
		return !_mqReady;
	},

	// Alias for base for semantic clarity.
	get content() {
		return !_mqReady;
	},

	// True when the exact breakpoint has been resolved.
	// False during SSR and client startup until MQ confirms the breakpoint.
	get ready() {
		return _mqReady;
	},

	// True while visual loading overlay should be visible.
	get loading() {
		return _mqLoading;
	},

	// Bucket getters — reactive via _mqBucket ($state), no matchMedia race.
	get sm() {
		return _mqBucket === "sm";
	},
	get md() {
		return _mqBucket === "md";
	},
	get lg() {
		return _mqBucket === "lg";
	},
	get xl() {
		return _mqBucket === "xl";
	},
	get xxl() {
		return _mqBucket === "xxl";
	},

	// Orientation — not captured in data-mq, uses MediaQuery directly.
	get portrait() {
		if (!_isBrowser) return false;
		return _mq("(orientation: portrait)").current;
	},
	get vertical() {
		if (!_isBrowser) return false;
		return _mq("(orientation: portrait)").current;
	},
	get landscape() {
		if (!_isBrowser) return true;
		return _mq("(orientation: landscape)").current;
	},
	get horizontal() {
		if (!_isBrowser) return true;
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

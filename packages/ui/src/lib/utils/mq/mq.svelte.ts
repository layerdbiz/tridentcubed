import { MediaQuery } from "svelte/reactivity";

export const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	xxl: 1536,
} as const;

export type MqBucketType = keyof typeof BREAKPOINTS;
export type MqOrientationType = "portrait" | "landscape";

export const MQ_STORAGE_KEY = "layerd:mq";
export const MQ_ORIENTATION_STORAGE_KEY = "layerd:mq:orientation";

export const MQ_DEFAULT_BUCKET: MqBucketType = "sm";
export const MQ_DEFAULT_ORIENTATION: MqOrientationType = "landscape";

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

export const MQ_ORIENTATION_QUERY_MAP = {
	portrait: "(orientation: portrait)",
	landscape: "(orientation: landscape)",
} as const satisfies Record<MqOrientationType, string>;

export const MQ_BUCKET_PRIORITY = [
	"xxl",
	"xl",
	"lg",
	"md",
	"sm",
] as const satisfies readonly MqBucketType[];

export const MQ_ORIENTATION_PRIORITY = [
	"portrait",
	"landscape",
] as const satisfies readonly MqOrientationType[];

const _isBrowser = typeof window !== "undefined";

let _updateHtmlAttributes = true;
let _isMqRuntimeReady = false;
let _resizeFrame = 0;

export function configureMqUtility(
	options: { updateHtmlAttributes?: boolean } = {},
): void {
	if (options.updateHtmlAttributes !== undefined) {
		_updateHtmlAttributes = options.updateHtmlAttributes;
	}
}

export function isMqBucket(value: string | null): value is MqBucketType {
	return value !== null && MQ_BUCKET_PRIORITY.includes(value as MqBucketType);
}

export function isMqOrientation(
	value: string | null,
): value is MqOrientationType {
	return value !== null &&
		MQ_ORIENTATION_PRIORITY.includes(value as MqOrientationType);
}

export function readHtmlMqBucket(): MqBucketType | null {
	if (!_isBrowser) return null;

	const attr = document.documentElement.getAttribute("data-mq");

	return isMqBucket(attr) ? attr : null;
}

export function readHtmlMqOrientation(): MqOrientationType | null {
	if (!_isBrowser) return null;

	const attr = document.documentElement.getAttribute("data-orientation");

	return isMqOrientation(attr) ? attr : null;
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

export function readLocalMqOrientation(): MqOrientationType | null {
	if (!_isBrowser) return null;

	try {
		const storedValue = window.localStorage.getItem(MQ_ORIENTATION_STORAGE_KEY);

		return isMqOrientation(storedValue) ? storedValue : null;
	} catch {
		return null;
	}
}

export function readBootstrapMqBucket(): MqBucketType | null {
	return readHtmlMqBucket() ?? readLocalMqBucket();
}

export function readBootstrapMqOrientation(): MqOrientationType | null {
	return readHtmlMqOrientation() ?? readLocalMqOrientation();
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

export function resolveMqOrientation(): MqOrientationType {
	if (!_isBrowser) return MQ_DEFAULT_ORIENTATION;

	if (typeof window.matchMedia === "function") {
		for (const orientation of MQ_ORIENTATION_PRIORITY) {
			if (window.matchMedia(MQ_ORIENTATION_QUERY_MAP[orientation]).matches) {
				return orientation;
			}
		}
	}

	const width = window.innerWidth || document.documentElement.clientWidth || 0;
	const height = window.innerHeight || document.documentElement.clientHeight ||
		0;

	return height >= width ? "portrait" : "landscape";
}

function readInitialMqBucket(): MqBucketType {
	return readBootstrapMqBucket() ?? resolveMqBucket();
}

function readInitialMqOrientation(): MqOrientationType {
	return readBootstrapMqOrientation() ?? resolveMqOrientation();
}

let _mqBucket: MqBucketType = $state(readInitialMqBucket());
let _mqOrientation: MqOrientationType = $state(readInitialMqOrientation());
let _mqReady: boolean = $state(false);
let _mqLoading: boolean = $state(false);

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

export function _setMqOrientation(orientation: MqOrientationType): void {
	if (_mqOrientation !== orientation) {
		_mqOrientation = orientation;
	}

	if (_isBrowser && _updateHtmlAttributes) {
		document.documentElement.setAttribute("data-orientation", orientation);
		document.documentElement.setAttribute("data-orientation-init", "1");

		try {
			localStorage.setItem(MQ_ORIENTATION_STORAGE_KEY, orientation);
		} catch {
			/* ignore */
		}
	}
}

export function _setMqReady(ready: boolean): void {
	_mqReady = ready;
}

export function _setMqLoading(loading: boolean): void {
	_mqLoading = loading;
}

export function syncMqBucket(): MqBucketType {
	const bucket = resolveMqBucket();

	_setMqBucket(bucket);

	return bucket;
}

export function syncMqOrientation(): MqOrientationType {
	const orientation = resolveMqOrientation();

	_setMqOrientation(orientation);

	return orientation;
}

export function syncMqState(): {
	bucket: MqBucketType;
	orientation: MqOrientationType;
} {
	return {
		bucket: syncMqBucket(),
		orientation: syncMqOrientation(),
	};
}

function handleMqResize(): void {
	if (!_isBrowser) return;

	if (_resizeFrame) {
		window.cancelAnimationFrame(_resizeFrame);
	}

	_resizeFrame = window.requestAnimationFrame(() => {
		syncMqState();
		_resizeFrame = 0;
	});
}

function completeMqRuntimeInit(): void {
	syncMqState();
	_setMqReady(true);
}

export function initMqRuntime(): void {
	if (!_isBrowser || _isMqRuntimeReady) return;

	_isMqRuntimeReady = true;

	syncMqState();

	window.addEventListener("resize", handleMqResize, { passive: true });
	window.addEventListener("orientationchange", handleMqResize, {
		passive: true,
	});

	if (typeof window.requestAnimationFrame === "function") {
		window.requestAnimationFrame(completeMqRuntimeInit);
		return;
	}

	window.setTimeout(completeMqRuntimeInit, 0);
}

const _mediaQueryCache = new Map<string, MediaQuery>();

function _mq(query: string): { readonly current: boolean } {
	if (!_isBrowser) return { current: false };

	let existing = _mediaQueryCache.get(query);

	if (!existing) {
		existing = new MediaQuery(query);
		_mediaQueryCache.set(query, existing);
	}

	return existing;
}

export const mq = {
	get bucket() {
		return _mqBucket;
	},

	get orientation() {
		return _mqOrientation;
	},

	get base() {
		return !_mqReady;
	},

	get content() {
		return !_mqReady;
	},

	get ready() {
		return _mqReady;
	},

	get loading() {
		return _mqLoading;
	},

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

	get portrait() {
		return _mqOrientation === "portrait";
	},

	get vertical() {
		return _mqOrientation === "portrait";
	},

	get landscape() {
		return _mqOrientation === "landscape";
	},

	get horizontal() {
		return _mqOrientation === "landscape";
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

initMqRuntime();

import { useEventListener } from "runed";
import { browser } from "$app/environment";

export interface DebugValueType {
	auto?: boolean;
	box?: boolean;
	grid?: boolean;
	rails?: boolean;
}

export interface NormalizedDebugValue {
	auto: boolean;
	box: boolean;
	grid: boolean;
	rails: boolean;
}

export interface DebugOptions {
	/**
	 * Whether debug mode is enabled
	 * @default true
	 */
	enabled?: boolean;
}

export interface DebugPosition {
	top: number;
	left: number;
	centerX: number;
	centerY: number;
	width: number;
	height: number;
}

export function isDebugValueType(value: unknown): value is DebugValueType {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeDebugValue(value: unknown): NormalizedDebugValue {
	if (value === true) {
		return {
			auto: true,
			box: false,
			grid: false,
			rails: false,
		};
	}

	if (!isDebugValueType(value)) {
		return {
			auto: false,
			box: false,
			grid: false,
			rails: false,
		};
	}

	return {
		auto: Boolean(value.auto),
		box: Boolean(value.box),
		grid: Boolean(value.grid),
		rails: Boolean(value.rails),
	};
}

export function hasLayoutDebugValue(
	value: Pick<NormalizedDebugValue, "grid" | "rails">,
): boolean {
	return value.grid || value.rails;
}

export class DebugClass {
	private positionTrigger = $state(0);
	private options: Required<DebugOptions>;

	constructor(
		private elementGetter: () => HTMLElement | null | undefined,
		options: DebugOptions = {},
	) {
		this.options = {
			enabled: true,
			...options,
		};

		// Set up event listeners for scroll/resize to trigger position updates
		this.setupEventListeners();
	}

	private setupEventListeners() {
		// Use runed event listeners for scroll/resize with SSR guard
		useEventListener(
			() => (browser && this.options.enabled ? window : null),
			"scroll",
			() => {
				this.positionTrigger++;
			},
			{ passive: true },
		);

		useEventListener(
			() => (browser && this.options.enabled ? window : null),
			"resize",
			() => {
				this.positionTrigger++;
			},
			{ passive: true },
		);
	}

	/**
	 * Calculate overlay position for debug display
	 */
	getOverlayPosition(): DebugPosition {
		const element = this.elementGetter();

		if (!browser || !this.options.enabled || !element) {
			return { top: 0, left: 0, centerX: 0, centerY: 0, width: 0, height: 0 };
		}

		// Access positionTrigger to ensure reactivity on scroll/resize
		this.positionTrigger;

		const rect = element.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		return {
			top: rect.bottom + 4,
			left: centerX,
			centerX,
			centerY,
			width: rect.width,
			height: rect.height,
		};
	}

	/**
	 * Check if debug overlay should be shown
	 */
	isEnabled(position?: DebugPosition): boolean {
		if (!browser || !this.options.enabled) return false;

		const element = this.elementGetter();
		if (!element) return false;

		const pos = position || this.getOverlayPosition();
		return pos.width > 0 && pos.height > 0;
	}

	/**
	 * Enable debug mode
	 */
	enable() {
		this.options.enabled = true;
	}

	/**
	 * Disable debug mode
	 */
	disable() {
		this.options.enabled = false;
	}

	/**
	 * Toggle debug mode
	 */
	toggle() {
		this.options.enabled = !this.options.enabled;
	}

	/**
	 * Whether debug mode is currently enabled
	 */
	get enabled(): boolean {
		return this.options.enabled;
	}
}

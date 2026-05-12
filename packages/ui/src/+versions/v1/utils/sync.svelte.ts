// packages/ui/src/lib/utils/sync.svelte.ts
import { PersistedState } from "runed";

type PersistFallback<T> = T | (() => T);

function resolveFallback<T>(fallback: PersistFallback<T>): T {
	return typeof fallback === "function" ? (fallback as () => T)() : fallback;
}

/**
 * SyncOptions – configuration for Sync class
 */
export interface SyncOptions {
	target: "html" | "body" | string; // element selector
	attribute: string; // attribute name
	defaultValue?: string; // fallback if none in storage
	syncTabs?: boolean; // sync across tabs
	storage?: "local" | "session"; // storage type
}

export interface PersistJsonOptions<T> {
	key: string;
	fallback: PersistFallback<T>;
	syncTabs?: boolean;
	storage?: "local" | "session";
	serialize?: (value: T) => string;
	deserialize?: (value: string) => T;
	validate?: (value: unknown) => value is T;
}

/**
 * Synchronize an HTML attribute with storage + optional cross-tab sync.
 * SSR-safe: only touches DOM/storage when `window` exists.
 * Exposes PersistedState directly for full reactive capabilities.
 */
export class Sync {
	public readonly state: PersistedState<string>;
	private readonly target: string;
	private readonly attribute: string;

	constructor(options: SyncOptions) {
		const {
			target,
			attribute,
			defaultValue = "",
			syncTabs = true,
			storage = "local",
		} = options;

		this.target = target;
		this.attribute = attribute;
		const storageKey = `sync-attr:${target}:${attribute}`;

		// Get initial value from DOM if available (for FOUC prevention)
		let initialValue = defaultValue;
		if (typeof window !== "undefined") {
			const currentDOMValue = this.getElement()?.getAttribute(attribute);
			if (currentDOMValue) initialValue = currentDOMValue;
		}

		// Create PersistedState - it handles SSR safety and cross-tab sync
		this.state = new PersistedState(storageKey, initialValue, {
			storage,
			syncTabs,
		});

		// Set up reactive DOM sync - only runs on client
		if (typeof window !== "undefined") {
			$effect(() => {
				// Check if FOUC prevention has already handled the initial state
				const foucPrevented = document.documentElement.getAttribute(
					"data-fouc-prevented",
				);

				// On first run, if FOUC prevention set the DOM, don't override it immediately
				if (foucPrevented && !this.hasRunEffect) {
					this.hasRunEffect = true;
					// Sync our state with what FOUC prevention set in DOM
					const domValue = this.getElement()?.getAttribute(this.attribute);
					if (domValue && domValue !== this.state.current) {
						this.state.current = domValue;
					}
					return;
				}

				this.hasRunEffect = true;
				this.applyToDOM(this.state.current);
			});
		}
	}

	private hasRunEffect = false;

	/**
	 * Get the target element
	 */
	getElement(): Element | null {
		if (typeof window === "undefined") return null;
		switch (this.target) {
			case "html":
				return document.documentElement;
			case "body":
				return document.body;
			default:
				return document.querySelector(this.target);
		}
	}

	/**
	 * Apply value to DOM attribute
	 */
	private applyToDOM(value: string): void {
		const el = this.getElement();
		if (!el) return;
		if (value) el.setAttribute(this.attribute, value);
		else el.removeAttribute(this.attribute);
	}

	/**
	 * Get current value (reactive)
	 */
	get current(): string {
		return this.state.current;
	}

	/**
	 * Set value (persists and applies to DOM)
	 */
	set current(value: string) {
		this.state.current = value;
	}

	/**
	 * Set value explicitly
	 */
	set(value: string): this {
		this.current = value;
		return this;
	}

	/**
	 * Toggle between two values
	 */
	toggle(valueA: string, valueB: string): this {
		this.current = this.current === valueA ? valueB : valueA;
		return this;
	}

	/**
	 * Clear the value (sets to empty string)
	 */
	clear(): this {
		this.current = "";
		return this;
	}
}

export class PersistJson<T> {
	public readonly state: PersistedState<string>;
	private readonly key: string;
	private readonly fallback: PersistFallback<T>;
	private readonly serializeValue: (value: T) => string;
	private readonly deserializeValue: (value: string) => T;
	private readonly validate?: (value: unknown) => value is T;

	constructor(options: PersistJsonOptions<T>) {
		const {
			key,
			fallback,
			syncTabs = true,
			storage = "local",
			serialize = JSON.stringify,
			deserialize = JSON.parse as (value: string) => T,
			validate = undefined,
		} = options;

		this.key = key;
		this.fallback = fallback;
		this.serializeValue = serialize;
		this.deserializeValue = deserialize;
		this.validate = validate;

		this.state = new PersistedState(
			key,
			this.serializeValue(this.getFallback()),
			{
				storage,
				syncTabs,
			},
		);
	}

	private getFallback(): T {
		return resolveFallback(this.fallback);
	}

	private parse(raw: string): T {
		try {
			const parsed = this.deserializeValue(raw);
			if (this.validate && !this.validate(parsed)) {
				return this.getFallback();
			}
			return parsed;
		} catch {
			return this.getFallback();
		}
	}

	get current(): T {
		return this.parse(this.state.current);
	}

	set current(value: T) {
		this.state.current = this.serializeValue(value);
	}

	set(value: T): this {
		this.current = value;
		return this;
	}

	update(updater: (value: T) => T): this {
		this.current = updater(this.current);
		return this;
	}

	reset(): this {
		this.current = this.getFallback();
		return this;
	}

	clear(): this {
		this.reset();
		return this;
	}
}

export const persist = {
	json<T>(options: PersistJsonOptions<T>) {
		return new PersistJson(options);
	},
	read<T>(options: PersistJsonOptions<T>) {
		return new PersistJson(options).current;
	},
};

/**
 * Create a new Sync instance
 */
export function sync(options: SyncOptions): Sync {
	return new Sync(options);
}

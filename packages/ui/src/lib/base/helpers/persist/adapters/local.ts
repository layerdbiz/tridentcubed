import type { PersistAdapter } from '../persist.svelte.ts';

function getLocalStorage(): Storage | null {
	if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
		return null;
	}

	return window.localStorage;
}

function matchesPersistPrefix(key: string, prefix: string): boolean {
	return key === prefix || key.startsWith(`${prefix}:`) || key.startsWith(`${prefix}.`);
}

export function createLocalPersistAdapter(): PersistAdapter {
	return {
		async load<T>(key: string, fallback?: T): Promise<T> {
			const storage = getLocalStorage();
			if (!storage) return fallback as T;

			try {
				const rawValue = storage.getItem(key);
				if (rawValue === null) return fallback as T;
				return JSON.parse(rawValue) as T;
			} catch (error) {
				console.warn(`[persist] Failed to parse localStorage key "${key}".`, error);
				return fallback as T;
			}
		},

		async save<T>(key: string, value: T): Promise<void> {
			const storage = getLocalStorage();
			if (!storage) return;

			try {
				storage.setItem(key, JSON.stringify(value));
			} catch (error) {
				console.warn(`[persist] Failed to save localStorage key "${key}".`, error);
			}
		},

		async remove(key: string): Promise<void> {
			const storage = getLocalStorage();
			if (!storage) return;

			storage.removeItem(key);
		},

		async clear(prefix: string): Promise<void> {
			const storage = getLocalStorage();
			if (!storage) return;

			const keys: string[] = [];

			for (let index = 0; index < storage.length; index += 1) {
				const key = storage.key(index);
				if (!key) continue;

				if (matchesPersistPrefix(key, prefix)) {
					keys.push(key);
				}
			}

			for (const key of keys) {
				storage.removeItem(key);
			}
		},
	};
}

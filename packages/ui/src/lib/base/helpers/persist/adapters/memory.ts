import type { PersistAdapter } from '../persist.svelte.ts';

const persist_memory_store = new Map<string, unknown>();

function matchesPersistPrefix(key: string, prefix: string): boolean {
	return key === prefix || key.startsWith(`${prefix}:`) || key.startsWith(`${prefix}.`);
}

export function createMemoryPersistAdapter(): PersistAdapter {
	return {
		async load<T>(key: string, fallback?: T): Promise<T> {
			if (!persist_memory_store.has(key)) {
				return fallback as T;
			}

			return persist_memory_store.get(key) as T;
		},

		async save<T>(key: string, value: T): Promise<void> {
			persist_memory_store.set(key, value);
		},

		async remove(key: string): Promise<void> {
			persist_memory_store.delete(key);
		},

		async clear(prefix: string): Promise<void> {
			for (const key of persist_memory_store.keys()) {
				if (!matchesPersistPrefix(key, prefix)) continue;
				persist_memory_store.delete(key);
			}
		},
	};
}

import type { PersistAdapter } from '../persist.svelte.ts';

export function createNoopPersistAdapter(): PersistAdapter {
	return {
		async load<T>(_key: string, fallback?: T): Promise<T> {
			return fallback as T;
		},

		async save<T>(_key: string, _value: T): Promise<void> {
			return;
		},

		async remove(_key: string): Promise<void> {
			return;
		},

		async clear(_prefix: string): Promise<void> {
			return;
		},
	};
}
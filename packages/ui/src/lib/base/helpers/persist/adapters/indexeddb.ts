import type { PersistAdapter, PersistRecord } from '../persist.svelte.ts';

const PERSIST_INDEXEDDB_DATABASE = '@layerd-persist';
const PERSIST_INDEXEDDB_STORE = 'keyval';

let persist_database_promise: Promise<IDBDatabase | null> | undefined;

function getIndexedDbFactory(): IDBFactory | null {
	if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
		return null;
	}

	return window.indexedDB;
}

function matchesPersistPrefix(key: string, prefix: string): boolean {
	return key === prefix || key.startsWith(`${prefix}:`) || key.startsWith(`${prefix}.`);
}

function openPersistDatabase(): Promise<IDBDatabase | null> {
	if (persist_database_promise) {
		return persist_database_promise;
	}

	const indexedDbFactory = getIndexedDbFactory();
	if (!indexedDbFactory) {
		return Promise.resolve(null);
	}

	persist_database_promise = new Promise<IDBDatabase | null>((resolve, reject) => {
		const request = indexedDbFactory.open(PERSIST_INDEXEDDB_DATABASE, 1);

		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(PERSIST_INDEXEDDB_STORE)) {
				database.createObjectStore(PERSIST_INDEXEDDB_STORE, { keyPath: 'key' });
			}
		};

		request.onsuccess = () => {
			const database = request.result;
			database.onversionchange = () => {
				database.close();
				persist_database_promise = undefined;
			};
			resolve(database);
		};

		request.onerror = () => {
			reject(request.error ?? new Error('Failed to open persist IndexedDB.'));
		};
	}).catch((error): IDBDatabase | null => {
		console.warn('[persist] IndexedDB adapter is unavailable.', error);
		persist_database_promise = undefined;
		return null;
	});

	return persist_database_promise ?? Promise.resolve(null);
}

async function withStore<T>(
	mode: IDBTransactionMode,
	runner: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error?: unknown) => void) => void,
): Promise<T> {
	const database = await openPersistDatabase();
	if (!database) {
		return undefined as T;
	}

	return new Promise<T>((resolve, reject) => {
		const transaction = database.transaction(PERSIST_INDEXEDDB_STORE, mode);
		const store = transaction.objectStore(PERSIST_INDEXEDDB_STORE);
		runner(store, resolve, reject);
		transaction.onerror = () => {
			reject(transaction.error ?? new Error('Persist IndexedDB transaction failed.'));
		};
	});
}

export function createIndexedDbPersistAdapter(): PersistAdapter {
	return {
		async load<T>(key: string, fallback?: T): Promise<T> {
			try {
				const result = await withStore<T | PersistRecord | undefined>('readonly', (store, resolve, reject) => {
					const request = store.get(key);

					request.onsuccess = () => {
						resolve(request.result as T | PersistRecord | undefined);
					};

					request.onerror = () => {
						reject(request.error ?? new Error(`Failed to load persisted key "${key}".`));
					};
				});

				if (result && typeof result === 'object' && 'value' in result) {
					return (result as PersistRecord).value as T;
				}

				if (result !== undefined) {
					return result as T;
				}
			} catch (error) {
				console.warn(`[persist] Failed to load IndexedDB key "${key}".`, error);
			}

			return fallback as T;
		},

		async save<T>(key: string, value: T): Promise<void> {
			try {
				await withStore<void>('readwrite', (store, resolve, reject) => {
					const request = store.put({
						key,
						value,
						updatedAt: Date.now(),
					} satisfies PersistRecord);

					request.onsuccess = () => {
						resolve();
					};

					request.onerror = () => {
						reject(request.error ?? new Error(`Failed to save persisted key "${key}".`));
					};
				});
			} catch (error) {
				console.warn(`[persist] Failed to save IndexedDB key "${key}".`, error);
			}
		},

		async remove(key: string): Promise<void> {
			try {
				await withStore<void>('readwrite', (store, resolve, reject) => {
					const request = store.delete(key);

					request.onsuccess = () => {
						resolve();
					};

					request.onerror = () => {
						reject(request.error ?? new Error(`Failed to remove persisted key "${key}".`));
					};
				});
			} catch (error) {
				console.warn(`[persist] Failed to remove IndexedDB key "${key}".`, error);
			}
		},

		async clear(prefix: string): Promise<void> {
			try {
				await withStore<void>('readwrite', (store, resolve, reject) => {
					const request = store.openCursor();

					request.onsuccess = () => {
						const cursor = request.result;

						if (!cursor) {
							resolve();
							return;
						}

						if (matchesPersistPrefix(String(cursor.key), prefix)) {
							const deleteRequest = cursor.delete();
							deleteRequest.onsuccess = () => {
								cursor.continue();
							};
							deleteRequest.onerror = () => {
								reject(deleteRequest.error ?? new Error(`Failed to clear persisted prefix "${prefix}".`));
							};
							return;
						}

						cursor.continue();
					};

					request.onerror = () => {
						reject(request.error ?? new Error(`Failed to clear persisted prefix "${prefix}".`));
					};
				});
			} catch (error) {
				console.warn(`[persist] Failed to clear IndexedDB prefix "${prefix}".`, error);
			}
		},
	};
}

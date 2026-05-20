import type { PersistAdapter } from "../persist-new.svelte.ts";

type PersistDocument = Record<string, unknown>;

const SENSITIVE_PERSIST_PATH =
	/(^|\.)(password|passcode|token|secret|auth|authorization|cookie|session|api[_-]?key|private[_-]?key)(\.|$)/i;

export const PERSIST_LOCAL_STORAGE_NAMESPACE = "layerd:persist";

export interface PersistLocalStorageAdapterOptions {
	name?: string;
	namespace?: string;
	storage?: Storage | null;
}

function isRecord(value: unknown): value is PersistDocument {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyRecord(value: unknown): boolean {
	return isRecord(value) && Object.keys(value).length === 0;
}

function isSensitivePersistPath(path: string): boolean {
	return SENSITIVE_PERSIST_PATH.test(path);
}

function getStorage(storage: Storage | null | undefined): Storage | null {
	if (storage) return storage;
	if (typeof window === "undefined" || typeof localStorage === "undefined") {
		return null;
	}
	return localStorage;
}

function getScopeStorageKey(namespace: string, scope: string): string {
	return `${namespace}:${scope}`;
}

function splitPersistPath(
	path: string,
): { scope: string; segments: string[] } | null {
	const segments = String(path)
		.split(".")
		.map((item) => item.trim())
		.filter(Boolean);

	const [scope, ...rest] = segments;
	if (!scope) return null;

	return {
		scope,
		segments: rest,
	};
}

function readScopeDocument(storage: Storage, key: string): PersistDocument {
	try {
		const rawValue = storage.getItem(key);
		if (!rawValue) return {};

		const parsedValue = JSON.parse(rawValue);
		return isRecord(parsedValue) ? parsedValue : {};
	} catch {
		return {};
	}
}

function writeScopeDocument(
	storage: Storage,
	key: string,
	value: PersistDocument,
): void {
	if (!Object.keys(value).length) {
		storage.removeItem(key);
		return;
	}

	try {
		storage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.warn(`[persist] Failed to write storage key "${key}".`, error);
	}
}

function getNestedValue(current: unknown, segments: string[]): unknown {
	if (!segments.length) return current;
	if (!isRecord(current)) return undefined;

	const [head, ...tail] = segments;
	return getNestedValue(current[head], tail);
}

function setNestedValue(
	current: unknown,
	segments: string[],
	value: unknown,
): PersistDocument {
	if (!segments.length) {
		return isRecord(value) ? { ...value } : { value };
	}

	const [head, ...tail] = segments;
	const container = isRecord(current) ? { ...current } : {};
	container[head] = tail.length
		? setNestedValue(container[head], tail, value)
		: value;
	return container;
}

function patchNestedValue(
	current: unknown,
	segments: string[],
	value: Record<string, unknown>,
): PersistDocument {
	const existingValue = getNestedValue(current, segments);
	const nextValue = {
		...(isRecord(existingValue) ? existingValue : {}),
		...value,
	};

	return setNestedValue(current, segments, nextValue);
}

function removeNestedValue(
	current: unknown,
	segments: string[],
): PersistDocument {
	if (!segments.length) return {};

	const [head, ...tail] = segments;
	const container = isRecord(current) ? { ...current } : {};
	if (!(head in container)) return container;

	if (!tail.length) {
		delete container[head];
		return container;
	}

	const nextValue = removeNestedValue(container[head], tail);
	if (isEmptyRecord(nextValue)) {
		delete container[head];
		return container;
	}

	container[head] = nextValue;
	return container;
}

export function createLocalStoragePersistAdapter(
	options: PersistLocalStorageAdapterOptions = {},
): PersistAdapter {
	const name = options.name ?? "localStorage";
	const namespace = options.namespace ?? PERSIST_LOCAL_STORAGE_NAMESPACE;

	return {
		name,

		get<T>(path: string) {
			const storage = getStorage(options.storage);
			const parsedPath = splitPersistPath(path);
			if (!storage || !parsedPath) return null;

			const scopeDocument = readScopeDocument(
				storage,
				getScopeStorageKey(namespace, parsedPath.scope),
			);
			const value = getNestedValue(scopeDocument, parsedPath.segments);
			return value === undefined ? null : (value as T);
		},

		set<T>(path: string, value: T) {
			if (isSensitivePersistPath(path)) return;

			const storage = getStorage(options.storage);
			const parsedPath = splitPersistPath(path);
			if (!storage || !parsedPath) return;

			const storageKey = getScopeStorageKey(namespace, parsedPath.scope);
			const scopeDocument = readScopeDocument(storage, storageKey);
			const nextDocument = setNestedValue(
				scopeDocument,
				parsedPath.segments,
				value,
			);
			writeScopeDocument(storage, storageKey, nextDocument);
		},

		patch<T>(path: string, value: Partial<T>) {
			if (isSensitivePersistPath(path) || !isRecord(value)) return;

			const storage = getStorage(options.storage);
			const parsedPath = splitPersistPath(path);
			if (!storage || !parsedPath) return;

			const storageKey = getScopeStorageKey(namespace, parsedPath.scope);
			const scopeDocument = readScopeDocument(storage, storageKey);
			const nextDocument = patchNestedValue(
				scopeDocument,
				parsedPath.segments,
				value,
			);
			writeScopeDocument(storage, storageKey, nextDocument);
		},

		remove(path: string) {
			const storage = getStorage(options.storage);
			const parsedPath = splitPersistPath(path);
			if (!storage || !parsedPath) return;

			const storageKey = getScopeStorageKey(namespace, parsedPath.scope);
			if (!parsedPath.segments.length) {
				storage.removeItem(storageKey);
				return;
			}

			const scopeDocument = readScopeDocument(storage, storageKey);
			const nextDocument = removeNestedValue(
				scopeDocument,
				parsedPath.segments,
			);
			writeScopeDocument(storage, storageKey, nextDocument);
		},

		clear(scope?: string) {
			const storage = getStorage(options.storage);
			if (!storage) return;

			if (scope?.trim()) {
				storage.removeItem(getScopeStorageKey(namespace, scope.trim()));
				return;
			}

			const prefix = `${namespace}:`;
			const keys: string[] = [];

			for (let index = 0; index < storage.length; index += 1) {
				const key = storage.key(index);
				if (key?.startsWith(prefix)) keys.push(key);
			}

			for (const key of keys) {
				storage.removeItem(key);
			}
		},
	};
}

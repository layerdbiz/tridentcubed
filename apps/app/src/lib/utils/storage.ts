import { browser } from "$app/environment";

export function getStorageItem<T>(key: string, fallback: T): T {
	if (!browser) return fallback;

	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

export function setStorageItem(key: string, value: unknown): void {
	if (!browser) return;

	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Silently ignore quota exceeded or private mode errors
	}
}

export function removeStorageItem(key: string): void {
	if (!browser) return;

	try {
		localStorage.removeItem(key);
	} catch {
		// Silently ignore
	}
}

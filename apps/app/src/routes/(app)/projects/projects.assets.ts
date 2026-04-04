import { browser } from "$app/environment";

import { storageKey } from "./projects.constants";
import type * as projectTypes from "./projects.types";

const databaseName = `${storageKey}-assets`;
const storeName = "photos";
const assetReferencePrefix = "photo-store://";
const assetUrlCache = new Map<string, string>();

function createAssetKey(): string {
	if (browser && typeof crypto.randomUUID === "function") {
		return `photo-${crypto.randomUUID()}`;
	}

	return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!browser || !("indexedDB" in window)) {
			reject(new Error("IndexedDB is not available in this browser context."));
			return;
		}

		const request = window.indexedDB.open(databaseName, 1);

		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(storeName)) {
				database.createObjectStore(storeName);
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function withStore<T>(
	mode: IDBTransactionMode,
	handler: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	const database = await openDatabase();

	return new Promise((resolve, reject) => {
		let result: T;
		const transaction = database.transaction(storeName, mode);
		const store = transaction.objectStore(storeName);
		const request = handler(store);

		request.onsuccess = () => {
			result = request.result;
		};
		request.onerror = () => reject(request.error);
		transaction.oncomplete = () => {
			database.close();
			resolve(result);
		};
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

function revokeCachedUrl(reference: string): void {
	const cachedUrl = assetUrlCache.get(reference);
	if (!cachedUrl) return;

	URL.revokeObjectURL(cachedUrl);
	assetUrlCache.delete(reference);
}

function createAssetReference(key: string): string {
	return `${assetReferencePrefix}${key}`;
}

async function storeBlob(key: string, blob: Blob): Promise<void> {
	await withStore("readwrite", (store) => store.put(blob, key));
}

async function readBlob(key: string): Promise<Blob | null> {
	return (await withStore("readonly", (store) => store.get(key))) ?? null;
}

async function deleteBlob(key: string): Promise<void> {
	await withStore("readwrite", (store) => store.delete(key));
}

async function cacheObjectUrl(reference: string, blob: Blob): Promise<string> {
	revokeCachedUrl(reference);
	const objectUrl = URL.createObjectURL(blob);
	assetUrlCache.set(reference, objectUrl);
	return objectUrl;
}

function collectFieldValueAssetReferences(
	value: projectTypes.FieldStateValueType | undefined,
): string[] {
	if (Array.isArray(value)) {
		return value.filter((item) => isStoredAssetReference(item));
	}

	return isStoredAssetReference(value) ? [value] : [];
}

export function isStoredAssetReference(
	value: string | null | undefined,
): value is string {
	return Boolean(value?.startsWith(assetReferencePrefix));
}

export function getStoredAssetKey(
	value: string | null | undefined,
): string | null {
	if (!isStoredAssetReference(value)) return null;
	return value.slice(assetReferencePrefix.length) || null;
}

export function getRenderableAssetUrl(value: string): string {
	if (!isStoredAssetReference(value)) return value;
	return assetUrlCache.get(value) ?? "";
}

export async function saveImageFile(file: File): Promise<string> {
	const assetKey = createAssetKey();
	const assetReference = createAssetReference(assetKey);

	await storeBlob(assetKey, file);
	await cacheObjectUrl(assetReference, file);

	return assetReference;
}

export async function resolveAssetUrl(value: string): Promise<string> {
	if (!isStoredAssetReference(value)) return value;

	const cachedUrl = assetUrlCache.get(value);
	if (cachedUrl) return cachedUrl;

	const assetKey = getStoredAssetKey(value);
	if (!assetKey) return "";

	const blob = await readBlob(assetKey);
	if (!blob) return "";

	return cacheObjectUrl(value, blob);
}

export async function preloadSectionAssetUrls(
	sections: projectTypes.SectionType[],
): Promise<void> {
	const references = new Set<string>();

	for (const section of sections) {
		if (section.type === "fields" || section.type === "cover") {
			for (const value of Object.values(section.fields)) {
				for (const reference of collectFieldValueAssetReferences(value)) {
					references.add(reference);
				}
			}
		}

		for (const photo of section.photos) {
			if (isStoredAssetReference(photo.src)) references.add(photo.src);
		}
	}

	await Promise.all(
		Array.from(references).map((reference) => resolveAssetUrl(reference)),
	);
}

export async function removeStoredAsset(value: string): Promise<void> {
	const assetKey = getStoredAssetKey(value);
	if (!assetKey) return;

	revokeCachedUrl(value);
	await deleteBlob(assetKey);
}

export async function removeSectionAssets(
	sections: projectTypes.SectionType[],
): Promise<void> {
	const references = new Set<string>();

	for (const section of sections) {
		if (section.type === "fields" || section.type === "cover") {
			for (const value of Object.values(section.fields)) {
				for (const reference of collectFieldValueAssetReferences(value)) {
					references.add(reference);
				}
			}
		}

		for (const photo of section.photos) {
			if (isStoredAssetReference(photo.src)) references.add(photo.src);
		}
	}

	await Promise.all(
		Array.from(references).map((reference) => removeStoredAsset(reference)),
	);
}

export async function clearStoredAssets(): Promise<void> {
	if (!browser || !("indexedDB" in window)) return;

	for (const reference of assetUrlCache.keys()) {
		revokeCachedUrl(reference);
	}

	await withStore("readwrite", (store) => store.clear());
}

export async function getExportableImageSource(value: string): Promise<string> {
	const resolvedValue = await resolveAssetUrl(value);
	if (!resolvedValue || resolvedValue.startsWith("data:")) return resolvedValue;
	if (!resolvedValue.startsWith("blob:")) return resolvedValue;

	const response = await fetch(resolvedValue);
	const blob = await response.blob();

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

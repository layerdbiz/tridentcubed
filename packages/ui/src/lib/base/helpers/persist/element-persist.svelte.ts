import {
	createPersistComponentId,
	createPersistNew,
	type NormalizedPersistTarget,
	normalizePersistTarget,
	type PersistTargetValue,
	resolvePersistPath,
} from "./persist-new.svelte.ts";

export type PersistableElementType =
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement;

interface PersistElementOptionsType {
	componentId?: string;
	fallbackScope?: string;
	defaultWriteMode?: "instant" | "debounced" | "manual";
	defaultDebounceMs?: number;
}

function isPersistableElement(
	element: Element,
): element is PersistableElementType {
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement
	);
}

function getPersistBinding(
	element: PersistableElementType,
	normalized: NormalizedPersistTarget,
): {
	field: string;
	path: string;
	eventName: "input" | "change";
	writeMode: "instant" | "debounced" | "manual";
	debounceMs: number;
} | null {
	const inferredField = normalized.field ||
		(element instanceof HTMLInputElement &&
				(element.type === "checkbox" || element.type === "radio")
			? "checked"
			: "value");
	const path = resolvePersistPath(normalized, inferredField);
	if (!path) return null;

	const eventName =
		inferredField === "checked" || element instanceof HTMLSelectElement
			? "change"
			: "input";
	const writeMode = eventName === "input"
		? normalized.writeMode
		: normalized.writeMode === "debounced"
		? "instant"
		: normalized.writeMode;

	return {
		field: inferredField,
		path,
		eventName,
		writeMode,
		debounceMs: normalized.debounceMs,
	};
}

function readPersistElementValue(
	element: PersistableElementType,
	field: string,
): unknown {
	if (field === "checked" && element instanceof HTMLInputElement) {
		return element.checked;
	}

	return element.value;
}

function applyPersistedElementValue(
	element: PersistableElementType,
	field: string,
	value: unknown,
): void {
	if (field === "checked" && element instanceof HTMLInputElement) {
		element.checked = Boolean(value);
		return;
	}

	element.value = value === null || value === undefined ? "" : String(value);
}

export function attachPersistTarget(
	element: Element,
	persist: PersistTargetValue,
	options: PersistElementOptionsType = {},
): (() => void) | undefined {
	if (!persist || !isPersistableElement(element)) {
		return;
	}

	const persistComponentId = options.componentId ||
		createPersistComponentId({
			tag: element.tagName.toLowerCase(),
			id: element.id || undefined,
			name: element.getAttribute("name") ?? undefined,
			placeholder: element.getAttribute("placeholder") ?? undefined,
		});
	const persistController = createPersistNew({
		defaultWriteMode: options.defaultWriteMode ?? "debounced",
		defaultDebounceMs: options.defaultDebounceMs ?? 250,
	});
	const normalizedPersist = normalizePersistTarget(persist, {
		componentId: persistComponentId,
		fallbackScope: options.fallbackScope ?? "components",
		writeMode: options.defaultWriteMode ?? "debounced",
		debounceMs: options.defaultDebounceMs ?? 250,
	});

	if (!normalizedPersist.enabled) {
		persistController.destroy();
		return;
	}

	const binding = getPersistBinding(element, normalizedPersist);
	if (!binding) {
		persistController.destroy();
		return;
	}

	const restoredValue = persistController.read(binding.path, {
		adapters: normalizedPersist.adapters,
		strategy: normalizedPersist.strategy,
	});

	if (restoredValue !== null) {
		applyPersistedElementValue(element, binding.field, restoredValue);
	}

	const persistValue = () => {
		const nextValue = readPersistElementValue(element, binding.field);

		persistController.set(binding.path, nextValue, {
			adapters: normalizedPersist.adapters,
			strategy: normalizedPersist.strategy,
			writeMode: binding.writeMode,
			debounceMs: binding.debounceMs,
		});
	};

	element.addEventListener(binding.eventName, persistValue);

	return () => {
		element.removeEventListener(binding.eventName, persistValue);
		void persistController.flush(binding.path);
		persistController.destroy();
	};
}

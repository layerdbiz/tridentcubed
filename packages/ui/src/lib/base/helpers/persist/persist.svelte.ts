import { createIndexedDbPersistAdapter } from './adapters/indexeddb';
import { createLocalPersistAdapter } from './adapters/local';
import { createMemoryPersistAdapter } from './adapters/memory';
import { createNoopPersistAdapter } from './adapters/noop';
import { createSessionPersistAdapter } from './adapters/session';

export type PersistStorage = 'indexeddb' | 'local' | 'session' | 'memory' | 'noop';

export type PersistProp =
	| 'value'
	| 'size'
	| 'position'
	| 'scroll'
	| 'theme'
	| 'open'
	| 'resize'
	| 'draggable';

type ResolvedPersistProp = Exclude<PersistProp, 'resize' | 'draggable'> | 'checked';
type PersistPropInput =
	| PersistProp
	| ResolvedPersistProp
	| Array<PersistProp | ResolvedPersistProp>;

export type PersistConfig = {
	key?: string;
	prop?: PersistProp | PersistProp[];
	storage?: PersistStorage;
	namespace?: string;
	save?: boolean;
	load?: boolean;
	remove?: boolean;
	clear?: boolean;
	value?: unknown;
	getValue?: () => unknown;
	setValue?: (value: unknown) => void;
	fallback?: unknown;
};

export type PersistInput = boolean | string | PersistConfig;

export type PersistRecord = {
	key: string;
	value: unknown;
	updatedAt: number;
};

export type PersistAdapter = {
	load<T>(key: string, fallback?: T): Promise<T>;
	save<T>(key: string, value: T): Promise<void>;
	remove(key: string): Promise<void>;
	clear(prefix: string): Promise<void>;
};

export type PersistConfigureOptions = {
	storage?: PersistStorage;
	namespace?: string;
	adapters?: Partial<Record<PersistStorage, PersistAdapter>>;
};

export type PersistMethodOptions = {
	storage?: PersistStorage;
	namespace?: string;
	prop?: PersistPropInput;
};

export type PersistSyncInput = PersistInput | (() => PersistInput);

export type PersistSyncOptions<T> = PersistMethodOptions & {
	fallback?: T;
	getValue: () => T;
	setValue: (value: T) => void;
};

export type PersistSyncHandle<T> = {
	readonly ready: boolean;
	load(): Promise<T>;
	save(): Promise<void>;
	remove(): Promise<void>;
	clear(prefix?: string): Promise<void>;
};

export type PersistContext = {
	componentId?: string;
	tag?: string;
	type?: string;
	id?: string;
	name?: string;
	label?: string;
	placeholder?: string;
	scroll?: boolean;
	draggable?: boolean;
	resize?: boolean;
	theme?: boolean;
	accordion?: boolean;
	open?: boolean;
};

export type PersistableElementType = HTMLElement;

export interface PersistElementOptionsType {
	componentId?: string;
	fallbackScope?: string;
	context?: PersistContext;
	value?: unknown;
	getValue?: () => unknown;
	setValue?: (value: unknown) => void;
	fallback?: unknown;
}

export type PersistResolveOptions = {
	storage?: PersistStorage;
	namespace?: string;
	prop?: PersistPropInput;
	fallbackKey?: string;
	context?: PersistContext;
};

export type PersistResolvedEntry = {
	key: string;
	prop: ResolvedPersistProp;
	storageKey: string;
};

export type PersistResolvedConfig = {
	enabled: boolean;
	key: string | null;
	props: ResolvedPersistProp[];
	entries: PersistResolvedEntry[];
	storage: PersistStorage;
	namespace: string;
	save: boolean;
	load: boolean;
	remove: boolean;
	clear: boolean;
	automatic: boolean;
	value?: unknown;
	getValue?: () => unknown;
	setValue?: (value: unknown) => void;
	fallback?: unknown;
	clearPrefix: string;
	source: 'boolean' | 'string' | 'config';
};

type PersistElementBinding = {
	entry: PersistResolvedEntry;
	eventName: keyof HTMLElementEventMap;
};

export const DEFAULT_PERSIST_NAMESPACE = '@layerd:persist';
export const DEFAULT_PERSIST_STORAGE: PersistStorage = 'indexeddb';
export const DEFAULT_PERSIST_SCOPE = 'components';

export const persistPropMap = {
	input: ['value'],
	textarea: ['value'],
	select: ['value'],
	checkbox: ['checked'],
	radio: ['checked'],
	resize: ['size'],
	draggable: ['position'],
	scroll: ['scroll'],
	theme: ['theme'],
	accordion: ['open'],
} satisfies Record<string, ResolvedPersistProp[]>;

const persist_prop_aliases = {
	resize: 'size',
	draggable: 'position',
} as const satisfies Record<'resize' | 'draggable', ResolvedPersistProp>;

const persist_adapter_factories: Record<PersistStorage, () => PersistAdapter> = {
	indexeddb: () => createIndexedDbPersistAdapter(),
	local: () => createLocalPersistAdapter(),
	session: () => createSessionPersistAdapter(),
	memory: () => createMemoryPersistAdapter(),
	noop: () => createNoopPersistAdapter(),
};

const persist_state: {
	storage: PersistStorage;
	namespace: string;
} = {
	storage: DEFAULT_PERSIST_STORAGE,
	namespace: DEFAULT_PERSIST_NAMESPACE,
};

const persist_adapters = new Map<PersistStorage, PersistAdapter>();

let persist_component_counter = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPersistConfig(value: unknown): value is PersistConfig {
	if (!isRecord(value)) return false;

	for (const key of [
		'key',
		'prop',
		'storage',
		'namespace',
		'save',
		'load',
		'remove',
		'clear',
		'value',
		'getValue',
		'setValue',
		'fallback',
	]) {
		if (key in value) return true;
	}

	return false;
}

function normalizePersistNamespace(value: unknown): string {
	const nextValue = String(value ?? persist_state.namespace ?? DEFAULT_PERSIST_NAMESPACE)
		.trim()
		.replace(/\s+/g, '-')
		.replace(/:+$/g, '');

	return nextValue || DEFAULT_PERSIST_NAMESPACE;
}

function normalizePersistSegment(value: unknown): string {
	return String(value ?? '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-zA-Z0-9_-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^[-_]+|[-_]+$/g, '');
}

function normalizePersistKey(value: unknown): string {
	return String(value ?? '')
		.split('.')
		.map((segment) => normalizePersistSegment(segment))
		.filter(Boolean)
		.join('.');
}

function normalizePersistTag(value: unknown): string {
	return String(value ?? '').trim().toLowerCase();
}

function normalizePersistPropValue(
	value: PersistProp | ResolvedPersistProp | undefined,
): ResolvedPersistProp | null {
	if (!value) return null;

	const normalizedValue = String(value).trim().toLowerCase();
	if (normalizedValue in persist_prop_aliases) {
		return persist_prop_aliases[
			normalizedValue as keyof typeof persist_prop_aliases
		];
	}

	if (
		normalizedValue === 'value' ||
		normalizedValue === 'size' ||
		normalizedValue === 'position' ||
		normalizedValue === 'scroll' ||
		normalizedValue === 'theme' ||
		normalizedValue === 'open' ||
		normalizedValue === 'checked'
	) {
		return normalizedValue;
	}

	return null;
}

function uniquePersistProps(values: Array<ResolvedPersistProp | null | undefined>): ResolvedPersistProp[] {
	const nextValues: ResolvedPersistProp[] = [];

	for (const value of values) {
		if (!value || nextValues.includes(value)) continue;
		nextValues.push(value);
	}

	return nextValues;
}

function inferPersistProps(context: PersistContext = {}): ResolvedPersistProp[] {
	const inferredProps: ResolvedPersistProp[] = [];
	const tag = normalizePersistTag(context.tag);
	const type = normalizePersistTag(context.type);

	if (tag === 'input') {
		if (type === 'checkbox') {
			inferredProps.push(...persistPropMap.checkbox);
		} else if (type === 'radio') {
			inferredProps.push(...persistPropMap.radio);
		} else {
			inferredProps.push(...persistPropMap.input);
		}
	}

	if (tag === 'textarea') {
		inferredProps.push(...persistPropMap.textarea);
	}

	if (tag === 'select') {
		inferredProps.push(...persistPropMap.select);
	}

	if (context.resize) {
		inferredProps.push(...persistPropMap.resize);
	}

	if (context.draggable) {
		inferredProps.push(...persistPropMap.draggable);
	}

	if (context.scroll) {
		inferredProps.push(...persistPropMap.scroll);
	}

	if (context.theme) {
		inferredProps.push(...persistPropMap.theme);
	}

	if (context.accordion || context.open) {
		inferredProps.push(...persistPropMap.accordion);
	}

	return uniquePersistProps(inferredProps);
}

function normalizePersistProps(
	value: PersistPropInput | undefined,
	context: PersistContext = {},
): ResolvedPersistProp[] {
	const explicitProps = Array.isArray(value)
		? value.map((item) => normalizePersistPropValue(item))
		: [normalizePersistPropValue(value)];
	const resolvedProps = uniquePersistProps(explicitProps);

	if (resolvedProps.length) {
		return resolvedProps;
	}

	const inferredProps = inferPersistProps(context);
	if (inferredProps.length) {
		return inferredProps;
	}

	return ['value'];
}

function hasPersistAction(config: PersistConfig): boolean {
	return Boolean(config.save || config.load || config.remove || config.clear);
}

function createAutoPersistKey(context: PersistContext = {}): string | null {
	const componentId = normalizePersistSegment(
		context.componentId || createPersistComponentId(context),
	);

	if (!componentId) return null;

	return normalizePersistKey(`${DEFAULT_PERSIST_SCOPE}.${componentId}`);
}

function getPersistConfig(input: PersistInput): PersistConfig {
	if (isPersistConfig(input)) return input;
	return {};
}

function getPersistSource(input: PersistInput): PersistResolvedConfig['source'] {
	if (input === true) return 'boolean';
	if (typeof input === 'string') return 'string';
	return 'config';
}

function resolvePersistLogicalKey(
	input: PersistInput,
	config: PersistConfig,
	options: PersistResolveOptions,
): string | null {
	if (!input) return null;

	if (typeof input === 'string') {
		const normalizedKey = normalizePersistKey(input);
		return normalizedKey || null;
	}

	const explicitKey = normalizePersistKey(config.key ?? options.fallbackKey);
	if (explicitKey) return explicitKey;

	if (input === true) {
		return createAutoPersistKey(options.context);
	}

	return null;
}

function getPersistAdapter(storage: PersistStorage): PersistAdapter {
	const existingAdapter = persist_adapters.get(storage);
	if (existingAdapter) return existingAdapter;

	const adapter = persist_adapter_factories[storage]();
	persist_adapters.set(storage, adapter);
	return adapter;
}

export function createPersistComponentId(
	value: {
		tag?: string;
		id?: string;
		name?: string;
		label?: string;
		placeholder?: string;
	} = {},
): string {
	persist_component_counter += 1;

	const semanticPart = [
		normalizePersistSegment(value.id),
		normalizePersistSegment(value.name),
		normalizePersistSegment(value.label),
		normalizePersistSegment(value.placeholder),
		normalizePersistSegment(value.tag),
	].find(Boolean);

	return `${semanticPart || 'component'}-${persist_component_counter}`;
}

export function resolvePersistStorageKey(
	key: string,
	options: PersistMethodOptions = {},
): string {
	const namespace = normalizePersistNamespace(options.namespace);
	const logicalKey = normalizePersistKey(key);
	const prop = Array.isArray(options.prop) ? options.prop[0] : options.prop;
	const resolvedProp = normalizePersistPropValue(prop) ?? 'value';

	if (!logicalKey) {
		return `${namespace}:${resolvedProp}`;
	}

	return `${namespace}:${logicalKey}:${resolvedProp}`;
}

export function resolvePersistClearPrefix(
	prefix: string | undefined,
	options: Pick<PersistMethodOptions, 'namespace'> = {},
): string {
	const namespace = normalizePersistNamespace(options.namespace);
	const logicalPrefix = normalizePersistKey(prefix);

	return logicalPrefix ? `${namespace}:${logicalPrefix}` : namespace;
}

export function resolvePersistConfig(
	input: PersistInput,
	options: PersistResolveOptions = {},
): PersistResolvedConfig {
	const config = getPersistConfig(input);
	const storage = config.storage ?? options.storage ?? persist_state.storage;
	const namespace = config.namespace ?? options.namespace ?? persist_state.namespace;
	const key = resolvePersistLogicalKey(input, config, options);
	const props = normalizePersistProps(config.prop ?? options.prop, options.context);
	const entries = key
		? props.map((prop) => ({
			key,
			prop,
			storageKey: resolvePersistStorageKey(key, {
				namespace,
				prop,
			}),
		}))
		: [];
	const automatic = !hasPersistAction(config);

	return {
		enabled: Boolean(key),
		key,
		props,
		entries,
		storage,
		namespace,
		save: Boolean(config.save),
		load: Boolean(config.load),
		remove: Boolean(config.remove),
		clear: Boolean(config.clear),
		automatic,
		value: config.value,
		getValue: config.getValue,
		setValue: config.setValue,
		fallback: config.fallback,
		clearPrefix: resolvePersistClearPrefix(key ?? undefined, { namespace }),
		source: getPersistSource(input),
	};
}

export function resolvePersistEntries(
	input: PersistInput,
	options: PersistResolveOptions = {},
): PersistResolvedEntry[] {
	return resolvePersistConfig(input, options).entries;
}

async function savePersistEntry<T>(
	entry: PersistResolvedEntry,
	value: T,
	storage: PersistStorage,
): Promise<void> {
	await getPersistAdapter(storage).save(entry.storageKey, value);
}

async function removePersistEntry(
	entry: PersistResolvedEntry,
	storage: PersistStorage,
): Promise<void> {
	await getPersistAdapter(storage).remove(entry.storageKey);
}

function normalizePersistElementTag(element: Element): string {
	return element.tagName.toLowerCase();
}

function normalizePersistElementType(element: Element): string {
	if (element instanceof HTMLInputElement) {
		return element.type.toLowerCase();
	}

	return '';
}

function createPersistElementContext(
	element: Element,
	options: PersistElementOptionsType,
): PersistContext {
	const contextTag = options.context?.tag ?? normalizePersistElementTag(element);
	const contextType = options.context?.type ?? normalizePersistElementType(element);
	const contextName = element.getAttribute('name') ?? options.context?.name;
	const contextPlaceholder =
		element.getAttribute('placeholder') ?? options.context?.placeholder;

	return {
		...options.context,
		componentId:
			options.componentId ||
			options.context?.componentId ||
			createPersistComponentId({
				tag: contextTag,
				id: element.id || options.context?.id,
				name: contextName,
				label: options.context?.label,
				placeholder: contextPlaceholder,
			}),
		tag: contextTag,
		type: contextType,
		id: element.id || options.context?.id,
		name: contextName,
		placeholder: contextPlaceholder,
	};
}

function getPersistFallbackKey(
	context: PersistContext,
	fallbackScope: string | undefined,
): string | undefined {
	const componentId = context.componentId;
	const scope = String(fallbackScope ?? '').trim();

	if (!componentId || !scope) return undefined;

	return `${scope}.${componentId}`;
}

function chainPersistSetter(
	primary?: (value: unknown) => void,
	secondary?: (value: unknown) => void,
): ((value: unknown) => void) | undefined {
	if (!primary) return secondary;
	if (!secondary || primary === secondary) return primary;

	return (value: unknown) => {
		primary(value);
		secondary(value);
	};
}

function applyPersistedValue(
	element: PersistableElementType,
	entry: PersistResolvedEntry,
	value: unknown,
	config: PersistResolvedConfig,
): boolean {
	let applied = false;

	if (entry.prop === 'checked' && element instanceof HTMLInputElement) {
		element.checked = Boolean(value);
		applied = true;
	} else if (
		entry.prop === 'value' &&
		(element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement ||
			element instanceof HTMLSelectElement)
	) {
		element.value = value === null || value === undefined ? '' : String(value);
		applied = true;
	} else if (entry.prop === 'scroll') {
		const nextValue =
			typeof value === 'object' && value !== null
				? (value as { left?: number; top?: number })
				: { left: 0, top: 0 };

		element.scrollTo({
			left: Number(nextValue.left ?? 0),
			top: Number(nextValue.top ?? 0),
		});
		applied = true;
	} else if (entry.prop === 'open' && 'open' in element) {
		(element as HTMLElement & { open: boolean }).open = Boolean(value);
		applied = true;
	} else if (entry.prop === 'theme' && element instanceof HTMLElement) {
		if (value === null || value === undefined || value === '') {
			element.removeAttribute('data-theme');
		} else {
			element.setAttribute('data-theme', String(value));
		}
		applied = true;
	}

	if (config.setValue) {
		config.setValue(value);
		applied = true;
	}

	return applied;
}

function readPersistedValue(
	element: PersistableElementType,
	entry: PersistResolvedEntry,
	config: PersistResolvedConfig,
): unknown {
	if (config.getValue) {
		return config.getValue();
	}

	if (config.value !== undefined) {
		return config.value;
	}

	if (entry.prop === 'checked' && element instanceof HTMLInputElement) {
		return element.checked;
	}

	if (
		entry.prop === 'value' &&
		(element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement ||
			element instanceof HTMLSelectElement)
	) {
		return element.value;
	}

	if (entry.prop === 'scroll') {
		return {
			left: element.scrollLeft,
			top: element.scrollTop,
		};
	}

	if (entry.prop === 'open' && 'open' in element) {
		return Boolean((element as HTMLElement & { open: boolean }).open);
	}

	if (entry.prop === 'theme') {
		return element.getAttribute('data-theme') ?? '';
	}

	return undefined;
}

function getPersistBinding(
	element: PersistableElementType,
	entry: PersistResolvedEntry,
): PersistElementBinding | null {
	if (entry.prop === 'checked' && element instanceof HTMLInputElement) {
		return {
			entry,
			eventName: 'change',
		};
	}

	if (entry.prop === 'value') {
		if (element instanceof HTMLSelectElement) {
			return {
				entry,
				eventName: 'change',
			};
		}

		if (
			element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement
		) {
			return {
				entry,
				eventName: 'input',
			};
		}
	}

	if (entry.prop === 'scroll') {
		return {
			entry,
			eventName: 'scroll',
		};
	}

	if (entry.prop === 'open' && 'open' in element) {
		return {
			entry,
			eventName: 'toggle',
		};
	}

	return null;
}

async function loadPersistedEntries(
	element: PersistableElementType,
	config: PersistResolvedConfig,
	isDisposed: () => boolean,
): Promise<void> {
	for (const entry of config.entries) {
		const fallbackValue = config.fallback ?? config.value;
		const nextValue = await persist.load(entry.key, fallbackValue, {
			storage: config.storage,
			namespace: config.namespace,
			prop: entry.prop,
		});

		if (isDisposed()) return;
		if (nextValue === undefined && fallbackValue === undefined) continue;

		applyPersistedValue(element, entry, nextValue, config);
	}
}

async function savePersistedEntries(
	element: PersistableElementType,
	config: PersistResolvedConfig,
): Promise<void> {
	for (const entry of config.entries) {
		const nextValue = readPersistedValue(element, entry, config);
		if (nextValue === undefined) continue;

		await persist.save(entry.key, nextValue, {
			storage: config.storage,
			namespace: config.namespace,
			prop: entry.prop,
		});
	}
}

async function removePersistedEntries(config: PersistResolvedConfig): Promise<void> {
	for (const entry of config.entries) {
		await persist.remove(entry.key, {
			storage: config.storage,
			namespace: config.namespace,
			prop: entry.prop,
		});
	}
}

export function attachPersistTarget(
	element: Element,
	persistInput: PersistInput,
	options: PersistElementOptionsType = {},
): (() => void) | undefined {
	if (!persistInput || !(element instanceof HTMLElement)) {
		return;
	}

	const context = createPersistElementContext(element, options);
	const resolvedPersist = resolvePersistConfig(persistInput, {
		context,
		fallbackKey: getPersistFallbackKey(context, options.fallbackScope),
	});
	const mergedPersist: PersistResolvedConfig = {
		...resolvedPersist,
		value: resolvedPersist.value !== undefined ? resolvedPersist.value : options.value,
		getValue: resolvedPersist.getValue ?? options.getValue,
		setValue: chainPersistSetter(options.setValue, resolvedPersist.setValue),
		fallback:
			resolvedPersist.fallback !== undefined
				? resolvedPersist.fallback
				: options.fallback,
	};

	if (!mergedPersist.enabled) {
		return;
	}

	let disposed = false;
	const cleanupCallbacks: Array<() => void> = [];
	const isDisposed = () => disposed;

	if (mergedPersist.automatic || mergedPersist.load) {
		void loadPersistedEntries(element, mergedPersist, isDisposed);
	}

	if (mergedPersist.automatic) {
		for (const entry of mergedPersist.entries) {
			const binding = getPersistBinding(element, entry);
			if (!binding) continue;

			const handler = () => {
				const nextValue = readPersistedValue(element, entry, mergedPersist);
				if (nextValue === undefined) return;

				void persist.save(entry.key, nextValue, {
					storage: mergedPersist.storage,
					namespace: mergedPersist.namespace,
					prop: entry.prop,
				});
			};

			element.addEventListener(binding.eventName, handler);
			cleanupCallbacks.push(() => {
				element.removeEventListener(binding.eventName, handler);
			});
		}
	}

	if (mergedPersist.save || mergedPersist.remove || mergedPersist.clear) {
		const clickHandler = () => {
			queueMicrotask(() => {
				if (disposed) return;

				void (async () => {
					if (mergedPersist.save) {
						await savePersistedEntries(element, mergedPersist);
					}

					if (mergedPersist.remove) {
						await removePersistedEntries(mergedPersist);
					}

					if (mergedPersist.clear && mergedPersist.key) {
						await persist.clear(mergedPersist.key, {
							storage: mergedPersist.storage,
							namespace: mergedPersist.namespace,
						});
					}
				})();
			});
		};

		element.addEventListener('click', clickHandler);
		cleanupCallbacks.push(() => {
			element.removeEventListener('click', clickHandler);
		});
	}

	return () => {
		disposed = true;

		for (const cleanup of cleanupCallbacks) {
			cleanup();
		}
	};
}

function resolvePersistSyncInput(input: PersistSyncInput): PersistInput {
	return typeof input === 'function' ? input() : input;
}

function createPersistSyncSignature(
	input: PersistInput,
	options: PersistMethodOptions = {},
): string | null {
	const resolved = resolvePersistConfig(input, {
		storage: options.storage,
		namespace: options.namespace,
		prop: options.prop,
	});

	if (!resolved.enabled || !resolved.key || !resolved.entries.length) {
		return null;
	}

	return [
		resolved.storage,
		resolved.namespace,
		...resolved.entries.map((entry) => entry.storageKey),
	].join('|');
}

function snapshotPersistValue<T>(value: T): T {
	if (!Array.isArray(value) && !isRecord(value)) {
		return value;
	}

	return $state.snapshot(value) as T;
}

export function syncPersist<T>(
	input: PersistSyncInput,
	options: PersistSyncOptions<T>,
): PersistSyncHandle<T> {
	let isReady = $state(false);
	let currentSignature = $state<string | null>(null);

	async function load(): Promise<T> {
		const resolvedInput = resolvePersistSyncInput(input);
		const resolved = resolvePersistConfig(resolvedInput, {
			storage: options.storage,
			namespace: options.namespace,
			prop: options.prop,
		});

		const fallbackValue = options.fallback as T;

		if (!resolved.enabled || !resolved.entries.length) {
			options.setValue(fallbackValue);
			return fallbackValue;
		}

		const nextValue = await getPersistAdapter(resolved.storage).load<T>(
			resolved.entries[0].storageKey,
			fallbackValue,
		);

		options.setValue(nextValue);
		return nextValue;
	}

	async function save(): Promise<void> {
		const resolvedInput = resolvePersistSyncInput(input);
		const resolved = resolvePersistConfig(resolvedInput, {
			storage: options.storage,
			namespace: options.namespace,
			prop: options.prop,
		});

		if (!resolved.enabled || !resolved.entries.length) {
			return;
		}

		const nextValue = snapshotPersistValue(options.getValue());

		if (nextValue === undefined) {
			return;
		}

		for (const entry of resolved.entries) {
			await savePersistEntry(entry, nextValue, resolved.storage);
		}
	}

	async function remove(): Promise<void> {
		const resolvedInput = resolvePersistSyncInput(input);
		const resolved = resolvePersistConfig(resolvedInput, {
			storage: options.storage,
			namespace: options.namespace,
			prop: options.prop,
		});

		for (const entry of resolved.entries) {
			await removePersistEntry(entry, resolved.storage);
		}
	}

	async function clear(prefix?: string): Promise<void> {
		const resolvedInput = resolvePersistSyncInput(input);
		const resolved = resolvePersistConfig(resolvedInput, {
			storage: options.storage,
			namespace: options.namespace,
			prop: options.prop,
		});
		const nextPrefix = prefix ?? resolved.key ?? undefined;

		if (!nextPrefix && prefix === undefined) {
			return;
		}

		await persist.clear(nextPrefix, {
			storage: resolved.storage,
			namespace: resolved.namespace,
		});
	}

	$effect(() => {
		const resolvedInput = resolvePersistSyncInput(input);
		const nextSignature = createPersistSyncSignature(resolvedInput, options);

		if (nextSignature === currentSignature) {
			return;
		}

		currentSignature = nextSignature;
		isReady = false;

		let isCancelled = false;

		void (async () => {
			await load();

			if (isCancelled) {
				return;
			}

			isReady = true;
		})();

		return () => {
			isCancelled = true;
		};
	});

	$effect(() => {
		if (!currentSignature || !isReady) {
			return;
		}

		const nextValue = snapshotPersistValue(options.getValue());

		if (nextValue === undefined) {
			return;
		}

		void save();
	});

	return {
		get ready(): boolean {
			return isReady;
		},
		load,
		save,
		remove,
		clear,
	};
}

export const persist = {
	configure(options: PersistConfigureOptions = {}): void {
		if (options.storage) {
			persist_state.storage = options.storage;
		}

		if (options.namespace) {
			persist_state.namespace = normalizePersistNamespace(options.namespace);
		}

		if (options.adapters) {
			for (const [storage, adapter] of Object.entries(options.adapters)) {
				if (!adapter) continue;
				persist_adapters.set(storage as PersistStorage, adapter);
			}
		}
	},

	get storage(): PersistStorage {
		return persist_state.storage;
	},

	get namespace(): string {
		return persist_state.namespace;
	},

	adapter(storage: PersistStorage = persist_state.storage): PersistAdapter {
		return getPersistAdapter(storage);
	},

	normalize(input: PersistInput, options: PersistResolveOptions = {}): PersistResolvedConfig {
		return resolvePersistConfig(input, options);
	},

	resolveKey(key: string, options: PersistMethodOptions = {}): string {
		return resolvePersistStorageKey(key, options);
	},

	resolvePrefix(prefix: string | undefined, options: Pick<PersistMethodOptions, 'namespace'> = {}): string {
		return resolvePersistClearPrefix(prefix, options);
	},

	sync: syncPersist,

	async save<T>(key: string, value: T, options: PersistMethodOptions = {}): Promise<void> {
		const storage = options.storage ?? persist_state.storage;
		const entries = resolvePersistEntries(key, {
			storage,
			namespace: options.namespace,
			prop: options.prop,
		});

		for (const entry of entries) {
			await savePersistEntry(entry, value, storage);
		}
	},

	async load<T>(key: string, fallback?: T, options: PersistMethodOptions = {}): Promise<T> {
		const storage = options.storage ?? persist_state.storage;
		const resolvedKey = resolvePersistStorageKey(key, options);
		return getPersistAdapter(storage).load<T>(resolvedKey, fallback as T);
	},

	async remove(key: string, options: PersistMethodOptions = {}): Promise<void> {
		const storage = options.storage ?? persist_state.storage;
		const entries = resolvePersistEntries(key, {
			storage,
			namespace: options.namespace,
			prop: options.prop,
		});

		for (const entry of entries) {
			await removePersistEntry(entry, storage);
		}
	},

	async clear(prefix: string | undefined, options: Pick<PersistMethodOptions, 'storage' | 'namespace'> = {}): Promise<void> {
		const storage = options.storage ?? persist_state.storage;
		const resolvedPrefix = resolvePersistClearPrefix(prefix, options);
		await getPersistAdapter(storage).clear(resolvedPrefix);
	},
	};

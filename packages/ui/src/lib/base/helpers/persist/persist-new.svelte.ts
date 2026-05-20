import { createLocalStoragePersistAdapter } from "./adapters/localstorage";

export type MaybePromise<T> = T | Promise<T>;
export type PersistWriteMode = "instant" | "debounced" | "manual";
export type PersistAdapterStrategy =
	| "primary"
	| "mirror"
	| "fallback"
	| "local-first"
	| "remote-primary";

export interface PersistAdapter {
	name: string;
	get: <T>(path: string) => MaybePromise<T | null>;
	set: <T>(path: string, value: T) => MaybePromise<void>;
	patch?: <T>(path: string, value: Partial<T>) => MaybePromise<void>;
	remove: (path: string) => MaybePromise<void>;
	clear: (scope?: string) => MaybePromise<void>;
}

export interface PersistRecordTarget {
	id?: string | number;
	_source?: string;
	collection?: string;
}

export interface PersistTargetConfig {
	target?: boolean | string | PersistRecordTarget;
	field?: string;
	adapters?: string[];
	writeMode?: PersistWriteMode;
	debounceMs?: number;
	version?: number;
	strategy?: PersistAdapterStrategy;
}

export type PersistTargetValue =
	| boolean
	| string
	| PersistRecordTarget
	| PersistTargetConfig;

export interface NormalizePersistTargetOptions {
	componentId?: string;
	fallbackScope?: string;
	fallbackField?: string;
	adapters?: string[];
	writeMode?: PersistWriteMode;
	debounceMs?: number;
	version?: number;
	strategy?: PersistAdapterStrategy;
}

export interface NormalizedPersistTarget {
	enabled: boolean;
	basePath: string | null;
	field?: string;
	adapters: string[];
	writeMode: PersistWriteMode;
	debounceMs: number;
	version: number | null;
	strategy: PersistAdapterStrategy;
	source: "boolean" | "string" | "record" | "config";
	target?: PersistRecordTarget;
}

export interface PersistOperationOptions {
	adapters?: string[];
	strategy?: PersistAdapterStrategy;
	writeMode?: PersistWriteMode;
	debounceMs?: number;
}

export interface CreatePersistNewOptions {
	adapters?: PersistAdapter[];
	defaultAdapters?: string[];
	defaultWriteMode?: PersistWriteMode;
	defaultDebounceMs?: number;
	namespace?: string;
	strategy?: PersistAdapterStrategy;
}

export interface PersistController {
	get: <T>(
		path: string,
		options?: PersistOperationOptions,
	) => MaybePromise<T | null>;
	read: <T>(path: string, options?: PersistOperationOptions) => T | null;
	set: <T>(
		path: string,
		value: T,
		options?: PersistOperationOptions,
	) => MaybePromise<void> | void;
	patch: <T>(
		path: string,
		value: Partial<T>,
		options?: PersistOperationOptions,
	) => MaybePromise<void> | void;
	remove: (
		path: string,
		options?: PersistOperationOptions,
	) => MaybePromise<void> | void;
	clear: (
		scope?: string,
		options?: PersistOperationOptions,
	) => MaybePromise<void> | void;
	flush: (path?: string) => Promise<void>;
	destroy: () => void;
	normalizeTarget: (
		value: PersistTargetValue,
		options?: NormalizePersistTargetOptions,
	) => NormalizedPersistTarget;
	resolvePath: (
		value: PersistTargetValue | NormalizedPersistTarget,
		field?: string,
		options?: NormalizePersistTargetOptions,
	) => string | null;
	adapters: PersistAdapter[];
}

const DEFAULT_PERSIST_SCOPE = "components";
const DEFAULT_PERSIST_ADAPTERS = ["localStorage"];
const DEFAULT_PERSIST_DEBOUNCE_MS = 250;
const DEFAULT_PERSIST_STRATEGY: PersistAdapterStrategy = "primary";

let persist_component_counter = 0;

type PendingJob = {
	key: string;
	path: string;
	mode: PersistWriteMode;
	operation: () => MaybePromise<void>;
	timer: ReturnType<typeof setTimeout> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isPromiseLike<T>(value: MaybePromise<T> | void): value is Promise<T> {
	return (
		typeof value === "object" &&
		value !== null &&
		"then" in value &&
		typeof value.then === "function"
	);
}

function toPersistPathSegment(value: unknown): string {
	return String(value ?? "")
		.trim()
		.replace(/\.+/g, "_")
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_-]/g, "_")
		.replace(/^_+|_+$/g, "");
}

function normalizeExplicitPersistPath(value: string): string {
	return String(value)
		.split(".")
		.map((item) => toPersistPathSegment(item))
		.filter(Boolean)
		.join(".");
}

function joinPersistPath(
	...segments: Array<string | null | undefined>
): string {
	return segments
		.map((segment) => normalizeExplicitPersistPath(String(segment ?? "")))
		.filter(Boolean)
		.join(".");
}

function getPersistPathSegments(path: string): string[] {
	return normalizeExplicitPersistPath(path)
		.split(".")
		.filter(Boolean);
}

function hasPersistField(path: string, field: string): boolean {
	const segments = getPersistPathSegments(path);
	return segments[segments.length - 1] === toPersistPathSegment(field);
}

function isPersistConfig(value: unknown): value is PersistTargetConfig {
	if (!isRecord(value)) return false;

	for (
		const key of [
			"target",
			"field",
			"adapters",
			"writeMode",
			"debounceMs",
			"version",
			"strategy",
		]
	) {
		if (key in value) return true;
	}

	return false;
}

function isPersistRecordTarget(value: unknown): value is PersistRecordTarget {
	if (!isRecord(value)) return false;
	return !isPersistConfig(value);
}

function isNormalizedPersistTarget(
	value: unknown,
): value is NormalizedPersistTarget {
	if (!isRecord(value)) return false;

	const candidate = value as Partial<NormalizedPersistTarget>;
	return (
		typeof candidate.enabled === "boolean" &&
		(typeof candidate.basePath === "string" || candidate.basePath === null) &&
		Array.isArray(candidate.adapters)
	);
}

function getPersistAdapters(value: string[] | undefined): string[] {
	const next = Array.isArray(value)
		? value.map((item) => String(item).trim()).filter(Boolean)
		: [];

	return next.length ? next : [...DEFAULT_PERSIST_ADAPTERS];
}

function createDisabledPersistTarget(
	source: NormalizedPersistTarget["source"],
	options: NormalizePersistTargetOptions = {},
): NormalizedPersistTarget {
	return {
		enabled: false,
		basePath: null,
		field: options.fallbackField,
		adapters: getPersistAdapters(options.adapters),
		writeMode: options.writeMode ?? "instant",
		debounceMs: options.debounceMs ?? DEFAULT_PERSIST_DEBOUNCE_MS,
		version: options.version ?? null,
		strategy: options.strategy ?? DEFAULT_PERSIST_STRATEGY,
		source,
	};
}

export function createPersistComponentId(value: {
	tag?: string;
	id?: string;
	name?: string;
	label?: string;
	placeholder?: string;
} = {}): string {
	persist_component_counter += 1;

	const semanticPart = [
		toPersistPathSegment(value.id),
		toPersistPathSegment(value.name),
		toPersistPathSegment(value.label),
		toPersistPathSegment(value.placeholder),
		toPersistPathSegment(value.tag),
	].find(Boolean);

	return `${semanticPart || "component"}-${persist_component_counter}`;
}

export function normalizePersistTarget(
	value: PersistTargetValue,
	options: NormalizePersistTargetOptions = {},
): NormalizedPersistTarget {
	if (!value) return createDisabledPersistTarget("boolean", options);

	const adapters = getPersistAdapters(options.adapters);
	const writeMode = options.writeMode ?? "instant";
	const debounceMs = options.debounceMs ?? DEFAULT_PERSIST_DEBOUNCE_MS;
	const version = options.version ?? null;
	const strategy = options.strategy ?? DEFAULT_PERSIST_STRATEGY;

	if (value === true) {
		const componentId = toPersistPathSegment(options.componentId);
		const basePath = componentId
			? joinPersistPath(
				options.fallbackScope ?? DEFAULT_PERSIST_SCOPE,
				componentId,
			)
			: null;

		return {
			enabled: Boolean(basePath),
			basePath,
			field: options.fallbackField,
			adapters,
			writeMode,
			debounceMs,
			version,
			strategy,
			source: "boolean",
		};
	}

	if (typeof value === "string") {
		const basePath = normalizeExplicitPersistPath(value);

		return {
			enabled: Boolean(basePath),
			basePath: basePath || null,
			field: options.fallbackField,
			adapters,
			writeMode,
			debounceMs,
			version,
			strategy,
			source: "string",
		};
	}

	if (isPersistConfig(value)) {
		const normalized = normalizePersistTarget(value.target ?? true, {
			...options,
			fallbackField: value.field ?? options.fallbackField,
			adapters: value.adapters ?? options.adapters,
			writeMode: value.writeMode ?? options.writeMode,
			debounceMs: value.debounceMs ?? options.debounceMs,
			version: value.version ?? options.version,
			strategy: value.strategy ?? options.strategy,
		});

		return {
			...normalized,
			field: value.field ?? normalized.field,
			adapters: getPersistAdapters(value.adapters ?? normalized.adapters),
			writeMode: value.writeMode ?? normalized.writeMode,
			debounceMs: value.debounceMs ?? normalized.debounceMs,
			version: value.version ?? normalized.version,
			strategy: value.strategy ?? normalized.strategy,
			source: "config",
		};
	}

	if (!isPersistRecordTarget(value)) {
		return createDisabledPersistTarget("record", options);
	}

	const recordTarget: PersistRecordTarget = value;
	const collection: string = toPersistPathSegment(
		recordTarget.collection ?? recordTarget._source,
	);
	const id: string = toPersistPathSegment(recordTarget.id);
	const basePath: string | null = collection && id
		? joinPersistPath(collection, id)
		: null;

	return {
		enabled: Boolean(basePath),
		basePath,
		field: options.fallbackField,
		adapters,
		writeMode,
		debounceMs,
		version,
		strategy,
		source: "record",
		target: recordTarget,
	};
}

export function resolvePersistPath(
	value: PersistTargetValue | NormalizedPersistTarget,
	field?: string,
	options: NormalizePersistTargetOptions = {},
): string | null {
	const normalized = isNormalizedPersistTarget(value)
		? value
		: normalizePersistTarget(value, options);
	if (!normalized.enabled || !normalized.basePath) return null;

	const resolvedField = toPersistPathSegment(field ?? normalized.field ?? "");
	if (!resolvedField) return normalized.basePath;
	if (hasPersistField(normalized.basePath, resolvedField)) {
		return normalized.basePath;
	}

	return joinPersistPath(normalized.basePath, resolvedField);
}

function getMatchingAdapters(
	registry: Map<string, PersistAdapter>,
	requested: string[] | undefined,
	defaults: string[],
): PersistAdapter[] {
	const names = requested?.length ? requested : defaults;
	const adapters: PersistAdapter[] = [];

	for (const name of names) {
		const adapter = registry.get(name);
		if (adapter) adapters.push(adapter);
	}

	return adapters;
}

function getReadAdapters(
	adapters: PersistAdapter[],
	strategy: PersistAdapterStrategy,
): PersistAdapter[] {
	if (strategy === "fallback") return adapters;
	return adapters.slice(0, 1);
}

function getWriteAdapters(
	adapters: PersistAdapter[],
	strategy: PersistAdapterStrategy,
): PersistAdapter[] {
	if (strategy === "mirror" || strategy === "local-first") return adapters;
	return adapters.slice(0, 1);
}

function collectAsyncOperations(
	operations: Array<MaybePromise<void> | void>,
): Promise<void> | void {
	const asyncOperations: Promise<void>[] = [];

	for (const operation of operations) {
		if (isPromiseLike(operation)) {
			asyncOperations.push(Promise.resolve(operation));
		}
	}

	if (!asyncOperations.length) return;

	return Promise.all(asyncOperations).then(() => undefined);
}

function shouldFlushPath(candidatePath: string, path?: string): boolean {
	if (!path) return true;
	if (candidatePath === path) return true;
	if (candidatePath.startsWith(`${path}.`)) return true;
	if (path.startsWith(`${candidatePath}.`)) return true;
	return false;
}

export function createPersistNew(
	options: CreatePersistNewOptions = {},
): PersistController {
	const defaultAdapters = getPersistAdapters(options.defaultAdapters);
	const defaultWriteMode = options.defaultWriteMode ?? "instant";
	const defaultDebounceMs = options.defaultDebounceMs ??
		DEFAULT_PERSIST_DEBOUNCE_MS;
	const defaultStrategy = options.strategy ?? DEFAULT_PERSIST_STRATEGY;
	const adapterRegistry = new Map<string, PersistAdapter>();
	const pendingJobs = new Map<string, PendingJob>();
	const configuredAdapters = options.adapters?.length
		? options.adapters
		: [createLocalStoragePersistAdapter({ namespace: options.namespace })];

	for (const adapter of configuredAdapters) {
		adapterRegistry.set(adapter.name, adapter);
	}

	function normalizeOperationOptions(
		overrides: PersistOperationOptions = {},
	): Required<PersistOperationOptions> {
		return {
			adapters: getPersistAdapters(overrides.adapters ?? defaultAdapters),
			strategy: overrides.strategy ?? defaultStrategy,
			writeMode: overrides.writeMode ?? defaultWriteMode,
			debounceMs: overrides.debounceMs ?? defaultDebounceMs,
		};
	}

	function runWriteOperation(
		path: string,
		operation: () => MaybePromise<void>,
		operationOptions: PersistOperationOptions = {},
	): MaybePromise<void> | void {
		const normalizedOptions = normalizeOperationOptions(operationOptions);
		const jobKey = [
			normalizedOptions.adapters.join(","),
			normalizedOptions.strategy,
			path,
		].join("::");
		const existingJob = pendingJobs.get(jobKey);
		if (existingJob?.timer) {
			clearTimeout(existingJob.timer);
		}

		const nextJob: PendingJob = {
			key: jobKey,
			path,
			mode: normalizedOptions.writeMode,
			operation,
			timer: null,
		};

		if (normalizedOptions.writeMode === "manual") {
			pendingJobs.set(jobKey, nextJob);
			return;
		}

		if (normalizedOptions.writeMode === "debounced") {
			nextJob.timer = setTimeout(() => {
				pendingJobs.delete(jobKey);
				void Promise.resolve(operation());
			}, normalizedOptions.debounceMs);

			pendingJobs.set(jobKey, nextJob);
			return;
		}

		pendingJobs.delete(jobKey);
		return operation();
	}

	return {
		adapters: configuredAdapters,

		get<T>(
			path: string,
			operationOptions: PersistOperationOptions = {},
		): MaybePromise<T | null> {
			const normalizedOptions = normalizeOperationOptions(operationOptions);
			const adapters = getReadAdapters(
				getMatchingAdapters(
					adapterRegistry,
					normalizedOptions.adapters,
					defaultAdapters,
				),
				normalizedOptions.strategy,
			);

			for (const [index, adapter] of adapters.entries()) {
				const result = adapter.get<T>(path);
				if (isPromiseLike(result)) {
					return (async (): Promise<T | null> => {
						const first = (await result) as T | null;
						if (first !== null && first !== undefined) return first;

						for (const nextAdapter of adapters.slice(index + 1)) {
							const next = (await nextAdapter.get<T>(path)) as T | null;
							if (next !== null && next !== undefined) return next;
						}

						return null;
					})();
				}

				if (result !== null && result !== undefined) {
					return result;
				}
			}

			return null;
		},

		read<T>(
			path: string,
			operationOptions: PersistOperationOptions = {},
		): T | null {
			const result = this.get<T>(path, operationOptions);
			return isPromiseLike(result) ? null : result;
		},

		set<T>(
			path: string,
			value: T,
			operationOptions: PersistOperationOptions = {},
		) {
			const normalizedOptions = normalizeOperationOptions(operationOptions);
			const adapters = getWriteAdapters(
				getMatchingAdapters(
					adapterRegistry,
					normalizedOptions.adapters,
					defaultAdapters,
				),
				normalizedOptions.strategy,
			);

			return runWriteOperation(
				path,
				() =>
					collectAsyncOperations(
						adapters.map((adapter) => adapter.set(path, value)),
					),
				normalizedOptions,
			);
		},

		patch<T>(
			path: string,
			value: Partial<T>,
			operationOptions: PersistOperationOptions = {},
		) {
			const normalizedOptions = normalizeOperationOptions(operationOptions);
			const adapters = getWriteAdapters(
				getMatchingAdapters(
					adapterRegistry,
					normalizedOptions.adapters,
					defaultAdapters,
				),
				normalizedOptions.strategy,
			);

			return runWriteOperation(
				path,
				() => {
					const operations = adapters.map((adapter) => {
						if (adapter.patch) return adapter.patch<T>(path, value);

						const current = adapter.get<Record<string, unknown>>(path);
						if (isPromiseLike(current)) {
							return Promise.resolve(current).then((resolved) => {
								const nextValue = {
									...(isRecord(resolved) ? resolved : {}),
									...(isRecord(value) ? value : {}),
								};
								return adapter.set(path, nextValue as T);
							});
						}

						const nextValue = {
							...(isRecord(current) ? current : {}),
							...(isRecord(value) ? value : {}),
						};

						return adapter.set(path, nextValue as T);
					});

					return collectAsyncOperations(operations);
				},
				normalizedOptions,
			);
		},

		remove(path: string, operationOptions: PersistOperationOptions = {}) {
			const normalizedOptions = normalizeOperationOptions(operationOptions);
			const adapters = getWriteAdapters(
				getMatchingAdapters(
					adapterRegistry,
					normalizedOptions.adapters,
					defaultAdapters,
				),
				normalizedOptions.strategy,
			);

			return runWriteOperation(
				path,
				() =>
					collectAsyncOperations(
						adapters.map((adapter) => adapter.remove(path)),
					),
				normalizedOptions,
			);
		},

		clear(scope?: string, operationOptions: PersistOperationOptions = {}) {
			const normalizedOptions = normalizeOperationOptions(operationOptions);
			const adapters = getWriteAdapters(
				getMatchingAdapters(
					adapterRegistry,
					normalizedOptions.adapters,
					defaultAdapters,
				),
				normalizedOptions.strategy,
			);

			return runWriteOperation(
				scope ? normalizeExplicitPersistPath(scope) : "*",
				() =>
					collectAsyncOperations(
						adapters.map((adapter) => adapter.clear(scope)),
					),
				normalizedOptions,
			);
		},

		async flush(path?: string) {
			const jobs = Array.from(pendingJobs.values()).filter((job) =>
				shouldFlushPath(job.path, path)
			);

			for (const job of jobs) {
				if (job.timer) {
					clearTimeout(job.timer);
				}
				pendingJobs.delete(job.key);
				await Promise.resolve(job.operation());
			}
		},

		destroy() {
			for (const job of pendingJobs.values()) {
				if (job.timer) {
					clearTimeout(job.timer);
				}
			}

			pendingJobs.clear();
		},

		normalizeTarget(
			value: PersistTargetValue,
			targetOptions: NormalizePersistTargetOptions = {},
		) {
			return normalizePersistTarget(value, {
				adapters: targetOptions.adapters ?? defaultAdapters,
				writeMode: targetOptions.writeMode ?? defaultWriteMode,
				debounceMs: targetOptions.debounceMs ?? defaultDebounceMs,
				strategy: targetOptions.strategy ?? defaultStrategy,
				...targetOptions,
			});
		},

		resolvePath(
			value: PersistTargetValue | NormalizedPersistTarget,
			field?: string,
			targetOptions: NormalizePersistTargetOptions = {},
		) {
			return resolvePersistPath(value, field, {
				adapters: targetOptions.adapters ?? defaultAdapters,
				writeMode: targetOptions.writeMode ?? defaultWriteMode,
				debounceMs: targetOptions.debounceMs ?? defaultDebounceMs,
				strategy: targetOptions.strategy ?? defaultStrategy,
				...targetOptions,
			});
		},
	};
}

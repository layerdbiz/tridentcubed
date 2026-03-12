import { DragDropManager, Draggable, Droppable } from "@dnd-kit/dom";

type ItemAccessor<T> = T | (() => T);
type ArrayAccessors<T> =
	| T[]
	| (() => T[])
	| {
		get: () => T[];
		set: (items: T[]) => void;
	};

type ManagedCleanup = {
	destroy: () => void;
};

function move<T>(items: T[], from: number, to: number) {
	items.splice(to, 0, items.splice(from, 1)[0]);
	return items;
}

function hasValue(value: unknown, target: unknown): boolean {
	if (value === target) return true;
	if (Array.isArray(value)) return value.some((item) => hasValue(item, target));
	if (value && typeof value === "object") {
		return Object.values(value).some((item) =>
			hasValue(item, target)
		);
	}
	return false;
}

function getNearestParentElementFromMap<T>(
	element: HTMLElement,
	map: WeakMap<HTMLElement, T>,
) {
	let parent = element.parentElement;
	while (parent) {
		if (map.has(parent)) return map.get(parent) ?? null;
		parent = parent.parentElement;
	}
	return null;
}

function toArrayAccessors<T>(items: ArrayAccessors<T>) {
	if (Array.isArray(items)) {
		return {
			get: () => items,
			set: (nextItems: T[]) => items.splice(0, items.length, ...nextItems),
		};
	}

	if (typeof items === "function") {
		return {
			get: items,
			set: (nextItems: T[]) => items().splice(0, items().length, ...nextItems),
		};
	}

	return items;
}

function toItemAccessor<T>(item: ItemAccessor<T>) {
	return typeof item === "function" ? item : () => item;
}

type DraggableOptions<T> = {
	item: ItemAccessor<T>;
	type?: string;
	accept?: string[];
	draggableOptions?: Record<string, unknown>;
	droppableOptions?: Record<string, unknown>;
};

export type DroppableParams<T = unknown> = {
	items: ArrayAccessors<T>;
	setItems?: (items: T[]) => void;
	accept?: string[];
	droppableOptions?: Record<string, unknown>;
};

type UnsortableOptions = {
	autoAttach?: boolean;
	managerOptions?: Record<string, unknown>;
	manager?: DragDropManager;
};

const defaultOptions = {
	autoAttach: true,
} satisfies UnsortableOptions;

let lastDroppable: { disabled?: boolean } | null = null;
let lastDroppableOriginalState: boolean | undefined;

const containerMap = new WeakMap<
	HTMLElement,
	{ items: { get: () => unknown[]; set: (items: unknown[]) => void } }
>();
const itemMap = new WeakMap<
	HTMLElement,
	{ draggable: { handle?: HTMLElement } }
>();

export class Unsortable {
	manager: DragDropManager;
	options: UnsortableOptions;

	constructor(options: UnsortableOptions = {}) {
		this.options = { ...defaultOptions, ...options };
		this.manager = options.manager ||
			new DragDropManager(options.managerOptions);
		this.addDraggable = this.addDraggable.bind(this);
		this.addDroppable = this.addDroppable.bind(this);
		this.addHandle = this.addHandle.bind(this);
		this._onDragOver = this._onDragOver.bind(this);
		this._disableOwnDroppable = this._disableOwnDroppable.bind(this);
		this._restoreLastDroppable = this._restoreLastDroppable.bind(this);

		if (this.options.autoAttach) this.attach();
	}

	attach() {
		this.manager.monitor.addEventListener(
			"dragover",
			this._onDragOver as EventListener,
		);
		this.manager.monitor.addEventListener(
			"dragover",
			this._disableOwnDroppable as EventListener,
		);
		this.manager.monitor.addEventListener(
			"beforedragstart",
			this._disableOwnDroppable as EventListener,
		);
		this.manager.monitor.addEventListener(
			"dragend",
			this._restoreLastDroppable as EventListener,
		);
	}

	_disableOwnDroppable(event: Event) {
		const dragEvent = event as Event & {
			operation?: {
				source?: { data?: { droppable?: { disabled?: boolean } } };
			};
		};
		const droppable = dragEvent.operation?.source?.data?.droppable;
		if (!droppable) return;

		if (lastDroppable && droppable !== lastDroppable) {
			this._restoreLastDroppable();
		} else if (lastDroppable === droppable) return;

		lastDroppableOriginalState = droppable.disabled;
		droppable.disabled = true;
		lastDroppable = droppable;
	}

	_restoreLastDroppable() {
		if (!lastDroppable) return;
		lastDroppable.disabled = lastDroppableOriginalState;
		lastDroppable = null;
		lastDroppableOriginalState = undefined;
	}

	destroy() {
		this.manager.destroy();
	}

	_onDragOver(event: Event) {
		const dragEvent = event as Event & {
			operation?: {
				source: { element: HTMLElement };
				target?: { data?: { isContainer?: boolean } };
			};
		};

		if (!dragEvent.operation?.target) return;
		dragEvent.operation.source.element.removeAttribute("popover");

		if (dragEvent.operation.target.data?.isContainer) {
			return this.handleMove(event);
		}

		return this.handleSort(event);
	}

	handleMove(event: Event) {
		const dragEvent = event as Event & {
			operation: {
				source: { element: HTMLElement; data: { item: () => unknown } };
				target: {
					data: {
						items: { get: () => unknown[]; set: (items: unknown[]) => void };
					};
				};
			};
		};

		const source = getNearestParentElementFromMap(
			dragEvent.operation.source.element,
			containerMap,
		);
		if (!source) return;

		const sourceItem = dragEvent.operation.source.data.item();
		const sourceItems = source.items.get();
		const targetItems = dragEvent.operation.target.data.items.get();

		if (targetItems.includes(sourceItem)) return;

		source.items.set(sourceItems.filter((item) => item !== sourceItem));
		dragEvent.operation.target.data.items.set([...targetItems, sourceItem]);
	}

	handleSort(event: Event) {
		const dragEvent = event as Event & {
			operation: {
				source: { element: HTMLElement; data: { item: () => unknown } };
				target: { element: HTMLElement; data: { item: () => unknown } };
			};
		};

		const source = getNearestParentElementFromMap(
			dragEvent.operation.source.element,
			containerMap,
		);
		const target = getNearestParentElementFromMap(
			dragEvent.operation.target.element,
			containerMap,
		);
		if (!source || !target) return;

		const sourceItem = dragEvent.operation.source.data.item();
		const sourceItems = source.items.get();
		const targetItem = dragEvent.operation.target.data.item();
		const targetItems = target.items.get();

		if (sourceItem === targetItem) return;

		const oldIndex = sourceItems.indexOf(sourceItem);
		const newIndex = targetItems.indexOf(targetItem);

		if (sourceItems === targetItems) {
			source.items.set([...move([...sourceItems], oldIndex, newIndex)]);
			return;
		}

		if (newIndex !== -1 && !hasValue(sourceItem, targetItems)) {
			source.items.set(sourceItems.filter((item) => item !== sourceItem));
			const nextTargetItems = [...targetItems];
			nextTargetItems.splice(newIndex, 0, sourceItem);
			target.items.set(nextTargetItems);
		}
	}

	addDraggable<T>(
		element: HTMLElement,
		options: DraggableOptions<T>,
	): ManagedCleanup {
		const normalizedOptions = {
			...options,
			item: toItemAccessor(options.item),
		};

		const droppable = new Droppable(
			{
				accept: normalizedOptions.accept ||
					(normalizedOptions.type ? [normalizedOptions.type] : undefined),
				...normalizedOptions.droppableOptions,
				id: normalizedOptions.item(),
				element,
				data: {
					...normalizedOptions,
					...normalizedOptions.droppableOptions?.data,
					isContainer: false,
				},
			},
			this.manager,
		);

		const draggable = new Draggable(
			{
				type: normalizedOptions.type,
				id: normalizedOptions.item(),
				element,
				...normalizedOptions.draggableOptions,
				data: {
					...normalizedOptions,
					...normalizedOptions.draggableOptions?.data,
					droppable,
					isContainer: false,
				},
			},
			this.manager,
		);

		itemMap.set(element, { draggable });

		return {
			destroy() {
				draggable.destroy();
				droppable.destroy();
			},
		};
	}

	addDroppable<T>(
		element: HTMLElement,
		options: DroppableParams<T>,
	): ManagedCleanup {
		const items = toArrayAccessors(options.items);
		const normalizedOptions = {
			...options,
			items: {
				get: items.get,
				set: options.setItems || items.set,
			},
		};

		const droppable = new Droppable(
			{
				...normalizedOptions.droppableOptions,
				id: normalizedOptions.items.get(),
				element,
				accept: normalizedOptions.accept,
				data: {
					...normalizedOptions,
					...normalizedOptions.droppableOptions?.data,
					isContainer: true,
				},
			},
			this.manager,
		);

		containerMap.set(
			element,
			normalizedOptions as {
				items: { get: () => unknown[]; set: (items: unknown[]) => void };
			},
		);

		return {
			destroy() {
				droppable.destroy();
			},
		};
	}

	addHandle(element: HTMLElement) {
		requestAnimationFrame(() => {
			const nearest = getNearestParentElementFromMap(element, itemMap);
			if (!nearest) return;
			nearest.draggable.handle = element;
		});
	}
}

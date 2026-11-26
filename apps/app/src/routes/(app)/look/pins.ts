// Pins (#346; Justin, 2026-11-25): a project or a record pinned from its ⋮ menu shows in the menu's Pinned list, at
// the top above Recents. Each person has their own pins, newest on top, and the same ⋮ menu unpins it. The screens
// name a record by its name, but a pin keeps its id, so a renamed record stays pinned; a pin whose project or record
// went to the Trash is left out of the list (and comes back with it).
import { agoOf, type DatasetType, type RecentType } from './look.data';
import type { LookState } from './look.state.svelte';

/** One pin as the screens hold it: its own id, what it points at, and when it was pinned. */
export type PinType = { id: string; page: DatasetType; recordId: string; at: string };

type NamedType = { id?: string; name: string };

// The projects or records on a page, outside the Trash, each with its id and the name the screens use.
function liveOf(look: LookState, page: DatasetType): NamedType[] {
	if (page === 'projects')
		return look.projects.map((project) => ({ id: project.id, name: project.title }));
	if (page === 'customers') return look.added;
	if (page === 'team') return look.members;
	if (page === 'transport') return look.transports;
	return look.facilities;
}

// The id of what `key` names on its page: a project's own id, or a record's name.
function toRecordId(look: LookState, page: DatasetType, key: string) {
	if (page === 'projects') return key;
	return liveOf(look, page).find((record) => record.name === key)?.id;
}

function pinOf(look: LookState, page: DatasetType, key: string) {
	const recordId = toRecordId(look, page, key);
	return recordId
		? look.pins.find((pin) => pin.page === page && pin.recordId === recordId)
		: undefined;
}

/** Whether what `key` names (a project's id, or a record's name) is pinned. */
export function isPinned(look: LookState, page: DatasetType, key: string) {
	return Boolean(pinOf(look, page, key));
}

/** Whether what `key` names can be pinned: it is saved, so it has an id. */
export function isPinnable(look: LookState, page: DatasetType, key: string) {
	return Boolean(toRecordId(look, page, key));
}

/** Pins what `key` names at the top of the list, or unpins it when it is pinned already. */
export function togglePin(look: LookState, page: DatasetType, key: string, at = new Date()) {
	const pinned = pinOf(look, page, key);
	if (pinned) {
		look.pins = look.pins.filter((pin) => pin !== pinned);
		return;
	}
	const recordId = toRecordId(look, page, key);
	if (!recordId) return;
	look.pins = [{ id: crypto.randomUUID(), page, recordId, at: at.toISOString() }, ...look.pins];
}

/** The menu's Pinned list: newest pin first, each as the Recents list draws a row, what is in the Trash left out. */
export function pinnedOf(look: LookState): RecentType[] {
	const items: RecentType[] = [];
	for (const pin of look.pins.toSorted((a, b) => b.at.localeCompare(a.at))) {
		const record = liveOf(look, pin.page).find((one) => one.id === pin.recordId);
		if (!record) continue;
		items.push({
			page: pin.page,
			name: record.name.trim() || 'Untitled project',
			note: `Pinned · ${agoOf(pin.at)}`,
			...(pin.page === 'projects' ? { id: pin.recordId } : {})
		});
	}
	return items;
}

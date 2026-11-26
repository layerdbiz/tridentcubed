// Which of the menu's panels are open, remembered on the device (#212; Justin, 2026-11-18: a reload keeps them as
// they were left, and "everybody sets their own UI", so it is this browser's own and never goes to the server).
// A device that has kept nothing, or gives no storage (a private window, a test), shows them all open. Pinned
// (#346) sits above the other two.
export type MenuPanelsType = { pinned: boolean; recents: boolean; online: boolean };

type StoreType = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'trident-menu-panels';

// The browser's own storage, or nothing where reaching for it throws.
function deviceStore(): StoreType | undefined {
	try {
		return localStorage;
	} catch {
		return undefined;
	}
}

export function readMenuPanels(store: StoreType | undefined = deviceStore()): MenuPanelsType {
	const panels = { pinned: true, recents: true, online: true };
	try {
		const kept: unknown = JSON.parse(store?.getItem(KEY) ?? '{}');
		if (kept && typeof kept === 'object') {
			const { pinned, recents, online } = kept as Partial<MenuPanelsType>;
			if (typeof pinned === 'boolean') panels.pinned = pinned;
			if (typeof recents === 'boolean') panels.recents = recents;
			if (typeof online === 'boolean') panels.online = online;
		}
	} catch {
		// Nothing readable was kept: all open.
	}
	return panels;
}

export function writeMenuPanels(
	panels: MenuPanelsType,
	store: StoreType | undefined = deviceStore()
) {
	try {
		store?.setItem(
			KEY,
			JSON.stringify({ pinned: panels.pinned, recents: panels.recents, online: panels.online })
		);
	} catch {
		// No room or no storage: the panels still open and shut, they are only not remembered.
	}
}

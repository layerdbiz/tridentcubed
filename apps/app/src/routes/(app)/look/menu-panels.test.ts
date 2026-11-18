// The menu's panels are remembered on the device (#212): a reload shows Recents and Online as they were left.
import { describe, expect, it } from 'vite-plus/test';
import { readMenuPanels, writeMenuPanels } from './menu-panels';

function createStore(start: Record<string, string> = {}) {
	const kept = new Map(Object.entries(start));
	return {
		kept,
		getItem: (key: string) => kept.get(key) ?? null,
		setItem: (key: string, value: string) => void kept.set(key, value)
	};
}

const BROKEN = {
	getItem(): string | null {
		throw new Error('No storage in a private window');
	},
	setItem() {
		throw new Error('No storage in a private window');
	}
};

describe('the menu panels a device remembers', () => {
	it('opens both on a device that has kept nothing', () => {
		expect(readMenuPanels(createStore())).toEqual({ recents: true, online: true });
	});

	it('reads back what was last written', () => {
		const store = createStore();
		writeMenuPanels({ recents: false, online: true }, store);
		expect(readMenuPanels(store)).toEqual({ recents: false, online: true });
	});

	it('opens a panel the kept value says nothing about', () => {
		const store = createStore();
		writeMenuPanels({ recents: false, online: true }, store);
		const [key] = [...store.kept.keys()];
		store.kept.set(key, JSON.stringify({ recents: false }));
		expect(readMenuPanels(store)).toEqual({ recents: false, online: true });
	});

	it('opens both when what was kept cannot be read', () => {
		const store = createStore();
		writeMenuPanels({ recents: false, online: false }, store);
		const [key] = [...store.kept.keys()];
		store.kept.set(key, 'not json');
		expect(readMenuPanels(store)).toEqual({ recents: true, online: true });
	});

	it('carries on with both open where the browser gives no storage', () => {
		expect(readMenuPanels(BROKEN)).toEqual({ recents: true, online: true });
		expect(() => writeMenuPanels({ recents: false, online: false }, BROKEN)).not.toThrow();
		expect(readMenuPanels(undefined)).toEqual({ recents: true, online: true });
	});
});

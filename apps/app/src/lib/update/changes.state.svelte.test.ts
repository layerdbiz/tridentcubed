// The new version window's list (#396) with plain data: a source that says which commit is newest and what changed
// between two commits, and a store for the commit this device last pressed the button on. What is checked is that
// the list holds everything since that press, grows while unseen updates pile up, and that only the press clears it.
import { describe, expect, it } from 'vite-plus/test';
import type { ReleaseChangeType } from '#lib/releases/releases.utils.js';
import { ChangesState } from './changes.state.svelte';

// The branch as a row of commits, oldest first, each with the change it made.
const HISTORY = ['a', 'b', 'c', 'd', 'e'];

function toChange(commit: string): ReleaseChangeType {
	return { kind: 'feature', text: `Change ${commit}`, tickets: [] };
}

type AppType = {
	newest: string;
	seen: string | undefined;
	isIdle: boolean;
	isReadable: boolean;
	reads: number;
	changes: ChangesState;
};

function createApp({
	own = 'a',
	seen,
	isIdle = true
}: { own?: string; seen?: string; isIdle?: boolean } = {}) {
	const app = { newest: own, seen, isIdle, isReadable: true, reads: 0 } as AppType;
	app.changes = new ChangesState({
		own,
		store: { read: () => app.seen, write: (commit: string) => (app.seen = commit) },
		source: {
			newest: async () => app.newest,
			between: async (base: string, head: string) => {
				app.reads += 1;
				if (!app.isReadable) return undefined;
				return HISTORY.slice(HISTORY.indexOf(base) + 1, HISTORY.indexOf(head) + 1).map(toChange);
			}
		},
		isIdle: () => app.isIdle
	});
	return app;
}

function listed(app: AppType) {
	return app.changes.changes?.map((change) => change.text);
}

describe('the new version window', () => {
	it('on a device that never pressed it, remembers this version and shows nothing', async () => {
		const app = createApp({ own: 'c' });

		await app.changes.start();

		expect(app.changes.isOpen).toBe(false);
		expect(app.seen).toBe('c');
	});

	it('on opening a newer version than the one last pressed on, lists everything since, with no reload', async () => {
		const app = createApp({ own: 'd', seen: 'b' });

		await app.changes.start();

		expect(app.changes.isOpen).toBe(true);
		expect(app.changes.isNewer).toBe(false);
		expect(listed(app)).toEqual(['Change c', 'Change d']);
	});

	it('when a new version is out while the app is open, lists it and offers the reload', async () => {
		const app = createApp({ own: 'b', seen: 'b' });
		await app.changes.start();

		app.newest = 'c';
		await app.changes.check();

		expect(app.changes.isOpen).toBe(true);
		expect(app.changes.isNewer).toBe(true);
		expect(listed(app)).toEqual(['Change c']);
	});

	it('adds each further version to the list while it is unseen, open or not', async () => {
		const app = createApp({ own: 'b', seen: 'b' });
		app.newest = 'c';
		await app.changes.check();
		app.changes.close();

		app.newest = 'e';
		await app.changes.check();

		expect(listed(app)).toEqual(['Change c', 'Change d', 'Change e']);
	});

	it('reads nothing again while the newest version is the one listed', async () => {
		const app = createApp({ own: 'b', seen: 'b' });
		app.newest = 'c';
		await app.changes.check();

		await app.changes.check();

		expect(app.reads).toBe(1);
	});

	it('only the button clears the list: it remembers the newest version listed and says to reload', async () => {
		const app = createApp({ own: 'b', seen: 'a' });
		app.newest = 'd';
		await app.changes.check();
		app.changes.close();

		expect(app.seen).toBe('a');

		const shouldReload = app.changes.acknowledge();

		expect(shouldReload).toBe(true);
		expect(app.seen).toBe('d');
		expect(app.changes.isOpen).toBe(false);
	});

	it('closes with no reload when what it lists is the version already running', async () => {
		const app = createApp({ own: 'c', seen: 'a' });
		await app.changes.start();

		expect(app.changes.acknowledge()).toBe(false);
		expect(app.seen).toBe('c');
	});

	it('waits for a pause before opening on someone at work, and stays a note until then', async () => {
		const app = createApp({ own: 'b', seen: 'b', isIdle: false });
		app.newest = 'c';
		await app.changes.check();

		expect(app.changes.isNewer).toBe(true);
		expect(app.changes.isOpen).toBe(false);

		app.changes.openWhenIdle();
		expect(app.changes.isOpen).toBe(false);

		app.isIdle = true;
		app.changes.openWhenIdle();
		expect(app.changes.isOpen).toBe(true);
	});

	it('once closed, opens by itself again only for a further version', async () => {
		const app = createApp({ own: 'b', seen: 'b' });
		app.newest = 'c';
		await app.changes.check();
		app.changes.close();

		app.changes.openWhenIdle();
		expect(app.changes.isOpen).toBe(false);

		app.newest = 'd';
		await app.changes.check();
		expect(app.changes.isOpen).toBe(true);
	});

	it('still offers the reload when the list cannot be read, and tries the list again on the next version', async () => {
		const app = createApp({ own: 'b', seen: 'b' });
		app.isReadable = false;
		app.newest = 'c';
		await app.changes.check();

		expect(app.changes.isNewer).toBe(true);
		expect(app.changes.changes).toBeUndefined();

		app.isReadable = true;
		app.newest = 'd';
		await app.changes.check();

		expect(listed(app)).toEqual(['Change c', 'Change d']);
	});

	it('leaves the list alone on opening when it cannot be read, so it is tried next time', async () => {
		const app = createApp({ own: 'd', seen: 'b' });
		app.isReadable = false;

		await app.changes.start();

		expect(app.changes.isOpen).toBe(false);
		expect(app.seen).toBe('b');
	});

	it('does nothing in a build that does not know its commit, as on a computer', async () => {
		const app = createApp({ own: '', seen: 'b' });
		app.newest = 'c';

		await app.changes.start();
		await app.changes.check();

		expect(app.changes.isOpen).toBe(false);
		expect(app.changes.isNewer).toBe(false);
	});
});

// What's New (#363, #396, #399) with a plain history, store and reader: when it opens by itself, what counts as new,
// and that only its button clears what is new.
import { describe, expect, it } from 'vite-plus/test';
import type { HistoryType } from './history.utils';
import { WhatsNewState } from './releases.state.svelte';

// A branch of commits a, b, c, d (12 letters each), one change landing on each.
const CHAIN = ['a', 'b', 'c', 'd'].map((letter) => letter.repeat(12));

function createHistory(upTo: number): HistoryType {
	const changes = CHAIN.slice(0, upTo + 1).map((_, landed) => ({
		kind: 'feature' as const,
		text: `Change ${landed}`,
		tickets: [],
		at: new Date(Date.UTC(2026, 10, 25, landed)).toISOString(),
		landed
	}));
	return {
		head: `${CHAIN[upTo]}0000`,
		chain: CHAIN.slice(0, upTo + 1),
		batches: [
			{ day: '2026-11-25', from: changes[0].at, to: changes.at(-1)!.at, changes: changes.reverse() }
		]
	};
}

type AppType = {
	store: {
		seen: string | undefined;
		read: () => string | undefined;
		write: (commit: string) => void;
	};
	server: { history: HistoryType | undefined };
	whatsNew: WhatsNewState;
};

function createApp({
	own = 1,
	newest = own,
	seen
}: { own?: number; newest?: number; seen?: number } = {}): AppType {
	const store: AppType['store'] = {
		seen: seen === undefined ? undefined : `${CHAIN[seen]}0000`,
		read: () => store.seen,
		write: (commit) => (store.seen = commit)
	};
	const server: AppType['server'] = { history: createHistory(newest) };
	const whatsNew = new WhatsNewState({
		own: `${CHAIN[own]}0000`,
		store,
		read: async () => server.history
	});
	return { store, server, whatsNew };
}

describe("What's New", () => {
	it('stays shut on a first visit, and counts from there', async () => {
		const { whatsNew, store } = createApp({ own: 1 });

		await whatsNew.start();

		expect(whatsNew.isOpen).toBe(false);
		expect(store.seen).toBe(`${CHAIN[1]}0000`);
	});

	it('opens on opening the app on everything since the last press, and only Got it', async () => {
		const { whatsNew } = createApp({ own: 3, seen: 1 });

		await whatsNew.start();

		expect(whatsNew.isOpen).toBe(true);
		expect(whatsNew.fresh.map((change) => change.text)).toEqual(['Change 3', 'Change 2']);
		expect(whatsNew.isNewer).toBe(false);
		expect(whatsNew.acknowledge()).toBe(false);
		expect(whatsNew.isOpen).toBe(false);
	});

	it('stays shut once everything was seen', async () => {
		const { whatsNew } = createApp({ own: 2, seen: 2 });

		await whatsNew.start();

		expect(whatsNew.isOpen).toBe(false);
	});

	it('opens the moment a new version is out, with what it brought on top of what was still unseen', async () => {
		const { whatsNew, server } = createApp({ own: 1, seen: 0 });
		await whatsNew.start();
		whatsNew.close();

		server.history = createHistory(3);
		await whatsNew.check();

		expect(whatsNew.isOpen).toBe(true);
		expect(whatsNew.isNewer).toBe(true);
		expect(whatsNew.fresh.map((change) => change.landed)).toEqual([3, 2, 1]);
	});

	it('adds a version that lands while it is open to the list', async () => {
		const { whatsNew, server } = createApp({ own: 1, seen: 1 });
		await whatsNew.start();
		server.history = createHistory(2);
		await whatsNew.check();

		server.history = createHistory(3);
		await whatsNew.check();

		expect(whatsNew.fresh.map((change) => change.landed)).toEqual([3, 2]);
	});

	it('closed with the X, opens again only for a further version', async () => {
		const { whatsNew, server } = createApp({ own: 1, seen: 1 });
		await whatsNew.start();
		server.history = createHistory(2);
		await whatsNew.check();
		whatsNew.close();

		await whatsNew.check();
		expect(whatsNew.isOpen).toBe(false);

		server.history = createHistory(3);
		await whatsNew.check();
		expect(whatsNew.isOpen).toBe(true);
	});

	it('the button clears what is new up to the newest version, stays open and asks for the reload', async () => {
		const { whatsNew, server, store } = createApp({ own: 1, seen: 1 });
		await whatsNew.start();
		server.history = createHistory(3);
		await whatsNew.check();

		expect(whatsNew.acknowledge()).toBe(true);

		expect(store.seen).toBe(`${CHAIN[3]}0000`);
		expect(whatsNew.fresh).toEqual([]);
		expect(whatsNew.isOpen).toBe(true);
	});

	it('a history that cannot be read opens nothing, and the profile menu says so', async () => {
		const { whatsNew, server } = createApp({ own: 1, seen: 0 });
		server.history = undefined;

		await whatsNew.start();
		expect(whatsNew.isOpen).toBe(false);

		whatsNew.openAll();
		await Promise.resolve();
		expect(whatsNew.hasFailed).toBe(true);
	});

	// Justin, 2026-11-28: a release tapped in the bell opens What's New at that release, open, even an older one; the
	// profile menu still opens it at the newest.
	it('opens at the section asked for, and at the newest from the menu', async () => {
		const { whatsNew } = createApp({ own: 1, seen: 1 });
		await whatsNew.start();

		whatsNew.openAt('2026-11-24T00:00:00.000Z');
		expect(whatsNew.isOpen).toBe(true);
		expect(whatsNew.openOn).toBe('2026-11-24T00:00:00.000Z');

		whatsNew.close();
		whatsNew.openAll();
		expect(whatsNew.isOpen).toBe(true);
		expect(whatsNew.openOn).toBe('');
	});

	// Justin, 2026-11-26: nobody ever stays on an old version (#401).
	it('opens on opening the app on an older version even with everything seen, offering the reload', async () => {
		const { whatsNew } = createApp({ own: 1, newest: 2, seen: 2 });

		await whatsNew.start();

		expect(whatsNew.isOpen).toBe(true);
		expect(whatsNew.fresh).toEqual([]);
		expect(whatsNew.isNewer).toBe(true);
	});

	it('opens again when SvelteKit finds a newer version and everything was already seen on another tab', async () => {
		const { whatsNew, server } = createApp({ own: 1, seen: 1 });
		await whatsNew.start();
		server.history = createHistory(2);
		whatsNew.seen = `${CHAIN[2]}0000`;

		await whatsNew.check();

		expect(whatsNew.fresh).toEqual([]);
		expect(whatsNew.isOpen).toBe(true);
	});

	it('closed with the X or a tap outside while a newer version is out, counts as the button and shuts', async () => {
		const { whatsNew, server, store } = createApp({ own: 1, seen: 1 });
		await whatsNew.start();
		server.history = createHistory(3);
		await whatsNew.check();

		expect(whatsNew.dismiss()).toBe(true);

		expect(store.seen).toBe(`${CHAIN[3]}0000`);
		expect(whatsNew.isOpen).toBe(false);
	});

	it('closed with the X with nothing newer to load, leaves what is new as new', async () => {
		const { whatsNew } = createApp({ own: 3, seen: 1 });
		await whatsNew.start();

		expect(whatsNew.dismiss()).toBe(false);

		expect(whatsNew.isOpen).toBe(false);
		expect(whatsNew.fresh).toHaveLength(2);
	});

	it('opens on a first visit to an older version, so its button brings the newest', async () => {
		const { whatsNew } = createApp({ own: 1, newest: 2 });

		await whatsNew.start();

		expect(whatsNew.isOpen).toBe(true);
	});
});

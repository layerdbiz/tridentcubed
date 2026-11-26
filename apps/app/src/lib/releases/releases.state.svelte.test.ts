// What's New (#363) with plain releases and a plain store for the version this device last saw: when the window
// opens by itself, which releases it shows, and that a closed window stays closed.
import { describe, expect, it } from 'vite-plus/test';
import type { ReleaseType } from './releases.utils';
import { WhatsNewState } from './releases.state.svelte';

function createRelease(version: string): ReleaseType {
	return {
		version,
		date: '2026-11-26',
		changes: [{ kind: 'feature', text: `In ${version}`, tickets: [] }]
	};
}

// Newest first, as releases.json keeps them.
const RELEASES = ['1.2.0', '1.1.1', '1.1.0', '1.0.0'].map(createRelease);

function createApp(releases: ReleaseType[], seen?: string) {
	const store = {
		seen,
		read: () => store.seen,
		write: (version: string) => (store.seen = version)
	};
	return { store, whatsNew: new WhatsNewState(releases, store) };
}

function shownVersions(whatsNew: WhatsNewState) {
	return whatsNew.shown.map((release) => release.version);
}

describe("What's New", () => {
	it('opens on the newest release on a device that has seen none', () => {
		const { whatsNew } = createApp(RELEASES);

		whatsNew.start();

		expect(whatsNew.isOpen).toBe(true);
		expect(shownVersions(whatsNew)).toEqual(['1.2.0']);
	});

	it('shows every release newer than the one this device last saw, newest first', () => {
		const { whatsNew } = createApp(RELEASES, '1.1.0');

		whatsNew.start();

		expect(shownVersions(whatsNew)).toEqual(['1.2.0', '1.1.1']);
	});

	it('stays shut once the newest release was seen', () => {
		const { whatsNew } = createApp(RELEASES, '1.2.0');

		whatsNew.start();

		expect(whatsNew.isOpen).toBe(false);
	});

	it('stays shut while there is no release', () => {
		const { whatsNew } = createApp([]);

		whatsNew.start();

		expect(whatsNew.isOpen).toBe(false);
	});

	it('remembers the newest release when closed, so the next opening of the app shows nothing', () => {
		const { store, whatsNew } = createApp(RELEASES, '1.0.0');
		whatsNew.start();

		whatsNew.close();

		expect(whatsNew.isOpen).toBe(false);
		expect(store.seen).toBe('1.2.0');

		const again = new WhatsNewState(RELEASES, store);
		again.start();

		expect(again.isOpen).toBe(false);
	});

	it('opens on every release from the menu, even once they were seen', () => {
		const { whatsNew } = createApp(RELEASES, '1.2.0');

		whatsNew.openAll();

		expect(shownVersions(whatsNew)).toEqual(['1.2.0', '1.1.1', '1.1.0', '1.0.0']);
	});

	it('opens from the menu before the first release too, with nothing to list', () => {
		const { whatsNew } = createApp([]);

		whatsNew.openAll();

		expect(whatsNew.isOpen).toBe(true);
		expect(whatsNew.shown).toEqual([]);
	});

	it('compares versions as numbers, so 1.10.0 is newer than 1.9.0', () => {
		const { whatsNew } = createApp(['1.10.0', '1.9.0'].map(createRelease), '1.9.0');

		whatsNew.start();

		expect(shownVersions(whatsNew)).toEqual(['1.10.0']);
	});
});

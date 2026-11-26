// The last resort after a reload onto a new version (#401): taken once per version and tab, only when the reload
// made for that version still brought an older page.
import { describe, expect, it } from 'vite-plus/test';
import { noteReload, takeLastResort, type TabStoreType } from './rescue';

function createTab(): TabStoreType {
	const notes = new Map<string, string>();
	return { read: (key) => notes.get(key), write: (key, value) => void notes.set(key, value) };
}

describe('the last resort after a reload', () => {
	it('is taken when the reload made for the newest version still brought an older page', () => {
		const tab = createTab();
		noteReload('new', tab);

		expect(takeLastResort(true, 'new', tab)).toBe(true);
	});

	it('is taken once per version: a second miss leaves the window offering the reload', () => {
		const tab = createTab();
		noteReload('new', tab);
		takeLastResort(true, 'new', tab);
		noteReload('new', tab);

		expect(takeLastResort(true, 'new', tab)).toBe(false);
	});

	it('is taken again for a further version', () => {
		const tab = createTab();
		noteReload('new', tab);
		takeLastResort(true, 'new', tab);
		noteReload('newer', tab);

		expect(takeLastResort(true, 'newer', tab)).toBe(true);
	});

	it('is never taken when the reload brought the newest version', () => {
		const tab = createTab();
		noteReload('new', tab);

		expect(takeLastResort(false, 'new', tab)).toBe(false);
	});

	it('is never taken without a reload for that version, so opening an old tab only offers the reload', () => {
		const tab = createTab();

		expect(takeLastResort(true, 'new', tab)).toBe(false);
		noteReload('old', tab);
		expect(takeLastResort(true, 'new', tab)).toBe(false);
	});
});

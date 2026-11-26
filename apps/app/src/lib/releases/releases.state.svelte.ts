// What's New (#363): the window that shows the team what a release brought, the way Discord shows its changelog.
// After a release, the next opening of the app (the update note's reload, #202, is one) shows the releases newer
// than the one this device last saw: just the newest on a device that has seen none. Closing it remembers the
// newest, so it shows once per version. The profile menu opens it again on every release. A release that changed
// nothing in the app (the website alone) is left out: the window would show its version with nothing under it.
//
// It knows nothing of the browser: the releases and where the last seen version is kept are handed to it.
import { RELEASES } from './releases.constants';
import type { ReleaseType } from './releases.utils';
import { isNewer, toAppChanges } from './releases.utils';

/** Where the version this device last saw is kept. */
export type SeenStoreType = {
	read: () => string | undefined;
	write: (version: string) => void;
};

export class WhatsNewState {
	#releases: ReleaseType[];
	// The releases with something to say in the app.
	#news: ReleaseType[];
	#store: SeenStoreType;

	/** The releases the window shows, newest first. */
	shown = $state.raw<ReleaseType[]>([]);
	isOpen = $state(false);

	/** `releases` newest first, as releases.json keeps them. */
	constructor(releases: ReleaseType[], store: SeenStoreType) {
		this.#releases = releases;
		this.#news = releases.filter((release) => release.summary || toAppChanges(release).length > 0);
		this.#store = store;
	}

	/** On opening the app: shows what this device has not seen yet, if anything. */
	start() {
		const [newest] = this.#news;
		if (!newest) return;
		const seen = this.#store.read();
		this.shown = seen ? this.#news.filter((release) => isNewer(release.version, seen)) : [newest];
		this.isOpen = this.shown.length > 0;
	}

	/** From the profile menu: every release, or none yet, which the window then says. */
	openAll() {
		this.shown = this.#news;
		this.isOpen = true;
	}

	close() {
		const [newest] = this.#releases;
		if (newest) this.#store.write(newest.version);
		this.isOpen = false;
	}
}

const SEEN = 'trident.whats-new.seen';

// In the browser's storage, so per device. A private window or blocked storage simply shows it again.
const browserStore: SeenStoreType = {
	read() {
		try {
			return localStorage.getItem(SEEN) ?? undefined;
		} catch {
			return undefined;
		}
	},
	write(version) {
		try {
			localStorage.setItem(SEEN, version);
		} catch {
			// Not kept: it shows again next time.
		}
	}
};

/** The one What's New of the signed-in app. */
export const whatsNew = new WhatsNewState(RELEASES, browserStore);

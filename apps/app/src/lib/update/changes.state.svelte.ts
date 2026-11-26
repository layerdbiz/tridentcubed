// The new version window's list (#396): every new feature and fix since this device last pressed the window's
// button. Justin, 2026-11-26: updates that land unseen build on each other (ten while the app sat idle or closed are
// ten in the list), one that lands while the window is open is added to it, and only the button clears it; it
// reloads onto the newest version when one is out.
//
// Two ways it opens. On opening the app on a newer version than the one last pressed on, it lists what came since,
// and the button only says Got it. While the app is open and a newer version comes out, it lists everything since
// that press up to the newest, and the button reloads (update.state.svelte.ts holds when, so a change being saved is
// never lost). It opens by itself only on someone not at work (`isIdle`): otherwise it stays a note until they
// pause or tap it. Closed without the button, it opens by itself again only for a further version.
//
// It knows nothing of the browser or GitHub: the commit this build is, where the last pressed commit is kept, where
// the newest commit and the changes between two commits are read, and whether the person is idle are handed to it.
import type { ReleaseChangeType } from '#lib/releases/releases.utils.js';

export type ChangeSourceType = {
	/** The commit the newest version was built from, or nothing when it cannot be asked. */
	newest: () => Promise<string | undefined>;
	/** The new features and fixes after `base` up to `head`, or nothing when they cannot be read. */
	between: (base: string, head: string) => Promise<ReleaseChangeType[] | undefined>;
};

export type ChangesOptionsType = {
	/** The commit this build was made from; empty in a build that does not know it. */
	own: string;
	/** Where the commit this device last pressed the button on is kept. */
	store: { read: () => string | undefined; write: (commit: string) => void };
	source: ChangeSourceType;
	/** Whether the person is away or has not touched the app for a while. */
	isIdle: () => boolean;
};

export class ChangesState {
	#options: ChangesOptionsType;
	// The commit the list runs up to.
	#head: string;
	// The newest commit the window was closed on without the button.
	#closedOn = '';
	#isReading = false;

	/** What the window lists; nothing when the list could not be read. */
	changes = $state.raw<ReleaseChangeType[] | undefined>([]);
	isOpen = $state(false);
	/** A version newer than the one running is out: the button reloads onto it. */
	isNewer = $state(false);

	constructor(options: ChangesOptionsType) {
		this.#options = options;
		this.#head = options.own;
	}

	/** On opening the app: lists what came since the version last pressed on, if anything did. */
	async start() {
		const { own, store, source } = this.#options;
		if (!own) return;
		const seen = store.read();
		if (!seen) return store.write(own);
		if (seen === own) return;
		const changes = await source.between(seen, own);
		// Not readable now: tried again on the next opening.
		if (!changes) return;
		if (changes.length === 0) return store.write(own);
		this.changes = changes;
		this.isOpen = true;
	}

	/** Asks whether a newer version is out, and if so lists everything since the last press up to it. */
	async check() {
		const { own, store, source, isIdle } = this.#options;
		if (!own || this.#isReading) return;
		this.#isReading = true;
		try {
			const newest = await source.newest();
			if (!newest || newest === this.#head) return;
			this.changes = await source.between(store.read() ?? own, newest);
			this.#head = newest;
			this.isNewer = true;
			if (isIdle()) this.isOpen = true;
		} finally {
			this.#isReading = false;
		}
	}

	/** Opens a waiting window once the person pauses, unless it was closed on this version already. */
	openWhenIdle() {
		if (this.isNewer && !this.isOpen && this.#closedOn !== this.#head && this.#options.isIdle()) {
			this.isOpen = true;
		}
	}

	open() {
		this.isOpen = true;
	}

	/** Closed without the button: the list stays, unseen. */
	close() {
		this.isOpen = false;
		this.#closedOn = this.#head;
	}

	/** The button: the list is seen up to its newest version. True when that version still has to be loaded. */
	acknowledge() {
		this.#options.store.write(this.#head);
		this.isOpen = false;
		this.#closedOn = this.#head;
		return this.isNewer;
	}
}

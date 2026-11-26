// What's New (#363, #396, #399): every update the branch ever took, in batches, and what this device has not seen.
// Justin, 2026-11-26: nothing ever leaves it; it opens by itself when the app is opened on something new, and the
// moment a new version comes out while the app is open (on the branches in POP_UP_BRANCHES, where it takes the
// update note's place); updates that land unseen build on each other; and only its button clears them, reloading
// onto the newest version when one is out (update.state.svelte.ts holds when, so a change being saved is never lost).
//
// "Seen" is the commit this device last pressed the button on: every change that landed after it is new. The history
// comes from the newest version (routes/api/history.json), so an open app learns what a newer one brought. Closed with
// the X, it opens by itself again only for a further version; the profile menu opens it any time.
//
// It knows nothing of the browser: this build's commit, where the seen commit is kept and where the history is read
// are handed to it.
import { BUILD_COMMIT, HAS_POP_UP, HISTORY_PATH } from './releases.constants';
import { SHORT, toLanded, toNewSince, type HistoryType } from './history.utils';

/** Where the commit this device last pressed the button on is kept. */
export type SeenStoreType = {
	read: () => string | undefined;
	write: (commit: string) => void;
};

export type WhatsNewOptionsType = {
	/** The commit this build was made from; empty in a build that does not know it. */
	own: string;
	store: SeenStoreType;
	/** The newest version's history, or nothing when it cannot be read. */
	read: () => Promise<HistoryType | undefined>;
	/** Whether it opens by itself the moment a new version is out. */
	isLive: boolean;
};

export class WhatsNewState {
	#options: WhatsNewOptionsType;
	// The newest version the window was closed on without the button.
	#closedOn = '';
	#isReading = false;

	history = $state.raw<HistoryType>();
	/** The history was asked for and could not be read. */
	hasFailed = $state(false);
	isOpen = $state(false);
	/** The commit this device last pressed the button on. */
	seen = $state('');

	/** What landed since the last press. */
	fresh = $derived(this.history ? toNewSince(this.history, this.seen) : []);
	/** Where on the branch the last press was: a change that landed after it is new. */
	seenAt = $derived(this.history ? toLanded(this.history, this.seen) : -1);
	/** A version newer than the one running is out: the button reloads onto it. */
	isNewer = $derived.by(() => {
		const head = this.history?.head;
		const { own } = this.#options;
		return Boolean(head && own && head.slice(0, SHORT) !== own.slice(0, SHORT));
	});

	constructor(options: WhatsNewOptionsType) {
		this.#options = options;
	}

	/** On opening the app: opens on what came since the last press, if anything did. */
	async start() {
		const { own, store } = this.#options;
		this.seen = store.read() ?? '';
		await this.#read();
		const history = this.history;
		if (!history) return;
		// A first visit, or a press on a commit this branch does not hold: nothing counts as new until the next one.
		if (!this.seen || toLanded(history, this.seen) < 0) return this.#see(own || history.head);
		if (this.fresh.length > 0) this.isOpen = true;
	}

	/** Asks for the newest history; opens on it when a new version brought something, if it opens by itself. */
	async check() {
		if (this.#isReading) return;
		const before = this.history?.head;
		await this.#read();
		const head = this.history?.head;
		if (!head || head === before) return;
		if (this.#options.isLive && this.fresh.length > 0 && this.#closedOn !== head)
			this.isOpen = true;
	}

	/** From the profile menu: the whole history, read again. */
	openAll() {
		this.isOpen = true;
		void this.#read();
	}

	/** Closed without the button: what is new stays new. */
	close() {
		this.isOpen = false;
		this.#closedOn = this.history?.head ?? '';
	}

	/** The button: everything up to the newest version is seen. True when that version still has to be loaded. */
	acknowledge() {
		const head = this.history?.head;
		if (head) this.#see(head);
		this.#closedOn = head ?? '';
		if (!this.isNewer) this.isOpen = false;
		return this.isNewer;
	}

	#see(commit: string) {
		this.#options.store.write(commit);
		this.seen = commit;
	}

	async #read() {
		if (this.#isReading) return;
		this.#isReading = true;
		try {
			const history = await this.#options.read();
			if (history) this.history = history;
			this.hasFailed = !this.history;
		} finally {
			this.#isReading = false;
		}
	}
}

const SEEN = 'trident.whats-new.seen-commit';

// In the browser's storage, so per device. A private window or blocked storage starts again from the newest.
const browserStore: SeenStoreType = {
	read() {
		try {
			return localStorage.getItem(SEEN) ?? undefined;
		} catch {
			return undefined;
		}
	},
	write(commit) {
		try {
			localStorage.setItem(SEEN, commit);
		} catch {
			// Not kept.
		}
	}
};

// Without cookies: Vercel keeps an open app's requests on the version it started with (Skew Protection, by a
// cookie), and the history must come from the newest one. It is a file written at build time, open to anyone.
async function readHistory(): Promise<HistoryType | undefined> {
	try {
		const answer = await fetch(HISTORY_PATH, { credentials: 'omit', cache: 'no-store' });
		if (!answer.ok) return undefined;
		const history = (await answer.json()) as HistoryType;
		return history.head ? history : undefined;
	} catch {
		return undefined;
	}
}

/** The one What's New of the signed-in app. */
export const whatsNew = new WhatsNewState({
	own: BUILD_COMMIT,
	store: browserStore,
	read: readHistory,
	isLive: HAS_POP_UP
});

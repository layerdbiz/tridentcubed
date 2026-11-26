// The last resort after a reload onto a new version (#401). Justin, 2026-11-26: nobody ever stays on an old version.
// The reload is made for the newest version What's New knows of; if the page it brings is still an older one, this
// tab clears the service worker and every file it kept, and reloads once more, straight from the network. Once per
// version and tab: a second miss leaves the window offering the reload, so it never reloads without end.
const RELOADED = 'trident.update.reloaded-for';
const CLEARED = 'trident.update.cleared-for';

/** Where this tab notes what it reloaded for; a stand-in for the browser's per-tab storage in tests. */
export type TabStoreType = {
	read: (key: string) => string | undefined;
	write: (key: string, value: string) => void;
};

// The tab's own storage. Blocked storage notes nothing, and the last resort is then never taken.
const tabStore: TabStoreType = {
	read(key) {
		try {
			return sessionStorage.getItem(key) ?? undefined;
		} catch {
			return undefined;
		}
	},
	write(key, value) {
		try {
			sessionStorage.setItem(key, value);
		} catch {
			// Not noted.
		}
	}
};

/** Notes that this tab is reloading onto `head`, the newest version What's New knows of. */
export function noteReload(head: string, store = tabStore) {
	store.write(RELOADED, head);
}

/**
 * Whether the page just opened needs the last resort: it is older than `head` (`isNewer`), this tab reloaded for
 * `head`, and has not cleared for it yet. Noting the clearing is part of the answer, so it is taken once.
 */
export function takeLastResort(isNewer: boolean, head: string, store = tabStore) {
	if (!isNewer || store.read(RELOADED) !== head || store.read(CLEARED) === head) return false;
	store.write(CLEARED, head);
	return true;
}

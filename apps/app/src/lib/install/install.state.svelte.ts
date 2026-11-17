// Install App (#203): the line in the profile picture's menu and the link on the login page. It knows three
// things, each asked of the browser and none guessed from the device: whether the app runs installed (the display
// mode), whether the browser offered a one-tap install (`beforeinstallprompt`), and whether an install just
// happened (`appinstalled`). It shows only while the app is not installed; a tap uses the browser's offer when
// there is one and otherwise asks for the how-to.

/** The browser's one-tap install offer (Chrome's `beforeinstallprompt` event), kept for a later tap. */
export type InstallOfferType = {
	prompt: () => Promise<unknown>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** What Install App asks of the browser; `window` is one. */
export type InstallBrowserType = {
	matchMedia: (query: string) => {
		matches: boolean;
		addEventListener: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
	};
	addEventListener: (type: string, listener: (event: Event) => void) => void;
};

/** What a tap did: the one-tap install ran and was accepted or turned down, or the how-to is wanted. */
export type InstallTapType = 'installed' | 'dismissed' | 'how-to';

const STANDALONE = '(display-mode: standalone)';

export class InstallState {
	/** The page is in the installed app's own window. */
	isInstalled = $state(false);
	/** An install happened while this page was open. */
	hasInstalled = $state(false);
	#offer = $state.raw<InstallOfferType>();

	/** Until the browser says otherwise, as on the server, Install App shows. */
	isShown = $derived(!this.isInstalled && !this.hasInstalled);
	hasOffer = $derived(this.#offer !== undefined);

	/**
	 * Starts hearing the browser. The offer is kept and never cancelled (no `preventDefault()`), so the browser
	 * shows its own install banner as well.
	 */
	listen(browser: InstallBrowserType) {
		const display = browser.matchMedia(STANDALONE);
		this.isInstalled = display.matches;
		// Chrome on a computer moves the tab into the app's window as it installs.
		display.addEventListener('change', (event) => (this.isInstalled = event.matches));
		browser.addEventListener('beforeinstallprompt', (event) => {
			this.#offer = event as unknown as InstallOfferType;
		});
		browser.addEventListener('appinstalled', () => {
			this.hasInstalled = true;
			this.#offer = undefined;
		});
	}

	async tap(): Promise<InstallTapType> {
		const offer = this.#offer;
		if (!offer) return 'how-to';
		// A browser lets an offer be used once.
		this.#offer = undefined;
		try {
			await offer.prompt();
			const { outcome } = await offer.userChoice;
			if (outcome !== 'accepted') return 'dismissed';
			this.hasInstalled = true;
			return 'installed';
		} catch {
			// The browser took its offer back: the steps still get the User there.
			return 'how-to';
		}
	}
}

/** The one Install App state of this page. Only the browser's start-up (hooks.client.ts) makes it listen. */
export const install = new InstallState();

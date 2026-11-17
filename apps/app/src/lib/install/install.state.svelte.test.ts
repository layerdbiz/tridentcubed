// Install App with a browser that is three plain things (#203): whether the display is standalone, the one-tap
// offer it may send, and the word that an install happened. What is checked is whether Install App shows and what
// a tap does, never which device this is.
import { describe, expect, it, vi } from 'vite-plus/test';
import { InstallState, type InstallOfferType } from './install.state.svelte';

type OutcomeType = 'accepted' | 'dismissed';

function createBrowser({ isStandalone = false } = {}) {
	const heard = new Map<string, (event: never) => void>();
	const display = {
		matches: isStandalone,
		addEventListener(_type: 'change', listener: (event: { matches: boolean }) => void) {
			heard.set('display', listener);
		}
	};

	function send(type: string, event: unknown) {
		heard.get(type)?.(event as never);
	}

	return {
		queries: [] as string[],
		matchMedia(query: string) {
			this.queries.push(query);
			return display;
		},
		addEventListener(type: string, listener: (event: Event) => void) {
			heard.set(type, listener);
		},
		/** The browser offers a one-tap install; what the User answers it with is `outcome`. */
		offer(outcome: OutcomeType = 'accepted') {
			const offer = {
				preventDefault: vi.fn(),
				prompt: vi.fn(async () => ({ outcome })),
				userChoice: Promise.resolve({ outcome })
			};
			send('beforeinstallprompt', offer);
			return offer;
		},
		/** The browser says the app was installed, by whatever way. */
		install() {
			send('appinstalled', {});
		},
		/** The browser says the display is now standalone, or no longer is. */
		turn(isNowStandalone: boolean) {
			send('display', { matches: isNowStandalone });
		}
	};
}

function fresh(browser = createBrowser()) {
	const install = new InstallState();
	install.listen(browser);
	return { install, browser };
}

describe('whether Install App shows', () => {
	it('shows in a browser tab', () => {
		const { install } = fresh();
		expect(install.isShown).toBe(true);
	});

	it('shows before the browser was asked anything, as on the server', () => {
		expect(new InstallState().isShown).toBe(true);
	});

	it('is hidden when the app runs installed', () => {
		const { install } = fresh(createBrowser({ isStandalone: true }));
		expect(install.isShown).toBe(false);
	});

	it('asks the browser for its display mode, not for its name', () => {
		const { browser } = fresh();
		expect(browser.queries).toEqual(['(display-mode: standalone)']);
	});

	it('hides when the page moves into the installed app', () => {
		const { install, browser } = fresh();
		browser.turn(true);
		expect(install.isShown).toBe(false);
	});

	it('stays hidden when the installed app goes full screen, which the browser no longer calls standalone', () => {
		const { install, browser } = fresh(createBrowser({ isStandalone: true }));
		browser.turn(false);
		expect(install.isShown).toBe(false);
	});

	it('hides right after an install, with no reload', () => {
		const { install, browser } = fresh();
		browser.install();
		expect(install.isShown).toBe(false);
	});

	it('stays hidden after an install even when the page is still in a tab', () => {
		const { install, browser } = fresh();
		browser.install();
		browser.turn(false);
		expect(install.isShown).toBe(false);
	});
});

describe('a tap on Install App', () => {
	it('opens the how-to when the browser offered nothing', async () => {
		const { install } = fresh();
		expect(await install.tap()).toBe('how-to');
		expect(install.isShown).toBe(true);
	});

	it('runs the one-tap install where the browser offered it, and shows no instructions', async () => {
		const { install, browser } = fresh();
		const offer = browser.offer('accepted');
		expect(await install.tap()).toBe('installed');
		expect(offer.prompt).toHaveBeenCalledOnce();
	});

	it('hides once the one-tap install is accepted, before the browser says it is done', async () => {
		const { install, browser } = fresh();
		browser.offer('accepted');
		await install.tap();
		expect(install.isShown).toBe(false);
	});

	it('stays when the User turns the one-tap install down', async () => {
		const { install, browser } = fresh();
		browser.offer('dismissed');
		expect(await install.tap()).toBe('dismissed');
		expect(install.isShown).toBe(true);
	});

	it('uses an offer once: the next tap opens the how-to', async () => {
		const { install, browser } = fresh();
		const offer = browser.offer('dismissed');
		await install.tap();
		expect(await install.tap()).toBe('how-to');
		expect(offer.prompt).toHaveBeenCalledOnce();
	});

	it('uses the newest offer when the browser offers again', async () => {
		const { install, browser } = fresh();
		const first = browser.offer('dismissed');
		await install.tap();
		const second = browser.offer('accepted');
		expect(await install.tap()).toBe('installed');
		expect(first.prompt).toHaveBeenCalledOnce();
		expect(second.prompt).toHaveBeenCalledOnce();
	});

	it('opens the how-to when the browser refuses its own offer', async () => {
		const { install, browser } = fresh();
		const offer: InstallOfferType = browser.offer();
		offer.prompt = async () => {
			throw new DOMException('The prompt() method cannot be called.', 'InvalidStateError');
		};
		expect(await install.tap()).toBe('how-to');
		expect(install.isShown).toBe(true);
	});
});

describe("the browser's own install banner", () => {
	it('is left alone: the offer is kept, never cancelled', async () => {
		const { install, browser } = fresh();
		const offer = browser.offer();
		await install.tap();
		expect(offer.preventDefault).not.toHaveBeenCalled();
	});
});

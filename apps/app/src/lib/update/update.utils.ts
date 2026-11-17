// The update note's two words with the browser's service worker (#202). Neither decides anything: whether a new
// version exists is SvelteKit's version check, and when to switch is the update rule (update.state.svelte.ts).
import { TAKE_OVER, TAKE_OVER_WAIT } from './update.constants';

// No service worker in a browser without one, or on a plain http address: the note then only reloads.
async function findRegistration() {
	if (!('serviceWorker' in navigator)) return undefined;
	return navigator.serviceWorker.getRegistration();
}

/**
 * Asks the browser to fetch the new version's service worker now, so it downloads quietly while the app stays
 * open. A browser looks for one only when a page is opened, and the open app opens none. Once fetched it waits,
 * as every new version does. Without a connection nothing happens: the next opening fetches it.
 */
export async function downloadWorker() {
	try {
		await (await findRegistration())?.update();
	} catch {
		// Not reachable now.
	}
}

/**
 * Asks the waiting service worker to take over; done once it has. With none waiting (the browser has not fetched
 * it yet, or has no service worker) it is done at once: the reload that follows still lands on the new version,
 * because a page always comes from the network, and the new service worker then waits for the app to be closed.
 * The same holds for a worker that does not answer in time, so the note is never left on "Updating…".
 */
export async function takeOver() {
	const worker = (await findRegistration())?.waiting;
	if (!worker) return;
	await new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, TAKE_OVER_WAIT);
		worker.addEventListener('statechange', () => {
			if (worker.state !== 'activated' && worker.state !== 'redundant') return;
			clearTimeout(timer);
			resolve();
		});
		worker.postMessage(TAKE_OVER);
	});
}

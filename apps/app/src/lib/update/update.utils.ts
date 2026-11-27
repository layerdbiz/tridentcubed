// What's New's two words with the browser's service worker (#202). Neither decides anything: whether a new
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

// A new version still downloading is waited for, a little, so it can take over.
async function findWaiting() {
	const registration = await findRegistration();
	const installing = registration?.installing;
	if (!registration || registration.waiting || !installing)
		return registration?.waiting ?? undefined;
	await new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, TAKE_OVER_WAIT);
		installing.addEventListener('statechange', () => {
			if (installing.state === 'installing') return;
			clearTimeout(timer);
			resolve();
		});
	});
	return registration.waiting ?? undefined;
}

/**
 * Asks the waiting service worker to take over; done once it has. A new version still downloading is waited for a
 * moment first. With none waiting (the browser has no service worker, or the download failed) it is done at once:
 * the reload that follows still lands on the new version, because a page always comes from the newest version, and
 * the new service worker then waits for the app to be closed. The same holds for a worker that does not answer in
 * time, so the note is never left on "Updating…".
 */
export async function takeOver() {
	const worker = await findWaiting();
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

/**
 * The last resort (#401, rescue.ts): removes this site's service worker and every file kept on the device, so the
 * next page load comes straight from the network, as on a first visit. The app registers its service worker again
 * when it opens.
 */
export async function forgetWorker() {
	try {
		const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
		await Promise.all(registrations.map((registration) => registration.unregister()));
		const stores = await caches.keys();
		await Promise.all(stores.map((store) => caches.delete(store)));
	} catch {
		// Nothing more can be cleared from here: the reload still asks the network.
	}
}

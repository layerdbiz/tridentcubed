// The app's service worker (#201, ADR 0007): SvelteKit's own, bundled and registered in production builds only. It
// keeps this version's built files, the Needs Internet screen and the named static files on the device, so the
// app opens fast and shows its own screen with no signal. It never keeps the whole static folder (every app
// serves the same one, the Website's videos and photos included) and it never answers data. What it does with a
// request is in service-worker.utils.ts: a kept file comes from the device, a page that cannot be reached gets the
// Needs Internet screen, the rest is left alone. It never calls `skipWaiting()` on install: a new version waits until the app is closed,
// or until the User taps the update note (#202), whose message is the only thing that lets it take over an open app.
//
// A page load is answered with the browser's own request (navigation preload, turned on when this version takes
// over). A request sent from here reaches the server as a plain read, not as a page load, and Vercel's Skew
// Protection moves a visitor to the newest version on a page load only: without this an open app stayed on the old
// version after every deployment, and the update note came back after every tap.
import { version } from '$app/env';
import { immutable } from '$app/manifest';
import { self } from '$app/service-worker';
import {
	answer,
	fill,
	isTakeOver,
	toFiles,
	toKept,
	toOld,
	toStoreName
} from './service-worker.utils';

const STORE = toStoreName(version);
const KEPT = toKept(immutable);
// Not in every browser: without it a page load is sent from here, as before.
const PRELOAD = self.registration.navigationPreload as NavigationPreloadManager | undefined;

async function install() {
	const cache = await caches.open(STORE);
	await fill(
		{ get: (path) => fetch(path), put: (path, response) => cache.put(path, response) },
		toFiles(immutable)
	);
}

async function removeOld() {
	const old = toOld(await caches.keys(), version);
	await Promise.all(old.map((name) => caches.delete(name)));
}

async function read(path: string) {
	const cache = await caches.open(STORE);
	return cache.match(path, { ignoreVary: true });
}

self.addEventListener('install', (event) => event.waitUntil(install()));

self.addEventListener('activate', (event) =>
	event.waitUntil(Promise.all([removeOld(), PRELOAD?.enable()]))
);

self.addEventListener('message', (event) => {
	if (isTakeOver(event.data)) event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
	const answered = answer(event.request, {
		origin: self.location.origin,
		kept: KEPT,
		read,
		ask: () => fetch(event.request),
		preload: PRELOAD && (() => event.preloadResponse as Promise<Response | undefined>)
	});
	if (answered) event.respondWith(answered);
});

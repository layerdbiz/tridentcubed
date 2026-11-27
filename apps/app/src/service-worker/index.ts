// The app's service worker (#201, ADR 0007): SvelteKit's own, bundled and registered in production builds only. It
// keeps this version's built files, the Needs Internet screen and the named static files on the device, so the
// app opens fast and shows its own screen with no signal. It never keeps the whole static folder (every app
// serves the same one, the Website's videos and photos included) and it never answers data. What it does with a
// request is in service-worker.utils.ts: a kept file comes from the device, a page load comes from the newest
// version or gets the Needs Internet screen when it cannot be reached, the rest is left alone. It never calls
// `skipWaiting()` on install: a new version waits until the app is closed, or until the User taps What's New's button
// (#202, #396), whose message is the only thing that lets it take over an open app.
//
// Which version answers (#401): the install asks for its files from the deployment it was built in, and a page load
// asks the newest one, whatever Vercel's version cookie says. Navigation preload is turned off: the page is asked
// for here, and the browser's own request would only ask a second time.
import { version } from '$app/env';
import { immutable } from '$app/manifest';
import { self } from '$app/service-worker';
import { DEPLOYMENT_ID } from '#lib/update/update.constants.js';
import {
	answer,
	fill,
	isTakeOver,
	toFiles,
	toKept,
	toNewestPage,
	toOld,
	toOwnFiles,
	toStoreName
} from './service-worker.utils';

const STORE = toStoreName(version);
const KEPT = toKept(immutable);
// Turned on by the versions before #401; not in every browser.
const PRELOAD = self.registration.navigationPreload as NavigationPreloadManager | undefined;

async function install() {
	const cache = await caches.open(STORE);
	await fill(
		{
			get: (path) => fetch(path, toOwnFiles(DEPLOYMENT_ID)),
			put: (path, response) => cache.put(path, response)
		},
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
	event.waitUntil(Promise.all([removeOld(), PRELOAD?.disable()]))
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
		askPage: () => fetch(toNewestPage(event.request, DEPLOYMENT_ID))
	});
	if (answered) event.respondWith(answered);
});

// The app's service worker (#201, ADR 0007): SvelteKit's own, bundled and registered in production builds only. It
// keeps this version's built files, the Needs Internet screen and the named static files on the device, so the
// app opens fast and shows its own screen with no signal. It never keeps the whole static folder (every app
// serves the same one, the Website's videos and photos included) and it never answers data. What it does with a
// request is in rule.ts. It never calls `skipWaiting()` on install: a new version waits until the app is closed.
import { version } from '$app/env';
import { immutable } from '$app/manifest';
import { self } from '$app/service-worker';
import { answer, store, toKept, toOld, toStore, toStoreName } from './rule';

const STORE = toStoreName(version);
const KEPT = toKept(immutable);

async function install() {
	const cache = await caches.open(STORE);
	await store(
		{ ask: (path) => fetch(path), put: (path, response) => cache.put(path, response) },
		toStore(immutable)
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

self.addEventListener('activate', (event) => event.waitUntil(removeOld()));

self.addEventListener('fetch', (event) => {
	const answered = answer(event.request, {
		origin: self.location.origin,
		kept: KEPT,
		read,
		ask: () => fetch(event.request)
	});
	if (answered) event.respondWith(answered);
});

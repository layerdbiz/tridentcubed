// What the service worker does with a request (#201): a kept file (a built file of this version, or one of the
// named static files) comes from the device, a page load goes to the newest version (#401) and gets the Needs
// Internet screen only when the network fails, and everything else is left alone. Also what it stores when it
// installs and where it asks for it, what it removes when a new version takes over, and the one message that lets a
// waiting version take over an open app (#202).
import { describe, expect, it } from 'vite-plus/test';
import { KEPT_STATIC, LOGO, OFFLINE_PATH } from '#lib/install/install.constants.js';
import { DEPLOYMENT_HEADER, TAKE_OVER } from '#lib/update/update.constants.js';
import {
	type AskedType,
	answer,
	fill,
	isTakeOver,
	toFiles,
	toKept,
	toNewestPage,
	toOld,
	toOwnFiles
} from './service-worker.utils';

const ORIGIN = 'https://app.tridentcubed.com';
const BUILT = '/_app/immutable/chunks/app.abc123.js';
const KEPT = toKept([{ path: BUILT.slice(1) }, { path: '_app/immutable/assets/app.def456.css' }]);
const NO_SIGNAL = new TypeError('Failed to fetch');

/** A device holding the files it should, in front of a network that answers, or fails when `isCut`. */
function device({ isCut = false, stored = [...KEPT, OFFLINE_PATH] } = {}) {
	const asked: string[] = [];
	const read: string[] = [];
	return {
		asked,
		read,
		answer(request: Partial<AskedType> & { url: string }) {
			const full = { method: 'GET', mode: 'cors' as RequestMode, ...request };
			return answer(
				{ ...full, url: new URL(full.url, ORIGIN).href },
				{
					origin: ORIGIN,
					kept: KEPT,
					read: async (path) => {
						read.push(path);
						return stored.includes(path) ? new Response(`device:${path}`) : undefined;
					},
					ask: async () => {
						asked.push(full.url);
						if (isCut) throw NO_SIGNAL;
						return new Response(`network:${full.url}`);
					},
					// The page asked of the newest version, whatever version the browser is kept on.
					askPage: async () => {
						asked.push(full.url);
						if (isCut) throw NO_SIGNAL;
						return new Response(`newest:${full.url}`);
					}
				}
			);
		}
	};
}

const MISSING = new Response('Not found', { status: 404 });

/** A store that records what was put in it, filled from a server answering as `serve` says. */
function shelve(serve: (path: string) => Response) {
	const kept: string[] = [];
	return {
		kept,
		get: async (path: string) => serve(path),
		put: async (path: string) => void kept.push(path)
	};
}

async function text(response: Promise<Response> | undefined) {
	return (await response)?.text();
}

describe('the service worker’s rule', () => {
	it('answers a built file of this version from the device, with no network', async () => {
		const phone = device({ isCut: true });

		expect(await text(phone.answer({ url: BUILT, mode: 'cors' }))).toBe(`device:${BUILT}`);
		expect(await text(phone.answer({ url: LOGO, mode: 'no-cors' }))).toBe(`device:${LOGO}`);
		expect(phone.asked).toEqual([]);
	});

	it('asks the network for a kept file the device does not hold', async () => {
		const phone = device({ stored: [OFFLINE_PATH] });

		expect(await text(phone.answer({ url: BUILT }))).toBe(`network:${BUILT}`);
	});

	it('leaves alone a built file of another version, and every other static file', () => {
		const phone = device();

		expect(phone.answer({ url: '/_app/immutable/chunks/app.old999.js' })).toBeUndefined();
		expect(phone.answer({ url: '/videos/hero.mp4', mode: 'no-cors' })).toBeUndefined();
		expect(phone.answer({ url: '/photos/rig.jpg', mode: 'no-cors' })).toBeUndefined();
		expect(phone.answer({ url: '/_app/version.json' })).toBeUndefined();
		expect(phone.read).toEqual([]);
		expect(phone.asked).toEqual([]);
	});

	it('asks the newest version for a page and answers with what it gave', async () => {
		const phone = device();

		expect(await text(phone.answer({ url: '/?screen=workspace', mode: 'navigate' }))).toBe(
			'newest:/?screen=workspace'
		);
		expect(await text(phone.answer({ url: '/login', mode: 'navigate' }))).toBe('newest:/login');
		expect(phone.read).toEqual([]);
	});

	it('answers a page request with the Needs Internet screen only when the network fails', async () => {
		const phone = device({ isCut: true });

		expect(await text(phone.answer({ url: '/?screen=workspace', mode: 'navigate' }))).toBe(
			`device:${OFFLINE_PATH}`
		);
		expect(await text(phone.answer({ url: '/login?next=%2F', mode: 'navigate' }))).toBe(
			`device:${OFFLINE_PATH}`
		);
		expect(phone.asked).toEqual(['/?screen=workspace', '/login?next=%2F']);
	});

	it('passes a server’s own failure on as it came: only a lost network shows the screen', async () => {
		const failed = answer(
			{ method: 'GET', mode: 'navigate', url: `${ORIGIN}/` },
			{
				origin: ORIGIN,
				kept: KEPT,
				read: async () => new Response('screen'),
				ask: async () => new Response('down', { status: 503 }),
				askPage: async () => new Response('down', { status: 503 })
			}
		);

		expect((await failed)?.status).toBe(503);
	});

	it('fails as the network did when the device has no screen to show', async () => {
		const phone = device({ isCut: true, stored: [] });

		await expect(phone.answer({ url: '/', mode: 'navigate' })).rejects.toBe(NO_SIGNAL);
	});

	it('never answers a remote function, a server route or a file address, even opened as a page', () => {
		const phone = device({ isCut: true });

		for (const mode of ['cors', 'same-origin', 'navigate'] as const) {
			expect(phone.answer({ url: '/_app/remote/abc123/fetchLists', mode })).toBeUndefined();
			expect(phone.answer({ url: '/api/places?q=Houston', mode })).toBeUndefined();
			expect(phone.answer({ url: '/api/export/pdf', mode })).toBeUndefined();
			expect(phone.answer({ url: '/api/auth/callback/google?code=1', mode })).toBeUndefined();
			expect(phone.answer({ url: '/files/5f0c1d6e', mode })).toBeUndefined();
			expect(phone.answer({ url: '/local-files/a/b.jpg?sig=1', mode })).toBeUndefined();
			expect(phone.answer({ url: '/start/photos/rig.jpg', mode })).toBeUndefined();
			expect(phone.answer({ url: '/manifest.webmanifest', mode })).toBeUndefined();
		}
		expect(phone.read).toEqual([]);
		expect(phone.asked).toEqual([]);
	});

	it('leaves every request that is not a page load alone', () => {
		const phone = device();

		for (const mode of ['cors', 'same-origin', 'no-cors'] as const) {
			expect(phone.answer({ url: '/_app/remote/abc123/fetchLists', mode })).toBeUndefined();
			expect(phone.answer({ url: '/api/places?q=Houston', mode })).toBeUndefined();
			expect(phone.answer({ url: '/_app/version.json', mode })).toBeUndefined();
		}
		expect(phone.answer({ url: '/login', method: 'POST', mode: 'navigate' })).toBeUndefined();
	});

	it('never answers a request that is not a plain read', () => {
		const phone = device({ isCut: true });

		for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
			expect(phone.answer({ url: '/', method, mode: 'navigate' })).toBeUndefined();
			expect(phone.answer({ url: '/login', method, mode: 'navigate' })).toBeUndefined();
			expect(phone.answer({ url: BUILT, method })).toBeUndefined();
			expect(phone.answer({ url: '/_app/remote/abc123/saveRows', method })).toBeUndefined();
		}
		expect(phone.read).toEqual([]);
		expect(phone.asked).toEqual([]);
	});

	it('never answers a request to another site', () => {
		const phone = device({ isCut: true });

		expect(phone.answer({ url: 'https://tridentcubed.com/', mode: 'navigate' })).toBeUndefined();
		expect(phone.answer({ url: `https://cdn.example.com${BUILT}` })).toBeUndefined();
		expect(phone.asked).toEqual([]);
	});
});

// Vercel keeps a browser on the deployment it started with, by a cookie. A browser kept on an older one asked it for
// the new version's files and got "not found", so the new version never installed and Reload brought the old app
// back (#401). A request naming its deployment reaches that one, whatever the cookie says; named empty, the newest.
describe('which version the service worker asks', () => {
	it('asks for its own files from the deployment it was built in', () => {
		const request = new Request(`${ORIGIN}${BUILT}`, toOwnFiles('dpl_new'));

		expect(request.headers.get(DEPLOYMENT_HEADER)).toBe('dpl_new');
	});

	it('asks for its own files plainly off Vercel', () => {
		expect(new Request(`${ORIGIN}${BUILT}`, toOwnFiles('')).headers.has(DEPLOYMENT_HEADER)).toBe(
			false
		);
	});

	it('asks the newest version for a page, never the browser’s cache, keeping the rest of the request', () => {
		const page = new Request(`${ORIGIN}/projects?screen=workspace`, {
			headers: { accept: 'text/html' },
			redirect: 'manual'
		});
		const sent = toNewestPage(page, 'dpl_new');

		expect(sent.url).toBe(page.url);
		expect(sent.headers.get(DEPLOYMENT_HEADER)).toBe('');
		expect(sent.headers.get('accept')).toBe('text/html');
		expect(sent.cache).toBe('no-store');
		expect(sent.redirect).toBe('manual');
	});

	it('only skips the browser’s cache for a page off Vercel', () => {
		const sent = toNewestPage(new Request(`${ORIGIN}/`), '');

		expect(sent.headers.has(DEPLOYMENT_HEADER)).toBe(false);
		expect(sent.cache).toBe('no-store');
	});
});

describe('what the service worker stores', () => {
	it('is this version’s built files, the Needs Internet screen and the named static files only', () => {
		const built = [{ path: BUILT.slice(1) }, { path: '_app/immutable/assets/app.def456.css' }];

		expect(toFiles(built)).toEqual({
			needed: [BUILT, '/_app/immutable/assets/app.def456.css', OFFLINE_PATH],
			wanted: KEPT_STATIC
		});
		expect([...toKept(built)].sort()).toEqual(
			[BUILT, '/_app/immutable/assets/app.def456.css', ...KEPT_STATIC].sort()
		);
		expect(toKept(built).has(OFFLINE_PATH)).toBe(false);
	});

	it('installs when a named static file is missing, keeping the rest', async () => {
		const shelf = shelve((path) => (path === KEPT_STATIC[0] ? MISSING : new Response(path)));

		await fill(shelf, toFiles([{ path: BUILT.slice(1) }]));

		expect(shelf.kept.sort()).toEqual([BUILT, OFFLINE_PATH, ...KEPT_STATIC.slice(1)].sort());
	});

	it('never keeps the page a missing file’s address was sent on to', async () => {
		// A server may send an address it has no file for on to its login page.
		const login = Object.defineProperty(new Response('<h1>Sign In</h1>'), 'redirected', {
			value: true
		});
		const shelf = shelve((path) => (path === KEPT_STATIC[0] ? login : new Response(path)));

		await fill(shelf, toFiles([]));

		expect(shelf.kept.sort()).toEqual([OFFLINE_PATH, ...KEPT_STATIC.slice(1)].sort());
	});

	it('installs when a named static file cannot be asked for at all', async () => {
		const shelf = shelve((path) => {
			if (path === KEPT_STATIC[0]) throw NO_SIGNAL;
			return new Response(path);
		});

		await fill(shelf, toFiles([]));

		expect(shelf.kept).not.toContain(KEPT_STATIC[0]);
		expect(shelf.kept).toContain(OFFLINE_PATH);
	});

	it('does not install when a built file or the Needs Internet screen cannot be stored', async () => {
		const built = [{ path: BUILT.slice(1) }];
		const noFile = shelve((path) => (path === BUILT ? MISSING : new Response(path)));
		const noScreen = shelve((path) => (path === OFFLINE_PATH ? MISSING : new Response(path)));

		await expect(fill(noFile, toFiles(built))).rejects.toThrow(BUILT);
		await expect(fill(noScreen, toFiles(built))).rejects.toThrow(OFFLINE_PATH);
	});
});

describe('old versions’ stored files', () => {
	it('are the app’s other stores, never the current one or a store that is not the app’s', () => {
		const names = ['trident-files-1', 'trident-files-2', 'trident-files-3', 'someone-elses'];

		expect(toOld(names, '3')).toEqual(['trident-files-1', 'trident-files-2']);
		expect(toOld(['trident-files-3'], '3')).toEqual([]);
	});
});

describe('a waiting version', () => {
	it('takes over an open app on the update note’s message', () => {
		expect(isTakeOver(TAKE_OVER)).toBe(true);
	});

	it.each([undefined, null, '', 'skip-waiting', { type: TAKE_OVER }, [TAKE_OVER], 1, true])(
		'keeps waiting on any other message: %j',
		(message) => {
			expect(isTakeOver(message)).toBe(false);
		}
	);
});

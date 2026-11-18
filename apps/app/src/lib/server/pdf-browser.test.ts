// The export browser opens the report's files as the member who asked (#190): it sends their session to this site
// and to nowhere else, not to the storage host a file address sends it on to, nor to a font host. It stays signed in
// whatever cookies the site sets on the way (#220): a real browser against a small site that sets one, as the app
// does.
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { toPrintDocument } from './export';
import { findLocalBrowser, printPdf, sessionFor, toCookies } from './pdf-browser';

const SITE = 'https://dev.app.tridentcubed.com';
const SESSION = { authorization: 'Bearer abc', 'x-vercel-protection-bypass': 'key' };

describe('the session the export browser sends', () => {
	it('goes with every request to this site', () => {
		expect(sessionFor(`${SITE}/files/0b6f2f8e-2b1c-4c47-9d8e-1f4c6f0a1b2c`, SITE, SESSION)).toEqual(
			SESSION
		);
		expect(sessionFor(`${SITE}/_app/immutable/assets/app.css`, SITE, SESSION)).toEqual(SESSION);
		expect(sessionFor(`${SITE}/api/export/pdf`, SITE, SESSION)).toEqual(SESSION);
	});

	it('never goes to another host, port or scheme', () => {
		for (const address of [
			'https://abc.supabase.co/storage/v1/object/sign/files/a/b.webp?token=t',
			'https://fonts.gstatic.com/s/inter.woff2',
			'https://dev.app.tridentcubed.com.evil.example/files/x',
			'https://evil.example/?https://dev.app.tridentcubed.com',
			'http://dev.app.tridentcubed.com/files/x',
			'https://dev.app.tridentcubed.com:8443/files/x',
			'data:image/png;base64,AAAA',
			'not an address'
		]) {
			expect(sessionFor(address, SITE, SESSION)).toEqual({});
		}
	});
});

describe('the cookies the export browser keeps for the site', () => {
	it('are the cookies of the request, kept for this site alone', () => {
		expect(
			toCookies('__Secure-better-auth.session_token=abc.d%3D; __vdpl=dpl_1; flag=a=b', SITE)
		).toEqual([
			{ name: '__Secure-better-auth.session_token', value: 'abc.d%3D', url: SITE, secure: true },
			{ name: '__vdpl', value: 'dpl_1', url: SITE, secure: true },
			{ name: 'flag', value: 'a=b', url: SITE, secure: true }
		]);
	});

	it('are plain on a site without https, and none when there is no session', () => {
		expect(toCookies('better-auth.session_token=abc', 'http://localhost:5174')).toEqual([
			{
				name: 'better-auth.session_token',
				value: 'abc',
				url: 'http://localhost:5174',
				secure: false
			}
		]);
		expect(toCookies(undefined, SITE)).toEqual([]);
		expect(toCookies(' ; =x; lone', SITE)).toEqual([]);
	});
});

// A one-pixel PNG.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
	'base64'
);

type SeenType = { path: string; cookie: string; authorization: string; status: number };

type AnswerType = { status: number; setCookie?: string; type?: string };

// A small site: every request is noted with the session it carried. `answer` gives the status and any cookie to set.
async function createSite(answer: (request: IncomingMessage) => AnswerType) {
	const seen: SeenType[] = [];
	const server: Server = createServer((request, response) => {
		const { status, setCookie, type = 'image/png' } = answer(request);
		seen.push({
			path: request.url ?? '',
			cookie: request.headers.cookie ?? '',
			authorization: request.headers.authorization ?? '',
			status
		});
		response.statusCode = status;
		response.setHeader('content-type', type);
		response.setHeader('access-control-allow-origin', '*');
		if (setCookie) response.setHeader('set-cookie', setCookie);
		response.end(type === 'image/png' ? PNG : '<!doctype html><title>Report</title>');
	});
	await new Promise<void>((resolve) => server.listen(0, resolve));
	const { port } = server.address() as AddressInfo;
	return { seen, port, close: () => new Promise((resolve) => server.close(resolve)) };
}

const TOKEN = 'better-auth.session_token=abc';
const CACHE = 'better-auth.session_data=fresh';

// Needs a Chrome or Edge on the machine, as the export does off Vercel (CI's runner has one).
describe.skipIf(!(await findLocalBrowser()))('the export browser, printing', () => {
	let site: Awaited<ReturnType<typeof createSite>>;
	let storage: Awaited<ReturnType<typeof createSite>>;

	beforeAll(async () => {
		// Like the app: only the session token opens anything, and an answer may set the five-minute session cache.
		site = await createSite((request) => {
			if (!request.headers.cookie?.includes(TOKEN)) return { status: 401 };
			if (request.url?.startsWith('/api/export/pdf')) {
				return {
					status: 200,
					type: 'text/html',
					setCookie: `${CACHE}; Path=/; HttpOnly; SameSite=Lax`
				};
			}
			return { status: 200 };
		});
		storage = await createSite(() => ({ status: 200 }));
	});

	afterAll(async () => {
		await site?.close();
		await storage?.close();
	});

	it('stays signed in after the site sets a cookie, and takes the session to no other host', async () => {
		const origin = `http://localhost:${site.port}`;
		const pdf = await printPdf({
			html: toPrintDocument({
				pages: `<article data-page>
					<img src="/files/signature" crossorigin="anonymous" />
					<img src="/start/team/photo.webp" />
					<img src="http://127.0.0.1:${storage.port}/stored.webp" crossorigin="anonymous" />
				</article>`,
				styles: '',
				site: origin
			}),
			site: origin,
			session: { cookie: TOKEN, authorization: 'Bearer abc' }
		});

		expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
		const pictures = site.seen.filter(
			(request) => request.path === '/files/signature' || request.path === '/start/team/photo.webp'
		);
		expect(pictures.map((request) => `${request.status} ${request.path}`).toSorted()).toEqual([
			'200 /files/signature',
			'200 /start/team/photo.webp'
		]);
		expect(site.seen.filter((request) => request.status === 401)).toEqual([]);
		// The cookie the site set on the way has joined the session, not taken its place.
		for (const picture of pictures) {
			expect(picture.cookie.split('; ').toSorted()).toEqual([CACHE, TOKEN].toSorted());
			expect(picture.authorization).toBe('Bearer abc');
		}
		expect(
			storage.seen.map((request) => [request.path, request.cookie, request.authorization])
		).toEqual([['/stored.webp', '', '']]);
	});
});

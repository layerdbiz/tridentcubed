// Where a signed-out visitor is sent (#181): any app address leads to the login page, which keeps the address so
// signing in lands there; the sign-in pages and Better Auth's own routes stay open. A signed-in Guest waits for
// access (#182).
import { describe, expect, it } from 'vite-plus/test';
import { KEPT_STATIC, WORKER_PATH } from '#lib/install/install.constants.js';
import { type AccessType, toGuard, toNext } from './guard';

function guard(path: string, access: AccessType = 'signed-out') {
	return toGuard(new URL(path, 'http://localhost:5174'), access);
}

describe('the sign-in guard', () => {
	it('sends a signed-out visitor to the login page with the address they asked for', () => {
		expect(guard('/?screen=workspace&project=abc')).toEqual({
			kind: 'redirect',
			location: '/login?next=%2F%3Fscreen%3Dworkspace%26project%3Dabc'
		});
		expect(guard('/')).toEqual({ kind: 'redirect', location: '/login' });
		expect(guard('/waiting')).toEqual({ kind: 'redirect', location: '/login' });
	});

	it('keeps a report link behind sign-in: a scanned QR code opens for staff only (#216)', () => {
		const link = '/report/0b9f3c1e-6a52-4d1b-9c47-2f8e5a7d3b10/5';

		expect(guard(link)).toEqual({
			kind: 'redirect',
			location: `/login?next=${encodeURIComponent(link)}`
		});
		expect(toNext(link)).toBe(link);
		expect(guard(link, 'guest')).toEqual({ kind: 'redirect', location: '/waiting' });
		expect(guard(link, 'staff')).toBeUndefined();
	});

	it('sends the look prototype’s old address to the app, signed in or not', () => {
		const home = { kind: 'redirect', location: '/' };

		expect(guard('/prototype/look')).toEqual(home);
		expect(guard('/prototype/look?screen=workspace&project=p1', 'staff')).toEqual(home);
		expect(guard('/prototype', 'guest')).toEqual(home);
		expect(guard('/prototypes', 'staff')).toBeUndefined();
	});

	it('refuses a signed-out request to the app’s server routes instead of sending it to a page', () => {
		expect(guard('/api/places?q=Houston')).toEqual({
			kind: 'refuse',
			status: 401,
			message: 'Sign in first.'
		});
	});

	it('lets a signed-out visitor reach the login page, Better Auth and remote functions', () => {
		expect(guard('/login?next=%2F')).toBeUndefined();
		expect(guard('/api/auth/callback/google')).toBeUndefined();
		expect(guard('/_app/remote/abc/submitEmail')).toBeUndefined();
	});

	it('lets anyone reach the manifest and the Needs Internet screen, so the app installs before sign-in (#199)', () => {
		for (const access of ['signed-out', 'guest', 'staff'] as const) {
			expect(guard('/manifest.webmanifest', access)).toBeUndefined();
			expect(guard('/offline', access)).toBeUndefined();
		}
		// Only those two addresses: a lookalike is still closed.
		expect(guard('/manifest.webmanifest.map')).toMatchObject({ kind: 'redirect' });
		expect(guard('/offline-projects')).toMatchObject({ kind: 'redirect' });
	});

	it('lets anyone reach the service worker, the icons and the logo, which a browser fetches with no session (#200)', () => {
		for (const access of ['signed-out', 'guest', 'staff'] as const) {
			expect(guard(WORKER_PATH, access)).toBeUndefined();
			for (const file of KEPT_STATIC) expect(guard(file, access)).toBeUndefined();
		}
		// A file beside them is not opened with them.
		expect(guard('/install/other.png')).toMatchObject({ kind: 'redirect' });
		expect(guard('/service-worker.js.map')).toMatchObject({ kind: 'redirect' });
	});

	it('lets staff of the organization through, and off the waiting page', () => {
		expect(guard('/?screen=settings', 'staff')).toBeUndefined();
		expect(guard('/api/places?q=Houston', 'staff')).toBeUndefined();
		expect(guard('/waiting', 'staff')).toEqual({ kind: 'redirect', location: '/' });
	});

	it('keeps a Guest on Waiting for access, wherever they go', () => {
		expect(guard('/', 'guest')).toEqual({ kind: 'redirect', location: '/waiting' });
		expect(guard('/?screen=record&record=customers%3AAcme', 'guest')).toEqual({
			kind: 'redirect',
			location: '/waiting'
		});
		expect(guard('/waiting', 'guest')).toBeUndefined();
		expect(guard('/api/export/pdf', 'guest')).toEqual({
			kind: 'refuse',
			status: 403,
			message: 'You are waiting for access.'
		});
		// Signing out and remote functions (which check the User themselves) stay open.
		expect(guard('/api/auth/sign-out', 'guest')).toBeUndefined();
		expect(guard('/_app/remote/abc/signOut', 'guest')).toBeUndefined();
	});

	it('gives a file address nothing but a refusal unless staff ask (#187)', () => {
		const file = '/files/0b6f2f8e-2b1c-4c47-9d8e-1f4c6f0a1b2c';
		expect(guard(file)).toEqual({ kind: 'refuse', status: 401, message: 'Sign in first.' });
		expect(guard(file, 'guest')).toMatchObject({ kind: 'refuse', status: 403 });
		expect(guard(file, 'staff')).toBeUndefined();
	});

	it('lets anyone read What’s New’s history, which an open app asks for without its cookies (#399)', () => {
		expect(guard('/api/history.json')).toBeUndefined();
		expect(guard('/api/history.json/more')).toEqual({
			kind: 'refuse',
			status: 401,
			message: 'Sign in first.'
		});
	});

	it('leaves the local folder’s signed links to their signature, as Storage’s are (#187)', () => {
		expect(guard('/local-files/org/file.webp?op=get&expires=1&sig=x')).toBeUndefined();
	});

	it('closes Better Auth’s organization routes to everyone: memberships change only through the app', () => {
		for (const access of ['signed-out', 'guest', 'staff'] as const) {
			expect(guard('/api/auth/organization/update-member-role', access)).toEqual({
				kind: 'refuse',
				status: 404,
				message: 'Not found.'
			});
			expect(guard('/api/auth/organization/create', access)).toMatchObject({ status: 404 });
		}
	});
});

describe('where signing in lands', () => {
	it('lands on the address that was asked for', () => {
		expect(toNext('/?screen=record&record=customers%3AAcme')).toBe(
			'/?screen=record&record=customers%3AAcme'
		);
	});

	it('lands on the app when the address asked for was the old prototype’s', () => {
		expect(toNext('/prototype/look')).toBe('/');
		expect(toNext('/prototype/look?screen=workspace&tab=edit')).toBe('/');
	});

	it('lands on the app for anything that is not an address of this app', () => {
		for (const next of [
			null,
			'',
			'https://evil.example',
			'//evil.example',
			'/\\evil.example',
			'/login'
		]) {
			expect(toNext(next)).toBe('/');
		}
	});
});

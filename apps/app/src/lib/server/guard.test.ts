// Where a signed-out visitor is sent (#181): any app address leads to the login page, which keeps the address so
// signing in lands there; the sign-in pages and Better Auth's own routes stay open. A signed-in Guest waits for
// access (#182).
import { describe, expect, it } from 'vite-plus/test';
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

	it('lets a member of the organization through, and off the waiting page', () => {
		expect(guard('/?screen=settings', 'member')).toBeUndefined();
		expect(guard('/api/places?q=Houston', 'member')).toBeUndefined();
		expect(guard('/waiting', 'member')).toEqual({ kind: 'redirect', location: '/' });
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

	it('closes Better Auth’s organization routes to everyone: memberships change only through the app', () => {
		for (const access of ['signed-out', 'guest', 'member'] as const) {
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

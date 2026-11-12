// Where a signed-out visitor is sent (#181): any app address leads to the login page, which keeps the address so
// signing in lands there; the sign-in pages and Better Auth's own routes stay open.
import { describe, expect, it } from 'vite-plus/test';
import { toGuard, toNext } from './guard';

function guard(path: string, isSignedIn = false) {
	return toGuard(new URL(path, 'http://localhost:5174'), isSignedIn);
}

describe('the sign-in guard', () => {
	it('sends a signed-out visitor to the login page with the address they asked for', () => {
		expect(guard('/?screen=workspace&project=abc')).toEqual({
			kind: 'login',
			location: '/login?next=%2F%3Fscreen%3Dworkspace%26project%3Dabc'
		});
		expect(guard('/')).toEqual({ kind: 'login', location: '/login' });
	});

	it('refuses a signed-out request to the app’s server routes instead of sending it to a page', () => {
		expect(guard('/api/places?q=Houston')).toEqual({ kind: 'refuse' });
	});

	it('lets a signed-out visitor reach the login page, Better Auth and remote functions', () => {
		expect(guard('/login?next=%2F')).toBeUndefined();
		expect(guard('/api/auth/callback/google')).toBeUndefined();
		expect(guard('/_app/remote/abc/submitEmail')).toBeUndefined();
	});

	it('lets a signed-in User through', () => {
		expect(guard('/?screen=settings', true)).toBeUndefined();
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

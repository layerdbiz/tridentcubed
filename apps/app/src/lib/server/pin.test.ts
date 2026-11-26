// The version cookie on every page (#401): a page keeps the browser on the deployment that served it, and is never
// kept by the browser; anything that is not a page, and every answer off Vercel, goes out as it came.
import { describe, expect, it } from 'vite-plus/test';
import { toPinCookie, toPinnedPage } from './pin';

function page(headers: Record<string, string> = {}) {
	return new Response('<!doctype html>', {
		headers: { 'content-type': 'text/html', ...headers }
	});
}

describe('the version cookie', () => {
	it('is written as the Vercel adapter writes it', () => {
		expect(toPinCookie('dpl_new')).toBe(
			'__vdpl=dpl_new; Path=/; SameSite=Strict; Secure; HttpOnly'
		);
	});

	it('keeps the browser on the deployment that served a page, and the page out of its cache', async () => {
		const pinned = toPinnedPage(page({ 'set-cookie': 'session=1; Path=/' }), 'dpl_new');

		expect(pinned.headers.getSetCookie()).toEqual([
			'session=1; Path=/',
			'__vdpl=dpl_new; Path=/; SameSite=Strict; Secure; HttpOnly'
		]);
		expect(pinned.headers.get('cache-control')).toBe('no-store');
		expect(await pinned.text()).toBe('<!doctype html>');
	});

	it('leaves what is not a page as it came', () => {
		const data = Response.json({ ok: true });

		expect(toPinnedPage(data, 'dpl_new')).toBe(data);
		const moved = new Response(null, { status: 303, headers: { location: '/login' } });
		expect(toPinnedPage(moved, 'dpl_new')).toBe(moved);
	});

	it('leaves every answer as it came off Vercel', () => {
		const answer = page();

		expect(toPinnedPage(answer, '')).toBe(answer);
	});
});

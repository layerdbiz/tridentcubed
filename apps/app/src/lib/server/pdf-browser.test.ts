// The export browser opens the report's files as the member who asked (#190): it sends their session to this site's
// own origin and to nowhere else, not to the storage host a file address sends it on to, nor to a font host.
import { describe, expect, it } from 'vite-plus/test';
import { sessionFor } from './pdf-browser';

const SITE = 'https://dev.app.tridentcubed.com';
const SESSION = { cookie: '__Secure-better-auth.session_token=abc' };

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

// Which phone the how-to opens on (Justin, 2026-11-17): read from what the browser says it is, so the User lands
// on their own steps with no extra tap. Only the starting tab follows it; both tabs stay one tap away.
import { describe, expect, it } from 'vite-plus/test';
import { toPhone } from './install.utils';

const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1';
const IPAD =
	'Mozilla/5.0 (iPad; CPU OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Mobile/15E148 Safari/604.1';
const ANDROID =
	'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const SAMSUNG =
	'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const WINDOWS =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

describe('which phone the how-to opens on', () => {
	it('is the iPhone tab on an iPhone, in Safari or in Chrome', () => {
		expect(toPhone(IPHONE)).toBe('iphone');
		expect(toPhone(IPHONE_CHROME)).toBe('iphone');
	});

	it('is the iPhone tab on an iPad, whose steps are the same', () => {
		expect(toPhone(IPAD)).toBe('iphone');
	});

	it('is the Android tab on an Android phone, in Chrome or in Samsung’s browser', () => {
		expect(toPhone(ANDROID)).toBe('android');
		expect(toPhone(SAMSUNG)).toBe('android');
	});

	it('is not known on a computer, or when the browser says nothing', () => {
		expect(toPhone(MAC)).toBeUndefined();
		expect(toPhone(WINDOWS)).toBeUndefined();
		expect(toPhone('')).toBeUndefined();
	});
});

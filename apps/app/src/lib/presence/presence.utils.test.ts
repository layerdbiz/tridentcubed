// The device the menu's Online panel shows beside each person (#331): what the browser says about itself, plus the
// app's own hint for what it cannot say, and how long someone has been online or away, in words.
import { describe, expect, it } from 'vite-plus/test';
import { toDevice, toDeviceHint, toDeviceKind, toDuration } from './presence.utils';

// Real browser strings, as each device sends them.
const AGENTS = {
	iPhoneSafari:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
	iPhoneChrome:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
	iPhoneApp:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
	iPadOld:
		'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
	macSafari:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
	androidPhone:
		'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
	androidTablet:
		'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	samsung:
		'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
	windowsChrome:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	windowsEdge:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
	windowsFirefox:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
	chromebook:
		'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
	exportBrowser:
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36'
};

describe('the device someone is on', () => {
	it('reads a phone, its system and its browser', () => {
		expect(toDevice(AGENTS.iPhoneSafari)).toEqual({ kind: 'phone', name: 'iPhone · Safari' });
		expect(toDevice(AGENTS.iPhoneChrome)).toEqual({ kind: 'phone', name: 'iPhone · Chrome' });
		expect(toDevice(AGENTS.androidPhone)).toEqual({ kind: 'phone', name: 'Android · Chrome' });
		expect(toDevice(AGENTS.samsung)).toEqual({
			kind: 'phone',
			name: 'Android · Samsung Internet'
		});
	});

	it('reads a tablet: an Android one says no "Mobile", an old iPad names itself', () => {
		expect(toDevice(AGENTS.androidTablet)).toEqual({ kind: 'tablet', name: 'Android · Chrome' });
		expect(toDevice(AGENTS.iPadOld)).toEqual({ kind: 'tablet', name: 'iPad · Safari' });
	});

	it('reads a computer', () => {
		expect(toDevice(AGENTS.windowsChrome)).toEqual({ kind: 'computer', name: 'Windows · Chrome' });
		expect(toDevice(AGENTS.windowsEdge)).toEqual({ kind: 'computer', name: 'Windows · Edge' });
		expect(toDevice(AGENTS.windowsFirefox)).toEqual({
			kind: 'computer',
			name: 'Windows · Firefox'
		});
		expect(toDevice(AGENTS.macSafari)).toEqual({ kind: 'computer', name: 'Mac · Safari' });
		expect(toDevice(AGENTS.chromebook)).toEqual({ kind: 'computer', name: 'ChromeOS · Chrome' });
		expect(toDevice(AGENTS.linuxFirefox)).toEqual({ kind: 'computer', name: 'Linux · Firefox' });
	});

	it('takes a "Mac" with a touch screen for the iPad it is, from the app\'s own hint', () => {
		expect(toDevice(AGENTS.macSafari, 'touch')).toEqual({ kind: 'tablet', name: 'iPad · Safari' });
		expect(toDevice(AGENTS.windowsChrome, 'touch')).toEqual({
			kind: 'computer',
			name: 'Windows · Chrome'
		});
	});

	it('names the installed app in place of the browser', () => {
		expect(toDevice(AGENTS.iPhoneApp, 'app')).toEqual({
			kind: 'phone',
			name: 'iPhone · Installed app'
		});
		expect(toDevice(AGENTS.macSafari, 'touch.app')).toEqual({
			kind: 'tablet',
			name: 'iPad · Installed app'
		});
		expect(toDevice(AGENTS.windowsEdge, 'app')).toEqual({
			kind: 'computer',
			name: 'Windows · Installed app'
		});
	});

	it('says what it can and guesses nothing more', () => {
		expect(toDevice(AGENTS.iPhoneApp)).toEqual({ kind: 'phone', name: 'iPhone' });
		expect(toDevice('')).toEqual({ kind: '', name: '' });
		expect(toDevice('curl/8.5.0')).toEqual({ kind: '', name: '' });
		expect(toDevice(AGENTS.windowsChrome, 'nonsense<script>')).toEqual({
			kind: 'computer',
			name: 'Windows · Chrome'
		});
	});

	it("takes the server's own PDF browser, which carries the member's cookies, for nobody's device", () => {
		expect(toDevice(AGENTS.exportBrowser, 'touch')).toEqual({ kind: '', name: '' });
	});

	it('reads a kind back from a row only when it is one', () => {
		expect(['phone', 'tablet', 'computer', 'watch', null].map(toDeviceKind)).toEqual([
			'phone',
			'tablet',
			'computer',
			undefined,
			undefined
		]);
	});
});

describe("the app's hint about its device", () => {
	it('says whether the screen takes touch and whether it is the installed app', () => {
		expect(toDeviceHint({ touchPoints: 5, isInstalled: false })).toBe('touch');
		expect(toDeviceHint({ touchPoints: 5, isInstalled: true })).toBe('touch.app');
		expect(toDeviceHint({ touchPoints: 0, isInstalled: true })).toBe('app');
		expect(toDeviceHint({ touchPoints: 0, isInstalled: false })).toBe('');
	});

	it('does not take one stray touch point (some computers report one) for a touch screen', () => {
		expect(toDeviceHint({ touchPoints: 1, isInstalled: false })).toBe('');
	});
});

describe('how long, in words', () => {
	const MINUTE = 60_000;

	it('counts minutes for the first hour, never less than one', () => {
		expect(toDuration(0)).toBe('1 min');
		expect(toDuration(30_000)).toBe('1 min');
		expect(toDuration(25 * MINUTE + 59_000)).toBe('25 min');
		expect(toDuration(59 * MINUTE)).toBe('59 min');
	});

	it('then hours, then days', () => {
		expect(toDuration(60 * MINUTE)).toBe('1 hour');
		expect(toDuration(3 * 60 * MINUTE + 40 * MINUTE)).toBe('3 hours');
		expect(toDuration(23 * 60 * MINUTE + 59 * MINUTE)).toBe('23 hours');
		expect(toDuration(24 * 60 * MINUTE)).toBe('1 day');
		expect(toDuration(9 * 24 * 60 * MINUTE)).toBe('9 days');
	});

	it('reads a stamp from a clock a little ahead as just now', () => {
		expect(toDuration(-5 * MINUTE)).toBe('1 min');
	});
});

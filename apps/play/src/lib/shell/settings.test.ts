import { describe, expect, test } from 'vite-plus/test';
import {
	createSettings,
	fromHash,
	pickScreen,
	toFrames,
	toggle,
	toHash,
	toSettingsText
} from './settings';

const OPTIONS = [
	{ slug: 'main', label: 'Main', url: '/main.html' },
	{ slug: 'a', label: 'A', url: '/a.html' },
	{ slug: 'b', label: 'B', url: '/b.html' }
];

describe('createSettings', () => {
	test('opens on the first option on every device, in the viewer theme', () => {
		expect(createSettings(OPTIONS, 'dark')).toMatchObject({
			views: ['main'],
			screens: ['desktop', 'laptop', 'tablet', 'phone'],
			themes: ['dark']
		});
	});
});

describe('toggle', () => {
	test('adds and removes, but never leaves the list empty', () => {
		expect(toggle(['main'], 'a')).toEqual(['main', 'a']);
		expect(toggle(['main', 'a'], 'main')).toEqual(['a']);
		expect(toggle(['a'], 'a')).toEqual(['a']);
	});
});

describe('pickScreen', () => {
	test('Fill stands alone; a device replaces it; devices keep their order, largest first', () => {
		expect(pickScreen(['fill'], 'phone')).toEqual(['phone']);
		expect(pickScreen(['phone'], 'desktop')).toEqual(['desktop', 'phone']);
		expect(pickScreen(['desktop', 'phone'], 'fill')).toEqual(['fill']);
		expect(pickScreen(['desktop', 'phone'], 'phone')).toEqual(['desktop']);
	});
});

describe('the address', () => {
	test('carries every control and reads back the same', () => {
		const settings = {
			...createSettings(OPTIONS, 'light'),
			views: ['main', 'b'],
			screens: ['phone' as const, 'custom' as const],
			themes: ['light' as const, 'dark' as const],
			width: 480,
			height: 700,
			isContainerOn: true,
			container: 360
		};

		const hash = toHash(settings);
		expect(hash).toBe('v=main.b&s=phone.custom&t=light.dark&w=480x700&c=360');
		expect(fromHash(hash, createSettings(OPTIONS, 'light'), OPTIONS)).toEqual(settings);
	});

	test('reads a repeated value once', () => {
		const base = createSettings(OPTIONS, 'light');
		expect(fromHash('v=main.main&s=phone.phone&t=dark.dark', base, OPTIONS)).toMatchObject({
			views: ['main'],
			screens: ['phone'],
			themes: ['dark']
		});
	});

	test('changes only what the address names, over what was kept', () => {
		const kept = fromHash('s=phone&t=dark', createSettings(OPTIONS, 'light'), OPTIONS);
		expect(fromHash('#v=b', kept, OPTIONS)).toMatchObject({
			views: ['b'],
			screens: ['phone'],
			themes: ['dark']
		});
	});

	test('drops what it does not know and keeps the rest', () => {
		const base = createSettings(OPTIONS, 'light');

		expect(fromHash('#v=zzz.a&s=huge&t=dark', base, OPTIONS)).toMatchObject({
			views: ['a'],
			screens: ['desktop', 'laptop', 'tablet', 'phone'],
			themes: ['dark']
		});
	});
});

describe('toFrames', () => {
	test('shows every view in every theme on every device, the largest device first', () => {
		const frames = toFrames(
			{
				...createSettings(OPTIONS, 'light'),
				views: ['main', 'a'],
				screens: ['tablet', 'phone'],
				themes: ['light', 'dark']
			},
			OPTIONS
		);

		expect(frames.map((frame) => `${frame.name} ${frame.model}`)).toEqual([
			'Main · Light iPad Air 11″',
			'Main · Light iPhone 16',
			'Main · Dark iPad Air 11″',
			'Main · Dark iPhone 16',
			'A · Light iPad Air 11″',
			'A · Light iPhone 16',
			'A · Dark iPad Air 11″',
			'A · Dark iPhone 16'
		]);
		expect(frames[1]).toMatchObject({
			kind: 'phone',
			width: 393,
			height: 852,
			theme: 'light',
			url: '/main.html'
		});
	});

	test('a Custom screen takes its size from the sliders; Fill has no device and no size', () => {
		const settings = {
			...createSettings(OPTIONS, 'light'),
			screens: ['custom' as const],
			width: 500,
			height: 600
		};
		expect(toFrames(settings, OPTIONS)[0]).toMatchObject({
			kind: 'window',
			width: 500,
			height: 600
		});

		const fill = { ...createSettings(OPTIONS, 'light'), screens: ['fill' as const] };
		expect(toFrames(fill, OPTIONS)[0]).toMatchObject({ kind: null, width: null, height: null });
	});

	test('names nothing when only one view in one theme is shown', () => {
		expect(toFrames(createSettings(OPTIONS, 'light'), OPTIONS)[0].name).toBe('');
	});
});

describe('toSettingsText', () => {
	test('lists every control in words, then the link', () => {
		const text = toSettingsText(
			{ ...createSettings(OPTIONS, 'light'), views: ['main', 'b'], screens: ['phone'] },
			OPTIONS,
			'https://play.tridentcubed.com/prototype/menus'
		);

		expect(text).toBe(
			'Views: Main, B · Screens: Phone · Themes: Light · Container: Off\n' +
				'https://play.tridentcubed.com/prototype/menus#v=main.b&s=phone&t=light&w=600x800&c=0'
		);
	});
});

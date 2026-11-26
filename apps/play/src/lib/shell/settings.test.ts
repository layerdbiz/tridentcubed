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
	test('opens on the first option, filling the screen, in the viewer theme', () => {
		expect(createSettings(OPTIONS, 'dark')).toMatchObject({
			views: ['main'],
			screens: ['fill'],
			themes: ['dark'],
			layout: 'row'
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
	test('Fill stands alone; any sized screen replaces it', () => {
		expect(pickScreen(['fill'], 'phone')).toEqual(['phone']);
		expect(pickScreen(['phone'], 'desktop')).toEqual(['phone', 'desktop']);
		expect(pickScreen(['phone', 'desktop'], 'fill')).toEqual(['fill']);
	});
});

describe('the address', () => {
	test('carries every control and reads back the same', () => {
		const settings = {
			...createSettings(OPTIONS, 'light'),
			views: ['main', 'b'],
			screens: ['phone' as const, 'custom' as const],
			themes: ['light' as const, 'dark' as const],
			layout: 'column' as const,
			width: 480,
			height: 700,
			isContainerOn: true,
			container: 360
		};

		const hash = toHash(settings);
		expect(hash).toBe('v=main.b&s=phone.custom&t=light.dark&l=column&w=480x700&c=360');
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
		const kept = fromHash('s=phone&t=dark&l=column', createSettings(OPTIONS, 'light'), OPTIONS);
		expect(fromHash('#v=b', kept, OPTIONS)).toMatchObject({
			views: ['b'],
			screens: ['phone'],
			themes: ['dark'],
			layout: 'column'
		});
	});

	test('drops what it does not know and keeps the rest', () => {
		const base = createSettings(OPTIONS, 'light');

		expect(fromHash('#v=zzz.a&s=huge&t=dark', base, OPTIONS)).toMatchObject({
			views: ['a'],
			screens: ['fill'],
			themes: ['dark']
		});
	});
});

describe('toFrames', () => {
	test('shows every view on every screen in every theme', () => {
		const frames = toFrames(
			{
				...createSettings(OPTIONS, 'light'),
				views: ['main', 'a'],
				screens: ['phone'],
				themes: ['light', 'dark']
			},
			OPTIONS
		);

		expect(frames.map((frame) => frame.name)).toEqual([
			'Main · Phone · Light',
			'Main · Phone · Dark',
			'A · Phone · Light',
			'A · Phone · Dark'
		]);
		expect(frames[0]).toMatchObject({ width: 390, height: 844, theme: 'light', url: '/main.html' });
	});

	test('a Custom screen takes its size from the sliders; Fill has none', () => {
		const settings = {
			...createSettings(OPTIONS, 'light'),
			screens: ['custom' as const],
			width: 500,
			height: 600
		};
		expect(toFrames(settings, OPTIONS)[0]).toMatchObject({ width: 500, height: 600 });
		expect(toFrames(createSettings(OPTIONS, 'light'), OPTIONS)[0]).toMatchObject({
			width: null,
			height: null
		});
	});

	test('names the frame by its view alone when nothing else varies', () => {
		const frames = toFrames(createSettings(OPTIONS, 'light'), OPTIONS);
		expect(frames[0].name).toBe('Main');
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
			'Views: Main, B · Screens: Phone · Themes: Light · Layout: Side by side · Container: Off\n' +
				'https://play.tridentcubed.com/prototype/menus#v=main.b&s=phone&t=light&l=row&w=600x800&c=0'
		);
	});
});

// The controls of a shell page (#342): which options are shown, on which devices, in which themes. One plain object,
// kept in this browser per page and written into the address, so a link opens on the same view and Copy settings
// can say it in words. Every device is on until the viewer turns one off.
import type { OptionType } from './catalog';
import type { DeviceKindType } from './devices';

export type ScreenType = 'desktop' | 'laptop' | 'tablet' | 'phone' | 'custom' | 'fill';
export type ThemeType = 'light' | 'dark';

export type SettingsType = {
	/** Option slugs, in the order they were picked. */
	views: string[];
	screens: ScreenType[];
	themes: ThemeType[];
	/** The Custom screen's size, in CSS pixels. */
	width: number;
	height: number;
	/** Whether the prototype's container is held to `container` pixels wide, for container queries. */
	isContainerOn: boolean;
	container: number;
};

export type FrameType = {
	key: string;
	/** The option slug. */
	view: string;
	/** The view and theme, when more than one is shown; empty otherwise. */
	name: string;
	url: string;
	screen: ScreenType;
	theme: ThemeType;
	/** The device drawn around the screen; null when the prototype fills the page. */
	kind: DeviceKindType | null;
	model: string;
	/** The screen's real size in CSS pixels; null when it fills the page. */
	width: number | null;
	height: number | null;
};

/**
 * The devices, largest first, each at the screen size a web page sees on it: a 1080p monitor, a 13-inch MacBook Air
 * at its standard setting, an 11-inch iPad Air held upright and an iPhone 16.
 */
export const SCREENS: Record<
	ScreenType,
	{
		label: string;
		model: string;
		kind: DeviceKindType | null;
		width: number | null;
		height: number | null;
	}
> = {
	desktop: { label: 'Desktop', model: 'Monitor', kind: 'desktop', width: 1920, height: 1080 },
	laptop: { label: 'Laptop', model: 'MacBook Air 13″', kind: 'laptop', width: 1470, height: 956 },
	tablet: { label: 'Tablet', model: 'iPad Air 11″', kind: 'tablet', width: 820, height: 1180 },
	phone: { label: 'Phone', model: 'iPhone 16', kind: 'phone', width: 393, height: 852 },
	custom: { label: 'Custom', model: 'Window', kind: 'window', width: null, height: null },
	fill: { label: 'Fill', model: '', kind: null, width: null, height: null }
};

export const DEVICE_SCREENS: ScreenType[] = ['desktop', 'laptop', 'tablet', 'phone'];

export const THEMES: Record<ThemeType, string> = { light: 'Light', dark: 'Dark' };

export const SIZE_LIMITS = { least: 240, most: 2560 };
export const CONTAINER_LIMITS = { least: 120, most: 1600 };

const SCREEN_KEYS = Object.keys(SCREENS) as ScreenType[];
const THEME_KEYS = Object.keys(THEMES) as ThemeType[];

export function createSettings(options: OptionType[], theme: ThemeType): SettingsType {
	return {
		views: options.length ? [options[0].slug] : [],
		screens: [...DEVICE_SCREENS],
		themes: [theme],
		width: 600,
		height: 800,
		isContainerOn: false,
		container: 360
	};
}

/** Adds the item, or takes it away unless it is the last one left. */
export function toggle<T>(list: T[], item: T): T[] {
	if (!list.includes(item)) return [...list, item];
	return list.length > 1 ? list.filter((each) => each !== item) : list;
}

/** Fill gives the whole page to the prototype, so it never mixes with a device. Devices keep their own order. */
export function pickScreen(screens: ScreenType[], screen: ScreenType): ScreenType[] {
	if (screen === 'fill') return ['fill'];
	const picked: ScreenType[] = toggle(
		screens.filter((each) => each !== 'fill'),
		screen
	);
	return SCREEN_KEYS.filter((each) => picked.includes(each));
}

export function toHash(settings: SettingsType): string {
	return [
		`v=${settings.views.join('.')}`,
		`s=${settings.screens.join('.')}`,
		`t=${settings.themes.join('.')}`,
		`w=${settings.width}x${settings.height}`,
		`c=${settings.isContainerOn ? settings.container : 0}`
	].join('&');
}

/** Reads an address back over `base`; anything unknown is dropped and that control keeps its base value. */
export function fromHash(hash: string, base: SettingsType, options: OptionType[]): SettingsType {
	const params = new URLSearchParams(hash.replace(/^#/, ''));
	const settings = { ...base };

	const views = pickKnown(
		params.get('v'),
		options.map((option) => option.slug)
	);
	if (views.length) settings.views = views;

	const screens = pickKnown(params.get('s'), SCREEN_KEYS);
	if (screens.length) {
		settings.screens = screens.includes('fill')
			? ['fill']
			: SCREEN_KEYS.filter((each) => screens.includes(each));
	}

	const themes = pickKnown(params.get('t'), THEME_KEYS);
	if (themes.length) settings.themes = themes;

	const size = /^(\d+)x(\d+)$/.exec(params.get('w') ?? '');
	if (size) {
		settings.width = toSize(Number(size[1]));
		settings.height = toSize(Number(size[2]));
	}

	const container = params.get('c');
	if (container !== null && /^\d+$/.test(container)) {
		settings.isContainerOn = Number(container) > 0;
		if (settings.isContainerOn) settings.container = toSize(Number(container), CONTAINER_LIMITS);
	}

	return settings;
}

/** One frame per view, theme and screen, grouped by view and then theme, the largest screen first. */
export function toFrames(settings: SettingsType, options: OptionType[]): FrameType[] {
	const frames: FrameType[] = [];
	const views = settings.views
		.map((slug) => options.find((option) => option.slug === slug))
		.filter((option) => option !== undefined);

	for (const view of views) {
		for (const theme of settings.themes) {
			for (const screen of settings.screens) {
				const device = SCREENS[screen];
				const isCustom = screen === 'custom';
				const words: string[] = [];
				if (views.length > 1) words.push(view.label);
				if (settings.themes.length > 1) words.push(THEMES[theme]);

				frames.push({
					key: `${view.slug}-${theme}-${screen}`,
					view: view.slug,
					name: words.join(' · '),
					url: view.url,
					screen,
					theme,
					kind: device.kind,
					model: device.model,
					width: isCustom ? settings.width : device.width,
					height: isCustom ? settings.height : device.height
				});
			}
		}
	}

	return frames;
}

/** Every control in words, for Copy settings, then the link that opens on the same view. */
export function toSettingsText(
	settings: SettingsType,
	options: OptionType[],
	link: string
): string {
	const views = settings.views.map(
		(slug) => options.find((option) => option.slug === slug)?.label ?? slug
	);
	const screens = settings.screens.map((screen) =>
		screen === 'custom' ? `Custom ${settings.width} × ${settings.height}` : SCREENS[screen].label
	);
	const words = [
		`Views: ${views.join(', ')}`,
		`Screens: ${screens.join(', ')}`,
		`Themes: ${settings.themes.map((theme) => THEMES[theme]).join(', ')}`,
		`Container: ${settings.isContainerOn ? `${settings.container} px` : 'Off'}`
	];
	return `${words.join(' · ')}\n${link}#${toHash(settings)}`;
}

function pickKnown<T extends string>(value: string | null, known: readonly T[]): T[] {
	if (!value) return [];
	const picked = value
		.split('.')
		.filter((each): each is T => (known as readonly string[]).includes(each));
	return [...new Set(picked)];
}

function toSize(value: number, limits = SIZE_LIMITS): number {
	return Math.min(limits.most, Math.max(limits.least, Math.round(value)));
}

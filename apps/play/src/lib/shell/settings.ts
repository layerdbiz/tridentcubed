// The controls of a shell page (#342): which options are shown, on which screens, in which themes, and how the
// frames lie. One plain object, kept in this browser per page and written into the address, so a link opens on the
// same view and Copy settings can say it in words.
import type { OptionType } from './catalog';

export type ScreenType = 'fill' | 'phone' | 'tablet' | 'laptop' | 'desktop' | 'custom';
export type ThemeType = 'light' | 'dark';
export type LayoutType = 'row' | 'column';

export type SettingsType = {
	/** Option slugs, in the order they were picked. */
	views: string[];
	screens: ScreenType[];
	themes: ThemeType[];
	layout: LayoutType;
	/** The Custom screen's size, in CSS pixels. */
	width: number;
	height: number;
	/** Whether the prototype's container is held to `container` pixels wide, for container queries. */
	isContainerOn: boolean;
	container: number;
};

export type FrameType = {
	key: string;
	/** The option slug: frames of one view lie together. */
	view: string;
	name: string;
	url: string;
	screen: ScreenType;
	theme: ThemeType;
	/** Null when the frame fills its share of the page. */
	width: number | null;
	height: number | null;
};

/** The screens a frame can take: the phone and tablet are an iPhone 15 and an iPad Air held upright. */
export const SCREENS: Record<
	ScreenType,
	{ label: string; width: number | null; height: number | null }
> = {
	fill: { label: 'Fill', width: null, height: null },
	phone: { label: 'Phone', width: 390, height: 844 },
	tablet: { label: 'Tablet', width: 820, height: 1180 },
	laptop: { label: 'Laptop', width: 1280, height: 800 },
	desktop: { label: 'Desktop', width: 1440, height: 900 },
	custom: { label: 'Custom', width: null, height: null }
};

export const THEMES: Record<ThemeType, string> = { light: 'Light', dark: 'Dark' };
export const LAYOUTS: Record<LayoutType, string> = { row: 'Side by side', column: 'Stacked' };

export const SIZE_LIMITS = { least: 240, most: 2560 };
export const CONTAINER_LIMITS = { least: 120, most: 1600 };

const SCREEN_KEYS = Object.keys(SCREENS) as ScreenType[];
const THEME_KEYS = Object.keys(THEMES) as ThemeType[];

export function createSettings(options: OptionType[], theme: ThemeType): SettingsType {
	return {
		views: options.length ? [options[0].slug] : [],
		screens: ['fill'],
		themes: [theme],
		layout: 'row',
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

/** Fill shares the page out between frames, so it never mixes with a sized screen. */
export function pickScreen(screens: ScreenType[], screen: ScreenType): ScreenType[] {
	if (screen === 'fill') return ['fill'];
	return toggle(
		screens.filter((each) => each !== 'fill'),
		screen
	);
}

export function toHash(settings: SettingsType): string {
	return [
		`v=${settings.views.join('.')}`,
		`s=${settings.screens.join('.')}`,
		`t=${settings.themes.join('.')}`,
		`l=${settings.layout}`,
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
	if (screens.length) settings.screens = screens.includes('fill') ? ['fill'] : screens;

	const themes = pickKnown(params.get('t'), THEME_KEYS);
	if (themes.length) settings.themes = themes;

	const layout = params.get('l');
	if (layout === 'row' || layout === 'column') settings.layout = layout;

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

/** One frame per view, screen and theme. A frame's name says only what differs between the frames. */
export function toFrames(settings: SettingsType, options: OptionType[]): FrameType[] {
	const frames: FrameType[] = [];
	const views = settings.views
		.map((slug) => options.find((option) => option.slug === slug))
		.filter((option) => option !== undefined);

	for (const view of views) {
		for (const screen of settings.screens) {
			for (const theme of settings.themes) {
				const isCustom = screen === 'custom';
				const words = [view.label];
				if (settings.screens.length > 1 || screen !== 'fill') words.push(SCREENS[screen].label);
				if (settings.themes.length > 1) words.push(THEMES[theme]);

				frames.push({
					key: `${view.slug}-${screen}-${theme}`,
					view: view.slug,
					name: words.join(' · '),
					url: view.url,
					screen,
					theme,
					width: isCustom ? settings.width : SCREENS[screen].width,
					height: isCustom ? settings.height : SCREENS[screen].height
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
		`Layout: ${LAYOUTS[settings.layout]}`,
		`Container: ${settings.isContainerOn ? `${settings.container} px` : 'Off'}`
	];
	return `${words.join(' · ')}\n${link}#${toHash(settings)}`;
}

function pickKnown<T extends string>(value: string | null, known: readonly T[]): T[] {
	if (!value) return [];
	return value.split('.').filter((each): each is T => (known as readonly string[]).includes(each));
}

function toSize(value: number, limits = SIZE_LIMITS): number {
	return Math.min(limits.most, Math.max(limits.least, Math.round(value)));
}

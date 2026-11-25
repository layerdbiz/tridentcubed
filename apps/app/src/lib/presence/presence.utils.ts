// The device beside each person in the menu's Online panel (#331), and how long someone has been online or away.
//
// The server reads the device from the request each time it stamps someone as seen (`stampSeen`): what the browser
// says about itself, plus the app's own hint for the two things a browser does not say (`toDeviceHint`, a cookie the
// app sets as it starts). Only the kind and a short name are kept, never the browser's own words. What it cannot
// tell it leaves out: an Android tablet that says "Mobile" reads as a phone.

export const DEVICE_KINDS = ['phone', 'tablet', 'computer'] as const;

export type DeviceKindType = (typeof DEVICE_KINDS)[number];

export type DeviceType = {
	// Empty when the browser says nothing the app knows.
	kind: DeviceKindType | '';
	// The system, then the browser or the installed app: "iPhone · Safari", "Windows · Installed app".
	name: string;
};

// The first that matches names the system. iPhone and iPad come before Mac, since their browsers say "like Mac OS X".
const SYSTEMS: [RegExp, string][] = [
	[/iPhone|iPod/, 'iPhone'],
	[/iPad/, 'iPad'],
	[/Android/, 'Android'],
	[/CrOS/, 'ChromeOS'],
	[/Windows/, 'Windows'],
	[/Macintosh|Mac OS X/, 'Mac'],
	[/Linux/, 'Linux']
];

// The first that matches names the browser. Most say "Chrome" and "Safari" as well as their own name, so the others
// come first; on an iPhone each says its own (CriOS, FxiOS, EdgiOS).
const BROWSERS: [RegExp, string][] = [
	[/Edg(?:e|A|iOS)?\//, 'Edge'],
	[/SamsungBrowser\//, 'Samsung Internet'],
	[/OPR\/|OPiOS\//, 'Opera'],
	[/Firefox\/|FxiOS\//, 'Firefox'],
	[/Chrome\/|CriOS\//, 'Chrome'],
	[/Safari\//, 'Safari']
];

// What the name says in place of a browser for the installed app.
const INSTALLED_APP = 'Installed app';

/**
 * The device a request came from, by its browser's words (`user-agent`) and the app's hint (`toDeviceHint`). The
 * server's own browser, which prints PDFs as the member who asked (#240), is nobody's device.
 */
export function toDevice(userAgent: string, hint = ''): DeviceType {
	if (/Headless/.test(userAgent)) return { kind: '', name: '' };
	const flags = new Set(hint.split('.'));
	let system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? '';
	// An iPad says it is a Mac; only a Mac with a touch screen is one.
	if (system === 'Mac' && flags.has('touch')) system = 'iPad';
	if (!system) return { kind: '', name: '' };
	const browser = flags.has('app')
		? INSTALLED_APP
		: (BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? '');
	return { kind: toKind(system, userAgent), name: [system, browser].filter(Boolean).join(' · ') };
}

// The icons beside a name in the Online panel (#337; Justin, 2026-11-25: "an iPhone on iOS or an Android using
// Chrome [...] or Windows using Edge"), read from the kind and the name the server stamped. The kind is grey, the
// system and the browser are their own logos. Whole class names, so Tailwind finds them.
const KIND_ICONS: Record<DeviceKindType, string> = {
	phone: 'icon-[mdi--cellphone]',
	tablet: 'icon-[mdi--tablet]',
	computer: 'icon-[mdi--laptop]'
};

const SYSTEM_ICONS: Record<string, string> = {
	iPhone: 'icon-[logos--apple]',
	iPad: 'icon-[logos--apple]',
	Mac: 'icon-[logos--apple]',
	Android: 'icon-[logos--android-icon]',
	Windows: 'icon-[logos--microsoft-windows-icon]',
	ChromeOS: 'icon-[logos--chrome]',
	Linux: 'icon-[logos--linux-tux]'
};

const BROWSER_ICONS: Record<string, string> = {
	Safari: 'icon-[logos--safari]',
	Chrome: 'icon-[logos--chrome]',
	Edge: 'icon-[logos--microsoft-edge]',
	Firefox: 'icon-[logos--firefox]',
	Opera: 'icon-[logos--opera]',
	'Samsung Internet': 'icon-[mdi--web]'
};

export type DeviceIconsType = {
	kind: string;
	system: string;
	browser: string;
	// The installed app, which the panel shows by the app's own icon in place of a browser.
	isApp: boolean;
};

/** The icons for a stamped device; a part the app has no icon for is empty, and its words stay as the label. */
export function toDeviceIcons(kind: DeviceKindType | undefined, name: string): DeviceIconsType {
	const [system = '', browser = ''] = name.split(' · ');
	return {
		kind: kind ? KIND_ICONS[kind] : '',
		system: SYSTEM_ICONS[system] ?? '',
		browser: BROWSER_ICONS[browser] ?? '',
		isApp: browser === INSTALLED_APP
	};
}

/** A device kind read back from a row, or nothing for a value that is not one. */
export function toDeviceKind(value: unknown): DeviceKindType | undefined {
	return DEVICE_KINDS.find((kind) => kind === value);
}

function toKind(system: string, userAgent: string): DeviceKindType {
	if (system === 'iPhone') return 'phone';
	if (system === 'iPad') return 'tablet';
	if (system === 'Android') return /Mobile/.test(userAgent) ? 'phone' : 'tablet';
	return 'computer';
}

/**
 * The app's hint about its own device, for the cookie the server reads beside the browser's words: `touch` for a
 * screen that takes more than one finger (an iPad, which calls itself a Mac), `app` in the installed app's window.
 */
export function toDeviceHint({
	touchPoints,
	isInstalled
}: {
	touchPoints: number;
	isInstalled: boolean;
}) {
	return [touchPoints > 1 ? 'touch' : '', isInstalled ? 'app' : ''].filter(Boolean).join('.');
}

/** How long, in words: minutes for the first hour (never under one), then hours, then days. */
export function toDuration(milliseconds: number) {
	const minutes = Math.max(1, Math.floor(milliseconds / 60_000));
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return hours === 1 ? '1 hour' : `${hours} hours`;
	const days = Math.floor(hours / 24);
	return days === 1 ? '1 day' : `${days} days`;
}

// The devices a prototype is shown on (#342), drawn at their real sizes in CSS pixels. Each has a body (bezel and
// buttons, a lid and base, a panel on a stand), a screen of the size the device reports, and on that screen the bar
// the device keeps for itself (a phone's status bar, a browser's address bar), so the page gets the room a real page
// gets there. The sizes are worked out here so the packer can lay the devices out before any is drawn.

export type DeviceKindType = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'window';

/** A box inside its parent, in CSS pixels. */
export type BoxType = { x: number; y: number; width: number; height: number };

export type BodyType = {
	kind: DeviceKindType;
	/** The whole device, buttons and stand included. */
	width: number;
	height: number;
	/** The glass inside the body, which holds the bar and the page. */
	screen: BoxType & { radius: number };
	/** The bar the device draws at the top of its screen: a status bar or a browser's. */
	bar: { kind: 'status' | 'tablet' | 'browser' | 'notch'; height: number };
	/** The prototype itself, inside the screen. */
	page: BoxType;
};

/**
 * The parts of each body, from the real thing: an iPhone 16's 19 px of frame and glass round its screen, an iPad
 * Air's wider bezel, a MacBook Air's lid and the black band round its notch, a monitor's thin bezel and chin.
 */
export const PHONE = { bezel: 19, button: 3, radius: 66, screenRadius: 47, bar: 59 };
export const TABLET = { bezel: 40, button: 3, radius: 58, screenRadius: 18, bar: 24 };
export const LAPTOP = { side: 26, top: 26, bottom: 36, radius: 22, screenRadius: 12, notch: 37 };
export const MONITOR = { side: 14, top: 14, bottom: 34, radius: 10 };
export const WINDOW = { border: 1, radius: 12 };
/** A browser's tab and address bar. */
export const BROWSER_BAR = 40;

/**
 * The body round a `width` × `height` screen. A window is the one exception: its size is the page's (the Custom
 * screen sets what the prototype gets), and its address bar sits above.
 */
export function toBody(kind: DeviceKindType, width: number, height: number): BodyType {
	if (kind === 'phone') {
		const side = PHONE.bezel + PHONE.button;
		return {
			kind,
			width: width + 2 * side,
			height: height + 2 * PHONE.bezel,
			screen: { x: side, y: PHONE.bezel, width, height, radius: PHONE.screenRadius },
			bar: { kind: 'status', height: PHONE.bar },
			page: { x: 0, y: PHONE.bar, width, height: height - PHONE.bar }
		};
	}

	if (kind === 'tablet') {
		return {
			kind,
			width: width + 2 * TABLET.bezel + TABLET.button,
			height: height + 2 * TABLET.bezel + TABLET.button,
			screen: {
				x: TABLET.bezel,
				y: TABLET.bezel + TABLET.button,
				width,
				height,
				radius: TABLET.screenRadius
			},
			bar: { kind: 'tablet', height: TABLET.bar },
			page: { x: 0, y: TABLET.bar, width, height: height - TABLET.bar }
		};
	}

	if (kind === 'laptop') {
		const lid = toLid(width, height);
		const base = toLaptopBase(lid.width);
		const top = LAPTOP.notch + BROWSER_BAR;
		return {
			kind,
			width: base.width,
			height: lid.height + base.height,
			screen: {
				x: (base.width - lid.width) / 2 + LAPTOP.side,
				y: LAPTOP.top,
				width,
				height,
				radius: LAPTOP.screenRadius
			},
			bar: { kind: 'notch', height: top },
			page: { x: 0, y: top, width, height: height - top }
		};
	}

	if (kind === 'desktop') {
		const panel = toPanel(width, height);
		const stand = toStand(panel);
		return {
			kind,
			width: panel.width,
			height: panel.height + stand.neck + stand.foot,
			screen: { x: MONITOR.side, y: MONITOR.top, width, height, radius: 0 },
			bar: { kind: 'browser', height: BROWSER_BAR },
			page: { x: 0, y: BROWSER_BAR, width, height: height - BROWSER_BAR }
		};
	}

	const screen = { width, height: height + BROWSER_BAR };
	return {
		kind,
		width: screen.width + 2 * WINDOW.border,
		height: screen.height + 2 * WINDOW.border,
		screen: {
			x: WINDOW.border,
			y: WINDOW.border,
			...screen,
			radius: WINDOW.radius - WINDOW.border
		},
		bar: { kind: 'browser', height: BROWSER_BAR },
		page: { x: 0, y: BROWSER_BAR, width, height }
	};
}

export function toLid(width: number, height: number) {
	return { width: width + 2 * LAPTOP.side, height: height + LAPTOP.top + LAPTOP.bottom };
}

/** The laptop's base seen from the front: wider than the lid, thin, with the scoop that opens it. */
export function toLaptopBase(lidWidth: number) {
	return {
		width: Math.round(lidWidth * 1.12),
		height: Math.round(lidWidth * 0.016),
		scoop: Math.round(lidWidth * 0.11)
	};
}

export function toPanel(width: number, height: number) {
	return { width: width + 2 * MONITOR.side, height: height + MONITOR.top + MONITOR.bottom };
}

/** A monitor's stand: a neck behind the panel and a foot on the desk, sized from the panel. */
export function toStand(panel: { width: number; height: number }) {
	return {
		neck: Math.round(panel.height * 0.15),
		neckWidth: Math.round(panel.width * 0.11),
		foot: Math.round(panel.height * 0.022),
		footWidth: Math.round(panel.width * 0.34)
	};
}

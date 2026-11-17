// The addresses and files of the installable app (#199), named once so the manifest, the page head, the service
// worker and the sign-in guard's tests agree. The icons are shared static files (packages/ui/static/install).

/** The manifest's address, answered by the app itself (routes/manifest.webmanifest). */
export const MANIFEST_PATH = '/manifest.webmanifest';

/** The Needs Internet screen's address (routes/offline), kept on the device by the service worker. */
export const OFFLINE_PATH = '/offline';

/** The service worker's address, where SvelteKit builds src/service-worker to. */
export const WORKER_PATH = '/service-worker.js';

/** The black behind the logo: the icons' background and the manifest's two colors. */
export const BLACK = '#000000';

export const ICON_192 = '/install/icon-192.png';
export const ICON_512 = '/install/icon-512.png';
export const ICON_MASKABLE_192 = '/install/maskable-192.png';
export const ICON_MASKABLE_512 = '/install/maskable-512.png';
/** The 180 pixel icon Safari prefers, linked from the page head. */
export const ICON_APPLE = '/install/apple-touch-icon.png';

/** The dark-background logo, shown on the login page and on the Needs Internet screen. */
export const LOGO = '/branding/logo-dark.svg';

/**
 * The only static files the service worker keeps on the device. Never the whole shared static folder: it carries
 * the Website's videos and photos.
 */
export const KEPT_STATIC = [
	ICON_192,
	ICON_512,
	ICON_MASKABLE_192,
	ICON_MASKABLE_512,
	ICON_APPLE,
	LOGO,
	'/favicon.svg'
];

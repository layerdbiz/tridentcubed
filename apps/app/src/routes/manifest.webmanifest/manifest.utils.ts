// The app's manifest (#200): what a phone reads to put the app on its home screen and open it full screen. It is
// built from the address it was asked on, so the copy at any address but the real one names itself the test copy,
// with no setting to change at go-live (spec #199, "The test copy").
import {
	ICON_192,
	ICON_512,
	ICON_MASKABLE_192,
	ICON_MASKABLE_512
} from '#lib/install/install.constants.js';

/** The one address of the real app (ADR 0007). Every other address is a test copy. */
const REAL_HOST = 'app.tridentcubed.com';
const BLACK = '#000000';

export type ManifestIconType = {
	src: string;
	sizes: string;
	type: 'image/png';
	purpose: 'any' | 'maskable';
};

export type ManifestType = {
	id: string;
	name: string;
	short_name: string;
	start_url: string;
	scope: string;
	display: 'standalone';
	theme_color: string;
	background_color: string;
	icons: ManifestIconType[];
};

/**
 * The manifest for the address it was asked on. No `orientation`: naming one, even "any", has Android turn the app
 * against the phone's own rotation lock, and leaving it out lets the app turn as the phone is set to.
 */
export function toManifest(url: URL): ManifestType {
	const isReal = url.hostname === REAL_HOST;
	return {
		id: '/',
		name: isReal ? 'Trident Cubed' : 'Trident Cubed Dev',
		short_name: isReal ? 'Trident' : 'Trident Dev',
		start_url: '/',
		scope: '/',
		display: 'standalone',
		theme_color: BLACK,
		background_color: BLACK,
		icons: [
			{ src: ICON_192, sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: ICON_512, sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: ICON_MASKABLE_192, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
			{ src: ICON_MASKABLE_512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]
	};
}

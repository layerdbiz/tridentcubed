// What a browser gets when it asks the app for its manifest (#200): the name follows the address it asked on, and
// the rest is what a phone needs to put the app on its home screen and open it full screen. The icons it names are
// shared static files, so their sizes are read from the files themselves.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import {
	ICON_192,
	ICON_512,
	ICON_APPLE,
	ICON_MASKABLE_192,
	ICON_MASKABLE_512,
	MANIFEST_PATH
} from '#lib/install/install.constants.js';
import { toManifest } from './manifest.utils';

function manifest(address: string) {
	return toManifest(new URL(MANIFEST_PATH, address));
}

// The shared static folder every app serves (packages/ui/static).
function staticFile(path: string) {
	return new URL(`../../../../../packages/ui/static${path}`, import.meta.url);
}

// A PNG says its own width and height in its first chunk.
function readPngSize(path: string) {
	const bytes = readFileSync(staticFile(path));
	const isPng = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
	return isPng ? `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}` : 'not a PNG';
}

describe('the manifest', () => {
	it('names the real app on app.tridentcubed.com', () => {
		expect(manifest('https://app.tridentcubed.com')).toMatchObject({
			name: 'Trident Cubed',
			short_name: 'Trident'
		});
	});

	it('names the test copy on the dev address, a local address and every other address', () => {
		const others = [
			'https://dev.app.tridentcubed.com',
			'http://localhost:5174',
			'http://192.168.1.20:4174',
			'https://tridentcubed-app-git-dev-layerd.vercel.app',
			'https://tridentcubed.com',
			'https://app.tridentcubed.com.example.com'
		];

		for (const address of others) {
			expect(manifest(address), address).toMatchObject({
				name: 'Trident Cubed Dev',
				short_name: 'Trident Dev'
			});
		}
	});

	it('always carries what Chrome needs to offer an install', () => {
		for (const address of ['https://app.tridentcubed.com', 'http://localhost:5174']) {
			const { name, short_name, start_url, display, icons } = manifest(address);
			const sizes = icons.filter((icon) => icon.type === 'image/png').map((icon) => icon.sizes);

			expect(name || short_name).toBeTruthy();
			expect(start_url).toBe('/');
			expect(display).toBe('standalone');
			expect(sizes).toContain('192x192');
			expect(sizes).toContain('512x512');
			expect(manifest(address)).not.toHaveProperty('prefer_related_applications');
		}
	});

	it('is one app at the root of its address, opening full screen on black', () => {
		expect(manifest('https://app.tridentcubed.com')).toMatchObject({
			id: '/',
			start_url: '/',
			scope: '/',
			display: 'standalone',
			theme_color: '#000000',
			background_color: '#000000'
		});
	});

	it('locks no orientation, so the app turns with the phone', () => {
		expect(manifest('https://app.tridentcubed.com')).not.toHaveProperty('orientation');
	});

	it('names the icons at 192 and 512 pixels, plus a maskable pair for Android', () => {
		expect(manifest('https://app.tridentcubed.com').icons).toEqual([
			{ src: ICON_192, sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: ICON_512, sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: ICON_MASKABLE_192, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
			{ src: ICON_MASKABLE_512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
		]);
	});
});

describe('the icons', () => {
	it('are PNG files in the shared static folder, each at the size the manifest says', () => {
		for (const icon of manifest('https://app.tridentcubed.com').icons) {
			expect(readPngSize(icon.src), icon.src).toBe(icon.sizes);
		}
	});

	it('include the 180 pixel Apple touch icon', () => {
		expect(readPngSize(ICON_APPLE)).toBe('180x180');
	});
});

describe('the shared static folder', () => {
	it('holds no manifest file, so the Website serves none', () => {
		expect(existsSync(staticFile(MANIFEST_PATH))).toBe(false);
		expect(existsSync(staticFile('/manifest.json'))).toBe(false);
	});
});

describe('the page head of every page', () => {
	const head = readFileSync(new URL('../../app.html', import.meta.url), 'utf8');

	it('links the manifest and the Apple touch icon', () => {
		expect(head).toContain(`rel="manifest"`);
		expect(head).toContain(`href="${MANIFEST_PATH}"`);
		expect(head).toContain(`rel="apple-touch-icon"`);
		expect(head).toContain(`href="%sveltekit.assets%${ICON_APPLE}"`);
	});

	it('keeps zoom off, as before', () => {
		expect(head).toContain(
			'content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"'
		);
	});
});

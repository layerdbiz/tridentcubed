// Getting a picture ready on the device (#187; ADR 0004): its time and place read before shrinking, with where they
// came from; a photo at most 2048 px on its long side as WebP, or JPEG where WebP cannot be written; a logo keeping
// its clear background.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { readMetadata, toExifTaken } from '#lib/metadata/metadata.utils.js';
import { MAX_PICTURE_SIDE, PictureError, UNREADABLE } from './files.schema';
import {
	type BlobMakerType,
	encodePicture,
	isJustTaken,
	readDevicePlace,
	toFittedSize,
	toCarried,
	toSent,
	preparePicture,
	toTaken,
	toUntouched
} from './files.utils';

function readFixture(name: string) {
	return readFileSync(new URL(`../metadata/fixtures/${name}`, import.meta.url));
}

// What the picture's own metadata says of when and where, read as a picked picture is.
async function readExif(name: string) {
	return toExifTaken((await readMetadata(new Uint8Array(readFixture(name)))).tags);
}

// A browser's canvas: it writes the types it can, and a PNG for any it cannot (what Safari does with WebP).
function createCanvas(canWrite: string[]): BlobMakerType & { asked: string[] } {
	const asked: string[] = [];
	return {
		asked,
		toBlob(callback, type = 'image/png') {
			asked.push(type);
			callback(new Blob(['x'], { type: canWrite.includes(type) ? type : 'image/png' }));
		}
	};
}

describe('shrinking', () => {
	it('brings a photo down to 2048 px on its long side, and a logo to 1024, never up', () => {
		expect(MAX_PICTURE_SIDE).toEqual({ photo: 2048, logo: 1024 });
		expect(toFittedSize(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
		expect(toFittedSize(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 });
		expect(toFittedSize(800, 600, 2048)).toEqual({ width: 800, height: 600 });
	});

	it('writes a photo as WebP, or as JPEG where the browser cannot write WebP', async () => {
		expect((await encodePicture(createCanvas(['image/webp', 'image/jpeg']), 'photo')).type).toBe(
			'image/webp'
		);
		expect((await encodePicture(createCanvas(['image/jpeg']), 'photo')).type).toBe('image/jpeg');
	});

	it('writes WebP with the app’s own encoder where the browser cannot (Safari), JPEG if that fails', async () => {
		const safari = createCanvas(['image/jpeg']);
		const encoder = async () => new Blob(['webp'], { type: 'image/webp' });
		const broken = async () => {
			throw new Error('The encoder did not load.');
		};

		expect((await encodePicture(safari, 'photo', encoder)).type).toBe('image/webp');
		expect((await encodePicture(safari, 'logo', encoder)).type).toBe('image/webp');
		expect((await encodePicture(safari, 'photo', broken)).type).toBe('image/jpeg');
		expect((await encodePicture(safari, 'logo', broken)).type).toBe('image/png');
	});

	it('keeps a logo’s clear background: WebP, or PNG, never JPEG', async () => {
		const safari = createCanvas(['image/jpeg']);

		expect((await encodePicture(createCanvas(['image/webp']), 'logo')).type).toBe('image/webp');
		expect((await encodePicture(safari, 'logo')).type).toBe('image/png');
		expect(safari.asked).not.toContain('image/jpeg');
	});
});

describe('when and where it was taken', () => {
	it('reads them from the photo’s own metadata', async () => {
		const exif = await readExif('taken.jpg');

		expect(exif.at).toBe('2026-05-12T09:30:00.000Z');
		expect(exif.latitude).toBeCloseTo(25.9, 3);
		expect(exif.longitude).toBeCloseTo(-97.5, 3);
		expect(toTaken(exif, { now: new Date('2026-11-12T10:00:00Z') })).toMatchObject({
			from: 'file',
			at: '2026-05-12T09:30:00.000Z'
		});
	});

	it('falls back to the device’s clock and place, flagged as the device’s', async () => {
		const exif = await readExif('plain.jpg');

		expect(exif).toEqual({ at: undefined });
		expect(
			toTaken(exif, {
				now: new Date('2026-11-12T10:00:00Z'),
				place: { latitude: 29.7, longitude: -95.3 }
			})
		).toEqual({ from: 'device', at: '2026-11-12T10:00:00.000Z', latitude: 29.7, longitude: -95.3 });
	});

	it('gives a photo just taken that came without its place the device’s place, flagged as both', () => {
		const exif = { at: '2026-11-26T12:03:00.000Z' };
		const place = { latitude: 41.88, longitude: -87.63 };

		expect(toTaken(exif, { now: new Date('2026-11-26T12:03:02Z'), place })).toEqual({
			from: 'file-device',
			at: '2026-11-26T12:03:00.000Z',
			...place
		});
	});

	it('never gives an older photo from the gallery the device’s place of today', () => {
		const exif = { at: '2026-11-20T09:30:00.000Z' };
		const place = { latitude: 41.88, longitude: -87.63 };

		expect(toTaken(exif, { now: new Date('2026-11-26T12:03:00Z'), place })).toEqual({
			from: 'file',
			at: '2026-11-20T09:30:00.000Z'
		});
	});

	it('counts a photo as just taken for 15 minutes, either way of a clock a little off', () => {
		const now = new Date('2026-11-26T12:00:00Z');

		expect(isJustTaken('2026-11-26T11:45:00.000Z', now)).toBe(true);
		expect(isJustTaken('2026-11-26T12:05:00.000Z', now)).toBe(true);
		expect(isJustTaken('2026-11-26T11:44:59.000Z', now)).toBe(false);
		expect(isJustTaken(undefined, now)).toBe(false);
	});

	it('says nothing came from anywhere when neither knows, and the picture still goes', async () => {
		expect(toTaken({}, {})).toEqual({ from: '' });
		expect(
			toExifTaken((await readMetadata(new TextEncoder().encode('not a picture'))).tags)
		).toEqual({});
	});
});

describe('the device’s place (ADR 0004: asked once, never required)', () => {
	type StateType = 'granted' | 'prompt' | 'denied';

	// A browser whose location permission is in this state, that knows where it is, and keeps what it is told.
	function useBrowser(state: StateType) {
		const kept = new Map<string, string>();
		const getCurrentPosition = vi.fn((done: (position: { coords: object }) => void) =>
			done({ coords: { latitude: 41.88, longitude: -87.63 } })
		);
		vi.stubGlobal('navigator', {
			permissions: { query: async () => ({ state }) },
			geolocation: { getCurrentPosition }
		});
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => kept.get(key) ?? null,
			setItem: (key: string, value: string) => kept.set(key, value)
		});
		return getCurrentPosition;
	}

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('is read where the User already allowed it', async () => {
		useBrowser('granted');

		expect(await readDevicePlace()).toEqual({ latitude: 41.88, longitude: -87.63 });
	});

	it('is asked for once, the first time a photo needs it, and photos added together share the one ask', async () => {
		const asked = useBrowser('prompt');

		const [first, second] = await Promise.all([readDevicePlace(), readDevicePlace()]);
		expect(first).toEqual({ latitude: 41.88, longitude: -87.63 });
		expect(second).toEqual(first);
		expect(await readDevicePlace()).toBeUndefined();
		expect(asked).toHaveBeenCalledTimes(1);
	});

	it('is never asked for once the User said no', async () => {
		const asked = useBrowser('denied');

		expect(await readDevicePlace()).toBeUndefined();
		expect(asked).not.toHaveBeenCalled();
	});
});

describe('what goes to storage (#292)', () => {
	const JPEG = { type: 'image/jpeg', size: 4_000_000 };
	const HEIC = { type: 'image/heic', size: 2_000_000 };
	const HUGE = { type: 'image/jpeg', size: 30_000_000 };

	it('sends the copy when it carries every field and the field list fits', () => {
		expect(toSent({ kind: 'photo', file: JPEG, isCarried: true, isListKept: true })).toBe('copy');
		expect(toSent({ kind: 'logo', file: JPEG, isCarried: true, isListKept: true })).toBe('copy');
	});

	it('sends a photo untouched when its copy or its field list falls short, so nothing is lost', () => {
		expect(toSent({ kind: 'photo', file: JPEG, isCarried: false, isListKept: true })).toBe(
			'original'
		);
		expect(toSent({ kind: 'photo', file: JPEG, isCarried: true, isListKept: false })).toBe(
			'original'
		);
	});

	it('sends a HEIC untouched too when its copy falls short: the server converts it (#294)', () => {
		expect(toSent({ kind: 'photo', file: HEIC, isCarried: false, isListKept: true })).toBe(
			'original'
		);
	});

	it('sends the copy anyway when storage cannot take the original, or for a logo', () => {
		expect(toSent({ kind: 'photo', file: HUGE, isCarried: true, isListKept: false })).toBe('copy');
		expect(toSent({ kind: 'logo', file: JPEG, isCarried: false, isListKept: true })).toBe('plain');
	});
});

describe('a picture the device cannot read (#294)', () => {
	it('goes untouched for the server to convert, typed by its name when the browser gave none', () => {
		const heic = new File(['heic'], 'IMG_0001.HEIC', { type: '' });
		expect(toUntouched(heic).type).toBe('image/heic');
		expect(toUntouched(heic).size).toBe(4);
		const tiff = new File(['tiff'], 'scan.tif', { type: 'image/tiff' });
		expect(toUntouched(tiff)).toBe(tiff);
	});

	it('is turned down with a reason the User reads when the server cannot convert it either', () => {
		const raw = new File(['raw'], 'IMG_0001.CR2', { type: '' });
		expect(() => toUntouched(raw)).toThrow(PictureError);
		expect(() => toUntouched(raw)).toThrow(UNREADABLE);
		const broken = new File(['jpeg'], 'broken.jpg', { type: 'image/jpeg' });
		expect(() => toUntouched(broken)).toThrow(UNREADABLE);
	});

	// No browser here, so nothing draws: as on a device that cannot read the file.
	it('goes untouched when it is a HEIC, flagged for the server, with what the device read of it', async () => {
		const heic = new File([readFixture('phone.heic')], 'IMG_0001.HEIC', { type: '' });

		const prepared = await preparePicture(heic, 'logo');

		expect(prepared).toMatchObject({ isUnreadable: true, shouldConvert: true });
		expect(prepared.blob.type).toBe('image/heic');
		expect(prepared.taken).toMatchObject({ from: 'file' });
	});

	it('fails as an upload to retry, not as a picture to convert, when a JPEG does not draw', async () => {
		const jpeg = new File([readFixture('taken.jpg')], 'taken.jpg', { type: 'image/jpeg' });

		const failed = await preparePicture(jpeg, 'logo').catch((error: unknown) => error);

		expect(failed).toBeInstanceOf(Error);
		expect(failed).not.toBeInstanceOf(PictureError);
	});
});

describe('whether the metadata came across (#343)', () => {
	it('is every field for a carried copy or the original kept as it came, none for a plain copy', () => {
		expect(toCarried('copy', false)).toBe('all');
		expect(toCarried('original', false)).toBe('all');
		expect(toCarried('plain', false)).toBe('none');
	});

	it('is the server’s to say when it converts the original', () => {
		expect(toCarried('original', true)).toBe('');
	});
});

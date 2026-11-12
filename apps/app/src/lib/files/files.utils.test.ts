// Getting a picture ready on the device (#187; ADR 0004): its time and place read before shrinking, with where they
// came from; a photo at most 2048 px on its long side as WebP, or JPEG where WebP cannot be written; a logo keeping
// its clear background.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import {
	type BlobMakerType,
	encodePicture,
	MAX_PICTURE_SIDE,
	readExif,
	toExifTime,
	toFittedSize,
	toTaken
} from './files.utils';

function fixture(name: string) {
	const bytes = readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
	return new File([bytes], name, { type: 'image/jpeg' });
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

	it('keeps a logo’s clear background: WebP, or PNG, never JPEG', async () => {
		const safari = createCanvas(['image/jpeg']);

		expect((await encodePicture(createCanvas(['image/webp']), 'logo')).type).toBe('image/webp');
		expect((await encodePicture(safari, 'logo')).type).toBe('image/png');
		expect(safari.asked).not.toContain('image/jpeg');
	});
});

describe('when and where it was taken', () => {
	it('reads them from the photo’s own metadata', async () => {
		const exif = await readExif(fixture('taken.jpg'));

		expect(exif.at).toBe('2026-05-12T09:30:00.000Z');
		expect(exif.latitude).toBeCloseTo(25.9, 3);
		expect(exif.longitude).toBeCloseTo(-97.5, 3);
		expect(toTaken(exif, { now: new Date('2026-11-12T10:00:00Z') })).toMatchObject({
			from: 'file',
			at: '2026-05-12T09:30:00.000Z'
		});
	});

	it('falls back to the device’s clock and place, flagged as the device’s', async () => {
		const exif = await readExif(fixture('plain.jpg'));

		expect(exif).toEqual({ at: undefined });
		expect(
			toTaken(exif, {
				now: new Date('2026-11-12T10:00:00Z'),
				place: { latitude: 29.7, longitude: -95.3 }
			})
		).toEqual({ from: 'device', at: '2026-11-12T10:00:00.000Z', latitude: 29.7, longitude: -95.3 });
	});

	it('says nothing came from anywhere when neither knows, and the picture still goes', async () => {
		expect(toTaken({}, {})).toEqual({ from: '' });
		expect(await readExif(new File(['not a picture'], 'x.png'))).toEqual({});
	});

	it('reads a photo’s time with its offset, and without one as the device’s own time', () => {
		expect(toExifTime('2026:05:12 11:30:00', '+02:00')).toBe('2026-05-12T09:30:00.000Z');
		expect(toExifTime('2026:05:12 11:30:00')).toBe(new Date('2026-05-12T11:30:00').toISOString());
		expect(toExifTime('0000:00:00 00:00:00')).toBeUndefined();
		expect(toExifTime(undefined)).toBeUndefined();
	});
});

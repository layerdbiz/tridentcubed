// Which pictures the server converts (#294; ADR 0004): a HEIC Chrome cannot read on Windows or Android, a TIFF; what
// their untouched files are called in storage, and when a stored picture still needs converting.
import { describe, expect, it } from 'vite-plus/test';
import { isToConvert, isTypeAllowed, toEnding, toPictureType } from './files.schema';

describe('pictures the server converts', () => {
	it('lets a picture column take them, untouched, until the server converts them', () => {
		for (const type of ['image/heic', 'image/heif', 'image/avif', 'image/tiff']) {
			expect(isTypeAllowed(type, 'photo', 'file')).toBe(true);
			expect(isTypeAllowed(type, 'customer', 'logo')).toBe(true);
		}
		expect(isTypeAllowed('image/x-canon-cr2', 'photo', 'file')).toBe(false);
	});

	it('names their untouched files by their type', () => {
		expect(toEnding('image/heic', 'IMG_0001.HEIC')).toBe('heic');
		expect(toEnding('image/heif', 'photo')).toBe('heif');
		expect(toEnding('image/tiff', 'scan.tiff')).toBe('tif');
	});

	it('reads a picture’s type from its name when the browser gives none', () => {
		expect(toPictureType({ name: 'IMG_0001.HEIC', type: '' })).toBe('image/heic');
		expect(toPictureType({ name: 'scan.TIFF', type: 'application/octet-stream' })).toBe(
			'image/tiff'
		);
		expect(toPictureType({ name: 'photo.jpg', type: 'image/jpeg' })).toBe('image/jpeg');
		expect(toPictureType({ name: 'IMG_0001.CR2', type: '' })).toBe('');
	});

	it('converts what a browser may not show, and a photo bigger than the app keeps', () => {
		expect(isToConvert({ type: 'image/heic' }, 'photo')).toBe(true);
		expect(isToConvert({ type: 'image/jpeg', width: 4032, height: 3024 }, 'photo')).toBe(true);
		expect(isToConvert({ type: 'image/webp', width: 2048, height: 1536 }, 'photo')).toBe(false);
		expect(isToConvert({ type: 'image/png', width: 1600, height: 900 }, 'logo')).toBe(true);
		expect(isToConvert({ type: 'image/jpeg', width: null, height: null }, 'photo')).toBe(false);
		expect(isToConvert({ type: 'application/pdf', width: 9000 }, 'photo')).toBe(false);
	});
});

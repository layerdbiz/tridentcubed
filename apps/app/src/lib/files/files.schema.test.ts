// Which pictures the server converts (#294; ADR 0004): a HEIC Chrome cannot read on Windows or Android, a TIFF; what
// their untouched files are called in storage, and when a stored picture still needs converting.
import { describe, expect, it } from 'vite-plus/test';
import {
	isShownType,
	isToConvert,
	isTypeAllowed,
	toAttachmentKind,
	toCarriedLabel,
	toFileId,
	toEnding,
	toOriginalFacts,
	toPictureType,
	toSizeLabel,
	toSmallerPercent,
	toTyped,
	toTypeLabel
} from './files.schema';

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
		expect(toPictureType({ name: 'notes.txt', type: '' })).toBe('');
	});

	it('knows camera RAW by its name, so the User is told it cannot be read rather than see it left out', () => {
		expect(toPictureType({ name: 'IMG_0001.CR2', type: '' })).toBe('image/x-canon-cr2');
		expect(toPictureType({ name: 'DSC_0001.NEF', type: '' })).toBe('image/x-nikon-nef');
		expect(toPictureType({ name: 'shot.dng', type: '' })).toBe('image/x-adobe-dng');
	});

	it('shows a WebP, JPEG or PNG as it is', () => {
		expect(isShownType('image/jpeg')).toBe(true);
		expect(isShownType('image/heic')).toBe(false);
		expect(isShownType('application/pdf')).toBe(false);
	});

	it('types a file by what is known of it, keeping the file itself when it already says so', () => {
		const heic = new File(['heic'], 'IMG_0001.HEIC', { type: '' });
		expect(toTyped(heic, 'image/heic').type).toBe('image/heic');
		const jpeg = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
		expect(toTyped(jpeg, 'image/jpeg')).toBe(jpeg);
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

describe('PDFs and videos in a photo group (#327)', () => {
	it('knows a picked file by its type, else by its name', () => {
		expect(toAttachmentKind({ name: 'deck.jpg', type: 'image/jpeg' })).toBe('photo');
		expect(toAttachmentKind({ name: 'IMG_0001.HEIC', type: '' })).toBe('photo');
		expect(toAttachmentKind({ name: 'manifest.pdf', type: 'application/pdf' })).toBe('pdf');
		expect(toAttachmentKind({ name: 'Manifest.PDF', type: '' })).toBe('pdf');
		expect(toAttachmentKind({ name: 'lift.mov', type: 'video/quicktime' })).toBe('video');
		expect(toAttachmentKind({ name: 'lift.MOV', type: '' })).toBe('video');
		expect(toAttachmentKind({ name: 'lift.mp4', type: 'application/octet-stream' })).toBe('video');
		expect(toAttachmentKind({ name: 'notes.txt', type: 'text/plain' })).toBe('');
		expect(toAttachmentKind({ name: 'list.xlsx', type: '' })).toBe('');
	});

	it('keeps a PDF or a video in the attachment column only, and a picture in the picture column only', () => {
		for (const type of ['application/pdf', 'video/mp4', 'video/quicktime', 'video/webm']) {
			expect(isTypeAllowed(type, 'photo', 'source')).toBe(true);
			expect(isTypeAllowed(type, 'photo', 'file')).toBe(false);
		}
		expect(isTypeAllowed('image/webp', 'photo', 'source')).toBe(false);
		expect(isTypeAllowed('text/html', 'photo', 'source')).toBe(false);
		expect(isTypeAllowed('image/webp', 'photo', 'file')).toBe(true);
	});
});

describe('an attachment’s details (#343) and the type on its tile (#349)', () => {
	it('says a type the way people say it', () => {
		expect(toTypeLabel('image/heic')).toBe('HEIC');
		expect(toTypeLabel('image/heif')).toBe('HEIF');
		expect(toTypeLabel('image/jpeg')).toBe('JPEG');
		expect(toTypeLabel('image/png')).toBe('PNG');
		expect(toTypeLabel('image/webp')).toBe('WebP');
		expect(toTypeLabel('image/svg+xml')).toBe('SVG');
		expect(toTypeLabel('image/tiff')).toBe('TIFF');
		expect(toTypeLabel('image/avif')).toBe('AVIF');
		expect(toTypeLabel('image/gif')).toBe('GIF');
		expect(toTypeLabel('application/pdf')).toBe('PDF');
		expect(toTypeLabel('video/mp4')).toBe('MP4');
		expect(toTypeLabel('video/quicktime')).toBe('MOV');
		expect(toTypeLabel('video/webm')).toBe('WebM');
		expect(toTypeLabel('text/csv')).toBe('CSV');
		expect(toTypeLabel('application/octet-stream')).toBe('File');
		expect(toTypeLabel('')).toBe('');
	});

	it('says a size in bytes, KB or MB', () => {
		expect(toSizeLabel(980)).toBe('980 B');
		expect(toSizeLabel(1536)).toBe('1.5 KB');
		expect(toSizeLabel(626_688)).toBe('612 KB');
		expect(toSizeLabel(3_355_443)).toBe('3.2 MB');
		expect(toSizeLabel(undefined)).toBe('');
	});

	it('says how much smaller the saved file is than the original, as a whole percent', () => {
		expect(toSmallerPercent({ size: 3_355_443 }, { size: 626_688 })).toBe(81);
		expect(toSmallerPercent({ size: 1000 }, { size: 1000 })).toBe(0);
		expect(toSmallerPercent({ size: 1000 }, { size: 1500 })).toBe(-50);
		expect(toSmallerPercent({}, { size: 1000 })).toBeUndefined();
		expect(toSmallerPercent({ size: 0 }, { size: 0 })).toBeUndefined();
	});

	it('says whether the metadata came across', () => {
		expect(toCarriedLabel('all', true)).toBe('Every field came across');
		expect(toCarriedLabel('all', false)).toBe('The original had none');
		expect(toCarriedLabel('some', true)).toBe('Some fields came across');
		expect(toCarriedLabel('none', true)).toBe('None came across');
		expect(toCarriedLabel('', true)).toBe('Not recorded');
	});

	it('takes the original as recorded, else its type from its name for a file kept before #343', () => {
		const recorded = { type: 'image/heic', size: 3_000_000, width: 4032, height: 3024 };
		expect(
			toOriginalFacts({ name: 'IMG_0001.HEIC', type: 'image/webp', original: recorded })
		).toEqual(recorded);
		expect(toOriginalFacts({ name: 'IMG_0001.HEIC', type: 'image/webp' })).toEqual({
			type: 'image/heic'
		});
		expect(toOriginalFacts({ name: 'plan.pdf', type: 'application/pdf' })).toEqual({
			type: 'application/pdf'
		});
		expect(toOriginalFacts({ name: 'photo', type: 'image/webp' })).toEqual({ type: 'image/webp' });
	});
});

describe('the file at an app address (#343)', () => {
	it('is its id for a file in storage, nothing for a starting file, a preview or a guess', () => {
		const id = '9b2e6c1a-3f4d-4e5a-8b6c-7d8e9f0a1b2c';
		expect(toFileId(`/files/${id}`)).toBe(id);
		expect(toFileId('/start/photos/dock.webp')).toBe('');
		expect(toFileId('blob:https://next.app.tridentcubed.com/1234')).toBe('');
		expect(toFileId('/files/not-an-id')).toBe('');
		expect(toFileId('')).toBe('');
	});
});

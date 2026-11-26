// Carrying every metadata field into the shrunk copy (ADR 0004; #292; research #281, section 7): the copy a phone
// encodes gets the original's EXIF, XMP and ICC blocks byte for byte, and only Orientation changes, to upright. Each
// check reads both files with ExifTool, every field in every group, and compares them.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ExifTool } from 'exiftool-vendored';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { MAX_FIELD_LIST_CHARACTERS } from '#lib/files/files.schema.js';
import {
	carryMetadata,
	readMetadata,
	toExifTaken,
	toExifTime,
	toFieldList,
	toUprightXmp
} from './metadata.utils';

// The groups that describe a file rather than the photo (its size, its container, its encoder), the ones ExifTool
// works out from others (Composite, and MWG, which exiftool-vendored turns on), and the fields that point into the
// file: they differ between any two files and are left out (research #281, section 7).
const CONTAINER =
	/^(ExifTool|System|File|Composite|MWG|JFIF|RIFF|VP8|VP8L|VP8X|PNG|QuickTime|Meta|MPF0|MPImage\d*)$/;
const POINTERS = ['ThumbnailOffset', 'PreviewImageStart', 'JpgFromRawStart'];
const ORIENTATION = ['IFD0:Orientation', 'XMP-tiff:Orientation'];

let exiftool: ExifTool;
let folder: string;

beforeAll(async () => {
	exiftool = new ExifTool({ taskTimeoutMillis: 20_000 });
	folder = await mkdtemp(join(tmpdir(), 'trident-metadata-'));
});

afterAll(async () => {
	await exiftool.end();
	await rm(folder, { recursive: true, force: true });
});

function fixture(name: string) {
	return new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
}

/** Every field of the file as ExifTool reads it, by `Group:Name`, the container's own left out. */
async function fieldsOf(name: string, bytes: Uint8Array) {
	const path = join(folder, name);
	await writeFile(path, bytes);
	const tags = await exiftool.readRaw(path, { readArgs: ['-a', '-u', '-G1', '-n', '-b'] });
	const fields = new Map<string, unknown>();
	for (const [key, value] of Object.entries(tags)) {
		const [group, field] = key.split(':');
		if (!field || CONTAINER.test(group) || POINTERS.includes(field)) continue;
		fields.set(key, value);
	}
	return fields;
}

/** How many problems ExifTool's own check finds in the file, and the first of them. */
async function problemsOf(name: string) {
	const tags: Record<string, unknown> = await exiftool.readRaw(join(folder, name), {
		readArgs: ['-validate', '-warning', '-a', '-G1']
	});
	const summary = String(tags['ExifTool:Validate'] ?? 'OK');
	return {
		count: summary === 'OK' ? 0 : Number.parseInt(summary),
		first: tags['ExifTool:Warning']
	};
}

/** What the copy kept, changed, lost and added, field by field. */
async function compare(original: string, copy: Uint8Array, ending: string) {
	const before = await fieldsOf(original, fixture(original));
	const after = await fieldsOf(`copy-of-${original}.${ending}`, copy);
	const changed: string[] = [];
	const lost: string[] = [];
	for (const [key, value] of before) {
		if (!after.has(key)) lost.push(key);
		else if (JSON.stringify(after.get(key)) !== JSON.stringify(value)) changed.push(key);
	}
	const added = [...after.keys()].filter((key) => !before.has(key));
	return { before, after, changed, lost, added };
}

async function carry(original: string, encoded: string) {
	const copy = await carryMetadata(await readMetadata(fixture(original)), fixture(encoded));
	if (!copy) throw new Error(`${original} was not carried into ${encoded}`);
	return copy;
}

describe('carrying every field into the copy', () => {
	it('keeps every field of a camera JPEG in a WebP, turning only Orientation upright', async () => {
		const { before, after, changed, lost, added } = await compare(
			'camera.jpg',
			await carry('camera.jpg', 'canvas.webp'),
			'webp'
		);

		expect(before.get('IFD0:Orientation')).toBe(6);
		expect(changed).toEqual(ORIENTATION);
		expect(after.get('IFD0:Orientation')).toBe(1);
		expect(after.get('XMP-tiff:Orientation')).toBe(1);
		expect(after.get('GPS:GPSLatitude')).toBe(before.get('GPS:GPSLatitude'));
		expect(after.get('ExifIFD:DateTimeOriginal')).toBe('2026:05:12 11:30:00');
		// IPTC has no slot in a WebP; the File row's field list keeps it.
		expect(lost.length).toBeGreaterThan(0);
		expect(lost.every((key) => /^(IPTC|Photoshop):/.test(key))).toBe(true);
		expect(added).toEqual([]);
	});

	// Every original the tests hold, into every copy a phone makes: Chrome's canvas (lossy, see-through, lossless),
	// jSquash on Safari (the same three) and the JPEG fallback.
	const ORIGINALS = ['camera.jpg', 'screenshot.png', 'phone.heic', 'taken.jpg'];
	const COPIES = [
		'canvas.webp',
		'canvas-alpha.webp',
		'canvas-lossless.webp',
		'squash.webp',
		'squash-alpha.webp',
		'squash-lossless.webp',
		'canvas.jpg'
	];
	const PAIRS = ORIGINALS.flatMap((original) => COPIES.map((copy) => [original, copy]));

	it.each(PAIRS)('keeps every field of %s in %s', async (original, encoded) => {
		const ending = encoded.split('.').pop()!;
		const { before, after, changed, lost, added } = await compare(
			original,
			await carry(original, encoded),
			ending
		);

		expect(before.size).toBeGreaterThan(0);
		expect(changed.toSorted()).toEqual(ORIENTATION.filter((key) => before.has(key)));
		for (const key of changed) expect(after.get(key)).toBe(1);
		// What the copy has no slot for is kept in the field list instead: a PNG's pixel density anywhere, and IPTC
		// and Photoshop blocks in a WebP (a JPEG holds those).
		const noSlot = ending === 'jpg' ? /^PNG-pHYs:/ : /^(IPTC|Photoshop|PNG-pHYs):/;
		expect(lost.filter((key) => !noSlot.test(key))).toEqual([]);
		expect(added).toEqual([]);
	});

	it.each(PAIRS)(
		'writes %s into %s with no problem the original did not have',
		async (original, encoded) => {
			const copy = `checked-${original}.${encoded}`;
			await writeFile(join(folder, original), fixture(original));
			await writeFile(join(folder, copy), await carry(original, encoded));
			const before = await problemsOf(original);
			const after = await problemsOf(copy);

			expect(after.count).toBeLessThanOrEqual(before.count);
			if (after.count) expect(after.first).toBe(before.first);
		}
	);
});

describe('files that are harder to carry', () => {
	it('carries an XMP far bigger than a JPEG segment into a WebP', async () => {
		const path = join(folder, 'edited.png');
		await writeFile(path, fixture('screenshot.png'));
		const history = 'A long edit history. '.repeat(15_000);
		await exiftool.write(
			path,
			{},
			{ writeArgs: [`-XMP-dc:Description=${history}`, '-overwrite_original'] }
		);
		const edited = new Uint8Array(readFileSync(path));
		const original = await readMetadata(edited);
		const copy = await carryMetadata(original, fixture('canvas.webp'));

		expect(original.blocks.xmp?.length).toBeGreaterThan(300_000);
		expect(copy).toBeDefined();
		// Byte for byte, but for the one digit of Orientation.
		expect((await readMetadata(copy!)).blocks.xmp).toEqual(toUprightXmp(original.blocks.xmp));
	});

	it('carries a JPEG whose camera wrote a second, empty EXIF segment, keeping the first', async () => {
		const camera = fixture('camera.jpg');
		const empty = Uint8Array.of(0xff, 0xe1, 0x00, 0x08, ...new TextEncoder().encode('Exif\0\0'));
		// After the JFIF header (2 + 18 bytes) and the camera's own EXIF segment.
		const exifEnd = 20 + 2 + ((camera[22] << 8) | camera[23]);
		const twice = new Uint8Array([
			...camera.subarray(0, exifEnd),
			...empty,
			...camera.subarray(exifEnd)
		]);

		const copy = await carryMetadata(await readMetadata(twice), fixture('canvas.webp'));

		expect(copy).toBeDefined();
		expect((await readMetadata(copy!)).tags?.exif?.Make?.description).toBe('Trident Test');
	});
});

describe('when the copy cannot hold everything, the original goes instead', () => {
	it('gives nothing for a copy that is not a WebP or a JPEG', async () => {
		const png = fixture('screenshot.png');

		expect(await carryMetadata(await readMetadata(fixture('camera.jpg')), png)).toBeUndefined();
	});

	it('gives nothing when a field did not come across, such as a block that was not found', async () => {
		const camera = await readMetadata(fixture('camera.jpg'));
		const withoutExif = { ...camera, blocks: { ...camera.blocks, exif: undefined } };

		expect(await carryMetadata(withoutExif, fixture('canvas.webp'))).toBeUndefined();
		expect(await carryMetadata(camera, fixture('canvas.webp'))).toBeDefined();
	});

	it('gives nothing for a WebP when the original holds XMP only a JPEG can hold', async () => {
		const camera = await readMetadata(fixture('camera.jpg'));
		const extended = new TextEncoder().encode('http://ns.adobe.com/xmp/extension/\0more');
		const portrait = { ...camera, blocks: { ...camera.blocks, xmpExtended: [extended] } };

		expect(await carryMetadata(portrait, fixture('canvas.webp'))).toBeUndefined();
	});

	it('gives nothing for an original it could not read', async () => {
		const unread = { blocks: { xmpExtended: [] }, isRead: false };

		expect(await carryMetadata(unread, fixture('canvas.webp'))).toBeUndefined();
	});

	it('carries an original with no metadata at all as the copy alone', async () => {
		const plain = await readMetadata(fixture('plain.jpg'));
		const copy = await carryMetadata(plain, fixture('canvas.webp'));

		expect(copy).toBeDefined();
		expect((await readMetadata(copy!)).blocks).toEqual({ xmpExtended: [] });
	});
});

describe('the field list the File row keeps', () => {
	async function listOf(name: string) {
		const list = toFieldList((await readMetadata(fixture(name))).tags);
		if (!list) throw new Error(`${name} gave no field list`);
		return list as Record<string, Record<string, { value: unknown; description: string }>>;
	}

	it('keeps what a WebP has no slot for: a JPEG’s IPTC, a PNG’s text and pixel density', async () => {
		const camera = await listOf('camera.jpg');
		const screenshot = await listOf('screenshot.png');

		expect(camera.iptc['By-line'].description).toBe('Trident Test');
		expect(camera.iptc['Caption/Abstract'].description).toBe('Only a JPEG can hold this');
		expect(screenshot.png.Comment.description).toBe('Only a PNG can hold this');
		expect(screenshot.png['Pixels Per Unit X'].value).toBe(3780);
	});

	it('keeps every other group too, the copy’s own fields included', async () => {
		const camera = await listOf('camera.jpg');
		const phone = await listOf('phone.heic');

		expect(Object.keys(camera)).toEqual(
			expect.arrayContaining(['exif', 'gps', 'xmp', 'icc', 'iptc', 'Thumbnail', 'file'])
		);
		expect(camera.exif.DateTimeOriginal.description).toBe('2026:05:12 11:30:00');
		expect(camera.exif.Orientation.value).toBe(6);
		expect(phone.gps.Latitude).toBeCloseTo(25.9, 5);
		expect(phone.xmp.City.description).toBe('Nowhere');
	});

	it('notes a picture inside the metadata by its size, and keeps it no other way', async () => {
		const { Thumbnail } = await listOf('camera.jpg');

		expect(Thumbnail.image).toEqual({ bytes: expect.any(Number) });
		expect(Thumbnail).not.toHaveProperty('base64');
		expect(Thumbnail.Compression.value).toBe(6);
	});

	it('is plain JSON a database keeps as it is, well inside its limit', async () => {
		for (const name of ['camera.jpg', 'screenshot.png', 'phone.heic']) {
			const text = JSON.stringify(await listOf(name));

			expect(JSON.parse(text)).toEqual(await listOf(name));
			expect(text).not.toMatch(/\\u0000/);
			expect(text.length).toBeLessThan(MAX_FIELD_LIST_CHARACTERS);
		}
	});

	it('writes what Postgres cannot hold as character codes, a long text by its length, long bytes as base64', () => {
		const bytes = Array.from({ length: 2048 }, (_, at) => at % 256);
		const list = toFieldList({
			exif: {
				Odd: { value: 'a\0b', description: '\ud800' },
				Long: { value: 'x'.repeat(70_000) },
				MakerNote: { value: bytes }
			},
			icc: { '\0\0\0\0': { value: 1 } }
		} as never);

		expect(list).toEqual({
			exif: {
				Odd: { value: { codes: [97, 0, 98] }, description: { codes: [0xd800] } },
				Long: { value: { characters: 70_000 } },
				MakerNote: { value: { base64: Buffer.from(bytes).toString('base64') } }
			},
			icc: { 'codes:0,0,0,0': { value: 1 } }
		});
	});

	it('is nothing for a file that says nothing', async () => {
		expect(toFieldList((await readMetadata(new TextEncoder().encode('not a picture'))).tags)).toBe(
			undefined
		);
	});
});

describe('when and where the file says it was taken', () => {
	it('reads the time, with its offset, and the place', async () => {
		const exif = toExifTaken((await readMetadata(fixture('taken.jpg'))).tags);

		expect(exif.at).toBe('2026-05-12T09:30:00.000Z');
		expect(exif.latitude).toBeCloseTo(25.9, 3);
		expect(exif.longitude).toBeCloseTo(-97.5, 3);
	});

	it('reads the file’s last change, with its own offset, when the shutter time is missing', () => {
		const tags = {
			exif: {
				DateTime: { value: '', description: '2026:11:26 06:03:00' },
				OffsetTime: { value: '', description: '-06:00' }
			}
		} as unknown as Parameters<typeof toExifTaken>[0];

		expect(toExifTaken(tags)).toEqual({ at: '2026-11-26T12:03:00.000Z' });
	});

	it('reads a time without an offset as the reader’s own time', () => {
		expect(toExifTime('2026:05:12 11:30:00', '+02:00')).toBe('2026-05-12T09:30:00.000Z');
		expect(toExifTime('2026:05:12 11:30:00')).toBe(new Date('2026-05-12T11:30:00').toISOString());
		expect(toExifTime('0000:00:00 00:00:00')).toBeUndefined();
		expect(toExifTime(undefined)).toBeUndefined();
	});
});

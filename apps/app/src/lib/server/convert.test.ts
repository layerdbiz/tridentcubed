// Converting on the server (#294; ADR 0004): a photo the device could not read (HEIC in Chrome on Windows and Android,
// TIFF) is sent untouched, and the server turns it into the same 2048 px WebP a device makes, every metadata field
// carried, swaps it in and deletes the untouched file once the copy checks out. Fields are compared with ExifTool,
// every field in every group, as the device's carry is (research #281, section 7).
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ExifTool } from 'exiftool-vendored';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test';
import type { UploadRequestType } from '#lib/files/files.schema.js';
import { readMetadata, writeJpeg } from '#lib/metadata/metadata.utils.js';
import type { ActorType } from './db/claims';
import * as schema from './db/schema';
import { convertFile, convertPicture } from './convert';
import { createUpload, readFieldList, readFile, readFileDetails } from './files';
import { createLocalStore, type LocalStoreType } from './store';
import { createTestSignIn } from './testing';

// The groups that describe a file rather than the photo, and pointers into the file (as metadata.utils.test.ts).
const CONTAINER =
	/^(ExifTool|System|File|Composite|MWG|JFIF|RIFF|VP8|VP8L|VP8X|PNG|QuickTime|Meta|MPF0|MPImage\d*)$/;
const POINTERS = ['ThumbnailOffset', 'PreviewImageStart', 'JpgFromRawStart'];
const ORIENTATION = ['IFD0:Orientation', 'XMP-tiff:Orientation'];

let exiftool: ExifTool;
let scratch: string;

beforeAll(async () => {
	exiftool = new ExifTool({ taskTimeoutMillis: 20_000 });
	scratch = await mkdtemp(join(tmpdir(), 'trident-convert-'));
});

afterAll(async () => {
	await exiftool.end();
	await rm(scratch, { recursive: true, force: true });
});

function fixture(name: string) {
	return new Uint8Array(readFileSync(new URL(`../metadata/fixtures/${name}`, import.meta.url)));
}

/** Every field of the file as ExifTool reads it, by `Group:Name`, the container's own left out. */
async function fieldsOf(name: string, bytes: Uint8Array) {
	const path = join(scratch, name);
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

/** What the copy kept, changed, lost and added, field by field. */
async function compare(name: string, original: Uint8Array, copy: Uint8Array) {
	const before = await fieldsOf(name, original);
	const after = await fieldsOf(`converted-${name}`, copy);
	const changed: string[] = [];
	const lost: string[] = [];
	for (const [key, value] of before) {
		if (!after.has(key)) lost.push(key);
		else if (JSON.stringify(after.get(key)) !== JSON.stringify(value)) changed.push(key);
	}
	const added = [...after.keys()].filter((key) => !before.has(key));
	return { before, after, changed, lost, added };
}

// A big camera photo: a 3000 by 1500 JPEG holding camera.jpg's metadata (turned 90°, Orientation 6).
async function bigCameraPhoto() {
	const pixels = await sharp({
		create: { width: 3000, height: 1500, channels: 3, background: { r: 40, g: 90, b: 160 } }
	})
		.jpeg({ quality: 80 })
		.toBuffer();
	const { blocks } = await readMetadata(fixture('camera.jpg'));
	return writeJpeg(new Uint8Array(pixels), blocks);
}

// A scanner's TIFF: its fields are woven into the file, not a block the server can lift into a WebP.
async function scannedTiff() {
	const path = join(scratch, `scan-${crypto.randomUUID()}.tif`);
	await sharp({
		create: { width: 120, height: 80, channels: 3, background: { r: 200, g: 200, b: 190 } }
	})
		.tiff()
		.toFile(path);
	await exiftool.write(path, { Make: 'Test Scanner' }, { writeArgs: ['-overwrite_original'] });
	return new Uint8Array(readFileSync(path));
}

describe('turning a picture into the copy the app keeps', () => {
	it('turns a HEIC into a WebP with every field kept, only Orientation turned upright', async () => {
		const original = fixture('phone.heic');

		const converted = await convertPicture(original, 'photo');

		expect(converted.type).toBe('image/webp');
		expect(converted.isChecked).toBe(true);
		expect([converted.width, converted.height]).toEqual([96, 64]);
		const { before, after, changed, lost, added } = await compare(
			'phone.heic',
			original,
			converted.bytes
		);
		expect(before.size).toBeGreaterThan(20);
		expect(changed.every((key) => ORIENTATION.includes(key))).toBe(true);
		expect(after.get('IFD0:Orientation')).toBe(1);
		expect(after.get('ExifIFD:DateTimeOriginal')).toBe('2026:05:12 11:30:00');
		expect(after.get('GPS:GPSLatitude')).toBe(before.get('GPS:GPSLatitude'));
		expect(lost).toEqual([]);
		expect(added).toEqual([]);
	});

	it('reads the time and place and the full field list from the file itself', async () => {
		const converted = await convertPicture(fixture('phone.heic'), 'photo');

		expect(converted.taken).toEqual({
			from: 'file',
			at: '2026-05-12T09:30:00.000Z',
			latitude: expect.closeTo(25.9, 1),
			longitude: expect.closeTo(-97.5, 1)
		});
		expect(converted.metadata).toHaveProperty('exif');
	});

	it('shrinks a big photo to 2048 px on its long side, drawn upright, every field kept', async () => {
		const original = await bigCameraPhoto();

		const converted = await convertPicture(original, 'photo');

		expect(converted.type).toBe('image/webp');
		expect([converted.width, converted.height]).toEqual([1024, 2048]);
		const { changed, after } = await compare('camera-big.jpg', original, converted.bytes);
		expect(changed).toEqual(ORIENTATION);
		expect(after.get('IFD0:Orientation')).toBe(1);
		const drawn = await sharp(converted.bytes).metadata();
		expect([drawn.width, drawn.height]).toEqual([1024, 2048]);
	});

	it('shrinks a logo to 1024 px', async () => {
		const converted = await convertPicture(await bigCameraPhoto(), 'logo');

		expect([converted.width, converted.height]).toEqual([512, 1024]);
	});

	it('still makes a copy to show when it cannot carry every field, and says so (a TIFF)', async () => {
		const converted = await convertPicture(await scannedTiff(), 'photo');

		expect(converted.type).toBe('image/webp');
		expect(converted.isChecked).toBe(false);
		expect([converted.width, converted.height]).toEqual([120, 80]);
		expect(JSON.stringify(converted.metadata)).toContain('Test Scanner');
	});

	it('turns down what is not a picture', async () => {
		await expect(
			convertPicture(new TextEncoder().encode('not a picture'), 'photo')
		).rejects.toThrow('could not be read');
	});
});

describe('converting a file in storage', () => {
	type TestType = Awaited<ReturnType<typeof createTestSignIn>>;

	let test: TestType;
	let folder: string;
	let store: LocalStoreType;
	let team: ActorType;

	beforeEach(async () => {
		test = await createTestSignIn();
		folder = await mkdtemp(join(tmpdir(), 'trident-files-'));
		store = createLocalStore({ folder, secret: 'test-secret-that-is-at-least-32-characters-long' });
		team = (await test.signIn('tom@tridentcubed.com')).actor;
	});

	afterEach(async () => {
		await rm(folder, { recursive: true, force: true });
	});

	// A device that could not read the photo: it asks for an address for the untouched file and sends it there.
	async function sendUntouched(
		name: string,
		type: string,
		bytes: Uint8Array,
		options: { fields?: object; column?: 'picture' | 'logo' } = {}
	) {
		const { fields, column = 'picture' } = options;
		const request: UploadRequestType = {
			for: { table: 'customer', column, id: crypto.randomUUID() },
			name,
			type,
			size: bytes.byteLength,
			taken: { from: 'device', at: '2026-11-24T12:00:00.000Z' },
			...(fields ? { metadata: fields as Record<string, unknown> } : {})
		};
		const answer = await createUpload(test.claims, team, store, request);
		if (!answer.isAllowed) throw new Error(answer.reason);
		expect(await store.receive(answer.upload.url, bytes)).toBe(true);
		return answer.id;
	}

	async function filesInStorage() {
		const organizations = await readdir(folder);
		const names = await Promise.all(organizations.map((each) => readdir(join(folder, each))));
		return names.flat();
	}

	function convert(id: string, actor = team) {
		return convertFile(test.claims, actor, store, id);
	}

	it('swaps a HEIC for its WebP and deletes the untouched file once the copy checks out', async () => {
		const id = await sendUntouched('IMG_0001.HEIC', 'image/heic', fixture('phone.heic'));
		expect(await filesInStorage()).toEqual([`${id}.heic`]);

		expect(await convert(id)).toEqual({ isDone: true });

		const file = await readFile(test.claims, team, id);
		expect(file).toMatchObject({
			name: 'IMG_0001.HEIC',
			type: 'image/webp',
			width: 96,
			height: 64
		});
		expect(file?.path).toMatch(/\.webp$/);
		expect(await filesInStorage()).toEqual([file?.path.split('/').pop()]);
		const stored = await store.read(file!.path);
		expect(stored.byteLength).toBe(file?.size);
		expect((await sharp(stored).metadata()).format).toBe('webp');
		expect(file?.originalPath).toBeUndefined();
		// #343: what came in, beside what was saved.
		expect((await readFileDetails(test.claims, team, [id])).get(id)).toMatchObject({
			original: {
				type: 'image/heic',
				size: fixture('phone.heic').byteLength,
				width: 96,
				height: 64
			},
			saved: { type: 'image/webp', size: file?.size, width: 96, height: 64 },
			carried: 'all',
			isOriginalKept: false
		});
	});

	it('takes the time and place from the file when the device could not read them', async () => {
		const id = await sendUntouched('IMG_0001.HEIC', 'image/heic', fixture('phone.heic'));

		await convert(id);

		const file = await readFile(test.claims, team, id);
		expect(file?.taken).toMatchObject({ from: 'file', at: '2026-05-12T09:30:00.000Z' });
		expect(await readFieldList(test.claims, team, id)).toHaveProperty('exif');
	});

	it('keeps the time, place and field list the device read from the file', async () => {
		const id = await sendUntouched('IMG_0001.HEIC', 'image/heic', fixture('phone.heic'), {
			fields: { exif: { Make: { value: 'Phone' } } }
		});
		await test.db
			.update(schema.file)
			.set({ takenFrom: 'file', takenAt: new Date('2026-05-12T10:30:00.000Z') });

		await convert(id);

		const file = await readFile(test.claims, team, id);
		expect(file?.taken).toEqual({ from: 'file', at: '2026-05-12T10:30:00.000Z' });
		expect(await readFieldList(test.claims, team, id)).toEqual({
			exif: { Make: { value: 'Phone' } }
		});
	});

	it('keeps the untouched file beside the copy when the copy cannot carry every field', async () => {
		const id = await sendUntouched('scan.tif', 'image/tiff', await scannedTiff());

		expect(await convert(id)).toEqual({ isDone: true });

		const file = await readFile(test.claims, team, id);
		expect(file?.type).toBe('image/webp');
		expect(file?.originalPath).toBe(`${team.organizationId}/${id}.tif`);
		expect((await readFileDetails(test.claims, team, [id])).get(id)).toMatchObject({
			original: { type: 'image/tiff', width: 120, height: 80 },
			// A TIFF's fields are woven into it, not kept in a block a WebP holds: none come across, the original stays.
			carried: 'none',
			isOriginalKept: true
		});
		const stored = await filesInStorage();
		expect(stored).toHaveLength(2);
		expect(stored).toEqual(expect.arrayContaining([`${id}.tif`, file?.path.split('/').pop()]));
	});

	it('does nothing to a file that is already a copy the app keeps', async () => {
		const id = await sendUntouched('IMG_0001.HEIC', 'image/heic', fixture('phone.heic'));
		await convert(id);
		const once = await readFile(test.claims, team, id);

		expect(await convert(id)).toEqual({ isDone: true });

		expect(await readFile(test.claims, team, id)).toEqual(once);
	});

	it('leaves a photo storage keeps as it is when it needs no shrinking', async () => {
		const id = await sendUntouched('taken.jpg', 'image/jpeg', fixture('taken.jpg'));
		const before = await readFile(test.claims, team, id);

		expect(await convert(id)).toEqual({ isDone: true });

		expect(await readFile(test.claims, team, id)).toEqual(before);
	});

	it('shrinks a big photo sent untouched', async () => {
		const id = await sendUntouched('camera.jpg', 'image/jpeg', await bigCameraPhoto());
		await test.db.update(schema.file).set({ width: 3000, height: 1500 });

		await convert(id);

		const file = await readFile(test.claims, team, id);
		expect(file).toMatchObject({ type: 'image/webp', width: 1024, height: 2048 });
		expect(await filesInStorage()).toEqual([file?.path.split('/').pop()]);
	});

	it('shrinks a logo to logo size, by the column it is for', async () => {
		const id = await sendUntouched('logo.jpg', 'image/jpeg', await bigCameraPhoto(), {
			column: 'logo'
		});
		await test.db.update(schema.file).set({ width: 3000, height: 1500 });

		await convert(id);

		const file = await readFile(test.claims, team, id);
		expect(file).toMatchObject({ type: 'image/webp', width: 512, height: 1024 });
	});

	it('converts only for the member who sent it', async () => {
		const id = await sendUntouched('IMG_0001.HEIC', 'image/heic', fixture('phone.heic'));
		const other = (await test.signIn('ana@tridentcubed.com')).actor;
		expect(other.organizationId).toBe(team.organizationId);

		expect(await convert(id, other)).toEqual({
			isDone: false,
			reason: 'Only the person who added this picture can have it converted.'
		});
		expect(await filesInStorage()).toEqual([`${id}.heic`]);
	});

	it('says why when the untouched file cannot be read, and keeps it', async () => {
		const id = await sendUntouched(
			'broken.heic',
			'image/heic',
			new TextEncoder().encode('not a picture')
		);

		expect(await convert(id)).toEqual({
			isDone: false,
			reason: 'This picture could not be read. Save it as a JPEG and add it again.'
		});
		expect(await filesInStorage()).toEqual([`${id}.heic`]);
	});

	it('finds nothing for another organization or a Guest', async () => {
		const id = await sendUntouched('IMG_0001.HEIC', 'image/heic', fixture('phone.heic'));
		const guest = { ...team, organizationId: undefined } as unknown as ActorType;
		const other = {
			...team,
			organizationId: '22222222-2222-4222-8222-222222222222'
		} as ActorType;

		expect(await convert(id, guest)).toMatchObject({ isDone: false });
		expect(await convert(id, other)).toEqual({ isDone: false, reason: 'No such file.' });
		expect(await convert('not-an-id')).toEqual({ isDone: false, reason: 'No such file.' });
		expect(await filesInStorage()).toEqual([`${id}.heic`]);
	});
});

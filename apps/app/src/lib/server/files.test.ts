// Files (#187; ADR 0004; spec #179 "Files"): what another member, a Guest or another organization gets when they
// ask for an upload address or open a file, through the same doors the app uses, with the local folder store.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import type { UploadRequestType } from '#lib/files/files.schema.js';
import type { ActorType } from './db/claims';
import * as schema from './db/schema';
import { createUpload, findFileLink, readFieldList, readFile, readFileDetails } from './files';
import { saveBatch } from './rows';
import { createLocalStore, type LocalStoreType } from './store';
import { createTestSignIn } from './testing';

const THEIRS = { id: '22222222-2222-4222-8222-222222222222', domain: 'theirs.example' };
const PICTURE = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4, 87, 69, 66, 80]);

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

function logoOf(customerId?: string): UploadRequestType {
	return {
		for: { table: 'customer', column: 'logo', id: customerId },
		name: 'koga.webp',
		type: 'image/webp',
		size: PICTURE.byteLength,
		width: 640,
		height: 320,
		taken: { from: '' }
	};
}

// A member's device: asks for the address, sends the bytes there, and keeps the app's file address.
async function upload(actor: ActorType, request: UploadRequestType) {
	const answer = await createUpload(test.claims, actor, store, request);
	if (!answer.isAllowed) throw new Error(answer.reason);
	expect(answer.upload.method).toBe('PUT');
	expect(await store.receive(answer.upload.url, PICTURE)).toBe(true);
	return answer;
}

async function addOrganization() {
	await test.db
		.insert(schema.organization)
		.values({ id: THEIRS.id, name: 'Theirs', slug: 'theirs' });
	await test.db
		.insert(schema.organizationDetails)
		.values({ id: THEIRS.id, organizationId: THEIRS.id, emailDomain: THEIRS.domain });
	return (await test.signIn(`ana@${THEIRS.domain}`)).actor;
}

describe('a file row', () => {
	it('keeps what the file is for, its type, size, pixel size, who sent it and where it lies', async () => {
		const id = crypto.randomUUID();
		const { address } = await upload(team, logoOf(id));

		expect(address).toMatch(/^\/files\/[0-9a-f-]{36}$/);
		const file = await readFile(test.claims, team, address.slice('/files/'.length));
		expect(file).toMatchObject({
			for: { table: 'customer', column: 'logo', id },
			name: 'koga.webp',
			type: 'image/webp',
			size: 12,
			width: 640,
			height: 320,
			uploadedBy: team.userId,
			taken: { from: '' }
		});
		expect(file?.path).toBe(`${team.organizationId}/${file?.id}.webp`);
	});

	it('keeps the time and place a photo was taken, and whether they came from the file or the device', async () => {
		const fromFile = await upload(team, {
			...logoOf(),
			for: { table: 'customer', column: 'picture' },
			type: 'image/jpeg',
			taken: { from: 'file', at: '2026-05-12T09:30:00.000Z', latitude: 25.9, longitude: -97.5 }
		});
		const fromDevice = await upload(team, {
			...logoOf(),
			for: { table: 'contact', column: 'photo' },
			taken: { from: 'device', at: '2026-11-12T10:00:00.000Z' }
		});

		expect((await readFile(test.claims, team, fromFile.id))?.taken).toEqual({
			from: 'file',
			at: '2026-05-12T09:30:00.000Z',
			latitude: 25.9,
			longitude: -97.5
		});
		expect((await readFile(test.claims, team, fromDevice.id))?.taken).toEqual({
			from: 'device',
			at: '2026-11-12T10:00:00.000Z'
		});
	});

	it('keeps the original’s full field list beside a photo, for its own organization only (#292)', async () => {
		const fields = {
			exif: {
				Make: { value: ['Apple'], description: 'Apple' },
				MakerNote: { value: [65, 112, 0] }
			},
			iptc: { 'By-line': { value: [84, 84], description: 'TT' } },
			Thumbnail: { image: { bytes: 6120 } }
		};
		const photo = await upload(team, { ...logoOf(), metadata: fields });
		const plain = await upload(team, logoOf());

		expect(await readFieldList(test.claims, team, photo.id)).toEqual(fields);
		expect(await readFieldList(test.claims, team, plain.id)).toBeUndefined();
		expect(await readFieldList(test.claims, await addOrganization(), photo.id)).toBeUndefined();
	});

	it('keeps a field list whatever a device sends in it, never failing the upload over it', async () => {
		const odd = { icc: { '\0\0\0\0': { value: 'a\0b' } }, exif: { Huge: { value: 12n } } };
		const photo = await upload(team, { ...logoOf(), metadata: odd });

		expect(await readFieldList(test.claims, team, photo.id)).toEqual({
			icc: { 'codes:0,0,0,0': { value: { codes: [97, 0, 98] } } },
			exif: { Huge: {} }
		});
	});

	it('keeps the original’s type, size and pixel size beside the saved copy, and whether its metadata came across (#343)', async () => {
		const original = { type: 'image/jpeg', size: 3_000_000, width: 4032, height: 3024 };
		const photo = await upload(team, {
			...logoOf(),
			for: { table: 'customer', column: 'picture' },
			name: 'IMG_0001.JPG',
			original,
			carried: 'all',
			metadata: { exif: { Make: { value: 'Phone' } } }
		});

		const details = await readFileDetails(test.claims, team, [photo.id]);
		expect(details.get(photo.id)).toEqual({
			name: 'IMG_0001.JPG',
			original,
			saved: { type: 'image/webp', size: 12, width: 640, height: 320 },
			carried: 'all',
			hasFieldList: true,
			isOriginalKept: false,
			taken: { from: '' }
		});
	});

	it('says when and where a photo was taken, beside what it was and became (#343)', async () => {
		const taken = {
			from: 'file' as const,
			at: '2026-11-26T11:35:12.000Z',
			latitude: 29.76,
			longitude: -95.37
		};
		const photo = await upload(team, {
			...logoOf(),
			for: { table: 'customer', column: 'picture' },
			taken
		});

		expect((await readFileDetails(test.claims, team, [photo.id])).get(photo.id)?.taken).toEqual(
			taken
		);
	});

	it('takes the file as it was sent for its original when the device names no other (#343)', async () => {
		const logo = await upload(team, logoOf());

		const details = (await readFileDetails(test.claims, team, [logo.id])).get(logo.id);
		expect(details?.original).toEqual({ type: 'image/webp', size: 12, width: 640, height: 320 });
		expect(details?.carried).toBe('');
		expect(details?.hasFieldList).toBe(false);
	});

	it('reads the original’s type from its name for a file kept before #343', async () => {
		const photo = await upload(team, { ...logoOf(), name: 'IMG_0001.HEIC' });
		await test.db.update(schema.file).set({
			originalType: null,
			originalSize: null,
			originalWidth: null,
			originalHeight: null
		});

		const details = (await readFileDetails(test.claims, team, [photo.id])).get(photo.id);
		expect(details?.original).toEqual({ type: 'image/heic' });
	});

	it('gives the details of its own organization’s files only, and nothing for a guessed id', async () => {
		const logo = await upload(team, logoOf());
		const guessed = crypto.randomUUID();

		expect([
			...(await readFileDetails(test.claims, team, [logo.id, guessed, 'nope'])).keys()
		]).toEqual([logo.id]);
		expect((await readFileDetails(test.claims, await addOrganization(), [logo.id])).size).toBe(0);
	});

	it('is what a record row keeps: the address, saved through the save command', async () => {
		const customerId = crypto.randomUUID();
		const { address } = await upload(team, logoOf(customerId));
		const saved = await saveBatch(test.claims, team, {
			changes: [
				{
					changeId: crypto.randomUUID(),
					table: 'customer',
					id: customerId,
					operation: 'put',
					values: { name: 'Gulf Coast Metals', icon: address, logo: address }
				}
			]
		});

		expect(saved).toEqual({ isSaved: true });
	});
});

describe('who may ask for an upload address', () => {
	it('gives one to a member for a picture of a record, new or saved', async () => {
		expect((await createUpload(test.claims, team, store, logoOf())).isAllowed).toBe(true);
		expect(
			(await createUpload(test.claims, team, store, logoOf(crypto.randomUUID()))).isAllowed
		).toBe(true);
	});

	it('refuses a Guest', async () => {
		const { actor: guest } = await test.signIn('someone@personal.example');

		expect(await createUpload(test.claims, guest, store, logoOf())).toEqual({
			isAllowed: false,
			reason: 'You are waiting for access. An Admin of the organization can let you in.'
		});
	});

	it('refuses a column that holds no file, and a table that does not save', async () => {
		const name = { ...logoOf(), for: { table: 'customer', column: 'name' } };
		const user = { ...logoOf(), for: { table: 'user', column: 'image' } };

		expect(await createUpload(test.claims, team, store, name)).toEqual({
			isAllowed: false,
			reason: 'customer name does not hold a file.'
		});
		expect(await createUpload(test.claims, team, store, user)).toEqual({
			isAllowed: false,
			reason: 'user image does not hold a file.'
		});
	});

	it('refuses a file that is not a picture, or too big', async () => {
		const page = { ...logoOf(), type: 'text/html', name: 'page.html' };
		const huge = { ...logoOf(), size: 30_000_000 };

		expect(await createUpload(test.claims, team, store, page)).toMatchObject({
			isAllowed: false,
			reason: 'A text/html file cannot be kept here.'
		});
		expect(await createUpload(test.claims, team, store, huge)).toMatchObject({
			isAllowed: false,
			reason: 'That file is bigger than 20 MB.'
		});
		expect(
			await createUpload(test.claims, team, store, { ...logoOf(), type: 'constructor' })
		).toMatchObject({ isAllowed: false });
	});

	it('takes any kind of file for an item attachment, never for a record’s picture (#188, #233)', async () => {
		const attachment = (type: string, name: string): UploadRequestType => ({
			for: { table: 'item_attachment', column: 'file', id: crypto.randomUUID() },
			name,
			type,
			size: PICTURE.byteLength,
			taken: { from: '' }
		});
		// The path's ending is the type's when the app knows it, else the name's own, else `bin`.
		for (const [type, name, ending] of [
			[
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'manifest.xlsx',
				'xlsx'
			],
			['application/vnd.ms-excel', 'manifest.xls', 'xls'],
			['text/csv', 'manifest.csv', 'csv'],
			['application/pdf', 'manifest.pdf', 'pdf'],
			['image/webp', 'list.webp', 'webp'],
			[
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'Packing List.DOCX',
				'docx'
			],
			['text/tab-separated-values', 'manifest.tsv', 'tsv'],
			['application/zip', 'everything.zip', 'zip'],
			['application/octet-stream', 'list.numbers', 'numbers'],
			['application/octet-stream', 'no ending at all', 'bin'],
			['application/octet-stream', 'odd.../../etc', 'bin']
		]) {
			const answer = await upload(team, attachment(type, name));
			expect(answer.address).toMatch(/^\/files\//);
			expect((await readFile(test.claims, team, answer.id))?.path).toBe(
				`${team.organizationId}/${answer.id}.${ending}`
			);
		}

		// A type is one plain word either side of a slash: nothing else goes into the upload's header.
		for (const type of ['', 'text', 'text/plain; charset=utf-8', 'text/plain\r\nx-evil: 1'])
			expect(
				await createUpload(test.claims, team, store, attachment(type, 'manifest.txt'))
			).toMatchObject({ isAllowed: false });

		for (const [type, name] of [
			['application/pdf', 'logo.pdf'],
			['application/zip', 'logo.zip']
		])
			expect(await createUpload(test.claims, team, store, { ...logoOf(), type, name })).toEqual({
				isAllowed: false,
				reason: `A ${type} file cannot be kept here.`
			});
	});

	it('never lets a picture for another organization’s record land in theirs', async () => {
		const theirs = await addOrganization();
		const customerId = crypto.randomUUID();
		await upload(theirs, logoOf(customerId));
		await saveBatch(test.claims, theirs, {
			changes: [
				{
					changeId: crypto.randomUUID(),
					table: 'customer',
					id: customerId,
					operation: 'put',
					values: { name: 'Theirs Only' }
				}
			]
		});

		// Their customer is invisible to us: we would be making a new row, which is ours, so it is allowed, but
		// the file lands in our organization and theirs stays untouched.
		const answer = await createUpload(test.claims, team, store, logoOf(customerId));
		expect(answer.isAllowed).toBe(true);
		if (answer.isAllowed) {
			const file = await readFile(test.claims, team, answer.id);
			expect(file?.path.startsWith(`${team.organizationId}/`)).toBe(true);
		}
	});
});

describe('who may open a file', () => {
	it('hands a member of its organization a short-lived link that gives the file', async () => {
		const { id } = await upload(team, logoOf());
		const { actor: other } = await test.signIn('mia@tridentcubed.com');

		const link = await findFileLink(test.claims, other, store, id);

		expect(link).toBeDefined();
		expect(await store.send(link!)).toEqual(PICTURE);
	});

	it('gives a Guest, another organization and a guessed address nothing', async () => {
		const { id } = await upload(team, logoOf());
		const { actor: guest } = await test.signIn('someone@personal.example');
		const theirs = await addOrganization();

		expect(await findFileLink(test.claims, guest, store, id)).toBeUndefined();
		expect(await findFileLink(test.claims, theirs, store, id)).toBeUndefined();
		expect(await findFileLink(test.claims, team, store, crypto.randomUUID())).toBeUndefined();
		expect(await findFileLink(test.claims, team, store, 'not-an-id')).toBeUndefined();
	});

	it('gives nothing for a link that was changed, used for the wrong thing or ran out', async () => {
		const answer = await upload(team, logoOf());
		const link = (await findFileLink(test.claims, team, store, answer.id))!;

		expect(await store.send(link.replace(/sig=[^&]+/, 'sig=forged'))).toBeUndefined();
		expect(await store.send(answer.upload.url)).toBeUndefined();
		expect(await store.receive(link, PICTURE)).toBe(false);
		const expired = await store.toLink(`${team.organizationId}/${answer.id}.webp`, -1);
		expect(await store.send(expired)).toBeUndefined();
	});
});

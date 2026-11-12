// Files (#187; ADR 0004; spec #179 "Files"): what another member, a Guest or another organization gets when they
// ask for an upload address or open a file, through the same doors the app uses, with the local folder store.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import type { UploadRequestType } from '#lib/files/files.schema.js';
import type { ActorType } from './db/claims';
import * as schema from './db/schema';
import { createUpload, findFileLink, readFile } from './files';
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
		.values({ organizationId: THEIRS.id, emailDomain: THEIRS.domain });
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
		const { actor: guest } = await test.signIn('someone@gmail.com');

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
		const { actor: guest } = await test.signIn('someone@gmail.com');
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

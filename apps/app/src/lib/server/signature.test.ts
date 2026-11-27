// Email signatures (#354) on the in-process database and a local file store: who may open which signature, a
// person's from their Team record with the Sheets filling in the rest, and every picture copied once as a PNG to the
// app's public signature address. The Sheets and the starting photo are answered by a stand-in fetch.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { COMPANY_LOGO, SHEETS } from '#lib/signature/signature.constants.js';
import type { ActorType } from './db/claims';
import { createClaims } from './db/claims';
import { team } from './db/schema';
import { type SignatureRequestType, readSignature, toPictureName } from './signature';
import { createLocalStore, type LocalStoreType } from './store';
import { createTestSignIn, TEST_SECRET } from './testing';
import { eq } from 'drizzle-orm';

const ORIGIN = 'http://localhost:5174';
const MEMBER_EMAIL = 't.shaw@tridentcubed.com';
const ADMIN_EMAIL = 'c.poninski@tridentcubed.com';

const SHEET_ROWS: Record<string, unknown[]> = {
	person: [
		{
			email: 'T.Shaw@TridentCubed.com',
			title: 'From the Sheet',
			group: 'operations@tridentcubed.com',
			banner: 'map.png'
		}
	],
	group: [
		{
			slug: 'operations',
			shortname: 'Operations',
			email: 'operations@tridentcubed.com',
			src: 'https://tridentcubed.com/branding/logo.png',
			banner: 'map.png'
		}
	],
	banner: [
		{ banner: 'map.png', href: 'https://tridentcubed.com', src: 'https://banners.example/map.png' }
	],
	social: [{ name: 'LinkedIn', href: 'https://www.linkedin.com/company/example' }]
};

let photo: Uint8Array<ArrayBuffer>;
let banner: Uint8Array<ArrayBuffer>;
const asked: string[] = [];

// The stand-in for the network: the four Sheets, the banner, and the app's own starting files.
const request: SignatureRequestType = {
	origin: ORIGIN,
	async fetch(input) {
		const url = String(input instanceof Request ? input.url : input);
		asked.push(url);
		if (url.startsWith(SHEETS.api)) {
			const tab = url.split('/').at(-1) ?? '';
			return Response.json(SHEET_ROWS[tab] ?? []);
		}
		if (url === 'https://banners.example/map.png') return new Response(banner);
		if (url.startsWith(`${ORIGIN}/src/lib/start/team/`)) return new Response(photo);
		return new Response('Not found', { status: 404 });
	}
};

let folder: string;
let store: LocalStoreType;
let server: { claims: ReturnType<typeof createClaims>; store: LocalStoreType };
let member: ActorType;
let admin: ActorType;
let memberRecord: string;
let adminRecord: string;

beforeAll(async () => {
	photo = new Uint8Array(
		await sharp({ create: { width: 600, height: 600, channels: 3, background: '#336699' } })
			.webp()
			.toBuffer()
	);
	banner = new Uint8Array(
		await sharp({ create: { width: 2400, height: 800, channels: 4, background: '#ffffff00' } })
			.png()
			.toBuffer()
	);
	folder = await mkdtemp(join(tmpdir(), 'trident-signature-'));
	store = createLocalStore({ folder, secret: TEST_SECRET });
	const { db, claims, signIn } = await createTestSignIn();
	server = { claims, store };
	member = (await signIn(MEMBER_EMAIL)).actor;
	admin = (await signIn(ADMIN_EMAIL)).actor;
	const [own] = await db.select({ id: team.id }).from(team).where(eq(team.userId, member.userId));
	const [other] = await db.select({ id: team.id }).from(team).where(eq(team.userId, admin.userId));
	memberRecord = own.id;
	adminRecord = other.id;
});

afterAll(async () => {
	await rm(folder, { recursive: true, force: true });
});

describe('a person’s own email signature', () => {
	it('comes from their Team record, the Sheet filling in what the record leaves out', async () => {
		const answer = await readSignature(server, member, {}, request);

		expect(answer.isAllowed).toBe(true);
		if (!answer.isAllowed) return;
		expect(answer.signature).toMatchObject({
			id: memberRecord,
			type: 'person',
			name: 'Tynequa Shaw',
			title: 'Field Specialist / Junior Surveyor',
			email: 'T.Shaw@TridentCubed.com',
			group: 'operations@tridentcubed.com',
			socialLinks: { linkedin: 'https://www.linkedin.com/company/example' }
		});
		expect(answer.mailboxes).toEqual([]);
	});

	it('shows its photo and banner at the app’s public address, as PNGs made once at twice their size', async () => {
		const answer = await readSignature(server, member, {}, request);
		if (!answer.isAllowed) throw new Error(answer.reason);
		const { src, banner: shown } = answer.signature;

		expect(src).toMatch(/^http:\/\/localhost:5174\/signature\/[0-9a-f]{24}\.png$/);
		expect(shown?.src).toMatch(/^http:\/\/localhost:5174\/signature\/[0-9a-f]{24}\.png$/);
		const made = await sharp(await store.read(`signatures/${src.split('/').at(-1)}`)).metadata();
		expect(made).toMatchObject({ format: 'png', width: 224, height: 224 });
		const wide = await sharp(
			await store.read(`signatures/${shown?.src.split('/').at(-1)}`)
		).metadata();
		expect(wide).toMatchObject({ format: 'png', width: 1200, height: 400 });

		const before = asked.filter((url) => url.includes('/src/lib/start/team/')).length;
		await readSignature(server, member, {}, request);
		expect(asked.filter((url) => url.includes('/src/lib/start/team/')).length).toBe(before);
	});

	it('names a picture by what it was made from, so a new photo is a new file', () => {
		const first = toPictureName({ source: '/start/team/a.webp', kind: 'photo' });

		expect(first).toMatch(/^[0-9a-f]{24}\.png$/);
		expect(toPictureName({ source: '/start/team/a.webp', kind: 'photo' })).toBe(first);
		expect(toPictureName({ source: '/start/team/b.webp', kind: 'photo' })).not.toBe(first);
		expect(toPictureName({ source: '/start/team/a.webp', kind: 'banner' })).not.toBe(first);
	});

	it('shows the company logo when the photo cannot be read', async () => {
		await server.claims.run(admin, (tx) =>
			tx.update(team).set({ photo: '/start/team/not-there.webp' }).where(eq(team.id, adminRecord))
		);
		const answer = await readSignature(server, admin, {}, request);

		expect(answer.isAllowed && answer.signature.src).toBe(COMPANY_LOGO);
	});
});

describe('someone else’s and the shared mailboxes’ signatures', () => {
	it('are refused to anyone but an Admin', async () => {
		expect(await readSignature(server, member, { person: adminRecord }, request)).toEqual({
			isAllowed: false,
			reason: 'Only an Admin can open someone else’s email signature.'
		});
		expect(await readSignature(server, member, { mailbox: 'operations' }, request)).toEqual({
			isAllowed: false,
			reason: 'Only an Admin can open a shared mailbox’s email signature.'
		});
	});

	it('open for an Admin, who is given the shared mailboxes to pick from', async () => {
		const person = await readSignature(server, admin, { person: memberRecord }, request);
		const mailbox = await readSignature(server, admin, { mailbox: 'operations' }, request);

		expect(person.isAllowed && person.signature.name).toBe('Tynequa Shaw');
		expect(person.isAllowed && person.mailboxes).toEqual([
			{ slug: 'operations', name: 'Operations', email: 'operations@tridentcubed.com' }
		]);
		expect(mailbox.isAllowed && mailbox.signature).toMatchObject({
			type: 'group',
			name: 'Operations',
			src: 'https://tridentcubed.com/branding/logo.png'
		});
	});

	it('say so when the record or mailbox is not there', async () => {
		const gone = '00000000-0000-4000-8000-000000000000';

		expect(await readSignature(server, admin, { person: gone }, request)).toEqual({
			isAllowed: false,
			reason: 'That Team record is not there.'
		});
		expect(await readSignature(server, admin, { mailbox: 'nobody' }, request)).toEqual({
			isAllowed: false,
			reason: 'That shared mailbox is not in the Sheet.'
		});
	});
});

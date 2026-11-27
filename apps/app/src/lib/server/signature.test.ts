// Email signatures (#354) on the in-process database and a local file store: who may open and change which
// signature, a person's from their Team record with the Sheets filling in the rest, the photo and banner they pick or
// upload, and every picture copied once as a small PNG to the app's public signature address, a photo in its circle.
// The Sheets, Google Drive and the website are answered by a stand-in fetch.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { COMPANY_LOGO, SHEETS, WEBSITE_ICONS } from '#lib/signature/signature.constants.js';
import type { SignatureAnswerType } from '#lib/signature/signature.types.js';
import type { ActorType } from './db/claims';
import { createClaims } from './db/claims';
import { team } from './db/schema';
import {
	makePicture,
	pickSignature,
	readSignature,
	type SignatureRequestType,
	toPictureName,
	uploadSignature
} from './signature';
import { createLocalStore, type LocalStoreType } from './store';
import { createTestSignIn, TEST_SECRET } from './testing';

const ORIGIN = 'http://localhost:5174';
const MEMBER_EMAIL = 't.shaw@tridentcubed.com';
const ADMIN_EMAIL = 'c.poninski@tridentcubed.com';
const WEBSITE_PHOTO = 'https://tridentcubed.com/emails/profile-cezary-poninski.png';

const SHEET_ROWS: Record<string, unknown[]> = {
	person: [
		{
			email: 'T.Shaw@TridentCubed.com',
			title: 'From the Sheet',
			group: 'operations@tridentcubed.com',
			src: COMPANY_LOGO,
			banner: 'map.png',
			profileURL: 'tynequa-shaw-linkedin-updated.png'
		},
		{ email: 'C.Poninski@TridentCubed.com', src: WEBSITE_PHOTO, banner: 'map.png' }
	],
	group: [
		{
			slug: 'operations',
			shortname: 'Operations',
			email: 'operations@tridentcubed.com',
			src: COMPANY_LOGO,
			banner: 'map.png'
		}
	],
	banner: [
		{ banner: 'map.png', href: 'https://tridentcubed.com', fileId: '1MapBanner' },
		{ banner: 'expo.png', href: 'https://expo.example', fileId: '1ExpoBanner' }
	],
	profile: [
		{ banner: 'tynequa-shaw-linkedin-updated.png', fileId: '1TynequaPhoto' },
		{ banner: 'tynequa-shaw-at-work.png', fileId: '1GonePhoto' },
		{ banner: 'profile-500x500.png', fileId: '1LogoPhoto' }
	],
	social: [{ name: 'LinkedIn', href: 'https://www.linkedin.com/company/example' }]
};

let square: Uint8Array<ArrayBuffer>;
let shaped: Uint8Array<ArrayBuffer>;
let wide: Uint8Array<ArrayBuffer>;
const asked: string[] = [];

// The stand-in for the network: the Sheets, Google Drive's pictures and the website's. One Drive photo is gone.
const request: SignatureRequestType = {
	origin: ORIGIN,
	async fetch(input) {
		const url = String(input instanceof Request ? input.url : input);
		asked.push(url);
		if (url.startsWith(SHEETS.api)) {
			const tab = url.split('/').at(-1) ?? '';
			return Response.json(SHEET_ROWS[tab] ?? []);
		}
		if (url.includes('1GonePhoto')) return new Response('Not found', { status: 404 });
		if (url.includes('Banner=')) return new Response(wide);
		if (url === WEBSITE_PHOTO || url === COMPANY_LOGO) return new Response(shaped);
		if (
			url.startsWith('https://lh3.googleusercontent.com/') ||
			url.startsWith('https://tridentcubed.com/')
		) {
			return new Response(square);
		}
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

// A picture as the stand-in network or a device sends it.
async function makeSample(width: number, height: number, background: string) {
	return new Uint8Array(
		await sharp({ create: { width, height, channels: 4, background } })
			.png()
			.toBuffer()
	);
}

// The made picture a signature points at, read from the store.
async function readMade(address: string | undefined) {
	const bytes = await store.read(`signatures/${address?.split('/').at(-1)}`);
	const image = sharp(bytes);
	const { data, info } = await image
		.clone()
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
	return { meta: await image.metadata(), alphaAt };
}

function allowed(answer: SignatureAnswerType) {
	if (!answer.isAllowed) throw new Error(answer.reason);
	return answer;
}

beforeAll(async () => {
	square = new Uint8Array(
		await sharp({ create: { width: 600, height: 600, channels: 3, background: '#336699' } })
			.webp()
			.toBuffer()
	);
	// A website signature photo: a circle with the person over its top, the corners seeing through.
	shaped = new Uint8Array(
		await sharp(await makeSample(398, 467, '#00000000'))
			.composite([
				{
					input: Buffer.from(
						'<svg width="398" height="467"><circle cx="199" cy="268" r="199" fill="#cccccc"/></svg>'
					)
				}
			])
			.png()
			.toBuffer()
	);
	wide = await makeSample(2400, 700, '#112233ff');
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
		const answer = allowed(await readSignature(server, member, {}, request));

		expect(answer.signature).toMatchObject({
			id: memberRecord,
			type: 'person',
			name: 'Tynequa Shaw',
			title: 'Field Specialist / Junior Surveyor',
			email: 'T.Shaw@TridentCubed.com',
			group: 'operations@tridentcubed.com',
			socialLinks: { linkedin: 'https://www.linkedin.com/company/example' }
		});
		// What the Sheet gives, so the screen shows the record's details as they are typed.
		expect(answer.sheet?.group).toContain('operations@tridentcubed.com');
		expect(answer.mailboxes).toEqual([]);
	});

	it('starts with their Profile Images photo, not their profile picture, drawn in a circle', async () => {
		const answer = allowed(await readSignature(server, member, {}, request));

		expect(answer.choices?.photo).toBe('drive:1TynequaPhoto');
		expect(answer.signature.src).toMatch(/^http:\/\/localhost:5174\/signature\/[0-9a-f]{24}\.png$/);
		const { meta, alphaAt } = await readMade(answer.signature.src);
		expect(meta).toMatchObject({ format: 'png', width: 224, height: 224 });
		expect(alphaAt(0, 0)).toBe(0);
		expect(alphaAt(223, 223)).toBe(0);
		expect(alphaAt(112, 112)).toBe(255);
	});

	it('keeps a website signature photo in the circle it was drawn in', async () => {
		const answer = allowed(await readSignature(server, admin, {}, request));

		expect(answer.choices?.photo).toBe(WEBSITE_PHOTO);
		const { meta } = await readMade(answer.signature.src);
		expect(meta).toMatchObject({ format: 'png', width: 224, height: 263 });
	});

	it('copies the banner small and every website icon, so the signature points at the website for none', async () => {
		const answer = allowed(await readSignature(server, member, {}, request));
		const { banner, icons, logoImage } = answer.signature;

		expect(banner).toMatchObject({ href: 'https://tridentcubed.com', alt: 'Map' });
		expect((await readMade(banner?.src)).meta).toMatchObject({ width: 1200, height: 350 });
		expect(Object.keys(icons ?? {}).sort()).toEqual(
			Object.keys(WEBSITE_ICONS)
				.filter((name) => name !== 'logo')
				.sort()
		);
		expect(logoImage).toMatch(/^http:\/\/localhost:5174\/signature\//);
		expect(JSON.stringify(answer.signature)).not.toContain('tridentcubed.com/emails');

		const before = asked.length;
		await readSignature(server, member, {}, request);
		expect(asked.slice(before).filter((url) => !url.startsWith(SHEETS.api))).toEqual([]);
	});

	it('names a picture by what it was made from, so a new photo or a changed file is a new file', () => {
		const first = toPictureName({ source: 'drive:1A', kind: 'photo' });

		expect(first).toMatch(/^[0-9a-f]{24}\.png$/);
		expect(toPictureName({ source: 'drive:1A', kind: 'photo' })).toBe(first);
		expect(toPictureName({ source: 'drive:1B', kind: 'photo' })).not.toBe(first);
		expect(toPictureName({ source: 'drive:1A', kind: 'banner' })).not.toBe(first);
		expect(toPictureName({ source: 'drive:1A', kind: 'photo', version: '11/27/2026' })).not.toBe(
			first
		);
	});

	it('makes an icon as it is, never larger', async () => {
		const made = await sharp(
			await makePicture(await makeSample(96, 96, '#ff0000ff'), 'icon')
		).metadata();

		expect(made).toMatchObject({ format: 'png', width: 96, height: 96 });
	});
});

describe('picking a signature’s photo and banner', () => {
	it('shows the one picked, and none when they pick no banner', async () => {
		const expo = allowed(
			await pickSignature(server, member, { banner: 'drive:1ExpoBanner' }, request)
		);
		expect(expo.choices?.banner).toBe('drive:1ExpoBanner');
		expect(expo.signature.banner).toMatchObject({ href: 'https://expo.example', alt: 'Expo' });

		const none = allowed(await pickSignature(server, member, { banner: '' }, request));
		expect(none.choices?.banner).toBe('');
		expect(none.signature.banner).toBeUndefined();

		const back = allowed(await pickSignature(server, member, { banner: null }, request));
		expect(back.choices?.banner).toBe('drive:1MapBanner');
	});

	it('takes only a photo or banner offered', async () => {
		expect(await pickSignature(server, member, { photo: 'drive:1SomeoneElse' }, request)).toEqual({
			isAllowed: false,
			reason: 'That photo is not one to pick.'
		});
		expect(
			await pickSignature(server, member, { banner: 'https://example.com/a.png' }, request)
		).toEqual({
			isAllowed: false,
			reason: 'That banner is not one to pick.'
		});
	});

	it('shows the company logo, copied, when the picked photo cannot be read', async () => {
		const answer = allowed(
			await pickSignature(server, member, { photo: 'drive:1GonePhoto' }, request)
		);

		expect(answer.signature.src).toBe(
			`${ORIGIN}/signature/${toPictureName({ source: COMPANY_LOGO, kind: 'photo' })}`
		);
		await pickSignature(server, member, { photo: null }, request);
	});

	it('is the person’s own, or an Admin’s for anyone', async () => {
		expect(
			await pickSignature(server, member, { person: adminRecord, banner: '' }, request)
		).toEqual({
			isAllowed: false,
			reason: 'Only an Admin can open someone else’s email signature.'
		});
		const answer = allowed(
			await pickSignature(
				server,
				admin,
				{ person: memberRecord, photo: 'drive:1LogoPhoto' },
				request
			)
		);
		expect(answer.signature.id).toBe(memberRecord);
		expect(answer.choices?.photo).toBe('drive:1LogoPhoto');
		await pickSignature(server, admin, { person: memberRecord, photo: null }, request);
	});
});

describe('uploading a signature’s photo or banner', () => {
	it('keeps the photo as it came and shows it in its circle, offered first from then on', async () => {
		const bytes = new Uint8Array(
			await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#aa3311' } })
				.jpeg()
				.toBuffer()
		);
		const answer = allowed(
			await uploadSignature(server, member, { kind: 'photo', type: 'image/jpeg', bytes }, request)
		);

		expect(answer.choices?.photo).toMatch(/^upload:[0-9a-f]{24}\.jpg$/);
		expect(answer.choices?.photos[0]).toMatchObject({
			source: answer.choices?.photo,
			label: 'Your upload',
			preview: answer.signature.src
		});
		const { meta, alphaAt } = await readMade(answer.signature.src);
		expect(meta).toMatchObject({ width: 224, height: 224 });
		expect(alphaAt(0, 0)).toBe(0);
		const file = answer.choices?.photo.slice('upload:'.length);
		expect(await store.read(`signatures/uploads/${file}`)).toEqual(bytes);
	});

	it('takes a banner the same way, linking to the website', async () => {
		const answer = allowed(
			await uploadSignature(
				server,
				member,
				{ kind: 'banner', type: 'image/png', bytes: wide },
				request
			)
		);

		expect(answer.choices?.banner).toMatch(/^upload:[0-9a-f]{24}\.png$/);
		expect(answer.signature.banner).toMatchObject({
			href: 'https://tridentcubed.com',
			alt: 'Your upload'
		});
		await pickSignature(server, member, { banner: null }, request);
	});

	it('refuses what is not a picture, and anyone else’s signature', async () => {
		const text = new TextEncoder().encode('not a picture');

		expect(
			await uploadSignature(
				server,
				member,
				{ kind: 'photo', type: 'image/jpeg', bytes: text },
				request
			)
		).toEqual({ isAllowed: false, reason: 'That picture could not be read. Try another one.' });
		expect(
			await uploadSignature(
				server,
				member,
				{ kind: 'photo', type: 'image/gif', bytes: text },
				request
			)
		).toEqual({ isAllowed: false, reason: 'Send a JPEG, PNG or WebP picture.' });
		expect(
			await uploadSignature(
				server,
				member,
				{ person: adminRecord, kind: 'photo', type: 'image/png', bytes: wide },
				request
			)
		).toEqual({
			isAllowed: false,
			reason: 'Only an Admin can open someone else’s email signature.'
		});
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
		const person = allowed(await readSignature(server, admin, { person: memberRecord }, request));
		const mailbox = allowed(await readSignature(server, admin, { mailbox: 'operations' }, request));

		expect(person.signature.name).toBe('Tynequa Shaw');
		expect(person.mailboxes).toEqual([
			{ slug: 'operations', name: 'Operations', email: 'operations@tridentcubed.com' }
		]);
		expect(mailbox.signature).toMatchObject({
			type: 'group',
			name: 'Operations',
			src: `${ORIGIN}/signature/${toPictureName({ source: COMPANY_LOGO, kind: 'photo' })}`
		});
		expect(mailbox.choices).toBeUndefined();
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

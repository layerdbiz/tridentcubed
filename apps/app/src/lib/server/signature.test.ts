// Email signatures (#354) on the in-process database and a local file store: who may open and change which
// signature, a person's from their Team record with the Sheets filling in the rest, the photo and banners they pick,
// upload, edit and link, and every picture copied once as a small PNG to the app's public signature address, a photo
// in its circle, edited as the screen's editor left it. The Sheets, Google Drive and the website are answered by a
// stand-in fetch.
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
	editPicture,
	makePicture,
	readSignature,
	readUpload,
	saveSignature,
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
		expect(answer.mailboxes).toEqual([]);
	});

	it('starts with their Profile Images photo, not their profile picture, drawn in a circle', async () => {
		const answer = allowed(await readSignature(server, member, {}, request));

		expect(answer.parts?.photo.source).toBe('drive:1TynequaPhoto');
		expect(answer.signature.src).toMatch(/^http:\/\/localhost:5174\/signature\/[0-9a-f]{24}\.png$/);
		const { meta, alphaAt } = await readMade(answer.signature.src);
		expect(meta).toMatchObject({ format: 'png', width: 224, height: 224 });
		expect(alphaAt(0, 0)).toBe(0);
		expect(alphaAt(223, 223)).toBe(0);
		expect(alphaAt(112, 112)).toBe(255);
	});

	it('keeps a website signature photo in the circle it was drawn in', async () => {
		const answer = allowed(await readSignature(server, admin, {}, request));

		expect(answer.parts?.photo.source).toBe(WEBSITE_PHOTO);
		const { meta } = await readMade(answer.signature.src);
		expect(meta).toMatchObject({ format: 'png', width: 224, height: 263 });
	});

	it('copies the banner small and every website icon, so the signature points at the website for none', async () => {
		const answer = allowed(await readSignature(server, member, {}, request));
		const { banners, icons, logoImage } = answer.signature;

		expect(banners).toEqual([
			{
				href: 'https://tridentcubed.com',
				src: expect.stringMatching(/\/signature\//),
				alt: 'Map',
				width: 600,
				height: 175
			}
		]);
		expect((await readMade(banners?.[0].src)).meta).toMatchObject({ width: 1200, height: 350 });
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
		expect(toPictureName({ source: 'drive:1A', kind: 'photo', edit: { turns: 1 } })).not.toBe(
			first
		);
		expect(toPictureName({ source: 'drive:1A', kind: 'photo', edit: {} })).toBe(first);
	});

	it('makes an icon as it is, never larger', async () => {
		const made = await sharp(
			await makePicture(await makeSample(96, 96, '#ff0000ff'), 'icon')
		).metadata();

		expect(made).toMatchObject({ format: 'png', width: 96, height: 96 });
	});
});

describe('a picture as the editor leaves it', () => {
	// Four colours, one to each quarter: red top left, green top right, blue bottom left, white bottom right.
	let quarters: Buffer;
	const RED = [255, 0, 0];
	const GREEN = [0, 255, 0];
	const BLUE = [0, 0, 255];
	const WHITE = [255, 255, 255];

	beforeAll(async () => {
		const square = (colour: string) =>
			sharp({ create: { width: 100, height: 100, channels: 3, background: colour } })
				.png()
				.toBuffer();
		quarters = await sharp({
			create: { width: 200, height: 200, channels: 3, background: '#000000' }
		})
			.composite([
				{ input: await square('#ff0000'), left: 0, top: 0 },
				{ input: await square('#00ff00'), left: 100, top: 0 },
				{ input: await square('#0000ff'), left: 0, top: 100 },
				{ input: await square('#ffffff'), left: 100, top: 100 }
			])
			.png()
			.toBuffer();
	});

	async function colourAt(bytes: Buffer, x: number, y: number) {
		const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
		const at =
			(Math.round(y * (info.height - 1)) * info.width + Math.round(x * (info.width - 1))) *
			info.channels;
		return {
			colour: [data[at], data[at + 1], data[at + 2]],
			width: info.width,
			height: info.height
		};
	}

	it('is cut to its frame', async () => {
		const cut = await editPicture(quarters, { frame: { x: 0.5, y: 0, w: 0.5, h: 0.5 } });

		expect(await colourAt(cut, 0.5, 0.5)).toEqual({ colour: GREEN, width: 100, height: 100 });
	});

	it('is turned to the left a quarter at a time, then mirrored, then cut', async () => {
		// Turned once to the left, green is top left and white top right; mirrored, white is top left and blue
		// bottom left.
		expect((await colourAt(await editPicture(quarters, { turns: 1 }), 0.1, 0.1)).colour).toEqual(
			GREEN
		);
		expect(
			(await colourAt(await editPicture(quarters, { turns: 1, isFlipped: true }), 0.1, 0.1)).colour
		).toEqual(WHITE);
		const cut = await editPicture(quarters, {
			turns: 1,
			isFlipped: true,
			frame: { x: 0, y: 0.5, w: 0.5, h: 0.5 }
		});
		expect((await colourAt(cut, 0.5, 0.5)).colour).toEqual(BLUE);
	});

	it('is straightened about its frame’s middle and grown so the frame stays covered', async () => {
		const cut = await editPicture(quarters, { tilt: 20, frame: { x: 0, y: 0.5, w: 0.5, h: 0.5 } });
		const { width, height, colour } = await colourAt(cut, 0.5, 0.5);

		expect(colour).toEqual(BLUE);
		expect(width).toBeLessThan(100);
		expect(width).toBe(height);
		// Grown to cover the frame, no corner sees through to the picture's outside.
		const { data, info } = await sharp(cut)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect(data[3]).toBe(255);
		expect(data[(info.width * info.height - 1) * 4 + 3]).toBe(255);
	});

	it('keeps a photo square when the edit picks no shape, and cut where the frame was', async () => {
		const wide = await sharp({
			create: { width: 400, height: 200, channels: 3, background: '#0000ff' }
		})
			.composite([
				{
					input: await sharp({
						create: { width: 200, height: 200, channels: 3, background: '#ff0000' }
					})
						.png()
						.toBuffer(),
					left: 200,
					top: 0
				}
			])
			.png()
			.toBuffer();
		const photo = await makePicture(wide, 'photo', { frame: { x: 0.5, y: 0, w: 0.5, h: 1 } });
		const { data, info } = await sharp(photo).raw().toBuffer({ resolveWithObject: true });

		expect(info).toMatchObject({ width: 224, height: 224 });
		const middle = (112 * 224 + 112) * info.channels;
		expect([data[middle], data[middle + 1], data[middle + 2]]).toEqual(RED);
	});
});

describe('saving a signature’s photo and banners', () => {
	it('keeps the photo picked, its edit and its link, and back to the start with none', async () => {
		const edit = { turns: 1 };
		const answer = allowed(
			await saveSignature(
				server,
				member,
				{ photo: { source: 'drive:1LogoPhoto', edit, link: 'tridentcubed.com/team' } },
				request
			)
		);

		expect(answer.parts?.photo).toMatchObject({
			source: 'drive:1LogoPhoto',
			edit,
			link: 'https://tridentcubed.com/team',
			isPicked: true
		});
		expect(answer.signature.href).toBe('https://tridentcubed.com/team');
		expect(answer.signature.src).toBe(
			`${ORIGIN}/signature/${toPictureName({ source: 'drive:1LogoPhoto', kind: 'photo', edit })}`
		);

		const back = allowed(await saveSignature(server, member, { photo: null }, request));
		expect(back.parts?.photo).toMatchObject({ source: 'drive:1TynequaPhoto', isPicked: false });
		expect(back.parts?.photo.edit).toBeUndefined();
	});

	it('keeps ONE banner with its link and edit, its panel in the order left, the Sheet’s again with none', async () => {
		const banner = {
			id: 'expo',
			source: 'drive:1ExpoBanner',
			link: 'https://expo.example/stand',
			edit: { turns: 2 }
		};
		const answer = allowed(await saveSignature(server, member, { banner }, request));

		expect(answer.parts?.banner).toMatchObject(banner);
		expect(answer.signature.banners?.map((each) => [each.href, each.alt])).toEqual([
			['https://expo.example/stand', 'Expo']
		]);

		const moved = allowed(
			await saveSignature(
				server,
				member,
				{
					banners: [
						{ source: 'drive:1ExpoBanner' },
						{ source: 'drive:1MapBanner', edit: { isFlipped: true } }
					]
				},
				request
			)
		);
		expect(moved.parts?.banners.map(({ source, edit }) => ({ source, edit }))).toEqual([
			{ source: 'drive:1ExpoBanner', edit: undefined },
			{ source: 'drive:1MapBanner', edit: { isFlipped: true } }
		]);
		expect(moved.parts?.banner?.source).toBe('drive:1ExpoBanner');

		const back = allowed(await saveSignature(server, member, { banner: null }, request));
		expect(back.parts?.banner?.source).toBe('drive:1MapBanner');
		expect(back.signature.banners).toHaveLength(1);
	});

	it('takes only a photo or banner offered, and a link that is an address', async () => {
		expect(
			await saveSignature(
				server,
				member,
				{ photo: { source: 'drive:1SomeoneElse', link: '' } },
				request
			)
		).toEqual({ isAllowed: false, reason: 'That photo is not one to pick.' });
		expect(
			await saveSignature(
				server,
				member,
				{ banner: { id: 'a', source: 'https://example.com/a.png', link: '' } },
				request
			)
		).toEqual({ isAllowed: false, reason: 'That banner is not one to pick.' });
		expect(
			await saveSignature(
				server,
				member,
				{ banners: [{ source: 'https://example.com/a.png' }] },
				request
			)
		).toEqual({ isAllowed: false, reason: 'That banner is not one to pick.' });
		expect(
			await saveSignature(
				server,
				member,
				{ banner: { id: 'a', source: 'drive:1MapBanner', link: 'not a link' } },
				request
			)
		).toEqual({ isAllowed: false, reason: 'That banner link is not an address.' });
	});

	it('shows the group emails picked, offers an Admin’s new one to everyone, and only an Admin adds one', async () => {
		const answer = allowed(
			await saveSignature(server, member, { groupEmails: ['OPERATIONS@tridentcubed.com'] }, request)
		);
		expect(answer.parts?.groupEmails).toEqual(['operations@tridentcubed.com']);
		expect(answer.signature.group).toBe('operations@tridentcubed.com');

		expect(
			await saveSignature(server, member, { groupEmails: ['made-up@example.com'] }, request)
		).toEqual({ isAllowed: false, reason: 'That group email is not one to pick.' });
		expect(
			await saveSignature(
				server,
				member,
				{ addGroup: { email: 'sales@example.com', name: 'Sales' } },
				request
			)
		).toEqual({ isAllowed: false, reason: 'Only an Admin adds a group email.' });
		expect(
			await saveSignature(server, admin, { addGroup: { email: 'not one', name: '' } }, request)
		).toEqual({ isAllowed: false, reason: 'That is not an email address.' });

		const added = allowed(
			await saveSignature(
				server,
				admin,
				{ addGroup: { email: 'sales@example.com', name: 'Sales' } },
				request
			)
		);
		expect(added.parts?.groups.at(-1)).toEqual({ email: 'sales@example.com', name: 'Sales' });
		// Added once, whoever adds it again.
		const again = allowed(
			await saveSignature(
				server,
				admin,
				{ addGroup: { email: 'SALES@example.com', name: '' } },
				request
			)
		);
		expect(
			again.parts?.groups.filter((each) => each.email.toLowerCase() === 'sales@example.com')
		).toHaveLength(1);

		const picked = allowed(
			await saveSignature(server, member, { groupEmails: ['sales@example.com'] }, request)
		);
		expect(picked.signature.group).toBe('sales@example.com');
		const none = allowed(await saveSignature(server, member, { groupEmails: [] }, request));
		expect(none.signature.group).toBeFalsy();
		const back = allowed(await saveSignature(server, member, { groupEmails: null }, request));
		expect(back.parts?.groupEmails).toEqual(['operations@tridentcubed.com']);
	});

	it('shows the company logo, copied, when the picked photo cannot be read', async () => {
		const answer = allowed(
			await saveSignature(
				server,
				member,
				{ photo: { source: 'drive:1GonePhoto', link: '' } },
				request
			)
		);

		expect(answer.signature.src).toBe(
			`${ORIGIN}/signature/${toPictureName({ source: COMPANY_LOGO, kind: 'photo' })}`
		);
		await saveSignature(server, member, { photo: null }, request);
	});

	it('is the person’s own, or an Admin’s for anyone', async () => {
		expect(
			await saveSignature(server, member, { person: adminRecord, banners: [] }, request)
		).toEqual({
			isAllowed: false,
			reason: 'Only an Admin can open someone else’s email signature.'
		});
		const answer = allowed(
			await saveSignature(
				server,
				admin,
				{ person: memberRecord, photo: { source: 'drive:1LogoPhoto', link: '' } },
				request
			)
		);
		expect(answer.signature.id).toBe(memberRecord);
		expect(answer.parts?.photo.source).toBe('drive:1LogoPhoto');
		await saveSignature(server, admin, { person: memberRecord, photo: null }, request);
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

		const source = answer.parts?.photo.source ?? '';
		expect(source).toMatch(/^upload:[0-9a-f]{24}\.jpg$/);
		expect(answer.parts?.photos.at(-1)).toMatchObject({
			source,
			label: 'Your upload',
			isOwn: true
		});
		const { meta, alphaAt } = await readMade(answer.signature.src);
		expect(meta).toMatchObject({ width: 224, height: 224 });
		expect(alphaAt(0, 0)).toBe(0);
		const file = source.slice('upload:'.length);
		expect(await store.read(`signatures/uploads/${file}`)).toEqual(bytes);
		// The editor opens it as it came, from the app.
		expect(answer.parts?.photo.original).toBe(`/api/signature?upload=${file}`);
		expect(await readUpload(store, file)).toEqual({ bytes, type: 'image/jpeg' });
		expect(await readUpload(store, '../secret.jpg')).toBeUndefined();
		await saveSignature(server, member, { photo: null }, request);
	});

	it('takes a banner the same way, under the others, linking to the website', async () => {
		const answer = allowed(
			await uploadSignature(
				server,
				member,
				{ kind: 'banner', type: 'image/png', bytes: wide },
				request
			)
		);

		const upload = expect.stringMatching(/^upload:[0-9a-f]{24}\.png$/);
		// At the end of the panel, after the company banners in the order they were left.
		expect(answer.parts?.banners.map((each) => each.source)).toEqual([
			'drive:1ExpoBanner',
			'drive:1MapBanner',
			upload
		]);
		expect(answer.parts?.banner?.source).toEqual(upload);
		expect(answer.signature.banners).toHaveLength(1);
		expect(answer.signature.banners?.[0]).toMatchObject({
			href: 'https://tridentcubed.com',
			alt: 'Trident Cubed'
		});
		await saveSignature(server, member, { banner: null }, request);
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
		expect(mailbox.parts).toBeUndefined();
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

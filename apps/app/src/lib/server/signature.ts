// Email signatures (#354): one signature as the screen shows and copies it, and the photo and banner a person picks or
// uploads for it. A person's comes from their Team record, with the signature Sheets filling in what the app does not
// hold yet; a shared mailbox's comes from its Sheet row. Who may open and change which is the one permission check
// (`checkSignature`). Loaded only by /api/signature, its own Vercel function, because the pictures are made here.
//
// A pasted signature keeps each picture as a web address that every reader's mail app loads, signed out, every time
// the email is opened, which is what ran up the website's Vercel use (Justin, 2026-11-27). So every picture, the
// website's icons and logos too, is copied once into the file store as a small PNG at twice the size it shows, named
// by a hash of what it was made from, and the signature points at the app's public signature address for it
// (`/signature/<name>.png`): one request with no redirect, answered from Vercel's cache and kept by mail apps for a
// year, since a name never changes. An email already sent keeps working whichever storage or database stands behind
// the address later; a new photo gets a new name. A photo is always a circle (Justin, 2026-11-27: "it should always
// be a circle"), except a website signature photo already drawn in its circle. A picture that cannot be read or made
// is left out: the company logo shows instead of a photo, no banner, and the website's own icon.
import { createHash, randomUUID } from 'node:crypto';
import { and, asc, eq, isNull } from 'drizzle-orm';
import sharp from 'sharp';
import {
	CIRCLE_SIZE,
	COMPANY_LOGO,
	MAX_UPLOAD_BYTES,
	PICTURE_SIZES,
	PICTURE_VERSION,
	SHEETS,
	SIGNATURE_FOLDER,
	SIGNATURE_PICTURES,
	UPLOAD,
	UPLOAD_FILE,
	UPLOAD_FOLDER
} from '#lib/signature/signature.constants.js';
import type {
	ChoiceType,
	SignatureKindType,
	PictureSourceType,
	SignatureAnswerType,
	SignatureAskType,
	SignaturePickType
} from '#lib/signature/signature.types.js';
import {
	type MadeLookType,
	NO_SHEETS,
	type SavedPicksType,
	type SheetsType,
	type SignatureLookType,
	toBannerChoices,
	toBannerSource,
	toFetchAddress,
	toIconPictures,
	toMailboxLook,
	toMailboxSignature,
	toPersonLook,
	toPersonSignature,
	toPhotoChoices,
	toPhotoSource,
	toSheets
} from '#lib/signature/signature.utils.js';
import type { ActorType, ClaimsType } from './db/claims';
import { signature as signatures, team } from './db/schema';
import { checkSignature } from './permission';
import type { FileStoreType } from './store';

type SignatureServerType = { claims: ClaimsType; store: FileStoreType };

/** What reading a signature needs from its request: where the app is, and a way to fetch. */
export type SignatureRequestType = { origin: string; fetch: typeof fetch };

// The Sheets change rarely and are read whole, so one read serves every signature for a few minutes; a failed read
// is tried again sooner.
const SHEETS_MS = 5 * 60 * 1000;
const FAILED_SHEETS_MS = 30 * 1000;
const FETCH_TIMEOUT_MS = 8000;
let kept: { at: number; ms: number; sheets: Promise<SheetsType> } | undefined;

async function readSheet(send: typeof fetch, sheet: string, tab: string) {
	const response = await send(`${SHEETS.api}/${sheet}/${tab}`, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
	});
	if (!response.ok) throw new Error(`Sheetari answered ${response.status} for ${tab}.`);
	return response.json() as Promise<unknown>;
}

/** The signature Sheets, read whole; nothing from them when they cannot be read. */
export function readSheets(send: typeof fetch, now = Date.now()): Promise<SheetsType> {
	if (kept && now - kept.at < kept.ms) return kept.sheets;
	const entry = { at: now, ms: SHEETS_MS, sheets: Promise.resolve(NO_SHEETS) };
	entry.sheets = Promise.all([
		readSheet(send, SHEETS.people, 'person'),
		readSheet(send, SHEETS.people, 'group'),
		readSheet(send, SHEETS.people, 'banner'),
		readSheet(send, SHEETS.people, 'profile'),
		readSheet(send, SHEETS.social, 'social')
	]).then(
		([people, mailboxes, banners, profiles, social]) =>
			toSheets({ people, mailboxes, banners, profiles, social }),
		() => {
			entry.ms = FAILED_SHEETS_MS;
			return NO_SHEETS;
		}
	);
	kept = entry;
	return entry.sheets;
}

/** A signature picture's file name: a hash of what it is made from and how, so it is never written twice. */
export function toPictureName(picture: PictureSourceType) {
	const made = `${PICTURE_VERSION}\n${picture.kind}\n${picture.source}\n${picture.version ?? ''}`;
	return `${createHash('sha256').update(made).digest('hex').slice(0, 24)}.png`;
}

// Whether a picture is already drawn in a shape of its own: its four corners see through, as a website signature
// photo's do around its circle. A photo with a background is drawn in the circle.
async function isShaped(bytes: Uint8Array) {
	const { data, info } = await sharp(bytes)
		.rotate()
		.ensureAlpha()
		.resize(8, 8, { fit: 'fill' })
		.raw()
		.toBuffer({ resolveWithObject: true });
	const corners = [0, info.width - 1, (info.height - 1) * info.width, info.height * info.width - 1];
	return corners.every((pixel) => data[pixel * info.channels + 3] < 32);
}

// A photo or banner keeps 256 colours: a quarter of the bytes, and it looks the same at the size a signature shows it.
const PALETTE = { palette: true, quality: 90, effort: 10, compressionLevel: 9 } as const;

// A photo in the circle: cut square around what draws the eye (a face), then everything outside the circle cleared.
async function makeCircle(bytes: Uint8Array) {
	const size = CIRCLE_SIZE;
	const mask = Buffer.from(
		`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`
	);
	const square = await sharp(bytes)
		.rotate()
		.resize(size, size, { fit: 'cover', position: sharp.strategy.attention })
		.ensureAlpha()
		.toBuffer();
	return sharp(square)
		.composite([{ input: mask, blend: 'dest-in' }])
		.png(PALETTE)
		.toBuffer();
}

/**
 * The signature picture made from `bytes`, as a PNG at twice its shown size: a photo in its circle, a banner, or an
 * icon or logo as it is.
 */
export async function makePicture(bytes: Uint8Array, kind: SignatureKindType) {
	if (kind === 'photo' && !(await isShaped(bytes))) return new Uint8Array(await makeCircle(bytes));
	const { width, height } = PICTURE_SIZES[kind];
	const sized = sharp(bytes)
		.rotate()
		.resize({ width, height, fit: 'inside', withoutEnlargement: true });
	const png = kind === 'icon' ? sized.png({ compressionLevel: 9 }) : sized.png(PALETTE);
	return new Uint8Array(await png.toBuffer());
}

// The bytes of a picture a signature shows: an upload from the file store, anything else from its address.
async function readSource(store: FileStoreType, source: string, request: SignatureRequestType) {
	if (source.startsWith(UPLOAD)) {
		const file = source.slice(UPLOAD.length);
		return UPLOAD_FILE.test(file) ? store.read(`${UPLOAD_FOLDER}/${file}`) : undefined;
	}
	const url = new URL(toFetchAddress(source), request.origin);
	if (url.protocol !== 'https:' && url.origin !== request.origin) return undefined;
	const response = await request.fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;
}

// The pictures this copy of the server has made or found, so a signature opened again reads nothing to know it.
const made = new Set<string>();

/**
 * Where a signature shows this picture: the app's public signature address, the picture made the first time it is
 * asked for. Nothing when it cannot be read or made.
 */
export async function toPictureAddress(
	store: FileStoreType,
	picture: PictureSourceType | undefined,
	request: SignatureRequestType
) {
	if (!picture?.source) return undefined;
	const name = toPictureName(picture);
	const address = new URL(`${SIGNATURE_PICTURES}${name}`, request.origin).href;
	const path = `${SIGNATURE_FOLDER}/${name}`;
	if (made.has(path)) return address;
	const isThere = await store.read(path).then(
		() => true,
		() => false
	);
	if (isThere) {
		made.add(path);
		return address;
	}
	try {
		const bytes = await readSource(store, picture.source, request);
		if (!bytes) return undefined;
		await store.write(path, await makePicture(bytes, picture.kind), 'image/png');
		made.add(path);
		return address;
	} catch {
		return undefined;
	}
}

// Every picture a signature shows, copied: the photo (the company logo's when it cannot be made), the banner and the
// website's icons and logos (left out when one cannot be made, so the website's own shows).
async function makeLook(
	store: FileStoreType,
	look: SignatureLookType,
	request: SignatureRequestType
): Promise<MadeLookType> {
	const icons = toIconPictures();
	const [photo, banner, ...made] = await Promise.all([
		toPictureAddress(store, look.photo, request).then(
			(address) =>
				address ?? toPictureAddress(store, { source: COMPANY_LOGO, kind: 'photo' }, request)
		),
		toPictureAddress(store, look.banner?.picture, request),
		...icons.map((icon) => toPictureAddress(store, icon.picture, request))
	]);
	const shown: MadeLookType['icons'] = {};
	for (const [index, icon] of icons.entries()) {
		if (made[index]) shown[icon.name] = made[index];
	}
	return { photo, banner, icons: shown };
}

const RECORD_COLUMNS = {
	id: team.id,
	userId: team.userId,
	name: team.name,
	title: team.title,
	phone: team.phone,
	email: team.email,
	link: team.link
};

// The Team record asked for, or the User's own; for an Admin with none of their own, the first on the Team page.
async function findRecord(
	claims: ClaimsType,
	actor: ActorType,
	person: string | undefined,
	isAdmin: boolean
) {
	return claims.run(actor, async (tx) => {
		const isKept = isNull(team.deletedAt);
		const order = [asc(team.rank), asc(team.name)];
		const select = () => tx.select(RECORD_COLUMNS).from(team);
		if (person) return (await select().where(and(isKept, eq(team.id, person))))[0];
		const [own] = await select().where(and(isKept, eq(team.userId, actor.userId)));
		if (own || !isAdmin) return own;
		return (
			await select()
				.where(isKept)
				.orderBy(...order)
				.limit(1)
		)[0];
	});
}

type RecordType = NonNullable<Awaited<ReturnType<typeof findRecord>>>;

// What the person picked for their signature; nothing when they never did.
async function readPicks(claims: ClaimsType, actor: ActorType, teamId: string) {
	const [row] = await claims.run(actor, (tx) =>
		tx
			.select({ photo: signatures.photo, banner: signatures.banner })
			.from(signatures)
			.where(and(eq(signatures.teamId, teamId), isNull(signatures.deletedAt)))
	);
	return (row ?? {}) as SavedPicksType;
}

// An upload's picker picture is its own signature picture, made when it was uploaded.
async function toShownChoices(
	store: FileStoreType,
	choices: ChoiceType[],
	kind: SignatureKindType,
	request: SignatureRequestType
) {
	return Promise.all(
		choices.map(async (choice) =>
			choice.preview
				? choice
				: {
						...choice,
						preview: (await toPictureAddress(store, { source: choice.source, kind }, request)) ?? ''
					}
		)
	);
}

// A person's signature, with what they can pick for it.
async function answerPerson(
	server: SignatureServerType,
	actor: ActorType,
	record: RecordType,
	sheets: SheetsType,
	request: SignatureRequestType
) {
	const picks = await readPicks(server.claims, actor, record.id);
	const look = toPersonLook(record, sheets, picks);
	const [made, photos, banners] = await Promise.all([
		makeLook(server.store, look, request),
		toShownChoices(server.store, toPhotoChoices(record, sheets, picks.photo), 'photo', request),
		toShownChoices(server.store, toBannerChoices(sheets, picks.banner), 'banner', request)
	]);
	return {
		signature: toPersonSignature(record, sheets, look, made),
		choices: {
			photos,
			banners,
			photo: toPhotoSource(record, sheets, picks.photo),
			banner: toBannerSource(record, sheets, picks.banner)
		}
	};
}

function toMailboxes(sheets: SheetsType, isAdmin: boolean) {
	return isAdmin ? sheets.mailboxes.map(({ slug, name, email }) => ({ slug, name, email })) : [];
}

/** One email signature, as `actor` may see it, with the shared mailboxes for an Admin and a person's choices. */
export async function readSignature(
	server: SignatureServerType,
	actor: ActorType,
	ask: SignatureAskType,
	request: SignatureRequestType
): Promise<SignatureAnswerType> {
	const isAdmin = checkSignature(actor, { isOwn: false }).isAllowed;
	if (ask.mailbox) {
		const verdict = checkSignature(actor, { isOwn: false, isMailbox: true });
		if (!verdict.isAllowed) return verdict;
	}
	const sheets = await readSheets(request.fetch);
	const mailboxes = toMailboxes(sheets, isAdmin);

	if (ask.mailbox) {
		const mailbox = sheets.mailboxes.find((each) => each.slug === ask.mailbox);
		if (!mailbox) return { isAllowed: false, reason: 'That shared mailbox is not in the Sheet.' };
		const look = toMailboxLook(mailbox, sheets);
		const made = await makeLook(server.store, look, request);
		return {
			isAllowed: true,
			signature: toMailboxSignature(mailbox, sheets, look, made),
			mailboxes
		};
	}

	const found = await findAllowed(server, actor, ask.person, isAdmin);
	if (!found.isAllowed) return found;
	const person = await answerPerson(server, actor, found.record, sheets, request);
	return { isAllowed: true, ...person, mailboxes };
}

// The Team record asked for, when `actor` may open and change its signature.
async function findAllowed(
	server: SignatureServerType,
	actor: ActorType,
	person: string | undefined,
	isAdmin: boolean
): Promise<{ isAllowed: true; record: RecordType } | { isAllowed: false; reason: string }> {
	const record = await findRecord(server.claims, actor, person, isAdmin);
	if (!record) {
		return {
			isAllowed: false,
			reason: person
				? 'That Team record is not there.'
				: 'You have no Team record yet. An Admin can add you on the Team page.'
		};
	}
	const verdict = checkSignature(actor, { isOwn: record.userId === actor.userId });
	return verdict.isAllowed ? { isAllowed: true, record } : verdict;
}

// Keeps a person's picks, the ones given (`undefined` leaves one as it is).
async function writePicks(
	claims: ClaimsType,
	actor: ActorType,
	teamId: string,
	picks: SavedPicksType
) {
	const organizationId = actor.organizationId;
	if (!organizationId) return;
	const changed = {
		...(picks.photo !== undefined ? { photo: picks.photo } : {}),
		...(picks.banner !== undefined ? { banner: picks.banner } : {})
	};
	await claims.run(actor, (tx) =>
		tx
			.insert(signatures)
			.values({ id: randomUUID(), organizationId, teamId, ...changed })
			.onConflictDoUpdate({
				target: [signatures.organizationId, signatures.teamId],
				set: { ...changed, updatedAt: new Date(), deletedAt: null }
			})
	);
}

/**
 * Keeps the photo and banner picked for a person's signature (the User's own with no `person`): each one of its
 * choices, '' for no banner, or `null` to follow the Sheet and the defaults again. Answers the signature as it is now.
 */
export async function pickSignature(
	server: SignatureServerType,
	actor: ActorType,
	pick: SignaturePickType,
	request: SignatureRequestType
): Promise<SignatureAnswerType> {
	const isAdmin = checkSignature(actor, { isOwn: false }).isAllowed;
	const found = await findAllowed(server, actor, pick.person, isAdmin);
	if (!found.isAllowed) return found;
	const sheets = await readSheets(request.fetch);
	const saved = await readPicks(server.claims, actor, found.record.id);
	const photos = toPhotoChoices(found.record, sheets, saved.photo).map((each) => each.source);
	const banners = toBannerChoices(sheets, saved.banner).map((each) => each.source);
	if (pick.photo && !photos.includes(pick.photo)) {
		return { isAllowed: false, reason: 'That photo is not one to pick.' };
	}
	if (pick.banner && !banners.includes(pick.banner)) {
		return { isAllowed: false, reason: 'That banner is not one to pick.' };
	}
	await writePicks(server.claims, actor, found.record.id, {
		photo: pick.photo,
		banner: pick.banner
	});
	return readSignature(server, actor, { person: found.record.id }, request);
}

/** The picture types an upload takes: what every browser draws and the screen sends. */
export const UPLOAD_TYPES: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

/**
 * Keeps a picture uploaded for a person's signature as its photo or banner: the file as it came, in the files
 * bucket, and its signature picture made at once, so one that cannot be read is refused here.
 */
export async function uploadSignature(
	server: SignatureServerType,
	actor: ActorType,
	upload: { person?: string; kind: 'photo' | 'banner'; type: string; bytes: Uint8Array },
	request: SignatureRequestType
): Promise<SignatureAnswerType> {
	const ending = UPLOAD_TYPES[upload.type];
	if (!ending) return { isAllowed: false, reason: 'Send a JPEG, PNG or WebP picture.' };
	if (!upload.bytes.length || upload.bytes.length > MAX_UPLOAD_BYTES) {
		return { isAllowed: false, reason: 'That picture is too big. Pick a smaller one.' };
	}
	const isAdmin = checkSignature(actor, { isOwn: false }).isAllowed;
	const found = await findAllowed(server, actor, upload.person, isAdmin);
	if (!found.isAllowed) return found;

	const hash = createHash('sha256').update(upload.bytes).digest('hex').slice(0, 24);
	const source = `${UPLOAD}${hash}.${ending}`;
	let picture: Uint8Array;
	try {
		picture = await makePicture(upload.bytes, upload.kind);
	} catch {
		return { isAllowed: false, reason: 'That picture could not be read. Try another one.' };
	}
	const path = `${SIGNATURE_FOLDER}/${toPictureName({ source, kind: upload.kind })}`;
	await server.store.write(`${UPLOAD_FOLDER}/${hash}.${ending}`, upload.bytes, upload.type);
	await server.store.write(path, picture, 'image/png');
	made.add(path);
	const picks = upload.kind === 'photo' ? { photo: source } : { banner: source };
	await writePicks(server.claims, actor, found.record.id, picks);
	return readSignature(server, actor, { person: found.record.id }, request);
}

// Email signatures (#354): one signature as the screen shows and copies it. A person's comes from their Team record,
// with the signature Sheets filling in what the app does not hold yet; a shared mailbox's comes from its Sheet row.
// Who may open which is the one permission check (`checkSignature`). Loaded only by /api/signature, its own Vercel
// function, because the pictures are made here with sharp.
//
// A pasted signature keeps each picture as a web address that every reader's mail app loads, signed out, for as long
// as the email is read. So every picture that is not one of the website's own files (a starting file, an app file,
// Google Drive, a sign-in picture) is copied once into the file store as a PNG at twice the size it shows, named by a
// hash of what it was made from, and the signature points at the app's public signature address for it
// (`/signature/<name>.png`). Its name never changes, so an email already sent keeps working whichever storage or
// database stands behind the address later; a new photo gets a new name. A picture that cannot be read or made is
// left out: the company logo shows instead of a photo, and no banner.
import { createHash } from 'node:crypto';
import { and, asc, eq, isNull } from 'drizzle-orm';
import sharp from 'sharp';
import {
	PICTURE_SIZES,
	PICTURE_VERSION,
	SHEETS,
	SIGNATURE_FOLDER,
	SIGNATURE_PICTURES
} from '#lib/signature/signature.constants.js';
import type {
	PictureSourceType,
	SignatureAnswerType,
	SignatureAskType
} from '#lib/signature/signature.types.js';
import {
	isCopied,
	NO_SHEETS,
	type SheetsType,
	toMailboxPictures,
	toMailboxSignature,
	toPersonPictures,
	toPersonSignature,
	toSheets
} from '#lib/signature/signature.utils.js';
import { toStartFile, START_PATH } from '#lib/start/files.js';
import type { ActorType, ClaimsType } from './db/claims';
import { team } from './db/schema';
import { readFile } from './files';
import { checkSignature } from './permission';
import type { FileStoreType } from './store';

type SignatureServerType = { claims: ClaimsType; store: FileStoreType };

/** What reading a signature needs from its request: where the app is, and a way to fetch. */
export type SignatureRequestType = { origin: string; fetch: typeof fetch };

// The Sheets change rarely and are read whole, so one read serves every signature for a few minutes; a failed read
// is tried again sooner.
const SHEETS_MS = 5 * 60 * 1000;
const FAILED_SHEETS_MS = 30 * 1000;
const SHEET_TIMEOUT_MS = 8000;
let kept: { at: number; ms: number; sheets: Promise<SheetsType> } | undefined;

async function readSheet(send: typeof fetch, sheet: string, tab: string) {
	const response = await send(`${SHEETS.api}/${sheet}/${tab}`, {
		signal: AbortSignal.timeout(SHEET_TIMEOUT_MS)
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
		readSheet(send, SHEETS.social, 'social')
	]).then(
		([people, mailboxes, banners, social]) => toSheets({ people, mailboxes, banners, social }),
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
	const made = `${PICTURE_VERSION}\n${picture.kind}\n${picture.source}`;
	return `${createHash('sha256').update(made).digest('hex').slice(0, 24)}.png`;
}

/** The signature picture made from `bytes`: a photo or a banner at twice its shown size, as a PNG. */
export async function makePicture(bytes: Uint8Array, kind: PictureSourceType['kind']) {
	const { width, height } = PICTURE_SIZES[kind];
	const sized = sharp(bytes)
		.rotate()
		.resize({ width, height, fit: 'inside', withoutEnlargement: true });
	// A banner is drawn artwork, which a palette keeps small; a photo keeps every colour.
	const png =
		kind === 'banner'
			? sized.png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
			: sized.png({ compressionLevel: 9 });
	return new Uint8Array(await png.toBuffer());
}

const FILE_ADDRESS = /^\/files\/([0-9a-f-]{36})$/i;

// The bytes of a picture a signature shows, wherever the app keeps it.
async function readSource(
	server: SignatureServerType,
	actor: ActorType,
	source: string,
	request: SignatureRequestType
) {
	const file = source.match(FILE_ADDRESS)?.[1];
	if (file) {
		const found = await readFile(server.claims, actor, file);
		return found ? server.store.read(found.path) : undefined;
	}
	const start = source.startsWith(START_PATH) ? toStartFile(source) : undefined;
	const url = start ? new URL(start, request.origin) : new URL(source);
	if (url.protocol !== 'https:' && url.protocol !== 'data:' && url.origin !== request.origin) {
		return undefined;
	}
	const response = await request.fetch(url, { signal: AbortSignal.timeout(SHEET_TIMEOUT_MS) });
	return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;
}

/**
 * Where a signature shows this picture: the website's own files where they are, anything else at the app's public
 * signature address, made the first time it is asked for. Nothing when it cannot be read or made.
 */
export async function toPictureAddress(
	server: SignatureServerType,
	actor: ActorType,
	picture: PictureSourceType | undefined,
	request: SignatureRequestType
) {
	if (!picture) return undefined;
	if (!isCopied(picture.source)) return picture.source;
	const name = toPictureName(picture);
	const address = new URL(`${SIGNATURE_PICTURES}${name}`, request.origin).href;
	const path = `${SIGNATURE_FOLDER}/${name}`;
	const isMade = await server.store.read(path).then(
		() => true,
		() => false
	);
	if (isMade) return address;
	try {
		const bytes = await readSource(server, actor, picture.source, request);
		if (!bytes) return undefined;
		await server.store.write(path, await makePicture(bytes, picture.kind), 'image/png');
		return address;
	} catch {
		return undefined;
	}
}

const RECORD_COLUMNS = {
	id: team.id,
	userId: team.userId,
	name: team.name,
	title: team.title,
	phone: team.phone,
	email: team.email,
	link: team.link,
	photo: team.photo
};

// The Team record asked for, or the User's own; for an Admin with none of their own, the first on the Team page.
async function findRecord(
	claims: ClaimsType,
	actor: ActorType,
	person: string | undefined,
	isAdmin: boolean
) {
	return claims.run(actor, async (tx) => {
		const kept = isNull(team.deletedAt);
		const order = [asc(team.rank), asc(team.name)];
		const select = () => tx.select(RECORD_COLUMNS).from(team);
		if (person) return (await select().where(and(kept, eq(team.id, person))))[0];
		const [own] = await select().where(and(kept, eq(team.userId, actor.userId)));
		if (own || !isAdmin) return own;
		return (
			await select()
				.where(kept)
				.orderBy(...order)
				.limit(1)
		)[0];
	});
}

/** One email signature, as `actor` may see it, with the shared mailboxes for an Admin. */
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
	const mailboxes = isAdmin
		? sheets.mailboxes.map(({ slug, name, email }) => ({ slug, name, email }))
		: [];

	if (ask.mailbox) {
		const mailbox = sheets.mailboxes.find((each) => each.slug === ask.mailbox);
		if (!mailbox) return { isAllowed: false, reason: 'That shared mailbox is not in the Sheet.' };
		const wanted = toMailboxPictures(mailbox, sheets);
		const [photo, banner] = await Promise.all([
			toPictureAddress(server, actor, wanted.photo, request),
			toPictureAddress(server, actor, wanted.banner, request)
		]);
		return {
			isAllowed: true,
			signature: toMailboxSignature(mailbox, sheets, { photo, banner }),
			mailboxes
		};
	}

	const record = await findRecord(server.claims, actor, ask.person, isAdmin);
	if (!record) {
		return {
			isAllowed: false,
			reason: ask.person
				? 'That Team record is not there.'
				: 'You have no Team record yet. An Admin can add you on the Team page.'
		};
	}
	const verdict = checkSignature(actor, { isOwn: record.userId === actor.userId });
	if (!verdict.isAllowed) return verdict;
	const wanted = toPersonPictures(record, sheets);
	const [photo, banner] = await Promise.all([
		toPictureAddress(server, actor, wanted.photo, request),
		toPictureAddress(server, actor, wanted.banner, request)
	]);
	return {
		isAllowed: true,
		signature: toPersonSignature(record, sheets, { photo, banner }),
		mailboxes
	};
}

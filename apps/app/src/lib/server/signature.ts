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
import sharp, { type OutputInfo, type Sharp } from 'sharp';
import {
	cleanEdit,
	type EditType,
	frameOf,
	hasEdit,
	keptAspectOf,
	tiltCover
} from '#lib/components/photo/edit.js';
import {
	CIRCLE_SIZE,
	COMPANY_LOGO,
	MAX_UPLOAD_BYTES,
	MAX_UPLOADS,
	PICTURE_SIZES,
	PICTURE_VERSION,
	PROFILE,
	SHEETS,
	SIGNATURE_FOLDER,
	SIGNATURE_PICTURES,
	UPLOAD,
	UPLOAD_BANNER_LINK,
	UPLOAD_FILE,
	UPLOAD_FOLDER
} from '#lib/signature/signature.constants.js';
import type {
	GroupEmailType,
	PanelPictureType,
	PictureSourceType,
	SignatureAnswerType,
	SignatureAskType,
	SignatureBannerType,
	SignatureKindType,
	SignaturePhotoType,
	SignatureSaveType
} from '#lib/signature/signature.types.js';
import {
	type MadeLookType,
	type MadePictureType,
	NO_SHEETS,
	type SavedPicksType,
	type SheetsType,
	type SignatureLookType,
	toBannerPanel,
	toEmailKey,
	toFetchAddress,
	toGroupChoices,
	toGroupEmails,
	toIconPictures,
	toLink,
	toMailboxLook,
	toMailboxSignature,
	toPersonBanner,
	toPersonLook,
	toPersonParts,
	toPersonPhoto,
	toPersonSignature,
	toPhotoLink,
	toPhotoPanel,
	toSheets
} from '#lib/signature/signature.utils.js';
import { toStartFile } from '#lib/start/files.js';
import type { ActorType, ClaimsType } from './db/claims';
import { groupEmail, signature as signatures, team } from './db/schema';
import { readFile } from './files';
import { checkSignature } from './permission';
import type { FileStoreType } from './store';

type SignatureServerType = { claims: ClaimsType; store: FileStoreType };

/**
 * What reading a signature needs from its request: where the app is, a way to fetch, and a way to read one of the
 * app's own files (`/files/<id>`) as the person asking, for a profile picture picked as the photo.
 */
export type SignatureRequestType = {
	origin: string;
	fetch: typeof fetch;
	readFile?: (id: string) => Promise<Uint8Array | undefined>;
};

// The request, able to read the app's own files as `actor`.
function withFiles(
	server: SignatureServerType,
	actor: ActorType,
	request: SignatureRequestType
): SignatureRequestType {
	return {
		...request,
		readFile: async (id) => {
			const found = await readFile(server.claims, actor, id);
			return found ? server.store.read(found.path) : undefined;
		}
	};
}

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
	const edit = picture.edit && hasEdit(picture.edit) ? JSON.stringify(cleanEdit(picture.edit)) : '';
	const made = `${PICTURE_VERSION}\n${picture.kind}\n${picture.source}\n${picture.version ?? ''}\n${edit}`;
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

// A photo in the circle: cut square from its middle, as its tile on the screen shows it, then everything outside the
// circle cleared.
async function makeCircle(bytes: Uint8Array | Buffer) {
	const size = CIRCLE_SIZE;
	const mask = Buffer.from(
		`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`
	);
	const square = await sharp(bytes)
		.rotate()
		.resize(size, size, { fit: 'cover', position: 'centre' })
		.ensureAlpha()
		.toBuffer();
	return sharp(square)
		.composite([{ input: mask, blend: 'dest-in' }])
		.png(PALETTE)
		.toBuffer();
}

type RawType = { data: Buffer; info: OutputInfo };

function toRaw(image: Sharp): Promise<RawType> {
	return image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function fromRaw({ data, info }: RawType) {
	return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
}

function clamp(value: number, low: number, high: number) {
	return Math.min(high, Math.max(low, value));
}

// The part of a picture inside a box, the box kept inside the picture and at least a pixel.
function toBox(picture: OutputInfo, left: number, top: number, width: number, height: number) {
	const w = clamp(Math.round(width), 1, picture.width);
	const h = clamp(Math.round(height), 1, picture.height);
	return {
		left: clamp(Math.round(left), 0, picture.width - w),
		top: clamp(Math.round(top), 0, picture.height - h),
		width: w,
		height: h
	};
}

/**
 * A picture as the screen's editor leaves it (edit.ts, drawn by picture.svelte): turned to the left a quarter at a
 * time, then mirrored, then straightened clockwise about its frame's middle and grown so the frame stays covered, then
 * cut to its frame. `kept` is the shape the frame keeps when the edit picks none (a photo's circle is square). The
 * picture comes back as it is cut, at its own pixels; nothing is made larger.
 */
export async function editPicture(bytes: Uint8Array | Buffer, edit: EditType, kept?: number) {
	let picture = await toRaw(sharp(bytes).rotate());
	const aspect = picture.info.width / picture.info.height;
	const turns = (((edit.turns ?? 0) % 4) + 4) % 4;
	if (turns) picture = await toRaw(fromRaw(picture).rotate(360 - 90 * turns));
	if (edit.isFlipped) picture = await toRaw(fromRaw(picture).flop());
	const frame = frameOf(edit, aspect, keptAspectOf(edit, aspect, kept));
	const { width, height } = picture.info;
	const frameWidth = frame.w * width;
	const frameHeight = frame.h * height;
	const middleX = (frame.x + frame.w / 2) * width;
	const middleY = (frame.y + frame.h / 2) * height;
	const tilt = clamp(edit.tilt ?? 0, -45, 45);
	if (!tilt) {
		const box = toBox(picture.info, frame.x * width, frame.y * height, frameWidth, frameHeight);
		return fromRaw(picture).extract(box).png().toBuffer();
	}
	// Turned the whole picture about its middle, the frame's middle goes with it; the frame then cuts a part as many
	// times smaller as the picture grew, which is the same as growing the picture under it.
	const turned = await toRaw(
		fromRaw(picture).rotate(tilt, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
	);
	const angle = (tilt * Math.PI) / 180;
	const dx = middleX - width / 2;
	const dy = middleY - height / 2;
	const x = turned.info.width / 2 + dx * Math.cos(angle) - dy * Math.sin(angle);
	const y = turned.info.height / 2 + dx * Math.sin(angle) + dy * Math.cos(angle);
	const grow = tiltCover(tilt, frameWidth / frameHeight);
	const cutWidth = frameWidth / grow;
	const cutHeight = frameHeight / grow;
	const box = toBox(turned.info, x - cutWidth / 2, y - cutHeight / 2, cutWidth, cutHeight);
	return fromRaw(turned).extract(box).png().toBuffer();
}

/**
 * The signature picture made from `bytes`, as a PNG at twice its shown size: a photo in its circle, a banner, or an
 * icon or logo as it is. An `edit` from the screen's editor is made first; a photo's frame keeps square unless the
 * edit picks another shape.
 */
export async function makePicture(
	bytes: Uint8Array | Buffer,
	kind: SignatureKindType,
	edit?: EditType
) {
	const isEdited = Boolean(edit && hasEdit(edit) && kind !== 'icon');
	const source =
		isEdited && edit ? await editPicture(bytes, edit, kind === 'photo' ? 1 : undefined) : bytes;
	if (kind === 'photo' && (isEdited || !(await isShaped(source)))) {
		return new Uint8Array(await makeCircle(source));
	}
	const { width, height } = PICTURE_SIZES[kind];
	const sized = sharp(source)
		.rotate()
		.resize({ width, height, fit: 'inside', withoutEnlargement: true });
	const png = kind === 'icon' ? sized.png({ compressionLevel: 9 }) : sized.png(PALETTE);
	return new Uint8Array(await png.toBuffer());
}

/** A PNG's size, read from its header; none for what is not a PNG. */
export function toPngSize(bytes: Uint8Array) {
	const isPng = bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[12] === 0x49;
	if (!isPng) return undefined;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return { width: view.getUint32(16), height: view.getUint32(20) };
}

// A profile picture's bytes: one of the app's own files as the person asking, a starting file as the build named it,
// a sign-in picture from its address.
async function readProfile(address: string, request: SignatureRequestType) {
	const file = address.match(/^\/files\/([0-9a-f-]{36})$/)?.[1];
	if (file) return request.readFile?.(file);
	if (address.startsWith('/start/')) {
		const url = toStartFile(address);
		if (!url) return undefined;
		const response = await request.fetch(new URL(url, request.origin), {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		});
		return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;
	}
	return undefined;
}

// The bytes of a picture a signature shows: an upload from the file store, anything else from its address.
async function readSource(store: FileStoreType, source: string, request: SignatureRequestType) {
	if (source.startsWith(UPLOAD)) {
		const file = source.slice(UPLOAD.length);
		return UPLOAD_FILE.test(file) ? store.read(`${UPLOAD_FOLDER}/${file}`) : undefined;
	}
	if (source.startsWith(PROFILE)) {
		const address = source.slice(PROFILE.length);
		if (!address.startsWith('https:')) return readProfile(address, request);
		source = address;
	}
	const url = new URL(toFetchAddress(source), request.origin);
	if (url.protocol !== 'https:' && url.origin !== request.origin) return undefined;
	const response = await request.fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;
}

// The pictures this copy of the server has made or found, with their sizes, so a signature opened again reads nothing
// to know them.
const made = new Map<string, { width: number; height: number }>();

/**
 * Where a signature shows this picture, and its size: the app's public signature address, the picture made the first
 * time it is asked for. Nothing when it cannot be read or made.
 */
export async function toMadePicture(
	store: FileStoreType,
	picture: PictureSourceType | undefined,
	request: SignatureRequestType
): Promise<MadePictureType | undefined> {
	if (!picture?.source) return undefined;
	const name = toPictureName(picture);
	const address = new URL(`${SIGNATURE_PICTURES}${name}`, request.origin).href;
	const path = `${SIGNATURE_FOLDER}/${name}`;
	const known = made.get(path);
	if (known) return { address, ...known };
	const kept = await store.read(path).catch(() => undefined);
	const keptSize = kept && toPngSize(kept);
	if (keptSize) {
		made.set(path, keptSize);
		return { address, ...keptSize };
	}
	try {
		const bytes = await readSource(store, picture.source, request);
		if (!bytes) return undefined;
		const png = await makePicture(bytes, picture.kind, picture.edit);
		await store.write(path, png, 'image/png');
		const size = toPngSize(png) ?? { width: 0, height: 0 };
		made.set(path, size);
		return { address, ...size };
	} catch {
		return undefined;
	}
}

/** Where a signature shows this picture, made the first time it is asked for; nothing when it cannot be. */
export async function toPictureAddress(
	store: FileStoreType,
	picture: PictureSourceType | undefined,
	request: SignatureRequestType
) {
	return (await toMadePicture(store, picture, request))?.address;
}

// Every picture a signature shows, copied: the photo (the company logo's when it cannot be made), the banners and the
// website's icons and logos (one left out when it cannot be made: no banner, the website's own icon).
async function makeLook(
	store: FileStoreType,
	look: SignatureLookType,
	request: SignatureRequestType
): Promise<MadeLookType> {
	const icons = toIconPictures();
	const [photo, banners, made] = await Promise.all([
		toPictureAddress(store, look.photo, request).then(
			(address) =>
				address ?? toPictureAddress(store, { source: COMPANY_LOGO, kind: 'photo' }, request)
		),
		Promise.all(look.banners.map((banner) => toMadePicture(store, banner.picture, request))),
		Promise.all(icons.map((icon) => toPictureAddress(store, icon.picture, request)))
	]);
	const shown: MadeLookType['icons'] = {};
	for (const [index, icon] of icons.entries()) {
		if (made[index]) shown[icon.name] = made[index];
	}
	return { photo, banners, icons: shown };
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

// What the person saved for their signature; nothing when they never did.
async function readPicks(claims: ClaimsType, actor: ActorType, teamId: string) {
	const [row] = await claims.run(actor, (tx) =>
		tx
			.select({
				photo: signatures.photo,
				photoEdit: signatures.photoEdit,
				photoLink: signatures.photoLink,
				banner: signatures.banner,
				banners: signatures.banners,
				photoList: signatures.photoList,
				bannerList: signatures.bannerList,
				groupEmails: signatures.groupEmails
			})
			.from(signatures)
			.where(and(eq(signatures.teamId, teamId), isNull(signatures.deletedAt)))
	);
	return (row ?? {}) as SavedPicksType;
}

// The group emails an Admin added in the app, for everyone to pick.
async function readGroups(claims: ClaimsType, actor: ActorType): Promise<GroupEmailType[]> {
	return claims.run(actor, (tx) =>
		tx
			.select({ email: groupEmail.email, name: groupEmail.name })
			.from(groupEmail)
			.where(isNull(groupEmail.deletedAt))
			.orderBy(asc(groupEmail.createdAt))
	);
}

// A person's signature, with its photo, banner and group emails to edit.
async function answerPerson(
	server: SignatureServerType,
	actor: ActorType,
	record: RecordType,
	sheets: SheetsType,
	request: SignatureRequestType
) {
	const [picks, added] = await Promise.all([
		readPicks(server.claims, actor, record.id),
		readGroups(server.claims, actor)
	]);
	const look = toPersonLook(record, sheets, picks);
	const made = await makeLook(server.store, look, withFiles(server, actor, request));
	return {
		signature: toPersonSignature(record, sheets, look, made, picks),
		parts: toPersonParts(record, sheets, picks, added)
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

// Keeps what a person saved, the parts given (`undefined` leaves one as it is).
async function writePicks(
	claims: ClaimsType,
	actor: ActorType,
	teamId: string,
	picks: SavedPicksType
) {
	const organizationId = actor.organizationId;
	if (!organizationId) return;
	const changed = Object.fromEntries(
		Object.entries({
			photo: picks.photo,
			photoEdit: picks.photoEdit,
			photoLink: picks.photoLink,
			banners: picks.banners,
			photoList: picks.photoList,
			bannerList: picks.bannerList,
			groupEmails: picks.groupEmails
		}).filter(([, value]) => value !== undefined)
	);
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

// The photo as it is kept: each part the same as the Sheet and the defaults give is kept empty, so it follows them.
function toSavedPhoto(
	photo: SignaturePhotoType | null,
	defaults: { source: string; link: string }
): Pick<SavedPicksType, 'photo' | 'photoEdit' | 'photoLink'> {
	if (!photo) return { photo: null, photoEdit: null, photoLink: null };
	const edit = cleanEdit(photo.edit ?? {}) ?? null;
	const isDefault = photo.source === defaults.source && !edit;
	return {
		photo: isDefault ? null : photo.source,
		photoEdit: isDefault ? null : edit,
		photoLink: photo.link === defaults.link ? null : photo.link
	};
}

function sameBanner(left: SignatureBannerType, right: SignatureBannerType) {
	const plain = ({ source, edit, link }: SignatureBannerType) =>
		JSON.stringify({ source, edit: edit ?? null, link });
	return plain(left) === plain(right);
}

// A panel's new order and edits, when every picture is one already in it (a deleted upload is left out).
function toSavedList(given: PanelPictureType[], panel: PanelPictureType[]) {
	const known = new Set(panel.map((each) => each.source));
	if (given.some((each) => !known.has(each.source))) return undefined;
	return given.map(({ source, edit }) => {
		const clean = cleanEdit(edit ?? {});
		return clean ? { source, edit: clean } : { source };
	});
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Keeps what is saved for a person's signature (the User's own with no `person`), each part given whole: the photo
 * and the one banner, each a picture of its panel with an address for its link; the panels' order and edits, every
 * picture one already there; the group emails, each one offered. `null` follows the Sheet and the defaults again.
 * An Admin's new group email is added for everyone first. Answers the signature as it is now.
 */
export async function saveSignature(
	server: SignatureServerType,
	actor: ActorType,
	save: SignatureSaveType,
	request: SignatureRequestType
): Promise<SignatureAnswerType> {
	const isAdmin = checkSignature(actor, { isOwn: false }).isAllowed;
	const found = await findAllowed(server, actor, save.person, isAdmin);
	if (!found.isAllowed) return found;
	const { record } = found;
	const sheets = await readSheets(request.fetch);
	const saved = await readPicks(server.claims, actor, record.id);
	const picks: SavedPicksType = {};

	if (save.photos) {
		const list = toSavedList(save.photos, toPhotoPanel(record, sheets, saved));
		if (!list) return { isAllowed: false, reason: 'That photo is not one to pick.' };
		picks.photoList = list;
	}
	if (save.banners) {
		const list = toSavedList(save.banners, toBannerPanel(record, sheets, saved));
		if (!list) return { isAllowed: false, reason: 'That banner is not one to pick.' };
		picks.bannerList = list;
	}

	if (save.photo !== undefined) {
		if (save.photo) {
			const photos = picks.photoList ?? toPhotoPanel(record, sheets, saved);
			if (!photos.some((each) => each.source === save.photo?.source)) {
				return { isAllowed: false, reason: 'That photo is not one to pick.' };
			}
			const link = toLink(save.photo.link);
			if (link === undefined)
				return { isAllowed: false, reason: 'That photo link is not an address.' };
			save.photo = { ...save.photo, link };
		}
		const defaults = toPersonPhoto(record, sheets, {});
		Object.assign(
			picks,
			toSavedPhoto(save.photo, { source: defaults.source, link: toPhotoLink(record, sheets) })
		);
	}

	if (save.banner !== undefined) {
		if (save.banner) {
			const banners = picks.bannerList ?? toBannerPanel(record, sheets, saved);
			if (!banners.some((each) => each.source === save.banner?.source)) {
				return { isAllowed: false, reason: 'That banner is not one to pick.' };
			}
			const link = toLink(save.banner.link);
			if (link === undefined) {
				return { isAllowed: false, reason: 'That banner link is not an address.' };
			}
			const edit = cleanEdit(save.banner.edit ?? {});
			const banner = {
				id: save.banner.id,
				source: save.banner.source,
				...(edit ? { edit } : {}),
				link
			};
			const defaults = toPersonBanner(record, sheets, { banner: saved.banner });
			picks.banners = defaults && sameBanner(banner, defaults) ? null : [banner];
		} else picks.banners = null;
	}

	let added: GroupEmailType[] | undefined;
	if (save.addGroup) {
		if (!isAdmin) return { isAllowed: false, reason: 'Only an Admin adds a group email.' };
		const email = save.addGroup.email.trim();
		if (!EMAIL.test(email)) return { isAllowed: false, reason: 'That is not an email address.' };
		added = await readGroups(server.claims, actor);
		const isKnown = toGroupChoices(sheets, added).some(
			(each) => toEmailKey(each.email) === toEmailKey(email)
		);
		const organizationId = actor.organizationId;
		if (!isKnown && organizationId) {
			const name = save.addGroup.name.trim() || email;
			await server.claims.run(actor, (tx) =>
				tx
					.insert(groupEmail)
					.values({ id: randomUUID(), organizationId, email, name })
					.onConflictDoNothing()
			);
			added = [...added, { email, name }];
		}
	}

	if (save.groupEmails !== undefined) {
		if (save.groupEmails) {
			const offered = toGroupChoices(sheets, added ?? (await readGroups(server.claims, actor)));
			const emails: string[] = [];
			for (const email of save.groupEmails) {
				const group = offered.find((each) => toEmailKey(each.email) === toEmailKey(email));
				if (!group) return { isAllowed: false, reason: 'That group email is not one to pick.' };
				if (!emails.includes(group.email)) emails.push(group.email);
			}
			const defaults = toGroupEmails(record, sheets, {});
			picks.groupEmails = JSON.stringify(emails) === JSON.stringify(defaults) ? null : emails;
		} else picks.groupEmails = null;
	}

	await writePicks(server.claims, actor, record.id, picks);
	return readSignature(server, actor, { person: record.id }, request);
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
	made.set(path, toPngSize(picture) ?? { width: 0, height: 0 });

	// It joins the end of its panel and is the one in use: a photo keeping its link, a banner going to the website
	// until it is given a link of its own.
	const { record } = found;
	const [saved, sheets] = await Promise.all([
		readPicks(server.claims, actor, record.id),
		readSheets(request.fetch)
	]);
	const panel = (upload.kind === 'photo' ? toPhotoPanel : toBannerPanel)(record, sheets, saved);
	if (panel.filter((each) => each.isOwn).length >= MAX_UPLOADS) {
		return { isAllowed: false, reason: `Up to ${MAX_UPLOADS} uploads. Delete one first.` };
	}
	const list = panel.map(({ source, edit }) => (edit ? { source, edit } : { source }));
	if (!list.some((each) => each.source === source)) list.push({ source });
	if (upload.kind === 'photo') {
		await writePicks(server.claims, actor, record.id, {
			photo: source,
			photoEdit: null,
			photoList: list
		});
	} else {
		const banner = { id: randomUUID(), source, link: UPLOAD_BANNER_LINK };
		await writePicks(server.claims, actor, record.id, { banners: [banner], bannerList: list });
	}
	return readSignature(server, actor, { person: record.id }, request);
}

/**
 * A picture someone uploaded for a signature, as it came, for the screen's editor: to the signed-in only, since it
 * was never meant for anyone else. Nothing for a name that is not an upload's.
 */
export async function readUpload(store: FileStoreType, file: string) {
	if (!UPLOAD_FILE.test(file)) return undefined;
	const bytes = await store.read(`${UPLOAD_FOLDER}/${file}`).catch(() => undefined);
	const ending = file.split('.').at(-1) ?? '';
	const type = Object.entries(UPLOAD_TYPES).find(([, each]) => each === ending)?.[0];
	return bytes && type ? { bytes, type } : undefined;
}

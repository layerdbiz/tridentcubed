// Email signatures (#354): the plain rules, tested beside. A person's signature is built from their Team record, the
// details the app holds; the signature Sheets fill in what it does not hold yet (the shared addresses under them, the
// company's social links) and give the shared mailboxes and the Google Drive photos and banners to pick from.
//
// The photo is the signature's own, not the person's profile picture in the app (Justin, 2026-11-27: "this photo is
// different from their avatar profile"): the one they picked or uploaded, else their photo on the website's
// signature, else their photo in the Profile Images folder, else the Trident logo (`DEFAULT_PHOTO`). The banner is the
// one they picked or uploaded, none if they said so, else the Sheet's, else the Trident Cubed map (`DEFAULT_BANNER`).
// Round 8 (Justin, 2026-11-28): a signature shows ONE banner; the photo and the banner are each picked from a panel of
// pictures, the built-in ones always there (the Trident logos, their profile picture, their email photo, their
// Profile Images photos; every company banner) and their own uploads, in the order they left them, each with its
// edit. The shared addresses under it are the group emails they pick, else their Sheet row's.
// Every picture, the website's icons too, is copied to the app's public signature address before a signature shows
// it (#lib/server/signature.ts), so a pasted signature never points at Google Drive or at a page that redirects.
import { cleanEdit, type EditType } from '#lib/components/photo/edit.js';
import {
	BANNER_WIDTH,
	COMPANY_LOGO,
	DEFAULT_BANNER,
	DEFAULT_PHOTO,
	DRIVE,
	MAX_LINK,
	PROFILE,
	SIGNATURE_API,
	UPLOAD,
	UPLOAD_BANNER_LINK,
	WEBSITE_ICONS
} from './signature.constants';
import type {
	ChoiceType,
	GroupEmailType,
	MailboxType,
	PanelPictureType,
	PanelShownType,
	PictureSourceType,
	SignatureBannerType,
	SignaturePartsType,
	SignaturePhotoType,
	SignatureType
} from './signature.types';

/** A person row of the signature Sheet, as the app uses it. */
export type SheetPersonType = {
	email: string;
	name: string;
	title: string;
	phone: string;
	/** The shared addresses shown under the person, comma separated. */
	group: string;
	href: string;
	/** The photo on their website signature: a website address, or a Google Drive one as `drive:<id>`. */
	src: string;
	banner?: string;
	/** Their photo's file name in the Profile Images folder. */
	profile?: string;
};

/** A shared mailbox row of the signature Sheet. */
export type SheetMailboxType = MailboxType & {
	title: string;
	phone: string;
	href: string;
	src: string;
	banner?: string;
};

/** A banner in the Email Banners folder: its file name, where it takes a reader, and its picture. */
export type SheetBannerType = { banner: string; href: string; src: string; modified?: string };

/** A photo in the Profile Images folder: its file name, its Google Drive file and when it last changed. */
export type SheetProfileType = { name: string; file: string; modified?: string };

export type SocialLinksType = NonNullable<SignatureType['socialLinks']>;

/** Everything the Sheets give, read whole. */
export type SheetsType = {
	people: SheetPersonType[];
	mailboxes: SheetMailboxType[];
	banners: SheetBannerType[];
	profiles: SheetProfileType[];
	social: SocialLinksType;
};

export const NO_SHEETS: SheetsType = {
	people: [],
	mailboxes: [],
	banners: [],
	profiles: [],
	social: {}
};

/**
 * The Team record's details a signature uses. Its `photo` is the app's profile picture: one of the photos the
 * signature's can be, never the one it starts with.
 */
export type SignatureRecordType = {
	id: string;
	name: string;
	title: string;
	phone: string;
	email: string;
	link: string;
	photo?: string | null;
};

/**
 * What a person saved for their signature; each left empty (null) follows the Sheet and the defaults. `banner` is
 * the one banner picked before a signature had several ('' for none), read while `banners` is empty.
 */
export type SavedPicksType = {
	photo?: string | null;
	photoEdit?: EditType | null;
	photoLink?: string | null;
	banner?: string | null;
	banners?: SignatureBannerType[] | null;
	photoList?: PanelPictureType[] | null;
	bannerList?: PanelPictureType[] | null;
	groupEmails?: string[] | null;
};

/** A banner as the signature shows it, before it is copied: its picture, where it goes and what it is called. */
export type LookBannerType = { picture: PictureSourceType; href: string; alt: string };

/** The pictures a signature shows, before they are copied: its photo with where it goes, and its banners in order. */
export type SignatureLookType = {
	photo: PictureSourceType;
	photoLink: string;
	banners: LookBannerType[];
};

/** A picture copied to the signature address: where it is, and its size in pixels. */
export type MadePictureType = { address: string; width: number; height: number };

/** The addresses a signature's pictures were copied to: a banner not made is left out of its place. */
export type MadeLookType = {
	photo?: string;
	banners?: (MadePictureType | undefined)[];
	icons: Partial<Record<keyof typeof WEBSITE_ICONS, string>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function toText(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}

function toOptional(value: unknown) {
	return toText(value) || undefined;
}

function toRows(value: unknown) {
	return Array.isArray(value) ? value.filter(isRecord) : [];
}

// A Google Drive file's id, from any of its share and thumbnail addresses.
const DRIVE_ID = [/[?&]id=([\w-]{10,})/, /\/file\/d\/([\w-]{10,})/, /\/d\/([\w-]{10,})/];
const DRIVE_HOST = /^https:\/\/(drive\.google\.com|[\w-]+\.googleusercontent\.com)\//;

/** A Google Drive picture's file id, from any of its addresses; nothing for any other address. */
export function toDriveFile(url: string) {
	if (!DRIVE_HOST.test(url)) return undefined;
	return DRIVE_ID.map((pattern) => url.match(pattern)?.[1]).find(Boolean);
}

/** How a picture is named in a choice: `drive:<id>` for a Google Drive one, its address for any other. */
export function toSource(url: string) {
	const file = toDriveFile(url);
	return file ? `${DRIVE}${file}` : url;
}

/**
 * A Google Drive picture's direct address, `width` pixels wide. Drive's share and thumbnail addresses send the
 * browser through a signed-in Google hop that most mail apps do not follow, which is why the website asks for the
 * direct one (`email.remote.ts`).
 */
export function toDriveAddress(file: string, width: number) {
	return `https://lh3.googleusercontent.com/d/${file}=w${width}`;
}

/** Where the server reads a picture from: Google Drive's direct address for a Drive one, else the address itself. */
export function toFetchAddress(source: string) {
	return source.startsWith(DRIVE) ? toDriveAddress(source.slice(DRIVE.length), 2000) : source;
}

/** A small picture for the picker: Google Drive's at `width` pixels, a profile picture at its app address, a website one as it is. */
export function toPreview(source: string, width: number) {
	if (source.startsWith(PROFILE)) return source.slice(PROFILE.length);
	return source.startsWith(DRIVE) ? toDriveAddress(source.slice(DRIVE.length), width) : source;
}

/** An email address, compared the way mail does: without capitals or spaces. */
export function toEmailKey(email: string) {
	return email.trim().toLowerCase();
}

/** The Sheets' rows, read whole; a row missing what makes it one is left out. */
export function toSheets(raw: {
	people: unknown;
	mailboxes: unknown;
	banners: unknown;
	profiles?: unknown;
	social: unknown;
}): SheetsType {
	const people = toRows(raw.people).flatMap((row): SheetPersonType[] => {
		const email = toText(row.email);
		if (!email) return [];
		return [
			{
				email,
				name: toText(row.name),
				title: toText(row.title),
				phone: toText(row.phone),
				group: toText(row.group),
				href: toText(row.href),
				src: toSource(toText(row.src)),
				banner: toOptional(row.banner),
				profile: toOptional(row.profileURL)
			}
		];
	});
	const mailboxes = toRows(raw.mailboxes).flatMap((row): SheetMailboxType[] => {
		const slug = toText(row.slug);
		const name = toText(row.shortname) || toText(row.name) || slug;
		if (!slug || !name) return [];
		return [
			{
				slug,
				name,
				email: toText(row.email),
				title: toText(row.title),
				phone: toText(row.phone),
				href: toText(row.href),
				src: toSource(toText(row.src)),
				banner: toOptional(row.banner)
			}
		];
	});
	// The Drive folders' tabs list each file with its id; an older row has only its thumbnail address.
	const banners = toRows(raw.banners).flatMap((row): SheetBannerType[] => {
		const banner = toText(row.banner);
		const file = toText(row.fileId);
		const src = file ? `${DRIVE}${file}` : toSource(toText(row.src));
		const href = toText(row.href) || toText(row['GOOGLE DRIVE PHOTOS URL href']);
		return banner && src ? [{ banner, href, src, modified: toOptional(row.modified) }] : [];
	});
	const profiles = toRows(raw.profiles).flatMap((row): SheetProfileType[] => {
		const name = toText(row.banner) || toText(row.name);
		const file = toText(row.fileId) || toDriveFile(toText(row.src));
		return name && file ? [{ name, file, modified: toOptional(row.modified) }] : [];
	});
	const social: SocialLinksType = {};
	for (const row of toRows(raw.social)) {
		const name = toText(row.name).toLowerCase();
		const href = toText(row.href);
		if (href && (name === 'linkedin' || name === 'facebook' || name === 'whatsapp')) {
			social[name] = href;
		}
	}
	mailboxes.sort((left, right) => left.name.localeCompare(right.name));
	return { people, mailboxes, banners, profiles, social };
}

/** Whether a website signature's photo is someone's own, not the company logo it shows for no photo. */
export function isOwnPhoto(src: string) {
	return Boolean(src) && !/\/branding\/logo/.test(src);
}

// The words of a name that say who it is: lowercase letters only, without a rank such as "Capt.".
const RANKS = new Set(['capt', 'captain', 'mr', 'mrs', 'ms', 'dr', 'jr', 'sr']);
function toNameWords(name: string) {
	return name
		.toLowerCase()
		.split(/[^a-z]+/)
		.filter((word) => word.length > 1 && !RANKS.has(word));
}

/**
 * Whether a photo in the Profile Images folder is this person's: the one their Sheet row names, or one whose file
 * name holds their first and last names (`tynequa-shaw-linkedin-updated.png`).
 */
export function isTheirPhoto(file: string, name: string, named?: string) {
	if (named && file === named) return true;
	const words = toNameWords(name);
	if (words.length < 2) return false;
	const fileWords = new Set(toNameWords(file));
	return fileWords.has(words[0]) && fileWords.has(words[words.length - 1]);
}

// The Trident logo photos everyone can pick, from the Profile Images folder: dark first, as Justin listed them.
const LOGO_PHOTOS = [
	{ name: 'profile-dark-500x500.png', label: 'Trident logo, dark' },
	{ name: DEFAULT_PHOTO.name, label: 'Trident logo' }
];

function toLabel(file: string) {
	const words = file.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ');
	return words.charAt(0).toUpperCase() + words.slice(1);
}

// A Profile Images photo's name without the person's: "LinkedIn photo", "Profile photo".
function toPhotoLabel(file: string, name: string) {
	const own = new Set(toNameWords(name));
	const words = toNameWords(file).filter((word) => !own.has(word));
	if (words.includes('linkedin')) return 'LinkedIn photo';
	const rest = words.filter((word) => word !== 'profile' && word !== 'png');
	return rest.length ? `${toLabel(rest.join(' '))} photo` : 'Profile photo';
}

function findRow(record: SignatureRecordType, sheets: SheetsType) {
	return sheets.people.find((each) => toEmailKey(each.email) === toEmailKey(record.email));
}

function toUnique<T extends { source: string }>(choices: T[]) {
	const seen = new Set<string>();
	return choices.filter((choice) => !seen.has(choice.source) && seen.add(choice.source));
}

/**
 * The built-in photos a person can pick, always there (Justin, 2026-11-28: "the dark trident logo, the light trident
 * logo, my avatar that's linked with my profile, and also the custom email photo"): the Trident logos, their profile
 * picture in the app, their photo on the website's signature, and their photos in the Profile Images folder.
 */
export function toPhotoChoices(record: SignatureRecordType, sheets: SheetsType): ChoiceType[] {
	const row = findRow(record, sheets);
	const choices: ChoiceType[] = [];
	for (const logo of LOGO_PHOTOS) {
		const profile = sheets.profiles.find((each) => each.name === logo.name);
		const file = profile?.file ?? (logo.name === DEFAULT_PHOTO.name ? DEFAULT_PHOTO.file : '');
		if (!file) continue;
		const source = `${DRIVE}${file}`;
		choices.push({ source, label: logo.label, preview: toPreview(source, 480) });
	}
	if (record.photo) {
		const source = `${PROFILE}${record.photo}`;
		choices.push({ source, label: 'Profile picture', preview: toPreview(source, 480) });
	}
	if (row && isOwnPhoto(row.src)) {
		choices.push({ source: row.src, label: 'Email photo', preview: toPreview(row.src, 480) });
	}
	for (const profile of sheets.profiles) {
		if (!isTheirPhoto(profile.name, record.name, row?.profile)) continue;
		const source = `${DRIVE}${profile.file}`;
		choices.push({
			source,
			label: toPhotoLabel(profile.name, record.name),
			preview: toPreview(source, 480)
		});
	}
	return toUnique(choices);
}

/** The company's banners anyone can add: every banner in the Email Banners folder, or the Trident Cubed map. */
export function toBannerChoices(sheets: SheetsType): ChoiceType[] {
	const banners = sheets.banners.length
		? sheets.banners
		: [
				{
					banner: DEFAULT_BANNER.name,
					href: DEFAULT_BANNER.href,
					src: `${DRIVE}${DEFAULT_BANNER.file}`
				}
			];
	return toUnique(
		banners.map((banner) => ({
			source: banner.src,
			label: toLabel(banner.banner),
			preview: toPreview(banner.src, 600),
			link: banner.href
		}))
	);
}

/** The photo a person's signature shows: their pick, else their website photo, Profile Images photo or the logo. */
export function toPhotoSource(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved?: string | null
) {
	if (saved) return saved;
	const row = findRow(record, sheets);
	if (row && isOwnPhoto(row.src)) return row.src;
	const named = row?.profile && sheets.profiles.find((each) => each.name === row.profile);
	return `${DRIVE}${named ? named.file : DEFAULT_PHOTO.file}`;
}

/** The banner a person's signature shows: their pick ('' for none), else the Sheet's, else the Trident Cubed map. */
export function toBannerSource(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved?: string | null
) {
	if (typeof saved === 'string') return saved;
	const row = findRow(record, sheets);
	const named = row?.banner && sheets.banners.find((each) => each.banner === row.banner);
	if (named) return named.src;
	const fallback = sheets.banners.find((each) => each.banner === DEFAULT_BANNER.name);
	return fallback?.src ?? `${DRIVE}${DEFAULT_BANNER.file}`;
}

/** When the Google Drive file behind a source last changed, so an edited file is copied again under a new name. */
function toVersion(source: string, sheets: SheetsType) {
	if (!source.startsWith(DRIVE)) return undefined;
	const file = source.slice(DRIVE.length);
	const banner = sheets.banners.find((each) => each.src === source);
	return banner?.modified ?? sheets.profiles.find((each) => each.file === file)?.modified;
}

function toPicture(
	source: string,
	kind: PictureSourceType['kind'],
	sheets: SheetsType,
	edit?: EditType
): PictureSourceType {
	const version = toVersion(source, sheets);
	const kept = edit && cleanEdit(edit);
	return { source, kind, ...(version ? { version } : {}), ...(kept ? { edit: kept } : {}) };
}

/** Where a tap on a person's photo takes a reader when they set nowhere: their Team record's link, else the Sheet's. */
export function toPhotoLink(record: SignatureRecordType, sheets: SheetsType) {
	return record.link || findRow(record, sheets)?.href || '';
}

/**
 * The photo a person's signature shows: the one they picked or uploaded with its edit, else the Sheet's and the
 * defaults', and where a tap on it goes (theirs, else their link).
 */
export function toPersonPhoto(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {}
): SignaturePhotoType {
	const edit = saved.photo ? cleanEdit(saved.photoEdit ?? {}) : undefined;
	return {
		source: toPhotoSource(record, sheets, saved.photo),
		...(edit ? { edit } : {}),
		link: saved.photoLink ?? toPhotoLink(record, sheets)
	};
}

/**
 * The ONE banner under a person's signature (Justin, 2026-11-28: "I only want to allow the email signature to have one
 * banner image at a time and one link at a time"): the one they saved (the first, where an older row saved several;
 * none for an empty list), else the one they picked before there could be several, else the Sheet's, else the
 * Trident Cubed map. It goes where its Sheet row says, an upload to the website, until they give it a link.
 */
export function toPersonBanner(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {}
): SignatureBannerType | undefined {
	if (saved.banners) return saved.banners[0];
	const source = toBannerSource(record, sheets, saved.banner);
	if (!source) return undefined;
	const choice = toBannerChoices(sheets).find((each) => each.source === source);
	return { id: 'sheet', source, link: choice?.link || UPLOAD_BANNER_LINK };
}

// A banner's name: the company banner's, else what an upload is.
function toBannerLabel(source: string, sheets: SheetsType) {
	return toBannerChoices(sheets).find((each) => each.source === source)?.label;
}

function toLookBanner(banner: SignatureBannerType, sheets: SheetsType): LookBannerType {
	return {
		picture: toPicture(banner.source, 'banner', sheets, banner.edit),
		href: banner.link,
		alt: toBannerLabel(banner.source, sheets) ?? 'Trident Cubed'
	};
}

/** The pictures a person's signature shows, from what they saved, the Sheet and the defaults. */
export function toPersonLook(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {}
): SignatureLookType {
	const photo = toPersonPhoto(record, sheets, saved);
	return {
		photo: toPicture(photo.source, 'photo', sheets, photo.edit),
		photoLink: photo.link,
		banners: [toPersonBanner(record, sheets, saved)].flatMap((banner) =>
			banner ? [toLookBanner(banner, sheets)] : []
		)
	};
}

/** The pictures a shared mailbox's signature shows: its Sheet row's photo (the logo for none) and banner. */
export function toMailboxLook(mailbox: SheetMailboxType, sheets: SheetsType): SignatureLookType {
	const banner = mailbox.banner
		? sheets.banners.find((each) => each.banner === mailbox.banner)
		: undefined;
	return {
		photo: toPicture(mailbox.src || COMPANY_LOGO, 'photo', sheets),
		photoLink: mailbox.href,
		banners: banner
			? [toLookBanner({ id: 'sheet', source: banner.src, link: banner.href }, sheets)]
			: []
	};
}

/**
 * The big picture the screen's editor opens: Google Drive's at `width` pixels, an upload from the app (to the signed
 * in only), a website one as it is.
 */
export function toOriginal(source: string, width = 1600) {
	if (source.startsWith(UPLOAD)) return `${SIGNATURE_API}?upload=${source.slice(UPLOAD.length)}`;
	return toPreview(source, width);
}

// A panel as it was left (`list`), with every built-in picture there, added at its end when it is new, and the
// uploads still in it; one no longer offered goes, unless it is the one in use (`used`).
function toPanelList(
	list: PanelPictureType[] | null | undefined,
	builtIns: ChoiceType[],
	used: string[],
	start: () => PanelPictureType[]
): PanelPictureType[] {
	const offered = new Set(builtIns.map((each) => each.source));
	const kept = (list ?? start()).filter(
		(each) =>
			offered.has(each.source) || each.source.startsWith(UPLOAD) || used.includes(each.source)
	);
	for (const choice of builtIns) {
		if (!kept.some((each) => each.source === choice.source)) kept.push({ source: choice.source });
	}
	for (const source of used) {
		if (source && !kept.some((each) => each.source === source)) kept.push({ source });
	}
	return toUnique(kept).map(({ source, edit }) => {
		const clean = edit && cleanEdit(edit);
		return clean ? { source, edit: clean } : { source };
	});
}

/**
 * A person's photo panel (Justin, 2026-11-28: "There needs to be photos built in that are always available"): every
 * built-in photo and their uploads, in the order they left them, each with its edit. Before they ever moved one, the
 * built-in ones in their first order, then the upload they had picked, the photo's edit on the photo it was made on.
 */
export function toPhotoPanel(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {}
): PanelShownType[] {
	const builtIns = toPhotoChoices(record, sheets);
	const used = toPhotoSource(record, sheets, saved.photo);
	const list = toPanelList(saved.photoList, builtIns, [used], () => {
		const first: PanelPictureType[] = builtIns.map((each) => ({ source: each.source }));
		if (saved.photo?.startsWith(UPLOAD)) first.push({ source: saved.photo });
		const edit = saved.photo && saved.photoEdit ? cleanEdit(saved.photoEdit) : undefined;
		const item = first.find((each) => each.source === saved.photo);
		if (item && edit) item.edit = edit;
		return first;
	});
	return list.map((each) => ({
		...each,
		label: builtIns.find((choice) => choice.source === each.source)?.label ?? 'Your upload',
		preview: toOriginal(each.source, 800),
		original: toOriginal(each.source),
		isOwn: each.source.startsWith(UPLOAD)
	}));
}

/**
 * A person's banner panel: every company banner and their uploads, in the order they left them, each with its edit and
 * the link it starts with. Before they ever moved one, the company's in the folder's order, then the uploads they had.
 */
export function toBannerPanel(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {}
): PanelShownType[] {
	const builtIns = toBannerChoices(sheets);
	const used = toPersonBanner(record, sheets, saved);
	const list = toPanelList(saved.bannerList, builtIns, used ? [used.source] : [], () => [
		...builtIns.map((each) => ({ source: each.source })),
		...(saved.banners ?? [])
			.filter((each) => each.source.startsWith(UPLOAD))
			.map(({ source, edit }) => ({ source, edit }))
	]);
	return list.map((each) => {
		const choice = builtIns.find((item) => item.source === each.source);
		return {
			...each,
			label: choice?.label ?? 'Your upload',
			preview: toOriginal(each.source, 1200),
			original: toOriginal(each.source),
			link: choice?.link || UPLOAD_BANNER_LINK,
			isOwn: each.source.startsWith(UPLOAD)
		};
	});
}

/**
 * Every group email someone can show under their signature: the shared mailboxes the signature Sheet lists, then the
 * ones an Admin added in the app, each address once.
 */
export function toGroupChoices(sheets: SheetsType, added: GroupEmailType[] = []): GroupEmailType[] {
	const seen = new Set<string>();
	const groups: GroupEmailType[] = [];
	for (const group of [...sheets.mailboxes.map(({ email, name }) => ({ email, name })), ...added]) {
		const key = toEmailKey(group.email);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		groups.push({ email: group.email.trim(), name: group.name.trim() || group.email.trim() });
	}
	return groups;
}

/** The group emails under a person's signature: the ones they picked, else their Sheet row's. */
export function toGroupEmails(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {}
): string[] {
	if (saved.groupEmails) return saved.groupEmails;
	const group = findRow(record, sheets)?.group ?? '';
	return group
		.split(',')
		.map((each) => each.trim())
		.filter(Boolean);
}

/**
 * A person's signature's photo, banner and group emails as the screen edits them: the photo and the one banner it
 * shows, each with its name and pictures, their panels of pictures to pick from, and the group emails.
 */
export function toPersonParts(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {},
	added: GroupEmailType[] = []
): SignaturePartsType {
	const photos = toPhotoPanel(record, sheets, saved);
	const banners = toBannerPanel(record, sheets, saved);
	const photo = toPersonPhoto(record, sheets, saved);
	const banner = toPersonBanner(record, sheets, saved);
	return {
		photo: {
			...photo,
			label: photos.find((each) => each.source === photo.source)?.label ?? 'Photo',
			preview: toOriginal(photo.source, 480),
			original: toOriginal(photo.source),
			isPicked: Boolean(saved.photo)
		},
		...(banner
			? {
					banner: {
						...banner,
						label: banners.find((each) => each.source === banner.source)?.label ?? 'Your upload',
						preview: toOriginal(banner.source, 1200),
						original: toOriginal(banner.source)
					}
				}
			: {}),
		photos,
		banners,
		groups: toGroupChoices(sheets, added),
		groupEmails: toGroupEmails(record, sheets, saved)
	};
}

/**
 * A link as it is kept: an address as typed, an email address as a mail link, anything else on the web; '' for none.
 * Nothing for one that is not an address.
 */
export function toLink(typed: string) {
	const text = typed.trim();
	if (!text) return '';
	const link = /^(https?:|mailto:|tel:)/i.test(text)
		? text
		: /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(text)
			? `mailto:${text}`
			: `https://${text}`;
	if (link.length > MAX_LINK || /\s/.test(link)) return undefined;
	try {
		const url = new URL(link);
		if (/^https?:$/.test(url.protocol) && !url.hostname.includes('.')) return undefined;
		return link;
	} catch {
		return undefined;
	}
}

/** The size a banner shows at in the signature: as wide as the signature at most, never wider than it was made. */
export function toShownSize(made: { width: number; height: number }) {
	const width = Math.min(BANNER_WIDTH, made.width);
	return { width, height: Math.round((width * made.height) / made.width) };
}

/** The website's icons and logos every signature shows, to copy like any picture. */
export function toIconPictures() {
	return Object.entries(WEBSITE_ICONS).map(([name, source]) => ({
		name: name as keyof typeof WEBSITE_ICONS,
		picture: { source, kind: 'icon' } satisfies PictureSourceType
	}));
}

/** The shared addresses shown under someone, one per line in the signature: comma separated, none repeated. */
export function toSharedAddresses(group: string, own: string) {
	const seen = new Set([toEmailKey(own)]);
	const kept: string[] = [];
	for (const address of group.split(',')) {
		const key = toEmailKey(address);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		kept.push(address.trim());
	}
	return kept.join(', ');
}

// The parts every signature shares: its pictures at the addresses they were copied to, where its photo goes, and the
// social links. A banner shows at its own shape, as wide as the signature at most.
function toPictureParts(
	look: SignatureLookType,
	made: MadeLookType,
	sheets: SheetsType
): Pick<SignatureType, 'src' | 'href' | 'banners' | 'socialLinks' | 'icons' | 'logoImage'> {
	const { logo, ...icons } = made.icons;
	return {
		src: made.photo || COMPANY_LOGO,
		href: look.photoLink,
		banners: look.banners.flatMap((banner, index) => {
			const picture = made.banners?.[index];
			return picture
				? [{ href: banner.href, src: picture.address, alt: banner.alt, ...toShownSize(picture) }]
				: [];
		}),
		socialLinks: sheets.social,
		icons,
		...(logo ? { logoImage: logo } : {})
	};
}

/**
 * A person's signature: their Team record first, the Sheet's row (matched by email) for what the record leaves out,
 * and the pictures at the addresses they were copied to. With no photo made, the company logo shows.
 */
export function toPersonSignature(
	record: SignatureRecordType,
	sheets: SheetsType,
	look: SignatureLookType,
	made: MadeLookType,
	saved: SavedPicksType = {}
): SignatureType {
	return {
		id: record.id,
		type: 'person',
		...toDetails(record, findRow(record, sheets), toGroupEmails(record, sheets, saved)),
		slug: record.id,
		...toPictureParts(look, made, sheets)
	};
}

type DetailsType = Pick<SignatureRecordType, 'name' | 'title' | 'phone' | 'email'>;

// The words a person's signature shows: the Team record's, their Sheet row's where it is empty, and the shared
// addresses under them, never their own.
function toDetails(record: DetailsType, row: SheetPersonType | undefined, groups: string[]) {
	const email = record.email || row?.email || '';
	return {
		name: record.name,
		title: record.title || row?.title || '',
		phone: record.phone || row?.phone || '',
		email,
		group: toSharedAddresses(groups.join(','), email)
	};
}

/** A shared mailbox's signature, from its Sheet row, with its pictures where they were copied to. */
export function toMailboxSignature(
	mailbox: SheetMailboxType,
	sheets: SheetsType,
	look: SignatureLookType,
	made: MadeLookType
): SignatureType {
	return {
		id: mailbox.slug,
		type: 'group',
		name: mailbox.name,
		title: mailbox.title,
		phone: mailbox.phone,
		email: mailbox.email,
		group: '',
		slug: mailbox.slug,
		...toPictureParts(look, made, sheets)
	};
}

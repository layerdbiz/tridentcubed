// Email signatures (#354): the plain rules, tested beside. A person's signature is built from their Team record, the
// details the app holds; the signature Sheets fill in what it does not hold yet (the shared addresses under them, the
// company's social links) and give the shared mailboxes and the Google Drive photos and banners to pick from.
//
// The photo is the signature's own, not the person's profile picture in the app (Justin, 2026-11-27: "this photo is
// different from their avatar profile"): the one they picked or uploaded, else their photo on the website's
// signature, else their photo in the Profile Images folder, else the Trident logo (`DEFAULT_PHOTO`). The banner is the
// one they picked or uploaded, none if they said so, else the Sheet's, else the Trident Cubed map (`DEFAULT_BANNER`).
// Every picture, the website's icons too, is copied to the app's public signature address before a signature shows
// it (#lib/server/signature.ts), so a pasted signature never points at Google Drive or at a page that redirects.
import {
	COMPANY_LOGO,
	DEFAULT_BANNER,
	DEFAULT_PHOTO,
	DRIVE,
	UPLOAD,
	UPLOAD_BANNER_LINK,
	WEBSITE_ICONS
} from './signature.constants';
import type { ChoiceType, MailboxType, PictureSourceType, SignatureType } from './signature.types';

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

/** The Team record's details a signature uses. Its `photo` is the app's profile picture, which it does not use. */
export type SignatureRecordType = {
	id: string;
	name: string;
	title: string;
	phone: string;
	email: string;
	link: string;
};

/** What a person saved for their signature: a photo, a banner ('' for none), or nothing to follow the defaults. */
export type SavedPicksType = { photo?: string | null; banner?: string | null };

/** The pictures a signature shows, before they are copied: its photo, and its banner with where it goes. */
export type SignatureLookType = {
	photo: PictureSourceType;
	banner?: { picture: PictureSourceType; href: string; alt: string };
};

/** The addresses a signature's pictures were copied to. */
export type MadeLookType = {
	photo?: string;
	banner?: string;
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

/** A small picture for the picker: Google Drive's at `width` pixels, a website one as it is. */
export function toPreview(source: string, width: number) {
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

// The Trident logo photos everyone can pick, from the Profile Images folder.
const LOGO_PHOTOS = [
	{ name: DEFAULT_PHOTO.name, label: 'Trident logo' },
	{ name: 'profile-dark-500x500.png', label: 'Trident logo, dark' }
];

function toLabel(file: string) {
	const words = file.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ');
	return words.charAt(0).toUpperCase() + words.slice(1);
}

function findRow(record: SignatureRecordType, sheets: SheetsType) {
	return sheets.people.find((each) => toEmailKey(each.email) === toEmailKey(record.email));
}

function toUnique(choices: ChoiceType[]) {
	const seen = new Set<string>();
	return choices.filter((choice) => !seen.has(choice.source) && seen.add(choice.source));
}

/** The photos a person can pick: their upload, their website photo, their Profile Images photos and the logos. */
export function toPhotoChoices(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved?: string | null
): ChoiceType[] {
	const row = findRow(record, sheets);
	const choices: ChoiceType[] = [];
	if (saved?.startsWith(UPLOAD)) choices.push({ source: saved, label: 'Your upload', preview: '' });
	if (row && isOwnPhoto(row.src)) {
		choices.push({ source: row.src, label: 'Website photo', preview: toPreview(row.src, 240) });
	}
	for (const profile of sheets.profiles) {
		if (!isTheirPhoto(profile.name, record.name, row?.profile)) continue;
		const source = `${DRIVE}${profile.file}`;
		choices.push({ source, label: toLabel(profile.name), preview: toPreview(source, 240) });
	}
	for (const logo of LOGO_PHOTOS) {
		const profile = sheets.profiles.find((each) => each.name === logo.name);
		const file = profile?.file ?? (logo.name === DEFAULT_PHOTO.name ? DEFAULT_PHOTO.file : '');
		if (!file) continue;
		const source = `${DRIVE}${file}`;
		choices.push({ source, label: logo.label, preview: toPreview(source, 240) });
	}
	return toUnique(choices);
}

/** The banners anyone can pick: their upload, and every banner in the Email Banners folder. */
export function toBannerChoices(sheets: SheetsType, saved?: string | null): ChoiceType[] {
	const choices: ChoiceType[] = [];
	if (saved?.startsWith(UPLOAD)) {
		choices.push({ source: saved, label: 'Your upload', preview: '', link: UPLOAD_BANNER_LINK });
	}
	const banners = sheets.banners.length
		? sheets.banners
		: [
				{
					banner: DEFAULT_BANNER.name,
					href: DEFAULT_BANNER.href,
					src: `${DRIVE}${DEFAULT_BANNER.file}`
				}
			];
	for (const banner of banners) {
		choices.push({
			source: banner.src,
			label: toLabel(banner.banner),
			preview: toPreview(banner.src, 600),
			link: banner.href
		});
	}
	return toUnique(choices);
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
	sheets: SheetsType
): PictureSourceType {
	const version = toVersion(source, sheets);
	return version ? { source, kind, version } : { source, kind };
}

// A banner as the signature shows it, found among the choices for where it goes and what it is called.
function toBanner(source: string, sheets: SheetsType): SignatureLookType['banner'] {
	if (!source) return undefined;
	const choice = toBannerChoices(sheets, source).find((each) => each.source === source);
	return {
		picture: toPicture(source, 'banner', sheets),
		href: choice?.link || UPLOAD_BANNER_LINK,
		alt: choice?.label ?? 'Trident Cubed'
	};
}

/** The pictures a person's signature shows, from their picks, the Sheet and the defaults. */
export function toPersonLook(
	record: SignatureRecordType,
	sheets: SheetsType,
	saved: SavedPicksType = {}
): SignatureLookType {
	return {
		photo: toPicture(toPhotoSource(record, sheets, saved.photo), 'photo', sheets),
		banner: toBanner(toBannerSource(record, sheets, saved.banner), sheets)
	};
}

/** The pictures a shared mailbox's signature shows: its Sheet row's photo (the logo for none) and banner. */
export function toMailboxLook(mailbox: SheetMailboxType, sheets: SheetsType): SignatureLookType {
	const banner = mailbox.banner
		? sheets.banners.find((each) => each.banner === mailbox.banner)
		: undefined;
	return {
		photo: toPicture(mailbox.src || COMPANY_LOGO, 'photo', sheets),
		banner: banner ? toBanner(banner.src, sheets) : undefined
	};
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

// The parts every signature shares: its pictures at the addresses they were copied to, and the social links.
function toPictureParts(
	look: SignatureLookType,
	made: MadeLookType,
	sheets: SheetsType
): Pick<SignatureType, 'src' | 'banner' | 'socialLinks' | 'icons' | 'logoImage'> {
	const { logo, ...icons } = made.icons;
	return {
		src: made.photo || COMPANY_LOGO,
		banner:
			look.banner && made.banner
				? { href: look.banner.href, src: made.banner, alt: look.banner.alt }
				: undefined,
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
	made: MadeLookType
): SignatureType {
	const row = findRow(record, sheets);
	const email = record.email || row?.email || '';
	return {
		id: record.id,
		type: 'person',
		name: record.name,
		title: record.title || row?.title || '',
		phone: record.phone || row?.phone || '',
		email,
		group: toSharedAddresses(row?.group ?? '', email),
		href: record.link || row?.href || '',
		slug: record.id,
		...toPictureParts(look, made, sheets)
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
		href: mailbox.href,
		slug: mailbox.slug,
		...toPictureParts(look, made, sheets)
	};
}

// Email signatures (#354): the plain rules, tested beside. A person's signature is built from their Team record, the
// details the app holds; the signature Sheets fill in what it does not hold yet (the shared addresses under them, the
// banner, the company's social links) and give the shared mailboxes. Every picture that is not one of the website's
// own files is copied to the app's public signature address, so a pasted signature never points at Google Drive, at
// a signed-in-only file or at whatever storage the app uses today.
import { COMPANY_LOGO, OWN_HOSTS } from './signature.constants';
import type { MailboxType, PictureSourceType, SignatureType } from './signature.types';

/** A person row of the signature Sheet, as the app uses it. */
export type SheetPersonType = {
	email: string;
	name: string;
	title: string;
	phone: string;
	/** The shared addresses shown under the person, comma separated. */
	group: string;
	href: string;
	src: string;
	banner?: string;
};

/** A shared mailbox row of the signature Sheet. */
export type SheetMailboxType = MailboxType & {
	title: string;
	phone: string;
	href: string;
	src: string;
	banner?: string;
};

export type SheetBannerType = { banner: string; href: string; src: string };

export type SocialLinksType = NonNullable<SignatureType['socialLinks']>;

/** Everything the Sheets give, read whole. */
export type SheetsType = {
	people: SheetPersonType[];
	mailboxes: SheetMailboxType[];
	banners: SheetBannerType[];
	social: SocialLinksType;
};

export const NO_SHEETS: SheetsType = { people: [], mailboxes: [], banners: [], social: {} };

/** The Team record's details a signature uses. */
export type SignatureRecordType = {
	id: string;
	name: string;
	title: string;
	phone: string;
	email: string;
	link: string;
	photo: string;
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

/**
 * A Google Drive picture's direct address. Drive's share and thumbnail addresses send the browser through a signed-in
 * Google hop that most mail apps do not follow, which is why the website asks for the direct one (`email.remote.ts`).
 */
export function toDirectPicture(url: string) {
	if (!/drive\.google\.com|googleusercontent\.com/.test(url)) return url;
	const id = DRIVE_ID.map((pattern) => url.match(pattern)?.[1]).find(Boolean);
	if (!id) return url;
	const width =
		url
			.match(/[?&]sz=w(\d+)|=w(\d+)/)
			?.slice(1)
			.find(Boolean) ?? '2000';
	return `https://lh3.googleusercontent.com/d/${id}=w${width}`;
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
				src: toDirectPicture(toText(row.src)),
				banner: toOptional(row.banner)
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
				src: toDirectPicture(toText(row.src)),
				banner: toOptional(row.banner)
			}
		];
	});
	const banners = toRows(raw.banners).flatMap((row): SheetBannerType[] => {
		const banner = toText(row.banner);
		const src = toText(row.src);
		return banner && src ? [{ banner, href: toText(row.href), src: toDirectPicture(src) }] : [];
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
	return { people, mailboxes, banners, social };
}

/** Whether a picture is one of the website's own files, which a signature links to where it is. */
export function isOwnPicture(url: string) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' && OWN_HOSTS.includes(parsed.hostname);
	} catch {
		return false;
	}
}

/**
 * Whether a picture must be copied to the signature address before a signature may show it: anything that is not
 * one of the website's own files (an app file, a starting file, Google Drive, Cloudinary, a sign-in picture).
 */
export function isCopied(url: string) {
	return Boolean(url) && !isOwnPicture(url);
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

/** The pictures a person's signature needs: their photo and their banner, when each is there. */
export function toPersonPictures(
	record: SignatureRecordType,
	sheets: SheetsType
): { photo?: PictureSourceType; banner?: PictureSourceType } {
	const row = sheets.people.find((each) => toEmailKey(each.email) === toEmailKey(record.email));
	const banner = row?.banner && sheets.banners.find((each) => each.banner === row.banner);
	return {
		photo: record.photo ? { source: record.photo, kind: 'photo' } : undefined,
		banner: banner ? { source: banner.src, kind: 'banner' } : undefined
	};
}

/**
 * A person's signature: their Team record first, the Sheet's row (matched by email) for what the record leaves out,
 * and the pictures at the addresses they were copied to. With no photo, the company logo shows, as on the website.
 */
export function toPersonSignature(
	record: SignatureRecordType,
	sheets: SheetsType,
	pictures: { photo?: string; banner?: string }
): SignatureType {
	const row = sheets.people.find((each) => toEmailKey(each.email) === toEmailKey(record.email));
	const banner = row?.banner
		? sheets.banners.find((each) => each.banner === row.banner)
		: undefined;
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
		src: pictures.photo || COMPANY_LOGO,
		slug: record.id,
		socialLinks: sheets.social,
		banner:
			banner && pictures.banner
				? { href: banner.href, src: pictures.banner, alt: banner.banner }
				: undefined
	};
}

/** A shared mailbox's signature, from its Sheet row, with its pictures where they were copied to. */
export function toMailboxSignature(
	mailbox: SheetMailboxType,
	sheets: SheetsType,
	pictures: { photo?: string; banner?: string }
): SignatureType {
	const banner = mailbox.banner
		? sheets.banners.find((each) => each.banner === mailbox.banner)
		: undefined;
	return {
		id: mailbox.slug,
		type: 'group',
		name: mailbox.name,
		title: mailbox.title,
		phone: mailbox.phone,
		email: mailbox.email,
		group: '',
		href: mailbox.href,
		src: pictures.photo || COMPANY_LOGO,
		slug: mailbox.slug,
		socialLinks: sheets.social,
		banner:
			banner && pictures.banner
				? { href: banner.href, src: pictures.banner, alt: banner.banner }
				: undefined
	};
}

/** The pictures a shared mailbox's signature needs. */
export function toMailboxPictures(
	mailbox: SheetMailboxType,
	sheets: SheetsType
): { photo?: PictureSourceType; banner?: PictureSourceType } {
	const banner = mailbox.banner
		? sheets.banners.find((each) => each.banner === mailbox.banner)
		: undefined;
	return {
		photo: mailbox.src ? { source: mailbox.src, kind: 'photo' } : undefined,
		banner: banner ? { source: banner.src, kind: 'banner' } : undefined
	};
}

import { query } from "$app/server";
import * as v from "valibot";

// Base API URL
const API_BASE = "https://sheetari.deno.dev";
const PERSON_SHEET_ID = "1Eauw3boJ1Gu6B78ywFuYB_bE3H1yHZyes0U0Mg9qRUs";
const GROUP_SHEET_ID = "1Eauw3boJ1Gu6B78ywFuYB_bE3H1yHZyes0U0Mg9qRUs";
const SOCIAL_SHEET_ID = "1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4";

// Type definitions for raw API responses
interface PersonAPIResponse {
	id: string;
	type: "person";
	name: string;
	title: string;
	phone: string;
	email: string;
	group: string;
	href: string;
	src: string;
	slug: string;
	rank?: string;
	location?: string;
	banner?: string; // Banner identifier to match with banner sheet
}

interface GroupAPIResponse {
	id: string;
	type: "group";
	shortname: string;
	email: string;
	name: string;
	title: string;
	phone: string;
	href: string;
	src: string;
	slug: string;
	banner?: string; // Banner identifier to match with banner sheet
}

interface SocialAPIResponse {
	id: string;
	name: string;
	href: string;
	src: string;
}

interface BannerAPIResponse {
	id: string;
	banner: string;
	href: string;
	src: string;
}

// Social links interface
export interface SocialLinks {
	linkedin?: string;
	facebook?: string;
	whatsapp?: string;
}

// Navigation types
export interface EmailNavigationData {
	persons: PersonAPIResponse[];
	groups: GroupAPIResponse[];
}

const DEFAULT_RANK = 999;

function asArray<T>(value: T[] | unknown): T[] {
	return Array.isArray(value) ? value : [];
}

function toText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
	const text = toText(value);
	return text ? text : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getRankValue(rank: string | undefined): number {
	const parsedRank = Number.parseInt(rank ?? "", 10);
	return Number.isFinite(parsedRank) ? parsedRank : DEFAULT_RANK;
}

function normalizePerson(value: unknown): PersonAPIResponse | null {
	if (!isRecord(value)) return null;

	const slug = toText(value.slug);
	const name = toText(value.name);

	if (!slug || !name) {
		return null;
	}

	return {
		id: toText(value.id) || slug,
		type: "person",
		name,
		title: toText(value.title),
		phone: toText(value.phone),
		email: toText(value.email),
		group: toText(value.group),
		href: toText(value.href),
		src: toText(value.src),
		slug,
		rank: toOptionalText(value.rank),
		location: toOptionalText(value.location),
		banner: toOptionalText(value.banner),
	};
}

function normalizeGroup(value: unknown): GroupAPIResponse | null {
	if (!isRecord(value)) return null;

	const slug = toText(value.slug);
	const name = toText(value.name);
	const shortname = toText(value.shortname) || name || slug;

	if (!slug || !shortname) {
		return null;
	}

	return {
		id: toText(value.id) || slug,
		type: "group",
		shortname,
		email: toText(value.email),
		name,
		title: toText(value.title),
		phone: toText(value.phone),
		href: toText(value.href),
		src: toText(value.src),
		slug,
		banner: toOptionalText(value.banner),
	};
}

function normalizeSocial(value: unknown): SocialAPIResponse | null {
	if (!isRecord(value)) return null;

	const name = toText(value.name);
	const href = toText(value.href);

	if (!name || !href) {
		return null;
	}

	return {
		id: toText(value.id) || name.toLowerCase(),
		name,
		href,
		src: toText(value.src),
	};
}

function normalizeBanner(value: unknown): BannerAPIResponse | null {
	if (!isRecord(value)) return null;

	const banner = toText(value.banner);
	const src = toText(value.src);

	if (!banner || !src) {
		return null;
	}

	return {
		id: toText(value.id) || banner,
		banner,
		href: toText(value.href),
		src,
	};
}

function compareText(left: string, right: string): number {
	return left.localeCompare(right, undefined, { sensitivity: "base" });
}

// Batch fetch multiple sheets using the same pattern as globe.remote.ts
const getSheetariEmailData = query.batch(v.string(), async (sheets) => {
	const responses = await Promise.all(
		sheets.map((sheet) => {
			const url = sheet === "social"
				? `${API_BASE}/${SOCIAL_SHEET_ID}/${sheet}`
				: `${API_BASE}/${PERSON_SHEET_ID}/${sheet}`;
			return fetch(url).then((r) => r.json());
		}),
	);

	// Return a function that maps sheet name to its data
	return (sheet) => responses[sheets.indexOf(sheet)];
});

/**
 * Fetch all person email signatures
 */
export const fetchPersons = query(async () => {
	const data = await getSheetariEmailData("person");
	return asArray(data).map(normalizePerson).filter((person) => person !== null);
});

/**
 * Fetch all group email signatures
 */
export const fetchGroups = query(async () => {
	const data = await getSheetariEmailData("group");
	return asArray(data).map(normalizeGroup).filter((group) => group !== null);
});

/**
 * Fetch social links
 */
export const fetchSocials = query(async () => {
	const data = await getSheetariEmailData("social");
	const socialData = asArray(data).map(normalizeSocial).filter((social) =>
		social !== null
	);

	// Convert array to object with lowercase keys
	const socialLinks: SocialLinks = {};
	socialData.forEach((social) => {
		const key = social.name.toLowerCase() as keyof SocialLinks;
		socialLinks[key] = social.href;
	});

	return socialLinks;
});

/**
 * Fetch banner images
 */
export const fetchBanners = query(async () => {
	const data = await getSheetariEmailData("banner");
	return asArray(data).map(normalizeBanner).filter((banner) => banner !== null);
});

/**
 * Fetch all email signatures (for navigation and individual pages)
 */
export const fetchAllEmails = query(async () => {
	const [persons, groups] = await Promise.all([fetchPersons(), fetchGroups()]);

	return {
		persons: [...persons].sort((a, b) => {
			// Sort by rank first (lower is higher priority), then by name
			const rankA = getRankValue(a.rank);
			const rankB = getRankValue(b.rank);
			if (rankA !== rankB) return rankA - rankB;
			return compareText(a.name, b.name);
		}),
		groups: [...groups].sort((a, b) => compareText(a.shortname, b.shortname)),
	};
});

// The release rule (#157): which commits a release lists, which version it gets, what the app calls its version and
// what the GitHub release says. One version for the whole repo, tagged v<major>.<minor>.<patch> (/oneezy-naming), and
// the tag is the one record of it: nothing is committed for a release. Commit titles read
// `✨ feat(app): count an attached PDF (#290)`: a `feat` is a new feature, a `fix` or `perf` a fix, and every other kind
// (chore, ci, docs, refactor, test, style) is work the team never sees, so a release does not list it. The bump: any
// `!` or `BREAKING CHANGE:` is major, else any feature is minor, else any fix is patch. With no feature or fix since
// the last release there is no release.
//
// Plain functions and data, no git or file: releases.server.ts reads the tags and the commits, history.utils.ts folds
// the changes into What's New's batches and the GitHub notes, scripts/release.ts makes the release, and the app shows
// what the build was told. Written in the TypeScript Node runs as it is (no
// enums, `.ts` imports), for that script.
/** What a change is to the team: a new feature, or a fix to something that was wrong or slow. */
export type ChangeKindType = 'feature' | 'fix';

/** One line of a release's notes. */
export type ReleaseChangeType = {
	kind: ChangeKindType;
	/** The commit's title in plain words, starting with a capital. */
	text: string;
	/** The app or package it changed (`app`, `ui`, `site`), when the title names one. */
	area?: string;
	/** The tickets the title names, `(#290)`. */
	tickets: number[];
	/** Pictures for this change, before and after, as addresses the app can open. */
	pictures?: string[];
};

/** One release: its version without the `v`, the day it was made, and what it lists. */
export type ReleaseType = {
	version: string;
	/** The day it was made, as YYYY-MM-DD. */
	date: string;
	/** A sentence or two above the lists, when a release needs one. */
	summary?: string;
	changes: ReleaseChangeType[];
};

/** A release as What's New names it: its version and where its notes are. */
export type ReleaseRefType = { version: string; url: string };

/** A commit as `git log` gives it. */
export type CommitType = { subject: string; body?: string };

/**
 * Whether releases are made (#157). On since Justin's word on 2026-11-27: the push that brought next into dev made
 * FIRST_VERSION, its notes the one list in first-release.ts, and every push to dev after it with a feature or a fix
 * makes the next version. Once the first tag exists, this is no longer read.
 */
export const IS_RELEASING = true;

/** The branches a release is made from (dev) or promoted to (main): a build there is the version being released. */
export const RELEASE_BRANCHES = ['dev', 'main'];

/**
 * The branch whose every push is a prerelease of the release to come (Justin, 2026-11-27): v1.0.0-next.1, -next.2,
 * each with its tag and a GitHub pre-release, before the first release and after it.
 */
export const PRERELEASE_BRANCH = 'next';

/** Where the releases are published. */
export const REPOSITORY_URL = 'https://github.com/layerdbiz/tridentcubed';

/** The version the first release gets (#157). */
export const FIRST_VERSION = '1.0.0';

/** What the first release says above its lists. */
export const FIRST_SUMMARY =
	'Trident Cubed now has version numbers. From here on, every update shows what is new and what was fixed, right here.';

/** The team's clock, for the days What's New and the GitHub releases are told on. */
export const TEAM_TIME_ZONE = 'America/Chicago';

const KINDS: Record<string, ChangeKindType> = { feat: 'feature', fix: 'fix', perf: 'fix' };

// An optional emoji, the kind, an optional (area), an optional `!`, a colon and the words: `✨ feat(app)!: words`.
const TITLE =
	/^(?:[^\sA-Za-z0-9]+\s+)?(?<kind>[a-z]+)(?:\((?<area>[^)]*)\))?(?<isBreaking>!)?:\s*(?<words>.+)$/u;
// One bracket of tickets, `(#346)` or `(#346, #345)`, and the numbers inside one.
const TICKETS = /\s*\((#\d+(?:,\s*#\d+)*)\)/g;
const NUMBER = /#(\d+)/g;
// A release's tag: `v1.2.3`, nothing after it.
const TAG = /^v(\d+\.\d+\.\d+)$/;
// A prerelease's tag: `v1.2.3-next.4`.
const PRERELEASE_TAG = /^v(\d+\.\d+\.\d+)-next\.(\d+)$/;

type ParsedType = { change?: ReleaseChangeType; isBreaking: boolean };

function parse({ subject, body = '' }: CommitType): ParsedType {
	const match = TITLE.exec(subject.trim());
	if (!match?.groups) return { isBreaking: false };
	const { kind, area, isBreaking, words } = match.groups;
	const breaking = Boolean(isBreaking) || /^BREAKING[ -]CHANGE:/m.test(body);
	const change = KINDS[kind];
	if (!change) return { isBreaking: breaking };
	const tickets = [...words.matchAll(TICKETS)].flatMap((bracket) =>
		[...bracket[1].matchAll(NUMBER)].map((ticket) => Number(ticket[1]))
	);
	const plain = words.replace(TICKETS, '').trim();
	return {
		isBreaking: breaking,
		change: {
			kind: change,
			text: plain.charAt(0).toUpperCase() + plain.slice(1),
			...(area ? { area } : {}),
			tickets
		}
	};
}

/** The version after `version` for a bump. */
function bump(version: string, part: 'major' | 'minor' | 'patch') {
	const [major, minor, patch] = version.split('.').map(Number);
	if (part === 'major') return `${major + 1}.0.0`;
	if (part === 'minor') return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

/**
 * The new features and fixes among the commits, as a release lists them: features first, then fixes, each in the
 * order given, and a title met twice listed once. Every other kind of commit is left out.
 */
export function toReleaseChanges(commits: CommitType[]) {
	const parsed = commits.map(parse);
	const seen = new Set<string>();
	const changes: ReleaseChangeType[] = [];
	for (const kind of ['feature', 'fix'] as const) {
		for (const { change } of parsed) {
			if (change?.kind !== kind || seen.has(change.text)) continue;
			seen.add(change.text);
			changes.push(change);
		}
	}
	return changes;
}

/**
 * The release the commits since the last one make, or nothing when none of them is a feature or a fix. `last` is
 * the last release's version; with none, this is the first release: it gets FIRST_VERSION and FIRST_SUMMARY,
 * whatever it lists. Features come before fixes, each in the order given; a title met twice is listed once.
 */
export function planRelease(
	last: string | undefined,
	commits: CommitType[],
	date = new Date().toISOString().slice(0, 10)
): ReleaseType | undefined {
	const parsed = commits.map(parse);
	const changes = toReleaseChanges(commits);
	if (!last) return { version: FIRST_VERSION, date, summary: FIRST_SUMMARY, changes };
	if (changes.length === 0) return undefined;
	const part = parsed.some((commit) => commit.isBreaking)
		? 'major'
		: changes.some((change) => change.kind === 'feature')
			? 'minor'
			: 'patch';
	return { version: bump(last, part), date, changes };
}

/** A release tag's version, `v1.2.3` → `1.2.3`; nothing for any other tag. */
export function toTagVersion(tag: string) {
	return TAG.exec(tag.trim())?.[1];
}

/** Whether version `a` is newer than version `b`, part by part as numbers: 1.10.0 is newer than 1.9.0. */
export function isNewer(a: string, b: string) {
	const left = a.split('.').map(Number);
	const right = b.split('.').map(Number);
	for (const [index, part] of left.entries()) {
		if (part !== right[index]) return part > (right[index] ?? 0);
	}
	return false;
}

/** A version's tag, `1.2.3` → `v1.2.3`: its name on GitHub and as people read it. */
export function toTag(version: string) {
	return `v${version}`;
}

/** The release's page on GitHub: its notes. */
export function toReleaseUrl(version: string) {
	return `${REPOSITORY_URL}/releases/tag/${toTag(version)}`;
}

/** A prerelease: its version, the release it leads to and its number on the way, 1.2.0-next.3: 1.2.0 and 3. */
export type PrereleaseType = { version: string; base: string; number: number };

/** A prerelease tag's version, `v1.2.0-next.3` → 1.2.0-next.3, 1.2.0, 3; nothing for any other tag. */
export function toPrereleaseVersion(tag: string): PrereleaseType | undefined {
	const match = PRERELEASE_TAG.exec(tag.trim());
	if (!match) return undefined;
	return { version: `${match[1]}-next.${match[2]}`, base: match[1], number: Number(match[2]) };
}

/** Whether a version is a prerelease, 1.2.0-next.3, rather than a release. */
export function isPrerelease(version: string) {
	return version.includes('-');
}

/**
 * The release a prerelease leads to: the first release while there is none, else the one the commits since the last
 * make, or the next fix when none of them is a feature or a fix, since every push to next is a prerelease.
 */
export function toPrereleaseBase(last: string | undefined, commits: CommitType[]) {
	if (!last) return FIRST_VERSION;
	return planRelease(last, commits)?.version ?? bump(last, 'patch');
}

/** The prerelease after the ones of `base` already made, `numbers`: 1.0.0-next.4 after next.3; next.1 first. */
export function toNextPrerelease(base: string, numbers: number[]) {
	return `${base}-next.${Math.max(0, ...numbers) + 1}`;
}

// The theme's colours a release's glow is made of, in pairs that sit well together on the dark, ordered so the main
// colour of each differs from the next: next's releases one after another, as What's New scrolls through them
// (Justin, 2026-11-27), each look different from the one before.
const GLOWS: {
	color: 'primary' | 'accent' | 'danger' | 'warning';
	blend: 'primary' | 'accent' | 'danger' | 'warning';
}[] = [
	{ color: 'primary', blend: 'danger' },
	{ color: 'danger', blend: 'warning' },
	{ color: 'accent', blend: 'primary' },
	{ color: 'warning', blend: 'danger' },
	{ color: 'primary', blend: 'accent' },
	{ color: 'danger', blend: 'primary' },
	{ color: 'accent', blend: 'warning' },
	{ color: 'warning', blend: 'accent' }
];

/**
 * The colours of a release's glow at the top of What's New (Justin, 2026-11-27: each release its own colour): one of
 * the theme's pairs, picked by the version, so the same release always looks the same and the next one differs.
 */
export function toReleaseGlow(version: string) {
	let hash = 0;
	for (const character of version) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	return GLOWS[hash % GLOWS.length];
}

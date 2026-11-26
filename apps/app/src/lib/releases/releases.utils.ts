// The release rule (#157): which commits a release lists, which version it gets, what the app calls its version and
// what the GitHub release says. One version for the whole repo, tagged v<major>.<minor>.<patch> (/oneezy-naming), and
// the tag is the one record of it: nothing is committed for a release. Commit titles read
// `✨ feat(app): count an attached PDF (#290)`: a `feat` is a new feature, a `fix` or `perf` a fix, and every other kind
// (chore, ci, docs, refactor, test, style) is work the team never sees, so a release does not list it. The bump: any
// `!` or `BREAKING CHANGE:` is major, else any feature is minor, else any fix is patch. With no feature or fix since
// the last release there is no release.
//
// Plain functions and data, no git or file: releases.server.ts reads the tags and the commits, scripts/release.ts
// makes the release, and the app shows what the build was told. Written in the TypeScript Node runs as it is (no
// enums, `.ts` imports), for that script.
import type { HistoryBatchType, HistoryKindType } from './history.utils.ts';

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

/** A release as What's New names it: its version, its day and where its notes are. */
export type ReleaseRefType = { version: string; date: string; url: string };

/** A commit as `git log` gives it. */
export type CommitType = { subject: string; body?: string };

/**
 * Whether releases are made (#157). Off until Justin's word, so no tag and no GitHub release exist and every build
 * says "Not released yet". Turned on, the next push to dev makes FIRST_VERSION, and every push after it with a feature
 * or a fix makes the next version. Once the first tag exists, this is no longer read.
 */
export const IS_RELEASING = false;

/** The branches a release is made from (dev) or promoted to (main): a build there is the version being released. */
export const RELEASE_BRANCHES = ['dev', 'main'];

/** Where the releases are published. */
export const REPOSITORY_URL = 'https://github.com/layerdbiz/tridentcubed';

/** The version the first release gets (#157). */
export const FIRST_VERSION = '1.0.0';

/** What the first release says above its lists. */
export const FIRST_SUMMARY =
	'Trident Cubed now has version numbers. From here on, every update shows what is new and what was fixed, right here.';

/** The team's clock, for the days and times the GitHub release names (the app uses the reader's own). */
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

/** The release's page on GitHub: its notes. */
export function toReleaseUrl(version: string) {
	return `${REPOSITORY_URL}/releases/tag/v${version}`;
}

export type VersionLabelOptionsType = {
	/** The newest release the build holds all of. */
	last?: string;
	/** The release the build's changes since `last` make, if any. */
	planned?: string;
	/** Whether the build is on a branch releases are made from (RELEASE_BRANCHES). */
	isReleaseBranch: boolean;
	/** How many commits the build holds that `last` does not. */
	ahead: number;
};

/**
 * The app's version as people read it. On dev a build with something new is the release being made from it right
 * now, so it carries that version even in the minute before its tag exists. Anywhere else, next above all, it is the
 * release still to come, marked as a build before it: v1.2.0-next.12, the 12 counting the commits since the last
 * release. Empty while nothing is released and releases are not made yet.
 */
export function toVersionLabel({ last, planned, isReleaseBranch, ahead }: VersionLabelOptionsType) {
	if (!planned) return last ? `v${last}` : '';
	return isReleaseBranch ? `v${planned}` : `v${planned}-next.${ahead}`;
}

// The parts of the day as people say them, from the hour each starts.
const PARTS: { from: number; label: string }[] = [
	{ from: 21, label: 'night' },
	{ from: 17, label: 'evening' },
	{ from: 12, label: 'afternoon' },
	{ from: 5, label: 'morning' },
	{ from: 0, label: 'night' }
];

/** A batch's title: the words written for it, or when it began as people say it, Wednesday evening. */
export function toBatchTitle(batch: Pick<HistoryBatchType, 'title' | 'from'>, timeZone?: string) {
	if (batch.title) return batch.title;
	const from = new Date(batch.from);
	const day = from.toLocaleDateString('en-US', { weekday: 'long', timeZone });
	const hour = Number(
		from.toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone })
	);
	const part = PARTS.find((each) => hour >= each.from)!.label;
	return `${day} ${part}`;
}

function toDay(at: string, timeZone?: string, isYear = true) {
	return new Date(at).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		...(isYear ? { year: 'numeric' } : {}),
		timeZone
	});
}

/** The day a batch was released, or the days it ran over: November 24 – 25, 2026. */
export function toBatchWhen(batch: Pick<HistoryBatchType, 'from' | 'to'>, timeZone?: string) {
	const from = toDay(batch.from, timeZone);
	const to = toDay(batch.to, timeZone);
	if (from === to) return to;
	const parts = (at: string) =>
		new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone })
			.formatToParts(new Date(at))
			.reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
	const start = parts(batch.from);
	const end = parts(batch.to);
	if (start.year === end.year && start.month === end.month) {
		return `${toDay(batch.from, timeZone, false)} – ${end.day}, ${end.year}`;
	}
	return `${toDay(batch.from, timeZone, false)} – ${to}`;
}

/** How many new features, improvements and fixes a batch holds, the ones it has: 3 new, 2 fixes. */
export function toBatchCounts(batch: Pick<HistoryBatchType, 'changes'>) {
	const count = (kind: HistoryKindType) =>
		batch.changes.filter((change) => change.kind === kind).length;
	const parts = [
		[count('feature'), 'new'],
		[count('improved'), 'improved'],
		[count('fix'), count('fix') === 1 ? 'fix' : 'fixes']
	] as const;
	return parts.filter(([number]) => number > 0).map(([number, words]) => `${number} ${words}`);
}

const SECTIONS: { kind: HistoryKindType; heading: string }[] = [
	{ kind: 'feature', heading: '### ✨ New features' },
	{ kind: 'improved', heading: '### ⬆️ Improved' },
	{ kind: 'fix', heading: '### 🐛 Fixes' }
];

function toLine(change: { text: string; tickets: number[]; area?: string }, hasArea = false) {
	const tickets = change.tickets.map((ticket) => `#${ticket}`).join(', ');
	const area = hasArea && change.area ? `${change.area}: ` : '';
	return `- ${area}${change.text}${tickets ? ` (${tickets})` : ''}`;
}

export type ReleaseNotesType = {
	/** The words above everything, the first release's welcome. */
	summary?: string;
	/** What's New's batches the release brings, newest first, as the app shows them. */
	batches: HistoryBatchType[];
	/** The features and fixes outside the app and its library (the website, the tools), which What's New leaves out. */
	others: ReleaseChangeType[];
};

/**
 * A release's notes as GitHub shows them, the same as What's New in the app: each batch of work with its title, its
 * days and its words, then its new features, improvements and fixes, each with its tickets; then, under Behind the
 * scenes, the changes outside the app. Days are told on the team's clock.
 */
export function toReleaseNotes({ summary, batches, others }: ReleaseNotesType) {
	const blocks = summary ? [summary] : [];
	for (const batch of batches) {
		const when = [toBatchWhen(batch, TEAM_TIME_ZONE), ...toBatchCounts(batch)].join(' · ');
		blocks.push(`## ${toBatchTitle(batch, TEAM_TIME_ZONE)}`, `_${when}_`);
		if (batch.summary) blocks.push(batch.summary);
		for (const section of SECTIONS) {
			const lines = batch.changes
				.filter((change) => change.kind === section.kind)
				.map((change) => toLine(change));
			if (lines.length > 0) blocks.push(section.heading, lines.join('\n'));
		}
	}
	if (others.length > 0) {
		blocks.push('## Behind the scenes', others.map((change) => toLine(change, true)).join('\n'));
	}
	if (blocks.length === 0) blocks.push('Small changes behind the scenes.');
	return `${blocks.join('\n\n')}\n`;
}

// The areas whose changes people meet in the app: the app itself and the library it is drawn with.
const APP_AREAS = new Set(['app', 'ui']);

/** Whether people meet a change in the app: the app's and the library's, and those naming no area. */
export function isAppChange(change: ReleaseChangeType) {
	return !change.area || APP_AREAS.has(change.area);
}

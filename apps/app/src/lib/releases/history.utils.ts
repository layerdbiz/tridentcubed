// What's New keeps every update (#399), and Justin, 2026-11-27, wants it plain: each release's day of work under its
// date (2026-11-27), and in it only what people notice, in everyday words, as Features and Fixes. Every release has its
// own sections, next's prereleases too, so scrolling down reads v1.0.0-next.6, then next.5, next.4.
//
// Plain functions and data, no git or browser: history.server.ts reads which commits landed on the branch and when,
// at build time, and hands them here. A commit titled `✨ feat(...)` is a feature and a `🐛 fix` or `⚡ perf` a fix
// (releases.utils.ts reads the title), but it shows only with its plain words: a line `What's New: <words>` in its
// message, one per thing people will notice, or, for the commits made before that rule, the words in notes.ts. Every
// other commit stays out of What's New. A change lands when the branch takes it: its own commit on the branch, or the
// merge that brought it. The same days, written out, are a GitHub release's notes (#157). A release on dev is told in
// its own words instead (highlights.ts, Justin, 2026-11-28): each feature under a short title with its highlights,
// then the fixes, in place of every line of its work; next.app keeps its lines, and beside them its release notes: the
// release to come, as Coming to dev, then each release on dev, as dev.app tells them (Justin, 2026-11-28).
import type { HighlightsType } from './highlights.ts';
import {
	TEAM_TIME_ZONE,
	isPrerelease,
	toReleaseChanges,
	toReleaseRef,
	type ChangeKindType,
	type CommitType,
	type ReleaseChangeType,
	type ReleaseRefType
} from './releases.utils.ts';

/**
 * A commit and when it landed: `landed` counts the branch's own commits, oldest first, from 0. `release` is the
 * version of the first release that held it (#400); none while it is not released.
 */
export type LandedType = {
	subject: string;
	/** The rest of the commit's message, where its plain words are. */
	body?: string;
	at: string;
	landed: number;
	/** The commit itself, for the server's own use. */
	commit?: string;
	release?: string;
};

/** One thing What's New lists: a feature or a fix, in plain words, or a release's titled one with its highlights. */
export type HistoryChangeType = ReleaseChangeType & {
	/** A titled feature or fix's highlights (highlights.ts): `text` is then its title. */
	points?: string[];
	/** When it landed (ISO). */
	at: string;
	/** Which of the branch's commits brought it, oldest 0. */
	landed: number;
	/** The version of the first release that held it; none while it is not released. */
	release?: string;
};

/** One day of work: its date on the team's clock, its changes and the release that brought them. */
export type HistoryBatchType = {
	/** The day, 2026-11-27: the batch's title. A release made on dev is dated the day it reached dev. */
	day: string;
	/** When its first change landed (ISO). */
	from: string;
	/** When its last change landed (ISO). */
	to: string;
	/** The release that brought it, with the link to its notes (#400); none while it is not released. */
	release?: ReleaseRefType;
	/** The highlights of the release to come, in next.app's release notes before it reaches dev: Coming to dev. */
	isUpcoming?: boolean;
	changes: HistoryChangeType[];
};

/**
 * Everything a build knows of its branch: its commit, the branch's commits (short), the days, newest first, and its
 * version as people read it (#400), empty while nothing is released. On next, its release notes too.
 */
export type HistoryType = {
	head: string;
	chain: string[];
	batches: HistoryBatchType[];
	/**
	 * next.app's release notes, beside every change (Justin, 2026-11-28): the release to come once its highlights are
	 * written, then each release on dev told in its highlights, newest first, as dev.app shows them. None on dev, whose
	 * list already is its release notes, or where nothing is written.
	 */
	notes?: HistoryBatchType[];
	version?: string;
};

/** Plain words for the changes made before the `What's New:` rule, by the commit's title words; the rest stay out. */
export type PlainType = Record<string, string>;

/** How many letters of a commit the chain keeps. */
export const SHORT = 12;

// A line of plain words in a commit's message: `What's New: Search from the menu.`
const PLAIN_LINE = /^What['’]s New:[ \t]*(.+)$/gim;

/**
 * What a commit tells people, in plain words: its `What's New:` lines, or the words written for it before that rule,
 * or nothing. A commit that is not a feature or a fix tells nothing.
 */
export function toPlainLines(commit: CommitType, plain: PlainType = {}) {
	const [change] = toReleaseChanges([commit]);
	if (!change) return [];
	const lines = [...(commit.body ?? '').matchAll(PLAIN_LINE)].map((line) => line[1].trim());
	if (lines.length > 0) return lines.filter(Boolean);
	return plain[change.text] ? [plain[change.text]] : [];
}

/**
 * Whether a change is of a ticket hidden for now (notes.ts `HIDDEN_TICKETS`): its work is on the branch but switched off for now, so
 * neither What's New nor a release's notes tell of it.
 */
export function isHidden(change: Pick<ReleaseChangeType, 'tickets'>, hidden: number[] = []) {
	return change.tickets.some((ticket) => hidden.includes(ticket));
}

/**
 * The changes people notice among the landed commits, oldest first, a line met twice kept once (its first); none of
 * a ticket hidden for now.
 */
export function toHistoryChanges(
	landed: LandedType[],
	plain: PlainType = {},
	hidden: number[] = []
): HistoryChangeType[] {
	const seen = new Set<string>();
	const changes: HistoryChangeType[] = [];
	for (const commit of landed) {
		const [change] = toReleaseChanges([commit]);
		if (!change || isHidden(change, hidden)) continue;
		for (const text of toPlainLines(commit, plain)) {
			if (seen.has(text)) continue;
			seen.add(text);
			changes.push({
				...change,
				text,
				at: commit.at,
				landed: commit.landed,
				...(commit.release ? { release: commit.release } : {})
			});
		}
	}
	return changes;
}

/** The day a moment falls on, 2026-11-27, on the clock given (the team's unless told). */
export function toDay(at: string, timeZone = TEAM_TIME_ZONE) {
	return new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone
	}).format(new Date(at));
}

/**
 * The changes, oldest first, folded into sections, oldest first. A release made on dev is one section, however many
 * days its work took (Justin, 2026-11-27: "I only care whenever they land into the dev app"); next's prereleases and
 * what is not released yet are folded into days. A release also ends a section (#400), next's prereleases too: a
 * section never holds the changes of two releases, or of a release and what is not released yet, so it names its one
 * release.
 */
export function toBatches(changes: HistoryChangeType[], timeZone = TEAM_TIME_ZONE) {
	const batches: HistoryBatchType[] = [];
	for (const change of changes) {
		const day = toDay(change.at, timeZone);
		const batch = batches.at(-1);
		const release = batch?.changes[0].release;
		const isWhole = release !== undefined && !isPrerelease(release);
		if (batch && release === change.release && (isWhole || batch.day === day)) {
			batch.changes.push(change);
			batch.to = change.at;
			batch.day = day;
		} else batches.push({ day, from: change.at, to: change.at, changes: [change] });
	}
	return batches;
}

export type HistoryOptionsType = {
	/** The releases the branch knows, published or being made (#400). */
	releases?: ReleaseRefType[];
	/** The build's version as people read it. */
	version?: string;
	/** Plain words for the commits made before the `What's New:` rule (notes.ts). */
	plain?: PlainType;
	/** The tickets hidden for now, their work switched off (notes.ts). */
	hidden?: number[];
	/** The clock the days are told on: the team's. */
	timeZone?: string;
	/**
	 * Each release's own words (highlights.ts): the changes of a release on dev that has them show as its titled
	 * features and fixes in place of their lines.
	 */
	highlights?: Record<string, HighlightsType>;
	/** On next, the release its versions lead to: its highlights, once written, top its release notes as Coming to dev. */
	upcoming?: string;
};

/** A release's highlights as its changes, the features then the fixes, in the order written. */
function toHighlightChanges(
	highlights: HighlightsType,
	at: string,
	landed: number,
	release: string
): HistoryChangeType[] {
	const kinds = [
		['feature', highlights.features],
		['fix', highlights.fixes]
	] as const;
	return kinds.flatMap(([kind, items]) =>
		items.map((item) => ({
			kind,
			text: item.title,
			points: item.points,
			tickets: [],
			at,
			landed,
			release
		}))
	);
}

/**
 * A release told in its own words as one section (Justin, 2026-11-28): its highlights, dated the day its last change
 * landed, everything it brought counted as landing with that change.
 */
function toHighlightBatch(
	landed: LandedType[],
	highlights: HighlightsType,
	release: string,
	timeZone: string
): HistoryBatchType {
	const last = landed.at(-1)!;
	return {
		day: toDay(last.at, timeZone),
		from: landed[0].at,
		to: last.at,
		changes: toHighlightChanges(highlights, last.at, last.landed, release)
	};
}

/**
 * next.app's release notes (Justin, 2026-11-28): the release to come once its highlights are written, as Coming to
 * dev, dated with the newest change, then each release on dev with its highlights, newest first, each dated the day it
 * reached dev. None of them counts as new: what is new is in every change.
 */
function toNotes(
	newest: LandedType,
	releases: ReleaseRefType[],
	highlights: Record<string, HighlightsType>,
	upcoming: string,
	timeZone: string
) {
	const notes: HistoryBatchType[] = [];
	const coming = highlights[upcoming];
	if (coming) {
		notes.push({
			day: toDay(newest.at, timeZone),
			from: newest.at,
			to: newest.at,
			release: toReleaseRef(upcoming),
			isUpcoming: true,
			changes: toHighlightChanges(coming, newest.at, -1, upcoming)
		});
	}
	for (const release of releases.toReversed()) {
		const told = highlights[release.version];
		if (!told || isPrerelease(release.version) || release.version === upcoming) continue;
		const at = release.date ?? newest.at;
		notes.push({
			day: toDay(at, timeZone),
			from: at,
			to: at,
			release,
			changes: toHighlightChanges(told, at, -1, release.version)
		});
	}
	return notes;
}

/** Whether a release on dev is being made without its highlights (highlights.ts); a prerelease needs none. */
export function isMissingHighlights(version: string, highlights: Record<string, HighlightsType>) {
	return !isPrerelease(version) && !highlights[version];
}

/** A section with the release that brought it: dated the day that release reached dev, where it carries that day. */
function toReleased(
	batch: HistoryBatchType,
	release: ReleaseRefType | undefined,
	timeZone: string
) {
	if (!release) return batch;
	return { ...batch, release, ...(release.date ? { day: toDay(release.date, timeZone) } : {}) };
}

/**
 * The sections with the release that brought them, newest first, and each section's changes newest first: a release
 * made on dev is one section dated the day it reached dev, told in its highlights where they are written, next's
 * prereleases a section a day; and on next, beside them, its release notes.
 */
export function toHistory(
	head: string,
	chain: string[],
	landed: LandedType[],
	{
		releases = [],
		version,
		plain = {},
		hidden = [],
		timeZone = TEAM_TIME_ZONE,
		highlights = {},
		upcoming
	}: HistoryOptionsType = {}
): HistoryType {
	// A release on dev with its highlights is told in them, in place of its lines.
	const isTold = (each: LandedType) =>
		each.release !== undefined && !isPrerelease(each.release) && each.release in highlights;
	const sections = toBatches(
		toHistoryChanges(
			landed.filter((each) => !isTold(each)),
			plain,
			hidden
		),
		timeZone
	).map((batch) => ({ ...batch, changes: batch.changes.toReversed() }));
	for (const told of new Set(landed.filter(isTold).map((each) => each.release!))) {
		const own = landed.filter((each) => each.release === told);
		sections.push(toHighlightBatch(own, highlights[told], told, timeZone));
	}
	// Oldest first, by the last change each holds, then each with the release that brought it.
	const last = (batch: HistoryBatchType) =>
		Math.max(...batch.changes.map((change) => change.landed));
	const batches = sections
		.toSorted((a, b) => last(a) - last(b))
		.map((batch) =>
			toReleased(
				batch,
				releases.find((each) => each.version === batch.changes[0]?.release),
				timeZone
			)
		);
	const newest = landed.at(-1);
	const notes = upcoming && newest ? toNotes(newest, releases, highlights, upcoming, timeZone) : [];
	return {
		head,
		chain,
		batches: batches.reverse(),
		...(notes.length > 0 ? { notes } : {}),
		...(version ? { version } : {})
	};
}

/**
 * Which section is in view, for What's New's head to name (Justin, 2026-11-27): the last whose top (`tops`, in the
 * scroll's own terms, newest first) has passed `line`, the top of the scroll. Once the scroll is at its end, where the
 * sections near it never reach the line, the `open` one while it is on screen (a tap opened it and it scrolled as far
 * as it could), else the last of all.
 */
export function toSectionInView(tops: number[], line: number, isAtEnd = false, open = -1) {
	if (tops.length === 0) return 0;
	let index = 0;
	for (const [at, top] of tops.entries()) {
		if (top > line) break;
		index = at;
	}
	if (!isAtEnd) return index;
	return open >= index ? open : tops.length - 1;
}

/** Where a commit sits on the branch, oldest 0, or -1 when the branch does not hold it. */
export function toLanded(history: HistoryType, commit: string) {
	return commit ? history.chain.indexOf(commit.slice(0, SHORT)) : -1;
}

/** The changes that landed after `commit`, the one last seen: none when the branch does not hold it. */
export function toNewSince(history: HistoryType, commit: string) {
	const seen = toLanded(history, commit);
	if (seen < 0) return [];
	return history.batches.flatMap((batch) => batch.changes).filter((change) => change.landed > seen);
}

function countKind(batch: Pick<HistoryBatchType, 'changes'>, kind: ChangeKindType) {
	return batch.changes.filter((change) => change.kind === kind).length;
}

/** How many features and fixes a section holds, the kinds it has, each with its kind: 2 features, 1 fix. */
export function toBatchTallies(batch: Pick<HistoryBatchType, 'changes'>) {
	const features = countKind(batch, 'feature');
	const fixes = countKind(batch, 'fix');
	const parts = [
		['feature', features, features === 1 ? 'feature' : 'features'],
		['fix', fixes, fixes === 1 ? 'fix' : 'fixes']
	] as const;
	return parts
		.filter(([, number]) => number > 0)
		.map(([kind, number, words]) => ({ kind, text: `${number} ${words}` }));
}

/** How many features and fixes a section holds, the ones it has: 2 features, 1 fix. */
export function toBatchCounts(batch: Pick<HistoryBatchType, 'changes'>) {
	return toBatchTallies(batch).map((tally) => tally.text);
}

const SECTIONS: { kind: ChangeKindType; heading: string }[] = [
	{ kind: 'feature', heading: '### ✨ Features' },
	{ kind: 'fix', heading: '### 🐛 Fixes' }
];

function toLine(
	change: { text: string; tickets: number[]; area?: string; points?: string[] },
	hasArea = false
) {
	const tickets = change.tickets.map((ticket) => `#${ticket}`).join(', ');
	const area = hasArea && change.area ? `${change.area}: ` : '';
	// A titled feature or fix: its title in bold, its highlights under it.
	if (change.points)
		return [`- **${change.text}**`, ...change.points.map((point) => `  - ${point}`)].join('\n');
	return `- ${area}${change.text}${tickets ? ` (${tickets})` : ''}`;
}

export type ReleaseNotesType = {
	/** The words above everything: where it was made from, the first release's welcome. */
	summary?: string;
	/** What's New's days the release brings, newest first, as the app shows them. */
	batches: HistoryBatchType[];
	/** The features and fixes What's New leaves out, for whoever wants the detail. */
	others: ReleaseChangeType[];
};

/**
 * A release's notes as GitHub shows them (#157), the same as What's New in the app: each day under its date, its
 * features and fixes in plain words, each with its tickets; then, folded away under Behind the scenes, the rest.
 */
export function toReleaseNotes({ summary, batches, others }: ReleaseNotesType) {
	const blocks = summary ? [summary] : [];
	for (const batch of batches) {
		blocks.push(`## ${batch.day}`);
		for (const section of SECTIONS) {
			const lines = batch.changes
				.filter((change) => change.kind === section.kind)
				.map((change) => toLine(change));
			if (lines.length > 0) blocks.push(section.heading, lines.join('\n'));
		}
	}
	if (others.length > 0) {
		const lines = others.map((change) => toLine(change, true)).join('\n');
		blocks.push(`<details><summary>Behind the scenes</summary>\n\n${lines}\n\n</details>`);
	}
	if (blocks.length === 0) blocks.push('Small changes behind the scenes.');
	return `${blocks.join('\n\n')}\n`;
}

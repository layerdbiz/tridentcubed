// What's New keeps every update (#399), and Justin, 2026-11-27, wants it plain: each release's day of work under its
// date (2026-11-27), and in it only what people notice, in everyday words, as Features and Fixes. Every release has its
// own sections, next's prereleases too, so scrolling down reads v1.0.0-next.6, then next.5, next.4.
//
// Plain functions and data, no git or browser: history.server.ts reads which commits landed on the branch and when,
// at build time, and hands them here. A commit titled `✨ feat(...)` is a feature and a `🐛 fix` or `⚡ perf` a fix
// (releases.utils.ts reads the title), but it shows only with its plain words: a line `What's New: <words>` in its
// message, one per thing people will notice, or, for the commits made before that rule, the words in notes.ts. Every
// other commit stays out of What's New. A change lands when the branch takes it: its own commit on the branch, or the
// merge that brought it. The same days, written out, are a GitHub release's notes (#157).
import {
	TEAM_TIME_ZONE,
	toReleaseChanges,
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

/** One thing What's New lists: a feature or a fix, in plain words. */
export type HistoryChangeType = ReleaseChangeType & {
	/** When it landed (ISO). */
	at: string;
	/** Which of the branch's commits brought it, oldest 0. */
	landed: number;
	/** The version of the first release that held it; none while it is not released. */
	release?: string;
};

/** One day of work: its date on the team's clock, its changes and the release that brought them. */
export type HistoryBatchType = {
	/** The day, 2026-11-27: the batch's title. */
	day: string;
	/** When its first change landed (ISO). */
	from: string;
	/** When its last change landed (ISO). */
	to: string;
	/** The release that brought it, with the link to its notes (#400); none while it is not released. */
	release?: ReleaseRefType;
	changes: HistoryChangeType[];
};

/**
 * Everything a build knows of its branch: its commit, the branch's commits (short), the days, newest first, and its
 * version as people read it (#400), empty while nothing is released.
 */
export type HistoryType = {
	head: string;
	chain: string[];
	batches: HistoryBatchType[];
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

/** The changes people notice among the landed commits, oldest first, a line met twice kept once (its first). */
export function toHistoryChanges(landed: LandedType[], plain: PlainType = {}): HistoryChangeType[] {
	const seen = new Set<string>();
	const changes: HistoryChangeType[] = [];
	for (const commit of landed) {
		const [change] = toReleaseChanges([commit]);
		if (!change) continue;
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
 * The changes, oldest first, folded into days, oldest first. A release also ends one (#400), next's prereleases too
 * (Justin, 2026-11-27): a day never holds the changes of two releases, or of a release and what is not released yet,
 * so each section is one release's day and names it.
 */
export function toBatches(changes: HistoryChangeType[], timeZone = TEAM_TIME_ZONE) {
	const batches: HistoryBatchType[] = [];
	for (const change of changes) {
		const day = toDay(change.at, timeZone);
		const batch = batches.at(-1);
		if (batch && batch.day === day && batch.changes[0].release === change.release) {
			batch.changes.push(change);
			batch.to = change.at;
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
	/** The clock the days are told on: the team's. */
	timeZone?: string;
};

/** The days with the release that brought them, newest first, and each day's changes newest first. */
export function toHistory(
	head: string,
	chain: string[],
	landed: LandedType[],
	{ releases = [], version, plain = {}, timeZone = TEAM_TIME_ZONE }: HistoryOptionsType = {}
): HistoryType {
	const batches = toBatches(toHistoryChanges(landed, plain), timeZone).map((batch) => {
		// Every change of a day is of one release.
		const release = releases.find((each) => each.version === batch.changes.at(-1)?.release);
		return { ...batch, ...(release ? { release } : {}), changes: batch.changes.toReversed() };
	});
	return { head, chain, batches: batches.reverse(), ...(version ? { version } : {}) };
}

/**
 * Which section is in view, for What's New's head to name (Justin, 2026-11-27): the last whose top (`tops`, in the
 * scroll's own terms, newest first) has passed `line`, the top of the scroll; the last of all once the scroll is at
 * its end, where a short last section never reaches the line.
 */
export function toSectionInView(tops: number[], line: number, isAtEnd = false) {
	if (tops.length === 0) return 0;
	if (isAtEnd) return tops.length - 1;
	let index = 0;
	for (const [at, top] of tops.entries()) {
		if (top > line) break;
		index = at;
	}
	return index;
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

/** How many features and fixes a day holds, the ones it has: 2 features, 1 fix. */
export function toBatchCounts(batch: Pick<HistoryBatchType, 'changes'>) {
	const features = countKind(batch, 'feature');
	const fixes = countKind(batch, 'fix');
	const parts = [
		[features, features === 1 ? 'feature' : 'features'],
		[fixes, fixes === 1 ? 'fix' : 'fixes']
	] as const;
	return parts.filter(([number]) => number > 0).map(([number, words]) => `${number} ${words}`);
}

const SECTIONS: { kind: ChangeKindType; heading: string }[] = [
	{ kind: 'feature', heading: '### ✨ Features' },
	{ kind: 'fix', heading: '### 🐛 Fixes' }
];

function toLine(change: { text: string; tickets: number[]; area?: string }, hasArea = false) {
	const tickets = change.tickets.map((ticket) => `#${ticket}`).join(', ');
	const area = hasArea && change.area ? `${change.area}: ` : '';
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

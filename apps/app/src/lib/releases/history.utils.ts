// What's New keeps every update (#399). Justin, 2026-11-26: nothing ever leaves it; it folds the updates into batches
// of work like the Activity's Grouped view, each with its day, a friendly title and words, and in it the new
// features, what improved on something already out, and the fixes; never a batch of one when more came close by.
//
// Plain functions and data, no git or browser: history.server.ts reads which commits landed on the branch and when,
// at build time, and hands them here. A change is a commit titled `✨ feat(app): words (#n)` or a `fix`/`perf`, for
// the app or the library (releases.utils.ts reads the title). It lands when the branch takes it: its own commit on
// the branch, or the merge that brought it. The same batches, written out, are a GitHub release's notes (#157).
import {
	TEAM_TIME_ZONE,
	isAppChange,
	isPrerelease,
	toReleaseChanges,
	type ChangeKindType,
	type ReleaseChangeType,
	type ReleaseRefType
} from './releases.utils.ts';

/**
 * A commit and when it landed: `landed` counts the branch's own commits, oldest first, from 0. `release` is the
 * version of the first release that held it (#400); none while it is not released.
 */
export type LandedType = {
	subject: string;
	at: string;
	landed: number;
	/** The commit itself, for the server's own use. */
	commit?: string;
	release?: string;
};

/** What a change is in What's New: new, better than before (a feature for a ticket already out), or a fix. */
export type HistoryKindType = ChangeKindType | 'improved';

export type HistoryChangeType = Omit<ReleaseChangeType, 'kind'> & {
	kind: HistoryKindType;
	/** When it landed (ISO). */
	at: string;
	/** Which of the branch's commits brought it, oldest 0. */
	landed: number;
	/** The version of the first release that held it; none while it is not released. */
	release?: string;
};

/** One batch of work: its changes and the words written for it, if any. */
export type HistoryBatchType = {
	/** When its first change landed (ISO): it names the batch. */
	from: string;
	/** When its last change landed (ISO). */
	to: string;
	title?: string;
	summary?: string;
	/** The release that brought it, with the link to its notes (#400); none while it is not released. */
	release?: ReleaseRefType;
	changes: HistoryChangeType[];
};

/**
 * Everything a build knows of its branch: its commit, the branch's commits (short), the batches, newest first, and
 * its version as people read it (#400), empty while nothing is released.
 */
export type HistoryType = {
	head: string;
	chain: string[];
	batches: HistoryBatchType[];
	version?: string;
};

/** Words written for a batch: they go to the batch that holds `at`. */
export type NoteType = { at: string; title: string; summary: string };

/**
 * How changes fold into batches. A batch ends where no change lands for `gapHours`, or once it spans `longestHours`;
 * a batch of fewer than `fewest` changes joins the next one (the newest can stay small while it fills).
 */
export type HistoryBatchSettingsType = { gapHours: number; longestHours: number; fewest: number };

/** Justin, 2026-11-26 ("every hour or every 4 hours"): a stretch of work with no four-hour break, at most a day. */
export const BATCHES: HistoryBatchSettingsType = { gapHours: 4, longestHours: 24, fewest: 3 };

/** How many letters of a commit the chain keeps. */
export const SHORT = 12;

const HOUR = 3_600_000;

// A `perf` commit makes something already there faster or lighter: an improvement, not a fix.
const PERF = /^(?:[^\sA-Za-z0-9]+\s+)?perf\b/u;

/** The app's changes among the landed commits, oldest first, a title met twice kept once (its first landing). */
export function toHistoryChanges(landed: LandedType[]): HistoryChangeType[] {
	const seen = new Set<string>();
	const changes: HistoryChangeType[] = [];
	for (const commit of landed) {
		const [change] = toReleaseChanges([{ subject: commit.subject }]);
		if (!change || !isAppChange(change) || seen.has(change.text)) continue;
		seen.add(change.text);
		const kind = PERF.test(commit.subject.trim()) ? 'improved' : change.kind;
		const release = commit.release ? { release: commit.release } : {};
		changes.push({ ...change, kind, at: commit.at, landed: commit.landed, ...release });
	}
	return changes;
}

// The release a change is in, for cutting batches: a prerelease is not one, so next's pushes, each its own
// prerelease, fold together by time as before.
function toCut(change: HistoryChangeType) {
	return change.release && !isPrerelease(change.release) ? change.release : undefined;
}

/**
 * The changes, oldest first, folded into batches, oldest first. A release ends a batch (#400): a batch never holds
 * the changes of two releases, or of a release and what is not released yet. A prerelease does not end one.
 */
export function toBatches(changes: HistoryChangeType[], settings = BATCHES): HistoryBatchType[] {
	const runs: HistoryChangeType[][] = [];
	for (const change of changes) {
		const run = runs.at(-1);
		const time = Date.parse(change.at);
		const isNear =
			run &&
			toCut(run[0]) === toCut(change) &&
			time - Date.parse(run.at(-1)!.at) <= settings.gapHours * HOUR &&
			time - Date.parse(run[0].at) <= settings.longestHours * HOUR;
		if (isNear) run.push(change);
		else runs.push([change]);
	}
	// A small batch joins the one after it, in the same release.
	const joined: HistoryChangeType[][] = [];
	let waiting: HistoryChangeType[] = [];
	for (const [index, run] of runs.entries()) {
		const batch = [...waiting, ...run];
		const next = runs[index + 1];
		if (batch.length < settings.fewest && next && toCut(next[0]) === toCut(run[0])) waiting = batch;
		else {
			joined.push(batch);
			waiting = [];
		}
	}
	return joined.map((batch) => ({
		from: batch[0].at,
		to: batch.at(-1)!.at,
		changes: toImproved(batch, joined)
	}));
}

// A feature for a ticket a batch before it already brought out is an improvement on it.
function toImproved(batch: HistoryChangeType[], batches: HistoryChangeType[][]) {
	const before = new Set(
		batches
			.slice(0, batches.indexOf(batch))
			.flat()
			.flatMap((change) => change.tickets)
	);
	return batch.map((change) =>
		change.kind === 'feature' && change.tickets.some((ticket) => before.has(ticket))
			? { ...change, kind: 'improved' as const }
			: change
	);
}

export type HistoryOptionsType = {
	/** The releases the branch knows, published or being made (#400). */
	releases?: ReleaseRefType[];
	/** The build's version as people read it. */
	version?: string;
	settings?: HistoryBatchSettingsType;
};

/**
 * The batches with the words written for them and the release that brought them, newest first, and each batch's
 * changes newest first.
 */
export function toHistory(
	head: string,
	chain: string[],
	landed: LandedType[],
	notes: NoteType[] = [],
	{ releases = [], version, settings = BATCHES }: HistoryOptionsType = {}
): HistoryType {
	const batches = toBatches(toHistoryChanges(landed), settings).map((batch) => {
		const note = notes.find(
			(each) =>
				Date.parse(each.at) >= Date.parse(batch.from) && Date.parse(each.at) <= Date.parse(batch.to)
		);
		// A batch is its newest change's release: on next, the latest prerelease in it.
		const release = releases.find((each) => each.version === batch.changes.at(-1)?.release);
		const newestFirst: HistoryBatchType = {
			...batch,
			...(release ? { release } : {}),
			changes: batch.changes.toReversed()
		};
		return note ? { ...newestFirst, title: note.title, summary: note.summary } : newestFirst;
	});
	return { head, chain, batches: batches.reverse(), ...(version ? { version } : {}) };
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

// A day's year, month and day on the clock given, each as words.
function toDayParts(at: string, timeZone?: string) {
	const format = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone
	});
	return Object.fromEntries(
		format.formatToParts(new Date(at)).map((part) => [part.type, part.value])
	);
}

/** The day a batch was released, or the days it ran over: November 24 – 25, 2026. */
export function toBatchWhen(batch: Pick<HistoryBatchType, 'from' | 'to'>, timeZone?: string) {
	const from = toDay(batch.from, timeZone);
	const to = toDay(batch.to, timeZone);
	if (from === to) return to;
	const start = toDayParts(batch.from, timeZone);
	const end = toDayParts(batch.to, timeZone);
	if (start.year === end.year && start.month === end.month) {
		return `${toDay(batch.from, timeZone, false)} – ${end.day}, ${end.year}`;
	}
	return `${toDay(batch.from, timeZone, false)} – ${to}`;
}

function countKind(batch: Pick<HistoryBatchType, 'changes'>, kind: HistoryKindType) {
	return batch.changes.filter((change) => change.kind === kind).length;
}

/** How many new features, improvements and fixes a batch holds, the ones it has: 3 new, 2 fixes. */
export function toBatchCounts(batch: Pick<HistoryBatchType, 'changes'>) {
	const fixes = countKind(batch, 'fix');
	const parts = [
		[countKind(batch, 'feature'), 'new'],
		[countKind(batch, 'improved'), 'improved'],
		[fixes, fixes === 1 ? 'fix' : 'fixes']
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
 * A release's notes as GitHub shows them (#157), the same as What's New in the app: each batch of work with its
 * title, its days and its words, then its new features, improvements and fixes, each with its tickets; then, under
 * Behind the scenes, the changes outside the app. Days are told on the team's clock.
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

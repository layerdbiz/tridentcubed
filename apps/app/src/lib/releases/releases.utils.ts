// The release rule (#157): which commits a release lists and which version it gets. One version for the whole repo,
// tagged v<major>.<minor>.<patch> (/oneezy-naming). Commit titles read `✨ feat(app): count an attached PDF (#290)`:
// a `feat` is a new feature, a `fix` or `perf` a fix, and every other kind (chore, ci, docs, refactor, test, style)
// is work the team never sees, so a release does not list it. The bump: any `!` or `BREAKING CHANGE:` is major, else
// any feature is minor, else any fix is patch. With no feature or fix since the last release there is no release.
//
// Plain functions and data, no git or file: scripts/release.ts reads the commits and writes the release, and the app
// reads releases.json. Written in the TypeScript Node runs as it is (no enums, `.ts` imports), for that script.

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

/** A commit as `git log` gives it. */
export type CommitType = { subject: string; body?: string };

/** The version the first release gets (#157). */
export const FIRST_VERSION = '1.0.0';

/** What the first release says above its lists. */
export const FIRST_SUMMARY =
	'Trident Cubed now has version numbers. From here on, every update shows what is new and what was fixed, right here.';

const KINDS: Record<string, ChangeKindType> = { feat: 'feature', fix: 'fix', perf: 'fix' };

// An optional emoji, the kind, an optional (area), an optional `!`, a colon and the words: `✨ feat(app)!: words`.
const TITLE =
	/^(?:[^\sA-Za-z0-9]+\s+)?(?<kind>[a-z]+)(?:\((?<area>[^)]*)\))?(?<isBreaking>!)?:\s*(?<words>.+)$/u;
// One bracket of tickets, `(#346)` or `(#346, #345)`, and the numbers inside one.
const TICKETS = /\s*\((#\d+(?:,\s*#\d+)*)\)/g;
const NUMBER = /#(\d+)/g;

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

const HEADINGS: Record<ChangeKindType, string> = {
	feature: '## ✨ New features',
	fix: '## 🐛 Fixes'
};

/** A release's notes as GitHub shows them: the summary, then the new features and the fixes, each with its tickets. */
export function toReleaseNotes(release: ReleaseType) {
	const blocks = release.summary ? [release.summary] : [];
	for (const kind of ['feature', 'fix'] as const) {
		const lines = release.changes
			.filter((change) => change.kind === kind)
			.map((change) => {
				const tickets = change.tickets.map((ticket) => `#${ticket}`).join(', ');
				return `- ${change.text}${tickets ? ` (${tickets})` : ''}`;
			});
		if (lines.length > 0) blocks.push(HEADINGS[kind], lines.join('\n'));
	}
	return `${blocks.join('\n\n')}\n`;
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

// The areas whose changes people meet in the app: the app itself and the library it is drawn with.
const APP_AREAS = new Set(['app', 'ui']);

/** Whether people meet a change in the app: the app's and the library's, and those naming no area. */
export function isAppChange(change: ReleaseChangeType) {
	return !change.area || APP_AREAS.has(change.area);
}

/** A release's changes that What's New lists: those people meet in the app. */
export function toAppChanges(release: ReleaseType) {
	return release.changes.filter(isAppChange);
}

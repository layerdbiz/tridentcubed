// The Activity's Grouped view (#306; Justin, 2026-11-26): one person's back-to-back entries fold into one run, which
// shows as one snapshot line and opens like an accordion, so the page is not one huge list. The By Time view lists the
// same entries one by one.
import type { ActivityEventType } from './activity.types';

/** One person's back-to-back entries: newest first, and when the run began and ended. */
export type ActivityRunType = {
	/** The id of its newest entry. */
	id: string;
	who: string;
	userId: string | null;
	events: ActivityEventType[];
	/** Its oldest entry's time, as an ISO time. */
	from: string;
	/** Its newest entry's time, as an ISO time. */
	to: string;
};

/** How long a person may do nothing before their run ends: 30 minutes. A run ends at midnight too. */
export const RUN_GAP = 30 * 60_000;

// Whether two times fall on the same day where the device is.
function isSameDay(a: string, b: string) {
	return new Date(a).toDateString() === new Date(b).toDateString();
}

/** The Activity's entries (newest first) as runs, one person's back-to-back entries each, newest run first. */
export function toRuns(events: ActivityEventType[]): ActivityRunType[] {
	const runs: ActivityRunType[] = [];
	// Each person's run still taking entries: their oldest so far.
	const open = new Map<string, ActivityRunType>();
	for (const event of events) {
		const person = event.userId ?? event.who;
		const run = open.get(person);
		if (
			run &&
			Date.parse(run.from) - Date.parse(event.at) <= RUN_GAP &&
			isSameDay(run.from, event.at)
		) {
			run.events.push(event);
			run.from = event.at;
			continue;
		}
		const started: ActivityRunType = {
			id: event.id,
			who: event.who,
			userId: event.userId,
			events: [event],
			from: event.at,
			to: event.at
		};
		runs.push(started);
		open.set(person, started);
	}
	return runs;
}

/** What a run did: how many sign-ins and sign-outs, sign-in codes never used, projects opened, PDFs downloaded,
 * and rows added, changed and moved to the Trash, and the projects it touched. */
export type ActivityRunSummaryType = {
	signIns: number;
	signOuts: number;
	codes: number;
	/** Each project opened, once however often. */
	opened: number;
	/** Every PDF downloaded. */
	downloads: number;
	added: number;
	changed: number;
	trashed: number;
	/** Each project it touched once, newest first: its id when known, and its title. */
	projects: { id?: string; title: string }[];
};

/** What `run` did, for its snapshot line. */
export function toRunSummary(run: ActivityRunType): ActivityRunSummaryType {
	const summary: ActivityRunSummaryType = {
		signIns: 0,
		signOuts: 0,
		codes: 0,
		opened: 0,
		downloads: 0,
		added: 0,
		changed: 0,
		trashed: 0,
		projects: []
	};
	const seen = new Set<string>();
	const opened = new Set<string>();
	function touch(id: string | undefined, title: string | undefined) {
		const key = id ?? title;
		if (!title || !key || seen.has(key)) return;
		seen.add(key);
		summary.projects.push({ ...(id ? { id } : {}), title });
	}
	for (const event of run.events) {
		if (event.kind === 'signIn') summary.signIns += 1;
		else if (event.kind === 'signOut') summary.signOuts += 1;
		else if (event.kind === 'code') summary.codes += 1;
		else if (event.kind === 'open' || event.kind === 'download') {
			if (event.kind === 'download') summary.downloads += 1;
			else opened.add(event.projectId);
			touch(event.projectId, event.project);
		} else {
			if (event.kind === 'add') summary.added += 1;
			else if (event.kind === 'trash') summary.trashed += 1;
			else summary.changed += 1;
			touch(event.projectId, event.table === 'project' ? event.name : event.project);
		}
	}
	summary.opened = opened.size;
	return summary;
}

// ---------- The Activity Log and the bell (#403, Justin 2026-11-27) ----------
// Every row is the face of who did it with the action as a badge on it, under Today, Yesterday, Last 7 days and
// Earlier, with how long ago in the Online list's colours. The Log sorts its rows All, by project or by person, each
// grouped or not; a group shows how many of each action it holds, like the file counts (#350).

/** The headings rows sit under, newest first. */
export type ActivityBucketType = 'Today' | 'Yesterday' | 'Last 7 days' | 'Earlier';

const DAY = 86_400_000;

// Midnight before `time`, where the device is.
function startOfDay(time: number) {
	const day = new Date(time);
	day.setHours(0, 0, 0, 0);
	return day.getTime();
}

/** The heading `at` sits under, seen at `now`. */
export function toBucket(at: string, now = Date.now()): ActivityBucketType {
	const days = Math.round((startOfDay(now) - startOfDay(Date.parse(at))) / DAY);
	if (days <= 0) return 'Today';
	if (days === 1) return 'Yesterday';
	return days < 7 ? 'Last 7 days' : 'Earlier';
}

/** Rows, newest first, under their headings. */
export function byBucket<T>(items: T[], atOf: (item: T) => string, now = Date.now()) {
	const buckets: { label: ActivityBucketType; items: T[] }[] = [];
	for (const item of items) {
		const label = toBucket(atOf(item), now);
		const last = buckets.at(-1);
		if (last?.label === label) last.items.push(item);
		else buckets.push({ label, items: [item] });
	}
	return buckets;
}

/** How fresh a time is, the Online list's colours: fresh within 5 minutes (green), recent within the hour (orange). */
export type AgoToneType = 'fresh' | 'recent' | 'old';

// "3 hours", "1 day".
function toWord(count: number, word: string) {
	return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** "7 min ago", "3 hours ago", "4 days ago", and how fresh it is. */
export function toAgo(at: string, now = Date.now()): { words: string; tone: AgoToneType } {
	const minutes = (now - Date.parse(at)) / 60_000;
	const whole = Math.max(1, Math.floor(minutes));
	const hours = Math.floor(whole / 60);
	const words =
		whole < 60
			? `${whole} min ago`
			: hours < 24
				? `${toWord(hours, 'hour')} ago`
				: `${toWord(Math.floor(hours / 24), 'day')} ago`;
	return { words, tone: minutes < 5 ? 'fresh' : minutes < 60 ? 'recent' : 'old' };
}

/** The Log's time filter. */
export const ACTIVITY_TIMES = [
	{ id: 'any', label: 'Any time' },
	{ id: 'today', label: 'Today' },
	{ id: 'week', label: 'Last 7 days' },
	{ id: 'month', label: 'Last 30 days' }
] as const;

export type ActivityTimeType = (typeof ACTIVITY_TIMES)[number]['id'];

/** Whether `at` falls in the time picked. */
export function isInTime(at: string, time: ActivityTimeType, now = Date.now()) {
	if (time === 'any') return true;
	if (time === 'today') return Date.parse(at) >= startOfDay(now);
	return Date.parse(at) >= startOfDay(now) - (time === 'week' ? 6 : 29) * DAY;
}

/** The order a group's counts read in: added, changed, deleted, opened, downloaded, then sign-ins. */
const TALLY_ORDER: ActivityEventType['kind'][] = [
	'add',
	'change',
	'trash',
	'open',
	'download',
	'signIn',
	'signOut',
	'code'
];

/** How many of each action `events` hold, in the counts' order, the kinds with none left out. */
export function toTally(events: ActivityEventType[]) {
	const counts = new Map<ActivityEventType['kind'], number>();
	for (const event of events) counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
	return TALLY_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({
		kind,
		count: counts.get(kind) ?? 0
	}));
}

/** The project an entry is about: its id and title, or none for a sign-in or a row outside every project. */
export function projectOfEvent(
	event: ActivityEventType
): { id: string; title: string } | undefined {
	if (event.kind === 'open' || event.kind === 'download')
		return { id: event.projectId, title: event.project ?? '' };
	if (event.kind !== 'add' && event.kind !== 'change' && event.kind !== 'trash') return undefined;
	if (!event.projectId) return undefined;
	return {
		id: event.projectId,
		title: (event.table === 'project' ? event.name : event.project) ?? ''
	};
}

/** One project's entries, newest first: the Projects view. Entries outside every project gather under id ''. */
export type ActivityProjectGroupType = {
	id: string;
	title: string;
	events: ActivityEventType[];
	/** Who worked in it, whoever did something last first. */
	people: string[];
	/** Its newest entry's time. */
	at: string;
};

/** The entries by project, the project touched last first. */
export function toProjectGroups(events: ActivityEventType[]): ActivityProjectGroupType[] {
	const groups = new Map<string, ActivityProjectGroupType>();
	for (const event of events) {
		const project = projectOfEvent(event);
		const id = project?.id ?? '';
		let group = groups.get(id);
		if (!group) {
			group = { id, title: project?.title ?? '', events: [], people: [], at: event.at };
			groups.set(id, group);
		}
		if (!group.title && project?.title) group.title = project.title;
		group.events.push(event);
		if (!group.people.includes(event.who)) group.people.push(event.who);
	}
	return [...groups.values()];
}

/** One person's entries, newest first: the Users view. */
export type ActivityPersonGroupType = {
	who: string;
	userId: string | null;
	events: ActivityEventType[];
	at: string;
};

/** The entries by person, whoever did something last first. */
export function toPeopleGroups(events: ActivityEventType[]): ActivityPersonGroupType[] {
	const groups = new Map<string, ActivityPersonGroupType>();
	for (const event of events) {
		const key = event.userId ?? event.who;
		const group = groups.get(key);
		if (group) group.events.push(event);
		else groups.set(key, { who: event.who, userId: event.userId, events: [event], at: event.at });
	}
	return [...groups.values()];
}

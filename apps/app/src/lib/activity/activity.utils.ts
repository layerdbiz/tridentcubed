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

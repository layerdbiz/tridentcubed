// The Activity's Grouped view (#306, Justin 2026-11-26): one person's back-to-back entries fold into one run, so the
// page is not one huge list.
import { describe, expect, it } from 'vite-plus/test';
import type { ActivityEventType } from './activity.types';
import {
	isInTime,
	toAgo,
	toBucket,
	toPeopleGroups,
	toProjectGroups,
	toRunSummary,
	toRuns,
	toStreaks,
	toTally
} from './activity.utils';

// A local time on 25 November 2026, so a test reads the same in every time zone.
function at(hour: number, minute = 0) {
	return new Date(2026, 10, 25, hour, minute).toISOString();
}

let count = 0;
function change(
	who: string,
	time: string,
	extra: Partial<ActivityEventType> = {}
): ActivityEventType {
	count += 1;
	return {
		id: `c${count}`,
		at: time,
		kind: 'change',
		who,
		userId: `u-${who}`,
		thing: 'project',
		table: 'project',
		rowId: `r${count}`,
		columns: ['Title'],
		...extra
	} as ActivityEventType;
}

function idsOf(runs: ReturnType<typeof toRuns>) {
	return runs.map((run) => run.events.map((event) => event.id));
}

describe('toRuns', () => {
	it('folds one person’s back-to-back entries into one run, newest first', () => {
		const events = [
			change('Duncan', at(15, 40)),
			change('Duncan', at(15, 30)),
			change('Duncan', at(15, 10))
		];

		const runs = toRuns(events);

		expect(runs).toHaveLength(1);
		expect(runs[0].who).toBe('Duncan');
		expect(idsOf(runs)).toEqual([events.map((event) => event.id)]);
		expect(runs[0].from).toBe(at(15, 10));
		expect(runs[0].to).toBe(at(15, 40));
	});

	// Justin, 2026-11-28: "The minute that someone else enters the picture... it will group his things together, and
	// then if I come in after that, we'll group the next things that I do together."
	it('starts a new run each time someone else comes in between', () => {
		const events = [
			change('Duncan', at(15, 40)),
			change('Oziel', at(15, 35)),
			change('Oziel', at(15, 32)),
			change('Duncan', at(15, 30)),
			change('Duncan', at(15, 10))
		];
		const [d1, o1, o2, d2, d3] = events.map((event) => event.id);

		const runs = toRuns(events);

		expect(runs.map((run) => run.who)).toEqual(['Duncan', 'Oziel', 'Duncan']);
		expect(idsOf(runs)).toEqual([[d1], [o1, o2], [d2, d3]]);
	});

	// Justin, 2026-11-28: "Even if it spreads across multiple days."
	it('keeps one person’s back-to-back entries in one run however far apart, across days too', () => {
		const nextDay = new Date(2026, 10, 26, 9, 5).toISOString();
		const events = [
			change('Duncan', nextDay),
			change('Duncan', at(23, 55)),
			change('Duncan', at(8, 0))
		];

		const runs = toRuns(events);

		expect(idsOf(runs)).toEqual([events.map((event) => event.id)]);
		expect(runs[0].from).toBe(at(8, 0));
		expect(runs[0].to).toBe(nextDay);
	});
});

describe('toStreaks', () => {
	it('folds back-to-back items with the same key, in order', () => {
		const items = ['a1', 'a2', 'b1', 'a3', 'c1', 'c2'];

		expect(toStreaks(items, (item) => item[0])).toEqual([
			['a1', 'a2'],
			['b1'],
			['a3'],
			['c1', 'c2']
		]);
		expect(toStreaks([], (item: string) => item)).toEqual([]);
	});
});

describe('toRunSummary', () => {
	it('counts what a run did by kind, and names the projects it touched once each, newest first', () => {
		const susanna = { projectId: 'p1', project: 'MSC Susanna' };
		const [run] = toRuns([
			change('Duncan', at(15, 50), { ...susanna, table: 'photo', thing: 'photo', kind: 'add' }),
			change('Duncan', at(15, 45), { kind: 'trash', table: 'customer', thing: 'customer' }),
			change('Duncan', at(15, 40), { rowId: 'p2', projectId: 'p2', name: 'Harbor Lines job' }),
			change('Duncan', at(15, 35), { ...susanna, table: 'panel', thing: 'panel' }),
			{ id: 's1', at: at(15, 30), kind: 'signIn', who: 'Duncan', userId: 'u-Duncan' }
		]);

		expect(toRunSummary(run)).toEqual({
			signIns: 1,
			signOuts: 0,
			codes: 0,
			opened: 0,
			downloads: 0,
			added: 1,
			changed: 2,
			trashed: 1,
			projects: [
				{ id: 'p1', title: 'MSC Susanna' },
				{ id: 'p2', title: 'Harbor Lines job' }
			]
		});
	});

	it('counts each project opened once, every PDF downloaded, sign-outs and unused codes, and names those projects too', () => {
		const who = { who: 'Duncan', userId: 'u-Duncan' };
		const [run] = toRuns([
			{ id: 'o1', at: at(16, 30), kind: 'signOut', ...who },
			{
				id: 'd1',
				at: at(16, 25),
				kind: 'download',
				projectId: 'p1',
				project: 'MSC Susanna',
				...who
			},
			{
				id: 'd2',
				at: at(16, 20),
				kind: 'download',
				projectId: 'p1',
				project: 'MSC Susanna',
				...who
			},
			{
				id: 'v1',
				at: at(16, 15),
				kind: 'open',
				projectId: 'p2',
				project: 'Harbor Lines job',
				...who
			},
			{ id: 'v2', at: at(16, 10), kind: 'open', projectId: 'p1', project: 'MSC Susanna', ...who },
			{ id: 'v3', at: at(16, 5), kind: 'open', projectId: 'p1', project: 'MSC Susanna', ...who },
			{ id: 'v4', at: at(16, 2), kind: 'open', projectId: 'p3', ...who },
			{ id: 'k1', at: at(16, 0), kind: 'code', email: 'duncan@example.com', ...who }
		]);

		expect(toRunSummary(run)).toEqual({
			signIns: 0,
			signOuts: 1,
			codes: 1,
			opened: 3,
			downloads: 2,
			added: 0,
			changed: 0,
			trashed: 0,
			projects: [
				{ id: 'p1', title: 'MSC Susanna' },
				{ id: 'p2', title: 'Harbor Lines job' }
			]
		});
	});
});

// The Activity Log and the bell (#403, Justin 2026-11-27): rows under Today, Yesterday, Last 7 days and Earlier, how
// long ago in the Online list's colours, and the Projects and Users views with each group's counts.
describe('toBucket', () => {
	const now = new Date(2026, 10, 25, 18).getTime();

	it('puts each time under Today, Yesterday, Last 7 days or Earlier', () => {
		expect(toBucket(at(9), now)).toBe('Today');
		expect(toBucket(new Date(2026, 10, 24, 23).toISOString(), now)).toBe('Yesterday');
		expect(toBucket(new Date(2026, 10, 19, 8).toISOString(), now)).toBe('Last 7 days');
		expect(toBucket(new Date(2026, 10, 18, 8).toISOString(), now)).toBe('Earlier');
	});
});

describe('toAgo', () => {
	const now = new Date(2026, 10, 25, 18).getTime();

	it('says how long ago in words, fresh within 5 minutes, recent within the hour, old after', () => {
		expect(toAgo(at(17, 58), now)).toEqual({ words: '2 min ago', tone: 'fresh' });
		expect(toAgo(at(17, 50), now)).toEqual({ words: '10 min ago', tone: 'recent' });
		expect(toAgo(at(15), now)).toEqual({ words: '3 hours ago', tone: 'old' });
		expect(toAgo(at(17), now)).toEqual({ words: '1 hour ago', tone: 'old' });
		expect(toAgo(new Date(2026, 10, 21, 18).toISOString(), now)).toEqual({
			words: '4 days ago',
			tone: 'old'
		});
	});

	it('never says less than a minute', () => {
		expect(toAgo(at(18), now).words).toBe('1 min ago');
	});
});

describe('isInTime', () => {
	const now = new Date(2026, 10, 25, 18).getTime();

	it('keeps what falls in the time picked: any time, today, the last 7 days or the last 30 days', () => {
		const lastWeek = new Date(2026, 10, 20, 8).toISOString();
		expect(isInTime(at(9), 'today', now)).toBe(true);
		expect(isInTime(lastWeek, 'today', now)).toBe(false);
		expect(isInTime(lastWeek, 'week', now)).toBe(true);
		expect(isInTime(new Date(2026, 9, 1).toISOString(), 'month', now)).toBe(false);
		expect(isInTime(new Date(2026, 9, 1).toISOString(), 'any', now)).toBe(true);
	});
});

describe('toTally', () => {
	it('counts what a group did by kind, added first, then changed, deleted, opened and downloaded', () => {
		const events = [
			change('Duncan', at(15, 40)),
			change('Duncan', at(15, 30), { kind: 'add' }),
			change('Duncan', at(15, 20)),
			{
				id: 'o1',
				at: at(15, 10),
				kind: 'open',
				who: 'Duncan',
				userId: 'u-Duncan',
				projectId: 'p1'
			} as ActivityEventType
		];

		expect(toTally(events)).toEqual([
			{ kind: 'add', count: 1 },
			{ kind: 'change', count: 2 },
			{ kind: 'open', count: 1 }
		]);
	});
});

describe('toProjectGroups', () => {
	it('gathers each project’s entries, the project touched last first, with who worked in it', () => {
		const panel = { table: 'panel', thing: 'panel' } as const;
		const events = [
			change('Duncan', at(15, 40), { ...panel, projectId: 'p1', project: 'Reactor' }),
			change('Oziel', at(15, 30), { ...panel, projectId: 'p2', project: 'Turbine' }),
			change('Ana', at(15, 20), { ...panel, projectId: 'p1', project: 'Reactor' }),
			change('Duncan', at(15, 10), { ...panel, projectId: 'p1', project: 'Reactor' })
		];

		const groups = toProjectGroups(events);

		expect(groups.map((group) => [group.id, group.title, group.events.length])).toEqual([
			['p1', 'Reactor', 3],
			['p2', 'Turbine', 1]
		]);
		expect(groups[0].people).toEqual(['Duncan', 'Ana']);
	});

	it('names a project by its own title on a change to the project itself, and keeps the rest together apart', () => {
		const events = [
			change('Duncan', at(15, 40), {
				table: 'project',
				thing: 'project',
				projectId: 'p1',
				name: 'Reactor'
			}),
			{ id: 's1', at: at(15, 30), kind: 'signIn', who: 'Ana', userId: 'u-Ana' } as ActivityEventType
		];

		const groups = toProjectGroups(events);

		expect(groups.map((group) => [group.id, group.title])).toEqual([
			['p1', 'Reactor'],
			['', '']
		]);
	});
});

describe('toPeopleGroups', () => {
	it('gathers each person’s entries, whoever did something last first', () => {
		const events = [
			change('Duncan', at(15, 40)),
			change('Oziel', at(15, 30)),
			change('Duncan', at(15, 20))
		];

		expect(toPeopleGroups(events).map((group) => [group.who, group.events.length])).toEqual([
			['Duncan', 2],
			['Oziel', 1]
		]);
	});
});

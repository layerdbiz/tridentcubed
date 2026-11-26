// The Activity's Grouped view (#306, Justin 2026-11-26): one person's back-to-back entries fold into one run, so the
// page is not one huge list.
import { describe, expect, it } from 'vite-plus/test';
import type { ActivityEventType } from './activity.types';
import { toRunSummary, toRuns } from './activity.utils';

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

	it('keeps a person’s run whole while someone else works at the same time, each person a run of their own', () => {
		const events = [
			change('Duncan', at(15, 40)),
			change('Oziel', at(15, 35)),
			change('Duncan', at(15, 30)),
			change('Oziel', at(15, 20)),
			change('Duncan', at(15, 10))
		];
		const [d1, o1, d2, o2, d3] = events.map((event) => event.id);

		const runs = toRuns(events);

		expect(runs.map((run) => run.who)).toEqual(['Duncan', 'Oziel']);
		expect(idsOf(runs)).toEqual([
			[d1, d2, d3],
			[o1, o2]
		]);
	});

	it('ends a run after more than 30 minutes with nothing from that person', () => {
		const events = [
			change('Duncan', at(16, 30)),
			change('Duncan', at(16, 0)),
			change('Duncan', at(15, 29))
		];
		const [late, thirtyAfter, early] = events.map((event) => event.id);

		const runs = toRuns(events);

		expect(idsOf(runs)).toEqual([[late, thirtyAfter], [early]]);
		expect(runs[1].from).toBe(at(15, 29));
		expect(runs[1].to).toBe(at(15, 29));
	});

	it('ends a run at midnight, so each run sits under one day', () => {
		const afterMidnight = new Date(2026, 10, 26, 0, 5).toISOString();
		const events = [change('Duncan', afterMidnight), change('Duncan', at(23, 55))];

		expect(idsOf(toRuns(events))).toEqual([[events[0].id], [events[1].id]]);
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
			added: 1,
			changed: 2,
			trashed: 1,
			projects: [
				{ id: 'p1', title: 'MSC Susanna' },
				{ id: 'p2', title: 'Harbor Lines job' }
			]
		});
	});
});

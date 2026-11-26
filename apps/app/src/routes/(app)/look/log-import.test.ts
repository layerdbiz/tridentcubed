import { describe, expect, it } from 'vite-plus/test';
import type { DayType } from './look.data';
import { addToLog, notesOf, readLog, toRows, toTypedClock } from './log-import';

const YEAR = 2026;

function entriesOf(text: string) {
	return readLog(text, { year: YEAR }).entries.map(({ date, time, activity }) => ({
		date,
		time,
		activity
	}));
}

describe('a time log read from pasted text', () => {
	it('gives each timed line its date, time and activity', () => {
		expect(
			entriesOf(`25 November 2026
07:30 Arrived on site
08:15 Commenced loading`)
		).toEqual([
			{ date: '2026-11-25', time: '07:30', activity: 'Arrived on site' },
			{ date: '2026-11-25', time: '08:15', activity: 'Commenced loading' }
		]);
	});
});

describe('a time log that runs past midnight', () => {
	const NIGHT = `25 November 2026
22:30 - 02:15 Loading transformer onto barge
23:40 to 00:05 On standby, wind over the crane's limit
00:30 Lashing commenced`;

	it('keeps a range on the day it starts, its end in the activity, and says it runs past midnight', () => {
		const rows = rowsOf(NIGHT);
		const [loading, standby] = rows;

		expect(loading).toMatchObject({
			date: '2026-11-25',
			time: '22:30',
			end: '02:15',
			activity: 'Loading transformer onto barge (until 02:15)'
		});
		expect(standby).toMatchObject({
			date: '2026-11-25',
			time: '23:40',
			end: '00:05',
			activity: "On standby, wind over the crane's limit (until 00:05)"
		});
		expect(notesOf(loading, rows, []).map((note) => note.kind)).toEqual(['past-midnight']);
	});

	it('moves a time that comes after midnight to the next day, and says so', () => {
		const lashing = readLog(NIGHT, { year: YEAR }).entries[2];

		expect(lashing).toMatchObject({
			date: '2026-11-26',
			time: '00:30',
			activity: 'Lashing commenced',
			notes: ['next-day']
		});
	});
});

describe('the ways a time is written', () => {
	it.each([
		['0730 Arrived on site', '07:30', '', 'Arrived on site'],
		['07.30 Arrived on site', '07:30', '', 'Arrived on site'],
		['7:30 am - Arrived on site', '07:30', '', 'Arrived on site'],
		['10:30 PM: Barge alongside', '22:30', '', 'Barge alongside'],
		['12:15 a.m. Barge alongside', '00:15', '', 'Barge alongside'],
		['6pm Crew change', '18:00', '', 'Crew change'],
		['2230hrs Loading resumed', '22:30', '', 'Loading resumed'],
		['2230 hrs. Loading resumed', '22:30', '', 'Loading resumed'],
		['22h30 Loading resumed', '22:30', '', 'Loading resumed'],
		['1430-1600 Lifting', '14:30', '16:00', 'Lifting (until 16:00)'],
		['from 14:30 to 16:00 Lifting', '14:30', '16:00', 'Lifting (until 16:00)'],
		['14:30 – 16:00 – Lifting', '14:30', '16:00', 'Lifting (until 16:00)'],
		['Lifting 14:30 - 16:00', '14:30', '16:00', 'Lifting (until 16:00)'],
		['Barge alongside at 07:45', '07:45', '', 'Barge alongside'],
		['Barge alongside - 0745', '07:45', '', 'Barge alongside']
	])('reads "%s"', (line, time, end, activity) => {
		const [entry] = readLog(`25 Nov 2026\n${line}`, { year: YEAR }).entries;

		expect(entry).toMatchObject({ time, end, activity });
	});

	it('leaves a number that is no time in the activity', () => {
		const [entry] = readLog(`25 Nov 2026\n07:30 Loaded 1200 tons by 2400`, { year: YEAR }).entries;

		expect(entry).toMatchObject({ time: '07:30', activity: 'Loaded 1200 tons by 2400' });
	});
});

describe('the ways a date is written', () => {
	it.each([
		['2026-11-25', '2026-11-25'],
		['Tuesday 25 November 2026', '2026-11-25'],
		['Tue, 25 Nov', '2026-11-25'],
		['November 25, 2026', '2026-11-25'],
		['Nov. 25th', '2026-11-25'],
		['25th of November 2026', '2026-11-25'],
		['Day 2 - 26/11/2026', '2026-11-26'],
		['Date: 11/26/2026', '2026-11-26'],
		['26.11.2026', '2026-11-26'],
		['26-11-26', '2026-11-26'],
		['25 de noviembre de 2026', '2026-11-25'],
		['Miércoles, 26 de noviembre', '2026-11-26'],
		['DÍA 3: 27/11/2026', '2026-11-27']
	])('reads "%s"', (written, date) => {
		const [entry] = readLog(`${written}\n07:30 Arrived on site`, { year: YEAR }).entries;

		expect(entry).toMatchObject({ date, time: '07:30', activity: 'Arrived on site' });
	});

	it('takes a date on the same line as the time, in a row from a spreadsheet too', () => {
		expect(entriesOf('25/11/2026 22:30 Loading\n26/11/2026\t01:00\t02:15\tLashing')).toEqual([
			{ date: '2026-11-25', time: '22:30', activity: 'Loading' },
			{ date: '2026-11-26', time: '01:00', activity: 'Lashing (until 02:15)' }
		]);
	});

	it('reads day and month the way the rest of the log writes them', () => {
		const dates = readLog('05/11/2026\n07:30 Arrived\n25/11/2026\n08:00 Left', {
			year: YEAR
		}).entries;

		expect(dates.map((entry) => [entry.date, entry.notes])).toEqual([
			['2026-11-05', []],
			['2026-11-25', []]
		]);
	});

	it('takes month first when nothing says which, and says the date is unclear', () => {
		const [entry] = readLog('05/11/2026\n07:30 Arrived', { year: YEAR }).entries;

		expect(entry).toMatchObject({ date: '2026-05-11', notes: ['unclear-date'] });
	});
});

describe('the lines of a log that are not entries', () => {
	const LOG = `TIME LOG
MV Sample Vessel, berth 4

Tuesday 25 November 2026
07:30 Arrived on site, attended
safety briefing with the crew
08:15 Commenced loading

Remarks: weather clear all day`;

	it('carries a line with no time on into the entry above it', () => {
		expect(entriesOf(LOG)[0].activity).toBe(
			'Arrived on site, attended safety briefing with the crew'
		);
	});

	it('lists every other line with words, so nothing is left out unseen', () => {
		expect(readLog(LOG, { year: YEAR }).skipped).toEqual([
			{ line: 1, text: 'TIME LOG' },
			{ line: 2, text: 'MV Sample Vessel, berth 4' },
			{ line: 9, text: 'Remarks: weather clear all day' }
		]);
	});

	it('reads the headings of a pasted spreadsheet as lines left out', () => {
		const read = readLog('Date\tStart\tEnd\tActivity\n25/11/2026\t07:30\t\tArrived', {
			year: YEAR
		});

		expect(read.skipped).toEqual([{ line: 1, text: 'Date Start End Activity' }]);
		expect(read.entries[0]).toMatchObject({
			date: '2026-11-25',
			time: '07:30',
			activity: 'Arrived'
		});
	});
});

function counter(prefix = 'id') {
	let next = 0;
	return () => `${prefix}-${(next += 1)}`;
}

function rowsOf(text: string, days: DayType[] = []) {
	return toRows(readLog(text, { year: YEAR }), days, counter('row'));
}

describe('the check before an imported log is added', () => {
	const DAYS: DayType[] = [
		{
			id: 'day-25',
			date: '2026-11-25',
			entries: [{ id: 'typed', time: '07:30', activity: 'Arrived on site' }]
		}
	];

	it('names what to check on each entry, in plain words', () => {
		const rows = rowsOf(`Collected on the day
07:30 Toolbox talk
25 Nov 2026
22:30 - 02:15 Loading transformer onto barge
23:40 - 00:05 On standby
00:30 Lashing commenced
05/11/26`);

		expect(rows.map((row) => notesOf(row, rows, []).map((note) => note.text))).toEqual([
			['No date'],
			['Runs past midnight'],
			['Runs past midnight', 'Overlaps the 22:30 entry'],
			['Moved to the next day: its time is before the one above']
		]);
	});

	it('says the day and month were a guess', () => {
		const [row] = rowsOf('05/11/2026\n07:30 Arrived');

		expect(notesOf(row, [row], []).map((note) => note.text)).toEqual([
			'Day or month unclear: read as May 11'
		]);
	});

	it('leaves out, until chosen, an entry already in the time log or read twice', () => {
		const rows = rowsOf('25 Nov 2026\n07:30 arrived on site\n09:00 Loading\n09:00 Loading', DAYS);

		expect(rows.map((row) => row.isChosen)).toEqual([false, true, false]);
		expect(rows.map((row) => notesOf(row, rows, DAYS).map((note) => note.kind))).toEqual([
			['in-log'],
			[],
			['twice']
		]);
	});
});

describe('an imported log added to the Time Log', () => {
	it('fills the empty first day of a new project, and adds a day for each other date', () => {
		const days: DayType[] = [
			{ id: 'first', date: '', entries: [{ id: 'blank', time: '', activity: '' }] }
		];
		const rows = rowsOf('25 Nov 2026\n07:30 Arrived\n26 Nov 2026\n08:00 Loading');

		const added = addToLog(days, rows, counter());

		expect(added).toBe(2);
		expect(days).toEqual([
			{
				id: 'first',
				date: '2026-11-25',
				entries: [{ id: 'id-1', time: '07:30', activity: 'Arrived' }]
			},
			{
				id: 'id-2',
				date: '2026-11-26',
				entries: [{ id: 'id-3', time: '08:00', activity: 'Loading' }]
			}
		]);
	});

	it('puts each entry in its day by time and each new day by date, moving and changing nothing typed', () => {
		const days: DayType[] = [
			{
				id: 'day-24',
				date: '2026-11-24',
				entries: [{ id: 'a', time: '18:00', activity: 'Mobilised' }]
			},
			{
				id: 'day-26',
				date: '2026-11-26',
				entries: [
					{ id: 'b', time: '09:00', activity: 'Survey' },
					{ id: 'c', time: '06:00', activity: 'Typed out of order' }
				]
			}
		];
		const rows = rowsOf(
			'25 Nov 2026\n10:00 Barge alongside\n26 Nov 2026\n07:00 Crane rigged\n12:00 Lunch'
		);

		addToLog(days, rows, counter());

		expect(days.map((day) => [day.id, day.entries.map((entry) => entry.id)])).toEqual([
			['day-24', ['a']],
			['id-1', ['id-2']],
			['day-26', ['id-3', 'b', 'c', 'id-4']]
		]);
		expect(days[2].entries[1]).toEqual({ id: 'b', time: '09:00', activity: 'Survey' });
	});

	it('adds only the chosen entries, as the person fixed them', () => {
		const days: DayType[] = [];
		const rows = rowsOf('07:30 Arrived\n08:00 Loading');
		rows[0].date = '2026-11-25';
		rows[0].activity = 'Arrived on site';
		rows[1].isChosen = false;

		expect(addToLog(days, rows, counter())).toBe(1);
		expect(days).toEqual([
			{
				id: 'id-1',
				date: '2026-11-25',
				entries: [{ id: 'id-2', time: '07:30', activity: 'Arrived on site' }]
			}
		]);
	});
});

describe('a time typed into an entry', () => {
	it.each([
		['730', '07:30'],
		['0730', '07:30'],
		['7', '07:00'],
		['22:30', '22:30'],
		['', '']
	])('"%s" is kept as "%s"', (typed, kept) => {
		expect(toTypedClock(typed)).toBe(kept);
	});
});

describe('what is not read as a time or a date', () => {
	it('keeps a start whose end is no time of day, and reads 24:00 as midnight', () => {
		expect(entriesOf('25 Nov 2026\n22:00 - 24:00 Loading')).toEqual([
			{ date: '2026-11-25', time: '22:00', activity: 'Loading (until 00:00)' }
		]);
	});

	it('takes no quantity for a time', () => {
		expect(entriesOf('25 Nov 2026\n08:00 - 1500 tons loaded\n2000 litres of fuel taken')).toEqual([
			{ date: '2026-11-25', time: '08:00', activity: '1500 tons loaded 2000 litres of fuel taken' }
		]);
	});

	it('takes no words that only begin like a month for a date', () => {
		expect(entriesOf('25 Nov 2026\n07:30 Rigged\n1 set of slings\nMar 3 tugs alongside')).toEqual([
			{ date: '2026-11-25', time: '07:30', activity: 'Rigged 1 set of slings Mar 3 tugs alongside' }
		]);
	});

	it('reads a time with seconds, and a date and time written together', () => {
		expect(entriesOf('25 Nov 2026\n07:30:15 Arrived\n2026-11-26T22:30 Departed')).toEqual([
			{ date: '2026-11-25', time: '07:30', activity: 'Arrived' },
			{ date: '2026-11-26', time: '22:30', activity: 'Departed' }
		]);
	});
});

describe('days that turn over', () => {
	it('moves an evening stop and a morning start to the next day', () => {
		expect(entriesOf('25 Nov 2026\n17:00 Stopped for the night\n06:30 Resumed')).toEqual([
			{ date: '2026-11-25', time: '17:00', activity: 'Stopped for the night' },
			{ date: '2026-11-26', time: '06:30', activity: 'Resumed' }
		]);
	});

	it('turns the year over from December to January', () => {
		expect(
			entriesOf('31 Dec\n22:00 Loading\n1 Jan\n08:00 Sailed').map((entry) => entry.date)
		).toEqual(['2026-12-31', '2027-01-01']);
	});
});

describe('the check, once the person has fixed an entry', () => {
	it('stops saying a date was moved or unclear once the date is changed', () => {
		const rows = rowsOf('05/11/2026\n17:00 Stopped\n06:30 Resumed');
		rows[0].date = '2026-11-05';
		rows[1].date = '2026-11-06';

		expect(rows.flatMap((row) => notesOf(row, rows, []))).toEqual([]);
	});

	it('stops saying a range runs past midnight once its end is taken out of the activity', () => {
		const [row] = rowsOf('25 Nov 2026\n22:30 - 02:15 Loading');
		row.activity = 'Loading';

		expect(notesOf(row, [row], [])).toEqual([]);
	});

	it('finds an overlap across midnight, and an entry read twice with a full stop', () => {
		const rows = rowsOf(
			'25 Nov 2026\n22:30 - 02:15 Loading\n00:30 - 01:00 Crane fault\n00:30 - 01:00 Crane fault.'
		);

		expect(rows.map((row) => notesOf(row, rows, []).map((note) => note.kind))).toEqual([
			['past-midnight'],
			['next-day', 'overlap'],
			['overlap', 'twice']
		]);
	});
});

describe('where entries with no date go', () => {
	it('into a day of their own, never one with typed entries', () => {
		const days: DayType[] = [
			{ id: 'typed', date: '', entries: [{ id: 'a', time: '07:00', activity: 'Typed' }] }
		];

		addToLog(days, rowsOf('08:00 Pasted'), counter());

		expect(days.map((day) => [day.id, day.entries.map((entry) => entry.activity)])).toEqual([
			['typed', ['Typed']],
			['id-1', ['Pasted']]
		]);
	});

	it('fills a blank day only where its date keeps the days in order', () => {
		const days: DayType[] = [
			{ id: 'blank', date: '', entries: [] },
			{ id: 'day-24', date: '2026-11-24', entries: [{ id: 'a', time: '07:00', activity: 'Typed' }] }
		];

		addToLog(days, rowsOf('26 Nov 2026\n08:00 Pasted'), counter());

		expect(days.map((day) => [day.id, day.date])).toEqual([
			['blank', ''],
			['day-24', '2026-11-24'],
			['id-1', '2026-11-26']
		]);
	});
});

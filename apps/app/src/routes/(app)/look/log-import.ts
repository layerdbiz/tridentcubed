// Import a time log (#359): a log kept somewhere else, pasted or read from a file, turned into time log entries to
// check before they join the project's Time Log. Nothing here knows where the text came from.
import type { DayType, EntryType } from './look.data';

/** What the reading noticed about an entry, for the person to check: it is shown beside the entry. */
export type ReadNoteType = 'past-midnight' | 'next-day' | 'unclear-date';

/** One entry as read, before it is checked and added. */
export type ReadEntryType = {
	/** The line of the text it was read from, counted from 1. */
	line: number;
	date: string;
	time: string;
	/** Where a range ends ("22:30 - 02:15"), on the 24-hour clock; empty for a time alone. */
	end: string;
	/** What happened, with a range's end said at its close: "Loading (until 02:15)". */
	activity: string;
	notes: ReadNoteType[];
};

/** A line with words that became no entry: a heading, a note, a day's title. Shown, so nothing goes unseen. */
export type SkippedLineType = { line: number; text: string };

export type ReadLogType = { entries: ReadEntryType[]; skipped: SkippedLineType[] };

// The months by their first three letters, in English and Spanish, and each one's whole names: a word is a month
// when it is one of those, or the start of one at least three letters long ("Nov", "Sept", "noviembre").
const MONTHS: [number, string[]][] = [
	[1, ['january', 'enero']],
	[2, ['february', 'febrero']],
	[3, ['march', 'marzo']],
	[4, ['april', 'abril']],
	[5, ['may', 'mayo']],
	[6, ['june', 'junio']],
	[7, ['july', 'julio']],
	[8, ['august', 'agosto']],
	[9, ['september', 'septiembre', 'setiembre']],
	[10, ['october', 'octubre']],
	[11, ['november', 'noviembre']],
	[12, ['december', 'diciembre']]
];

function plain(word: string) {
	return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function monthOf(word: string) {
	const written = plain(word);
	if (written.length < 3) return undefined;
	return MONTHS.find(([, names]) => names.some((name) => name.startsWith(written)))?.[0];
}

const pad = (value: number) => String(value).padStart(2, '0');

function toDate(year: number, month: number, day: number) {
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
	return `${year}-${pad(month)}-${pad(day)}`;
}

function yearOf(written: string | undefined, year: number) {
	if (!written) return year;
	return written.length === 2 ? 2000 + Number(written) : Number(written);
}

const WEEKDAY = String.raw`(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo`;
// What may come before a day's date: "Day 2 -", "Date:", the day of the week; in Spanish "Día 2", "Fecha:".
const BEFORE_DATE = new RegExp(
	String.raw`^(?:(?:day|d[ií]a)\s*\d+\b[\s\-\u2013\u2014:,.)]*)?(?:(?:date|fecha)\s*:?\s*)?(?:(?:${WEEKDAY})[\s,]*)?`,
	'iu'
);
const AFTER = String.raw`(?![\p{L}\d]|:\d)`;
const ISO = new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})${AFTER}`, 'u');
// 25/11/2026, 11/25/26, 25.11.2026, 25-11-26; with no year only with a slash, since 07.30 is a time.
const NUMBERS = new RegExp(
	String.raw`^(\d{1,2})(?:([/.-])(\d{1,2})\2(\d{4}|\d{2})|/(\d{1,2}))${AFTER}`,
	'u'
);
// 25 Nov 2026, 25th of November, 25 de noviembre de 2026.
const DAY_MONTH = new RegExp(
	String.raw`^(\d{1,2})(?:st|nd|rd|th)?\.?\s+(?:of\s+|de\s+)?(\p{L}+)\.?(?:,?\s+(?:de\s+|del\s+)?(\d{4}))?${AFTER}`,
	'iu'
);
// November 25, 2026, Nov. 25th.
const MONTH_DAY = new RegExp(
	String.raw`^(\p{L}+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?${AFTER}`,
	'iu'
);

/** Which comes first in a date written all in numbers. */
type OrderType = 'day' | 'month';

/** A date at the start of a line, as written: two numbers whose order may be unclear, or a month by its name. */
type FoundDateType = {
	first: number;
	second: number;
	year?: string;
	/** True when the month was named, or the date was year first: then which number is the day is known. */
	isKnown: boolean;
	rest: string;
};

function findDate(line: string): FoundDateType | undefined {
	const text = line.slice(BEFORE_DATE.exec(line)?.[0].length ?? 0);
	const rest = (found: RegExpExecArray) => text.slice(found[0].length);
	const iso = ISO.exec(text);
	if (iso)
		return {
			first: Number(iso[2]),
			second: Number(iso[3]),
			year: iso[1],
			isKnown: true,
			rest: rest(iso)
		};
	const numbers = NUMBERS.exec(text);
	if (numbers)
		return {
			first: Number(numbers[1]),
			second: Number(numbers[3] ?? numbers[5]),
			year: numbers[4],
			isKnown: false,
			rest: rest(numbers)
		};
	const dayMonth = DAY_MONTH.exec(text);
	const named = dayMonth && monthOf(dayMonth[2]);
	if (dayMonth && named)
		return {
			first: named,
			second: Number(dayMonth[1]),
			year: dayMonth[3],
			isKnown: true,
			rest: rest(dayMonth)
		};
	const monthDay = MONTH_DAY.exec(text);
	const month = monthDay && monthOf(monthDay[1]);
	if (monthDay && month)
		return {
			first: month,
			second: Number(monthDay[2]),
			year: monthDay[3],
			isKnown: true,
			rest: rest(monthDay)
		};
	return undefined;
}

// How the log writes its dates in numbers: day first if any date can only be read that way (25/11), month first if
// any can only be read that way (11/25), month first when none says (the team's own way, Justin to confirm).
function orderOf(found: FoundDateType[]): { order: OrderType; isSure: boolean } {
	const numbers = found.filter((each) => !each.isKnown);
	const dayFirst = numbers.filter((each) => each.first > 12 && each.second <= 12).length;
	const monthFirst = numbers.filter((each) => each.second > 12 && each.first <= 12).length;
	if (dayFirst || monthFirst)
		return { order: dayFirst > monthFirst ? 'day' : 'month', isSure: true };
	return { order: 'month', isSure: false };
}

/** A found date as YYYY-MM-DD, and whether which number is the day was a guess. */
function toFoundDate(
	found: FoundDateType,
	order: { order: OrderType; isSure: boolean },
	year: number
) {
	const isSwapped = !found.isKnown && order.order === 'day';
	const month = isSwapped ? found.second : found.first;
	const day = isSwapped ? found.first : found.second;
	const date = toDate(yearOf(found.year, year), month, day);
	const isUnclear =
		!found.isKnown && !order.isSure && found.first !== found.second && found.second <= 12;
	return date ? { date, isUnclear } : undefined;
}

// A time as logs write it: 07:30, 07.30, 22h30, 0730, 2230hrs, 7:30 am, 6pm. Three digits only with "hrs"
// (730hrs), and an hour alone only with am or pm, so a quantity is not taken for a time.
const MERIDIEM = String.raw`[ap]\.?\s?m(?![a-z])\.?`;
const HOURS = String.raw`(?:\s*(?:hrs?|h)(?![a-z])\.?)?`;
const CLOCK = String.raw`(?:\d{1,2}[:.h]\d{2}(?:\s*${MERIDIEM}|${HOURS})|\d{1,2}\s*${MERIDIEM}|\d{4}${HOURS}|\d{3}\s*(?:hrs?|h)(?![a-z])\.?)(?!\d|:\d)`;
// Between the two times of a range: a dash, "to", "till", "until"; in Spanish "a" and "hasta".
const BETWEEN = String.raw`(?:\s*(?:[-\u2013\u2014~]|\b(?:to|till|until|hasta|a)\b)\s*|\t+)`;
const RANGE = String.raw`(${CLOCK})(?:${BETWEEN}(${CLOCK}))?`;
// Before a time: "from", "at"; in Spanish "de", "desde", "a las".
const BEFORE = String.raw`(?:(?:from|at|@|desde|de|a las)\s+)?`;
// What sits between a time and its activity: a dash, a colon, a bar.
const MARKS = /^[\s\-\u2013\u2014:;,.|]+|[\s\-\u2013\u2014:;,|]+$/g;

const LEADING = new RegExp(String.raw`^${BEFORE}${RANGE}`, 'i');
const TRAILING = new RegExp(String.raw`[\s\-\u2013\u2014:,]+${BEFORE}${RANGE}\s*$`, 'i');

/** A time as written, on the 24-hour clock; nothing for one that is no time of day (2400, 25:10, 13pm). */
function toClock(written: string) {
	const text = written.replace(/\s*(?:hrs?|h)\.?$/i, '').trim();
	let hours: number;
	let minutes: number;
	let meridiem = '';
	const digits = /^(\d{3,4})$/.exec(text);
	if (digits) {
		hours = Number(digits[1].slice(0, -2));
		minutes = Number(digits[1].slice(-2));
	} else {
		const parts = /^(\d{1,2})(?:[:.h](\d{2}))?\s*(?:([ap])\.?\s?m\.?)?$/i.exec(text);
		if (!parts) return undefined;
		hours = Number(parts[1]);
		minutes = Number(parts[2] ?? 0);
		meridiem = (parts[3] ?? '').toLowerCase();
	}
	if (minutes > 59) return undefined;
	if (meridiem) {
		if (hours < 1 || hours > 12) return undefined;
		hours = (hours % 12) + (meridiem === 'p' ? 12 : 0);
	} else if (hours > 23) return undefined;
	return `${pad(hours)}:${pad(minutes)}`;
}

/** A line's time or range, at its start or its end, and the words left: its activity. */
function timeAt(text: string) {
	for (const pattern of [LEADING, TRAILING]) {
		const found = pattern.exec(text);
		if (!found) continue;
		const time = toClock(found[1]);
		if (!time) continue;
		const end = found[2] ? toClock(found[2]) : '';
		if (end === undefined) continue;
		const rest = text.slice(0, found.index) + text.slice(found.index + found[0].length);
		return { time, end, rest: rest.replace(MARKS, '') };
	}
	return undefined;
}

function minutesOf(time: string) {
	return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

function nextDayOf(date: string) {
	const day = new Date(`${date}T12:00:00Z`);
	day.setUTCDate(day.getUTCDate() + 1);
	return day.toISOString().slice(0, 10);
}

// A time this far before the one above it is taken as after midnight: 23:40 then 00:30. Less is a log written out of
// order, which keeps its day.
const NIGHT_GAP = 12 * 60;

/** The entries a pasted or read time log holds, each with the line it came from, and the lines that held none. */
export function readLog(text: string, { year }: { year: number }): ReadLogType {
	const lines = text.split(/\r?\n/).map((line) => line.replace(/[^\S\t]+/g, ' ').trim());
	const order = orderOf(lines.map(findDate).filter((found) => found !== undefined));
	const entries: ReadEntryType[] = [];
	const skipped: SkippedLineType[] = [];
	// What the entry being read so far had, so a line under it with no time of its own carries its words on.
	let open: (ReadEntryType & { words: string }) | undefined;
	let date = '';
	let isUnclear = false;
	let last = '';

	function close() {
		if (!open) return;
		const { words: written, ...entry } = open;
		const words = written.replace(/\s+/g, ' ');
		entries.push({ ...entry, activity: entry.end ? `${words} (until ${entry.end})` : words });
		open = undefined;
	}

	for (const [index, line] of lines.entries()) {
		if (!line) {
			close();
			continue;
		}
		let rest = line;
		const found = findDate(line);
		const dated = found && toFoundDate(found, order, year);
		if (found && dated) {
			close();
			({ date, isUnclear } = dated);
			last = '';
			rest = found.rest.replace(MARKS, '');
			if (!rest) continue;
		}
		const timed = timeAt(rest);
		if (!timed) {
			if (open && !dated) open.words = `${open.words} ${rest}`.trim();
			else {
				close();
				skipped.push({ line: index + 1, text: rest.replace(/\s+/g, ' ') });
			}
			continue;
		}
		close();
		const notes: ReadNoteType[] = [];
		if (last && date && minutesOf(last) - minutesOf(timed.time) >= NIGHT_GAP) {
			date = nextDayOf(date);
			notes.push('next-day');
		}
		if (timed.end && minutesOf(timed.end) < minutesOf(timed.time)) notes.push('past-midnight');
		if (isUnclear) notes.push('unclear-date');
		last = timed.time;
		open = {
			line: index + 1,
			date,
			time: timed.time,
			end: timed.end,
			activity: '',
			words: timed.rest.trim(),
			notes
		};
	}
	close();
	return { entries, skipped };
}

/** An entry in the check step: as read, then as the person fixed it, and whether it is added. */
export type ImportRowType = ReadEntryType & { id: string; isChosen: boolean };

/** What the check step says about an entry. */
export type ImportNoteType = {
	kind: ReadNoteType | 'no-date' | 'no-time' | 'overlap' | 'twice' | 'in-log';
	text: string;
};

function sameWords(one: string, other: string) {
	return plain(one).replace(/\s+/g, ' ').trim() === plain(other).replace(/\s+/g, ' ').trim();
}

function isInLog(row: ReadEntryType, days: DayType[]) {
	return days.some(
		(day) =>
			day.date === row.date &&
			day.entries.some(
				(entry) => entry.time === row.time && sameWords(entry.activity, row.activity)
			)
	);
}

function isTwice(row: ReadEntryType, rows: ReadEntryType[]) {
	const at = rows.indexOf(row);
	return rows
		.slice(0, at < 0 ? rows.length : at)
		.some(
			(other) =>
				other.date === row.date &&
				other.time === row.time &&
				sameWords(other.activity, row.activity)
		);
}

// Where a range starts and ends, in minutes from the start of its date; an end before the start is the next day's.
function spanOf(row: ReadEntryType) {
	const start = minutesOf(row.time);
	const end = minutesOf(row.end);
	return { start, end: end < start ? end + 24 * 60 : end };
}

function toMonthDay(date: string) {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC'
	});
}

/** The entries read, ready to check: each chosen unless it is already in the time log or read twice. */
export function toRows(read: ReadLogType, days: DayType[], newId: () => string): ImportRowType[] {
	return read.entries.map((entry, index, all) => ({
		...entry,
		id: newId(),
		isChosen: !isInLog(entry, days) && !isTwice(entry, all)
	}));
}

/** What to check on one entry, from what it holds now, the other entries being added and the time log's days. */
export function notesOf(
	row: ImportRowType,
	rows: ImportRowType[],
	days: DayType[]
): ImportNoteType[] {
	const notes: ImportNoteType[] = [];
	if (!row.date) notes.push({ kind: 'no-date', text: 'No date' });
	if (!row.time) notes.push({ kind: 'no-time', text: 'No time' });
	if (row.notes.includes('unclear-date') && row.date)
		notes.push({
			kind: 'unclear-date',
			text: `Day or month unclear: read as ${toMonthDay(row.date)}`
		});
	if (row.notes.includes('next-day'))
		notes.push({
			kind: 'next-day',
			text: 'Moved to the next day: its time is before the one above'
		});
	if (row.end && row.time && minutesOf(row.end) < minutesOf(row.time))
		notes.push({ kind: 'past-midnight', text: 'Runs past midnight' });
	if (row.end && row.time) {
		const span = spanOf(row);
		const under = rows.find(
			(other) =>
				other !== row &&
				other.isChosen &&
				other.date === row.date &&
				other.end &&
				other.time &&
				spanOf(other).start <= span.start &&
				spanOf(other).end > span.start &&
				(spanOf(other).start < span.start || rows.indexOf(other) < rows.indexOf(row))
		);
		if (under) notes.push({ kind: 'overlap', text: `Overlaps the ${under.time} entry` });
	}
	if (isInLog(row, days)) notes.push({ kind: 'in-log', text: 'Already in the time log' });
	else if (isTwice(row, rows))
		notes.push({ kind: 'twice', text: 'Read twice: the same as one above' });
	return notes;
}

function isUntyped(entry: EntryType) {
	return !entry.time && !entry.activity.trim();
}

// The day an entry joins: the day with its date; else a day nobody has typed in yet (a new project's first), given
// the date; else a new day, before the first day dated after it.
function dayFor(days: DayType[], date: string, newId: () => string) {
	const dated = days.find((day) => day.date === date);
	if (dated) return dated;
	const blank = days.find((day) => !day.date && day.entries.every(isUntyped));
	if (blank) {
		blank.date = date;
		return blank;
	}
	const day: DayType = { id: newId(), date, entries: [] };
	const after = date ? days.findIndex((other) => other.date && other.date > date) : -1;
	days.splice(after < 0 ? days.length : after, 0, day);
	return day;
}

const byTime = (time: string) => time || '99';

/**
 * The chosen entries added to the time log's days, in place: each in the day of its date, before the first entry
 * timed after it. What was typed keeps its place and its words; a day's rows never typed in go once it has entries.
 * How many entries were added.
 */
export function addToLog(days: DayType[], rows: ImportRowType[], newId: () => string) {
	let count = 0;
	for (const row of rows) {
		if (!row.isChosen) continue;
		const day = dayFor(days, row.date, newId);
		for (const blank of day.entries.filter(isUntyped))
			day.entries.splice(day.entries.indexOf(blank), 1);
		const after = day.entries.findIndex((entry) => byTime(entry.time) > byTime(row.time));
		day.entries.splice(after < 0 ? day.entries.length : after, 0, {
			id: newId(),
			time: row.time,
			activity: row.activity.trim()
		});
		count += 1;
	}
	return count;
}

/** The 24-hour clock, typed: "730" and "0730" both become 07:30, "7" becomes 07:00. */
export function toTypedClock(text: string) {
	const digits = text.replace(/\D/g, '').slice(0, 4);
	if (!digits) return '';
	const padded = digits.length <= 2 ? `${digits.padStart(2, '0')}00` : digits.padStart(4, '0');
	const hours = Math.min(23, Number(padded.slice(0, 2)));
	const minutes = Math.min(59, Number(padded.slice(2)));
	return `${pad(hours)}:${pad(minutes)}`;
}

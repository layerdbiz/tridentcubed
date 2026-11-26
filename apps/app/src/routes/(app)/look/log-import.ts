// Import a time log (#359): a log kept somewhere else, pasted or read from a file, turned into time log entries to
// check before they join the project's Time Log. Nothing here knows where the text came from.
import type { DayType, EntryType } from './look.data';

/** What the reading noticed about an entry, for the person to check: it is shown beside the entry. */
export type ReadNoteType = 'next-day' | 'unclear-date';

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

// The months by their whole names, in English and Spanish, and the short forms people write: a word is a month when
// it is one of those, or the start of a whole name at least four letters long ("Sept", "Octob"). "Set" and the like
// are words first, so no other three letters count.
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

const SHORT_MONTHS: Record<string, number> = {
	jan: 1,
	ene: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	abr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	ago: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12,
	dic: 12
};

function monthOf(word: string) {
	const written = plain(word);
	if (SHORT_MONTHS[written]) return SHORT_MONTHS[written];
	if (written.length < 4) return undefined;
	return MONTHS.find(([, names]) => names.some((name) => name.startsWith(written)))?.[0];
}

function pad(value: number) {
	return String(value).padStart(2, '0');
}

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
// 2026-11-25, and 2026-11-25T22:30 with its time.
const ISO = new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:T(?=\d)|${AFTER})`, 'u');
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

/** How a log writes its dates in numbers: day first or month first, and whether one of its dates said so. */
type OrderType = { isDayFirst: boolean; isSure: boolean };

/** A date at the start of a line, as written: two numbers whose order may be unclear, or a month by its name. */
type FoundDateType = {
	first: number;
	second: number;
	year?: string;
	/** True when the month was named, or the date was year first: then which number is the day is known. */
	isKnown: boolean;
	/** True when "Day 2", "Date:" or the day of the week came before it: then it is surely a date. */
	isNamed: boolean;
	rest: string;
};

function findDate(line: string): FoundDateType | undefined {
	const before = BEFORE_DATE.exec(line)?.[0].length ?? 0;
	const text = line.slice(before);
	const isNamed = before > 0;
	const rest = (found: RegExpExecArray) => text.slice(found[0].length);
	const iso = ISO.exec(text);
	if (iso)
		return {
			first: Number(iso[2]),
			second: Number(iso[3]),
			year: iso[1],
			isKnown: true,
			isNamed,
			rest: rest(iso)
		};
	const numbers = NUMBERS.exec(text);
	if (numbers)
		return {
			first: Number(numbers[1]),
			second: Number(numbers[3] ?? numbers[5]),
			year: numbers[4],
			isKnown: false,
			isNamed,
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
			isNamed,
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
			isNamed,
			rest: rest(monthDay)
		};
	return undefined;
}

// How the log writes its dates in numbers: day first if any date can only be read that way (25/11), month first if
// any can only be read that way (11/25), month first when none says (the team's own way, Justin to confirm).
function orderOf(found: FoundDateType[]): OrderType {
	const numbers = found.filter((each) => !each.isKnown);
	const dayFirst = numbers.filter((each) => each.first > 12 && each.second <= 12).length;
	const monthFirst = numbers.filter((each) => each.second > 12 && each.first <= 12).length;
	if (dayFirst || monthFirst) return { isDayFirst: dayFirst > monthFirst, isSure: true };
	return { isDayFirst: false, isSure: false };
}

/** A found date as YYYY-MM-DD, and whether which number is the day was a guess. */
function toFoundDate(found: FoundDateType, order: OrderType, year: number) {
	const isSwapped = !found.isKnown && order.isDayFirst;
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
// A number with one of these after it is a quantity, not a time: 1500 tons, 2000 litres.
const UNITS = String.raw`(?!\s*(?:t|tons?|tonnes?|mt|kgs?|lbs?|pounds|lit(?:re|er)s?|l|gal(?:lon)?s?|m3?|cbm|cm|mm|km|nm|ft|feet|met(?:re|er)s?|pcs|pieces|units|bbls?|barrels|psi|bar|rpm|miles?)(?![a-z])|\s*%)`;
const CLOCK = String.raw`(?:\d{1,2}[:.h]\d{2}(?::\d{2})?(?:\s*${MERIDIEM}|${HOURS})|\d{1,2}\s*${MERIDIEM}|\d{4}${UNITS}${HOURS}|\d{3}\s*(?:hrs?|h)(?![a-z])\.?)(?!\d|:\d)`;
// Between the two times of a range: a dash, "to", "till", "until"; in Spanish "a" and "hasta".
const BETWEEN = String.raw`(?:\s*(?:[-\u2013\u2014~]|\b(?:to|till|until|hasta|a)\b)\s*|\t+)`;
const RANGE = String.raw`(${CLOCK})(?:${BETWEEN}(${CLOCK}))?`;
// Before a time: "from", "at"; in Spanish "de", "desde", "a las".
const BEFORE = String.raw`(?:(?:from|at|@|desde|de|a las)\s+)?`;
// What sits between a time and its activity: a dash, a colon, a bar.
const MARKS = /^[\s\-\u2013\u2014:;,.|]+|[\s\-\u2013\u2014:;,|]+$/g;

const LEADING = new RegExp(String.raw`^${BEFORE}${RANGE}`, 'i');
const TRAILING = new RegExp(String.raw`[\s\-\u2013\u2014:,]+${BEFORE}${RANGE}\s*$`, 'i');
// The same with one time: what a line is read with when its range's end is no time of day.
const LEADING_ONE = new RegExp(String.raw`^${BEFORE}(${CLOCK})`, 'i');
const TRAILING_ONE = new RegExp(String.raw`[\s\-\u2013\u2014:,]+${BEFORE}(${CLOCK})\s*$`, 'i');

/**
 * A time as written, on the 24-hour clock; nothing for one that is no time of day (25:10, 13pm). 24:00 is midnight
 * only where a range ends.
 */
function toClock(written: string, isEnd = false) {
	const text = written.replace(/\s*(?:hrs?|h)\.?$/i, '').trim();
	let hours: number;
	let minutes: number;
	let meridiem = '';
	const digits = /^(\d{3,4})$/.exec(text);
	if (digits) {
		hours = Number(digits[1].slice(0, -2));
		minutes = Number(digits[1].slice(-2));
	} else {
		const parts = /^(\d{1,2})(?:[:.h](\d{2})(?::\d{2})?)?\s*(?:([ap])\.?\s?m\.?)?$/i.exec(text);
		if (!parts) return undefined;
		hours = Number(parts[1]);
		minutes = Number(parts[2] ?? 0);
		meridiem = (parts[3] ?? '').toLowerCase();
	}
	if (minutes > 59) return undefined;
	if (meridiem) {
		if (hours < 1 || hours > 12) return undefined;
		hours = (hours % 12) + (meridiem === 'p' ? 12 : 0);
	} else if (hours === 24 && minutes === 0 && isEnd) hours = 0;
	else if (hours > 23) return undefined;
	return `${pad(hours)}:${pad(minutes)}`;
}

// A time written as bare digits, 1500, beside one written with a colon or am/pm: more likely a quantity.
function isBare(written: string) {
	return /^\d{3,4}\b/.test(written.trim());
}

/** A line's time or range, at its start or its end, and the words left: its activity. */
function timeAt(text: string) {
	for (const [range, one] of [
		[LEADING, LEADING_ONE],
		[TRAILING, TRAILING_ONE]
	]) {
		let found = range.exec(text);
		if (!found) continue;
		const time = toClock(found[1]);
		if (!time) continue;
		let end = found[2] ? toClock(found[2], true) : '';
		if (found[2] && isBare(found[2]) && !isBare(found[1])) end = undefined;
		if (end === undefined) {
			found = one.exec(text);
			if (!found) continue;
			end = '';
		}
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

/** The days from 1970 to a date: what tells how far apart two dates are. */
function dayNumberOf(date: string) {
	return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

// A time this far before the one above it is taken as the next day: 23:40 then 00:30, 17:00 then 06:30. Less is a
// log written a little out of order, which keeps its day.
const NIGHT_GAP = 3 * 60;
// A date written with no year this far before the one above it is in the next year: 31 Dec, then 1 Jan.
const YEAR_GAP = 180;

/** The entries a pasted or read time log holds, each with the line it came from, and the lines that held none. */
export function readLog(text: string, { year }: { year: number }): ReadLogType {
	const lines = text.split(/\r?\n/).map((line) => line.replace(/[^\S\t]+/g, ' ').trim());
	const order = orderOf(lines.map(findDate).filter((found) => found !== undefined));
	const entries: ReadEntryType[] = [];
	const skipped: SkippedLineType[] = [];
	// What the entry being read so far had, so a line under it with no time of its own carries its words on.
	let reading: (ReadEntryType & { words: string }) | undefined;
	let date = '';
	let isUnclear = false;
	let lastTime = '';

	function close() {
		if (!reading) return;
		const { words: written, ...entry } = reading;
		const words = written.replace(/\s+/g, ' ');
		entries.push({ ...entry, activity: entry.end ? `${words} (until ${entry.end})` : words });
		reading = undefined;
	}

	for (const [index, line] of lines.entries()) {
		if (!line) {
			close();
			continue;
		}
		let rest = line;
		const found = findDate(line);
		let dated = found && toFoundDate(found, order, year);
		// A date with no year at the start of words with no time ("Mar 3 tugs alongside", "1/2 hour") is words.
		const after = found?.rest.replace(MARKS, '') ?? '';
		if (found && !found.year && !found.isNamed && after && !timeAt(after)) dated = undefined;
		if (found && dated) {
			close();
			if (!found.year && date && dayNumberOf(date) - dayNumberOf(dated.date) > YEAR_GAP)
				dated.date = `${Number(dated.date.slice(0, 4)) + 1}${dated.date.slice(4)}`;
			({ date, isUnclear } = dated);
			lastTime = '';
			rest = after;
			if (!rest) continue;
		}
		const timed = timeAt(rest);
		if (!timed) {
			if (reading && !dated) reading.words = `${reading.words} ${rest}`.trim();
			else {
				close();
				skipped.push({ line: index + 1, text: rest.replace(/\s+/g, ' ') });
			}
			continue;
		}
		close();
		const notes: ReadNoteType[] = [];
		if (lastTime && date && minutesOf(lastTime) - minutesOf(timed.time) >= NIGHT_GAP) {
			date = nextDayOf(date);
			notes.push('next-day');
		}
		if (isUnclear) notes.push('unclear-date');
		lastTime = timed.time;
		reading = {
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
export type ImportRowType = ReadEntryType & {
	id: string;
	isChosen: boolean;
	/** The date as read: what the reading's notes on the date are about, until the person changes it. */
	readDate: string;
};

/** What the check step says about an entry. */
export type ImportNoteType = {
	kind: ReadNoteType | 'no-date' | 'no-time' | 'past-midnight' | 'overlap' | 'twice' | 'in-log';
	text: string;
};

// The words alone, for telling two entries apart: no case, accents, stops or commas.
function toCompared(words: string) {
	return plain(words)
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
}

/** Whether two entries say the same: the same date and time, and the same words whatever their case and spaces. */
function isSameEntry(one: { date: string; time: string; activity: string }, other: typeof one) {
	return (
		one.date === other.date &&
		one.time === other.time &&
		toCompared(one.activity) === toCompared(other.activity)
	);
}

function isInLog(row: ReadEntryType, days: DayType[]) {
	return days.some((day) =>
		day.entries.some((entry) => isSameEntry({ ...entry, date: day.date }, row))
	);
}

function isTwice(row: ReadEntryType, rows: ReadEntryType[]) {
	const at = rows.indexOf(row);
	return rows.slice(0, at < 0 ? rows.length : at).some((other) => isSameEntry(other, row));
}

// A range's end while its activity still says it, "(until 02:15)"; none once the person has taken it out.
function endOf(row: ReadEntryType) {
	return row.end && row.time && row.activity.includes(`(until ${row.end})`) ? row.end : '';
}

// Where a range starts and ends, in minutes from the start of 1970, so ranges on two dates compare; an end before
// the start is the next day's.
function spanOf(row: ReadEntryType) {
	const day = dayNumberOf(row.date) * 24 * 60;
	const start = day + minutesOf(row.time);
	const end = day + minutesOf(endOf(row));
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
		isChosen: !isInLog(entry, days) && !isTwice(entry, all),
		readDate: entry.date
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
	const isAsRead = row.date === row.readDate;
	if (row.notes.includes('unclear-date') && row.date && isAsRead)
		notes.push({
			kind: 'unclear-date',
			text: `Day or month unclear: read as ${toMonthDay(row.date)}`
		});
	if (row.notes.includes('next-day') && isAsRead)
		notes.push({
			kind: 'next-day',
			text: 'Moved to the next day: its time is before the one above'
		});
	const end = endOf(row);
	if (end && minutesOf(end) < minutesOf(row.time))
		notes.push({ kind: 'past-midnight', text: 'Runs past midnight' });
	if (end && row.date) {
		const span = spanOf(row);
		const under = rows.find(
			(other) =>
				other !== row &&
				other.isChosen &&
				other.date &&
				endOf(other) &&
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

// Whether a day dated `date` at `index` keeps the dated days in order.
function isInOrder(days: DayType[], index: number, date: string) {
	return days.every(
		(day, at) => !day.date || at === index || (at < index ? day.date <= date : day.date >= date)
	);
}

// The day an entry joins: the day with its date; else a day nobody has typed in yet (a new project's first), given
// the date, where that keeps the days in order; else a new day, before the first day dated after it. An entry with
// no date never joins a day someone typed in.
function claimDayFor(days: DayType[], date: string, newId: () => string) {
	const dated = days.find((day) => day.date === date && (date || day.entries.every(isUntyped)));
	if (dated) return dated;
	const blank = days.findIndex(
		(day, index) => !day.date && day.entries.every(isUntyped) && isInOrder(days, index, date)
	);
	if (date && blank >= 0) {
		days[blank].date = date;
		return days[blank];
	}
	const day: DayType = { id: newId(), date, entries: [] };
	const after = date ? days.findIndex((other) => other.date && other.date > date) : -1;
	days.splice(after < 0 ? days.length : after, 0, day);
	return day;
}

// Where a time sorts among a day's entries: an entry with none after every timed one, as the panel sorts them.
function toSortTime(time: string) {
	return time || '99';
}

/**
 * The chosen entries added to the time log's days, in place: each in the day of its date, before the first entry
 * timed after it. What was typed keeps its place and its words; a day's rows never typed in go once it has entries.
 * How many entries were added.
 */
export function addToLog(days: DayType[], rows: ImportRowType[], newId: () => string) {
	let count = 0;
	for (const row of rows) {
		if (!row.isChosen) continue;
		const day = claimDayFor(days, row.date, newId);
		for (const blank of day.entries.filter(isUntyped))
			day.entries.splice(day.entries.indexOf(blank), 1);
		const after = day.entries.findIndex((entry) => toSortTime(entry.time) > toSortTime(row.time));
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

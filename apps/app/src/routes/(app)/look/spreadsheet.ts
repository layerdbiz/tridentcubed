// The item list as a table (#242; Michael's Excel packing list printed only its file name). Rows pasted from a
// spreadsheet, or a spreadsheet file, are read here into a grid of cells; the grid is what the project saves, and
// the table the report prints is worked out from it each time (`toTable`).
//
// The customer supplies the sheet, so nothing here may depend on its shape. Every filled cell is kept, in the order
// it came. What makes the table read well is guesswork: which rows are headings, which column is the quantity and
// which the item, which row is the totals, which columns say one measure in two units. A sheet a guess does not
// fit keeps that part as it came, and no guess ever drops a cell.

/** The item list's cells as read, blank rows and blank columns left out. This is what a project saves. */
export type GridType = { name: string; cells: string[][] };

export type SkippedType = { rows: number; columns: number };

// Cells split by one character, the way a spreadsheet writes them: a cell in quotes may hold the character, a line
// break, and a quote written twice.
function splitCells(text: string, mark: string) {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let isQuoted = false;
	let isStarted = false;
	for (let at = 0; at < text.length; at += 1) {
		const letter = text[at];
		if (isQuoted) {
			if (letter !== '"') cell += letter;
			else if (text[at + 1] === '"') {
				cell += '"';
				at += 1;
			} else isQuoted = false;
		} else if (letter === '"' && !isStarted) {
			isQuoted = true;
			isStarted = true;
		} else if (letter === mark) {
			row.push(cell);
			cell = '';
			isStarted = false;
		} else if (letter === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
			isStarted = false;
		} else if (letter !== '\r') {
			cell += letter;
			isStarted = true;
		}
	}
	if (cell !== '' || row.length) {
		row.push(cell);
		rows.push(row);
	}
	return rows;
}

const MARKS = ['\t', ',', ';'];

// What separates the cells: the mark the sheet's first lines use most, counted over all of them, since a sheet may
// open with a title that uses none. A tab wins a tie.
function markOf(text: string) {
	const lines = text
		.split(/\r?\n/)
		.filter((each) => each.trim())
		.slice(0, 30);
	const countOf = (mark: string) =>
		lines.reduce((sum, line) => sum + line.split(mark).length - 1, 0);
	let best = MARKS[0];
	for (const mark of MARKS) if (countOf(mark) > countOf(best)) best = mark;
	return best;
}

// #245: what a sheet may carry that no font can draw (Michael's Excel list held U+EE01 and U+EE02, and the report
// printed a box beside every heading and number they sat in). Control characters, a sheet program's private
// characters, half a broken pair, the marks that stand for "something was here", and the invisible marks of text
// direction. The two joiners stay: they hold a letter or a picture together in some scripts and print nothing.
const UNPRINTABLE = /[\p{Cc}\p{Co}\p{Cs}\uFFFC\uFFFD]|(?![\u200C\u200D])\p{Cf}/gu;
const SPACES = /[\s\p{Z}]+/gu;

/** A cell as it is kept and printed: every space a plain one, nothing that cannot print, no space at its ends. */
export function toPrintable(text: string) {
	// The byte order mark first: a regular expression counts it as a space, and it is one of no width.
	return text
		.replaceAll('\uFEFF', '')
		.replace(SPACES, ' ')
		.replace(UNPRINTABLE, '')
		.replace(/ +/g, ' ')
		.trim();
}

function wordsOf(value: unknown) {
	if (value === null || value === undefined) return '';
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** JSON as rows: a list of rows, a list of records (their keys are the headings), or an object holding one. */
export function readJson(value: unknown): string[][] | undefined {
	let list = value;
	if (list && typeof list === 'object' && !Array.isArray(list)) {
		const held = Object.values(list).find((each) => Array.isArray(each));
		list = held ?? [list];
	}
	if (!Array.isArray(list) || !list.length) return undefined;
	if (list.every((row) => Array.isArray(row)))
		return list.map((row: unknown[]) => row.map(wordsOf));
	const keys: string[] = [];
	for (const record of list)
		if (record && typeof record === 'object')
			for (const key of Object.keys(record)) if (!keys.includes(key)) keys.push(key);
	if (!keys.length) return undefined;
	return [
		keys,
		...list.map((record) =>
			keys.map((key) =>
				record && typeof record === 'object'
					? wordsOf((record as Record<string, unknown>)[key])
					: ''
			)
		)
	];
}

/** Pasted text as rows of cells: tab, comma or semicolon separated, or JSON. Nothing for a single cell. */
export function readText(text: string): string[][] | undefined {
	const clean = text.replace(/^﻿/, '').replace(/[\r\n]+$/, '');
	if (!clean.trim()) return undefined;
	if (/^\s*[[{]/.test(clean)) {
		try {
			const rows = readJson(JSON.parse(clean));
			if (rows) return rows;
		} catch {
			// Not JSON after all: read it as rows.
		}
	}
	if (!/[\t\n]/.test(clean)) return undefined;
	return splitCells(clean, clean.includes('\t') ? '\t' : markOf(clean));
}

/**
 * The cells worth keeping: each trimmed and rid of what cannot print (#245), with rows and columns that hold
 * nothing left out, and how many those were. Nothing when no cell holds anything.
 */
export function toGrid(
	name: string,
	rows: unknown[][]
): { grid: GridType; skipped: SkippedType } | undefined {
	const all = rows.map((row) => row.map((cell) => toPrintable(wordsOf(cell))));
	const filled = all.filter((row) => row.some(Boolean));
	if (!filled.length) return undefined;
	const width = Math.max(...filled.map((row) => row.length));
	const kept: number[] = [];
	for (let column = 0; column < width; column += 1)
		if (filled.some((row) => row[column])) kept.push(column);
	return {
		grid: { name, cells: filled.map((row) => kept.map((column) => row[column] ?? '')) },
		skipped: { rows: all.length - filled.length, columns: width - kept.length }
	};
}

/** One line of a printed cell: its words, and its unit when the cell stacks one measure in two units. */
export type LineType = { text: string; unit: string };

/**
 * A column as it prints. `index` is the sheet's own row numbers, `quantity` and `item` the two the report leads
 * with, `value` everything else. `sub` is what a merged heading held under it ("L × W × H").
 */
export type ColumnType = {
	kind: 'index' | 'quantity' | 'item' | 'value';
	head: string;
	sub: string;
	isNumber: boolean;
};

/** The item list ready to print: each row a cell per column, each cell its lines. */
export type TableType = {
	// The lines a sheet has above its headings (its title, who shipped it), each row's cells as one line.
	notes: string[];
	// Whether the sheet had headings to print at all.
	hasHeads: boolean;
	columns: ColumnType[];
	rows: LineType[][][];
	totals?: LineType[][];
};

function isNumber(text: string) {
	return /^[-+(]?[$€£]?\d[\d,]*(\.\d+)?\)?%?$/.test(text) || /^[-+]?\.\d+$/.test(text);
}

function filledOf(row: string[]) {
	return row.filter(Boolean).length;
}

// Where the table starts: the first row about as full as the fullest one that also reaches the table's right
// side. A title or a "Shipper: ..." line above the headings is neither. With no such row, the first.
function startOf(cells: string[][], width: number) {
	const need = Math.max(Math.min(2, width), Math.ceil(Math.max(...cells.map(filledOf)) / 2));
	const reach = width - 1 - Math.floor(width / 4);
	const start = cells.findIndex(
		(row) => filledOf(row) >= need && row.findLastIndex(Boolean) >= reach
	);
	return Math.max(0, start);
}

// A second row of headings sits under a merged one: no numbers, words under the gaps of the row above, and no more
// words under that row's words than under its gaps. A row of items written in words fails the last.
function isUnder(row: string[], above: string[]) {
	if (row.some(isNumber)) return false;
	let under = 0;
	let both = 0;
	for (const [column, cell] of row.entries())
		if (cell) {
			if (above[column]) both += 1;
			else under += 1;
		}
	return under > 0 && both <= under;
}

const QUANTITY =
	/^(total\s+|ttl\s+)?(qty\.?|quantity|quantities|pcs\.?|pieces|pkgs?\.?|packages|units|count|(no\.?|#|number) of \w+)(\s*\(.*\))?$/i;
const ITEM = /desc|commodity|cargo|article|goods|product|contents|item name|part name/i;
const INDEX = /^(items?|(items?|line|s|sr|pos)?\.?\s*(no|#)\.?|#|line|pos\.?)$/i;
const TOTALS = /^(grand\s+|sub\s*)?totals?:?$/i;
const LENGTHS = /^(l|w|h|d|len|length|wid|width|ht|hgt|height|depth|dia|diameter)\.?$/i;
const MEASURE = /dim|size|meas/i;
const UNIT = /[\s/_-](in|inch|inches|cm|mm|m|mtr|meters?|metres?|ft|feet|lbs?|kgs?|kilos?)\.?$/i;

// The unit a heading names, in brackets at its end or as its last word, and the heading without it.
function unitOf(head: string) {
	const found = head.match(/\(([^)]*)\)\s*$/)?.[1] ?? head.match(UNIT)?.[1] ?? '';
	return found.trim().toLowerCase();
}

function baseOf(head: string) {
	return (
		/\([^)]*\)\s*$/.test(head) ? head.replace(/\s*\([^)]*\)\s*$/, '') : head.replace(UNIT, '')
	)
		.replace(/\s+/g, ' ')
		.trim();
}

// A printed column before its cells are made: the sheet columns it reads, once for each unit it stacks.
type DraftType = ColumnType & { parts: { unit: string; members: number[] }[] };

/**
 * The table a grid prints as. Quantity leads, then the item; lengths under one merged heading share a column
 * ("472 × 204 × 151"); a measure given in two units shares a cell, one line each. Whatever of that a sheet does not
 * show plainly is left as it came.
 */
export function toTable(grid: GridType): TableType {
	const width = Math.max(0, ...grid.cells.map((row) => row.length));
	// Cleaned here too: a list saved before #245 still holds what its sheet carried.
	const cells = grid.cells.map((row) =>
		Array.from({ length: width }, (_, at) => toPrintable(row[at] ?? ''))
	);
	if (!cells.length || !width) return { notes: [], hasHeads: false, columns: [], rows: [] };
	const start = startOf(cells, width);
	const notes = cells.slice(0, start).map((row) => row.filter(Boolean).join(' '));
	const body = cells.slice(start);

	let heads = 0;
	if (body.length > 1 && !body[0].some(isNumber)) {
		heads = 1;
		while (heads < 3 && body.length > heads + 1 && isUnder(body[heads], body[heads - 1]))
			heads += 1;
	}
	const top = heads >= 2 ? body[heads - 2] : undefined;
	const bottom = heads >= 1 ? body[heads - 1] : undefined;
	const rows = body.slice(heads);
	const totals =
		rows.length > 1 && rows.at(-1)!.some((cell) => TOTALS.test(cell)) ? rows.pop() : undefined;

	// Each sheet column: its heading, the merged heading over it, and whether it holds numbers.
	let carried = '';
	const sheet = Array.from({ length: width }, (_, column) => {
		let group = '';
		let label = bottom?.[column] ?? '';
		if (top && label) {
			if (top[column]) carried = top[column];
			group = carried;
		} else if (top) {
			carried = '';
			label = top[column];
		}
		const values = rows.map((row) => row[column]).filter(Boolean);
		return {
			group,
			label,
			isNumber: values.length > 0 && values.filter(isNumber).length / values.length >= 0.6
		};
	});

	const quantity = sheet.findIndex((column) => QUANTITY.test(column.label));
	let item = sheet.findIndex((column, at) => at !== quantity && ITEM.test(column.label));
	if (item < 0)
		item = sheet.findIndex(
			(column, at) => at !== quantity && !column.isNumber && /^items?$/i.test(column.label)
		);
	if (item < 0) {
		// No heading names it: the column with the most words.
		let most = 0;
		for (const [at, column] of sheet.entries()) {
			if (column.isNumber || at === quantity) continue;
			const size = rows.reduce((sum, row) => sum + row[at].length, 0);
			if (size > most) {
				most = size;
				item = at;
			}
		}
	}
	const index = sheet.findIndex(
		(column, at) =>
			at !== quantity && at !== item && !column.group && column.isNumber && INDEX.test(column.label)
	);
	// Quantity moves ahead of the item only when the sheet names both; else every column stays where it is.
	const lead = quantity >= 0 && item >= 0 ? [index, quantity, item].filter((at) => at >= 0) : [];
	const order = [...lead, ...sheet.keys().filter((at) => !lead.includes(at))];

	const drafts: DraftType[] = [];
	for (let at = 0; at < order.length; at += 1) {
		const column = order[at];
		const { group, label } = sheet[column];
		if (column === index || column === quantity || column === item) {
			drafts.push({
				kind: column === index ? 'index' : column === quantity ? 'quantity' : 'item',
				head: column === index ? '#' : label,
				sub: '',
				isNumber: column !== item,
				parts: [{ unit: '', members: [column] }]
			});
			continue;
		}
		const members = [column];
		if (group)
			while (
				at + 1 < order.length &&
				order[at + 1] === order[at] + 1 &&
				sheet[order[at + 1]].group === group &&
				!lead.includes(order[at + 1])
			) {
				at += 1;
				members.push(order[at]);
			}
		const labels = members.map((member) => sheet[member].label);
		const isLengths =
			members.length > 1 && (MEASURE.test(group) || labels.every((each) => LENGTHS.test(each)));
		// Lengths become one column; anything else under a merged heading stays a column each.
		for (const each of isLengths ? [members] : members.map((member) => [member]))
			drafts.push({
				kind: 'value',
				head: group || sheet[each[0]].label,
				sub: !group ? '' : isLengths ? labels.join(' × ') : sheet[each[0]].label,
				isNumber: isLengths || sheet[each[0]].isNumber,
				parts: [{ unit: '', members: each }]
			});
	}

	// One measure in two units (Dimensions in inches and in meters) shares the first one's column.
	const columns: DraftType[] = [];
	for (const draft of drafts) {
		const unit = draft.kind === 'value' ? unitOf(draft.head) : '';
		const home =
			unit &&
			columns.find(
				(other) =>
					other.kind === 'value' &&
					unitOf(other.head) &&
					baseOf(other.head).toLowerCase() === baseOf(draft.head).toLowerCase() &&
					other.sub === draft.sub &&
					other.parts.every((part) => part.unit !== unit)
			);
		if (home) home.parts.push({ unit, members: draft.parts[0].members });
		else columns.push({ ...draft, parts: [{ unit, members: draft.parts[0].members }] });
	}
	for (const column of columns) if (column.parts.length > 1) column.head = baseOf(column.head);

	function print(row: string[]): LineType[][] {
		return columns.map((column) =>
			column.parts
				.map((part) => {
					const values = part.members.map((member) => row[member]);
					const text = values.some(Boolean) ? values.map((value) => value || '–').join(' × ') : '';
					return { text, unit: column.parts.length > 1 ? part.unit : '' };
				})
				.filter((line) => line.text)
		);
	}

	return {
		notes,
		hasHeads: heads > 0,
		columns: columns.map(({ kind, head, sub, isNumber }) => ({ kind, head, sub, isNumber })),
		rows: rows.map(print),
		totals: totals && print(totals)
	};
}

const BOOKS = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'numbers'];
const TEXTS = ['csv', 'tsv', 'tab', 'txt'];

// A text file's words. Excel on Windows saves a CSV in the Windows alphabet, not UTF-8: read that way, an accent
// is a broken letter, so a file that is not UTF-8 is read as Windows wrote it.
function wordsIn(bytes: ArrayBuffer) {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder('windows-1252').decode(bytes);
	}
}

/**
 * A spreadsheet file as rows of cells: Excel and its kin, CSV, TSV, JSON. Nothing for a file that is not a table
 * (a PDF, a document), which is attached as the file it is. It throws when a spreadsheet cannot be opened.
 */
export async function readFile(file: File): Promise<string[][] | undefined> {
	const kind = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
	if (BOOKS.includes(kind)) {
		// The reader is large, so it loads only when a spreadsheet is chosen.
		const { read, utils } = await import('xlsx');
		const book = read(await file.arrayBuffer(), { type: 'array', cellStyles: true });
		for (const name of book.SheetNames) {
			// Each cell as the sheet shows it (a date as a date, "4,100" with its comma); rows and columns the
			// sender hid stay hidden.
			const rows = utils.sheet_to_json<unknown[]>(book.Sheets[name], {
				header: 1,
				raw: false,
				defval: '',
				skipHidden: true
			});
			if (rows.some((row) => row.some((cell) => wordsOf(cell).trim())))
				return rows.map((row) => row.map(wordsOf));
		}
		return [];
	}
	if (kind === 'json') {
		try {
			return readJson(JSON.parse(wordsIn(await file.arrayBuffer())));
		} catch {
			return undefined;
		}
	}
	if (!TEXTS.includes(kind)) return undefined;
	const text = wordsIn(await file.arrayBuffer()).replace(/^﻿/, '');
	// Plain text is a table only when it is tab-separated; a note someone typed is a file.
	if (kind === 'txt' && !text.includes('\t')) return undefined;
	return splitCells(
		text,
		kind === 'csv' ? markOf(text) : text.includes('\t') ? '\t' : markOf(text)
	);
}

/** The grid as the text a panel's row keeps; nothing for no grid. */
export function toSaved(grid: GridType | undefined) {
	return grid?.cells.length ? JSON.stringify(grid) : '';
}

/** The grid a panel's row kept, or nothing when it kept none or what it kept is not one. */
export function fromSaved(text: string): GridType | undefined {
	if (!text) return undefined;
	try {
		const kept: unknown = JSON.parse(text);
		if (!kept || typeof kept !== 'object') return undefined;
		const { name, cells } = kept as { name?: unknown; cells?: unknown };
		if (!Array.isArray(cells) || !cells.length || !cells.every((row) => Array.isArray(row)))
			return undefined;
		return {
			name: typeof name === 'string' ? name : '',
			cells: cells.map((row: unknown[]) => row.map(wordsOf))
		};
	} catch {
		return undefined;
	}
}

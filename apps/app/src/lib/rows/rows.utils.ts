// The sync loop's difference (glossary "Sync loop"; #183): which row changes carry the rows the server last confirmed
// to the rows the screens hold now. Pure, so it is tested with plain data.
import { type RowChangeType, type RowType, TABLE_NAMES, type TableNameType } from './rows.schema';

function keyOf(row: { table: string; id: string }) {
	return `${row.table}/${row.id}`;
}

function isSame(a: unknown, b: unknown) {
	return a === b || JSON.stringify(a) === JSON.stringify(b);
}

function rankOf(table: TableNameType) {
	return TABLE_NAMES.indexOf(table);
}

/**
 * The changes from `confirmed` to `next`: a new row is put whole, a changed row with only the columns that changed,
 * and a row that is gone is deleted (to the Trash). Puts come first, parents before children; deletes after,
 * children before parents. Each change gets its own change id from `createId`.
 */
export function toChanges(
	confirmed: RowType[],
	next: RowType[],
	createId: () => string = () => crypto.randomUUID()
): RowChangeType[] {
	const before = new Map(confirmed.map((row) => [keyOf(row), row]));
	const after = new Set(next.map(keyOf));
	const puts: RowChangeType[] = [];
	for (const row of next) {
		const old = before.get(keyOf(row));
		const values: Record<string, unknown> = {};
		for (const [column, value] of Object.entries(row.values))
			if (!old || !isSame(old.values[column], value)) values[column] = value;
		if (old && Object.keys(values).length === 0) continue;
		puts.push({ changeId: '', table: row.table, id: row.id, operation: 'put', values });
	}
	const deletes: RowChangeType[] = [];
	for (const row of confirmed)
		if (!after.has(keyOf(row)))
			deletes.push({ changeId: '', table: row.table, id: row.id, operation: 'delete' });
	puts.sort((a, b) => rankOf(a.table) - rankOf(b.table));
	deletes.sort((a, b) => rankOf(b.table) - rankOf(a.table));
	return [...puts, ...deletes].map((change) => ({ ...change, changeId: createId() }));
}

/**
 * The confirmed rows once part of what the server holds has been taken in later (a project's rows as it opens,
 * #186): the rows `isPart` names are now the server's (`taken`), and every other row stays as it was confirmed, so
 * taking them in sends nothing back, and nothing else that waits to be sent is lost.
 */
export function toMerged(
	confirmed: RowType[],
	taken: RowType[],
	isPart: (row: RowType) => boolean
): RowType[] {
	return [...confirmed.filter((row) => !isPart(row)), ...taken.filter(isPart)];
}

/** The confirmed rows once the server has applied `changes`. */
export function toApplied(confirmed: RowType[], changes: RowChangeType[]): RowType[] {
	const rows = new Map(confirmed.map((row) => [keyOf(row), row]));
	for (const change of changes) {
		const key = keyOf(change);
		if (change.operation === 'delete') {
			rows.delete(key);
			continue;
		}
		const old = rows.get(key);
		rows.set(key, {
			table: change.table,
			id: change.id,
			values: { ...old?.values, ...structuredClone(change.values) }
		});
	}
	return [...rows.values()];
}

/**
 * A row id worked out from words rather than made at random (#184): the same words always give the same UUID, so
 * two devices that save the same new thing (a place picked in two location fields) save one row, and the seed's rows
 * keep their ids. Not a secret and not a security measure: a 128-bit hash shaped as a version 8 UUID. Put the
 * organization's id first, so organizations never share one.
 */
export function toStableId(...parts: string[]) {
	const hashes = [1779033703, 3144134277, 1013904242, 2773480762];
	for (const letter of parts.join('\u0000')) {
		const code = letter.codePointAt(0) ?? 0;
		const [a, b, c, d] = hashes;
		hashes[0] = b ^ Math.imul(a ^ code, 597399067);
		hashes[1] = c ^ Math.imul(b ^ code, 2869860233);
		hashes[2] = d ^ Math.imul(c ^ code, 951274213);
		hashes[3] = hashes[0] ^ Math.imul(d ^ code, 2716044179);
	}
	const [a, b, c, d] = hashes;
	const mixed = [
		Math.imul(c ^ (a >>> 18), 597399067),
		Math.imul(d ^ (b >>> 22), 2869860233),
		Math.imul(a ^ (c >>> 17), 951274213),
		Math.imul(b ^ (d >>> 19), 2716044179)
	];
	const hex = mixed.map((hash) => (hash >>> 0).toString(16).padStart(8, '0')).join('');
	const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

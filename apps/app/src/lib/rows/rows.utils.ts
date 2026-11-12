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

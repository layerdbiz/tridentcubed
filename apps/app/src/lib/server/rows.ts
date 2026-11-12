// The server half of saving (ADR 0005 and its 2026-11-12 amendment; spec #179; #183). `saveBatch` is what the one
// save command does with a batch of row changes; `readRows` is what the queries load. Both read the row registry
// (`#lib/rows/rows.schema.ts`), so a new table needs its Drizzle table in `TABLES` below and nothing else here.
//
// A batch, in one transaction through the claims helper, all or nothing: for each change, a change id already in the
// change record is done and skipped; otherwise its columns are checked against the registry, the one permission check
// is asked with the row as it is now, a name is checked against its page, and the change is applied with the times
// set by the server and written to the change record (who, when, table, row, what, before, after). The first refusal
// rolls everything back and comes back as a plain reason.
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
	checkValues,
	type BatchType,
	type RowChangeType,
	type SavedRowType,
	type SaveResultType,
	TABLE_NAMES,
	TABLES as SPECS,
	type TableNameType,
	columnsOf
} from '#lib/rows/rows.schema.js';
import type { ActorType, ClaimsType, TransactionType } from './db/claims';
import { change as changes, contact, customer } from './db/schema';
import { checkPermission, type ChangeType } from './permission';

/** The Drizzle table of each registry entry. */
export const TABLES: Record<TableNameType, PgTable> = { customer, contact };

type StoredRowType = Record<string, unknown> & {
	id: string;
	organizationId: string;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
};

class Refusal extends Error {}

function columnOf(table: TableNameType, column: string) {
	return (TABLES[table] as unknown as Record<string, PgColumn>)[column];
}

function toSaved(table: TableNameType, row: StoredRowType): SavedRowType {
	return {
		table,
		id: row.id,
		values: Object.fromEntries(columnsOf(table).map((column) => [column, row[column]])),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null
	};
}

async function findRow(tx: TransactionType, table: TableNameType, id: string) {
	const [row] = await tx
		.select()
		.from(TABLES[table])
		.where(eq(columnOf(table, 'id'), id));
	return row as StoredRowType | undefined;
}

async function isDone(tx: TransactionType, changeId: string) {
	const [done] = await tx.select({ id: changes.id }).from(changes).where(eq(changes.id, changeId));
	return Boolean(done);
}

// The project a row belongs to, for the freeze of a Sent or Complete project. No table in a project saves yet:
// #186 answers here from the row's `projectId` or its parent's (`SPECS[table].parent`), and moves that project's
// updated time when a row inside it changes.
async function findProject(
	_tx: TransactionType,
	_table: TableNameType,
	_row: Record<string, unknown>
): Promise<ChangeType['project']> {
	return undefined;
}

// A name already on the page, outside the Trash and whatever its capitals, is refused before the database's own
// unique index would refuse it, so the reason can name it.
async function checkName(tx: TransactionType, table: TableNameType, id: string, name: unknown) {
	if (!('isNamed' in SPECS[table]) || typeof name !== 'string') return;
	const [taken] = await tx
		.select({ id: columnOf(table, 'id') })
		.from(TABLES[table])
		.where(
			and(
				sql`lower(${columnOf(table, 'name')}) = lower(${name})`,
				isNull(columnOf(table, 'deletedAt')),
				ne(columnOf(table, 'id'), id)
			)
		);
	if (taken) throw new Refusal(`${name.trim()} is already there.`);
}

async function applyChange(tx: TransactionType, actor: ActorType, change: RowChangeType) {
	if (await isDone(tx, change.changeId)) return;
	const { table, id, operation } = change;
	const values = change.values ?? {};
	if (operation === 'put') {
		const invalid = checkValues(table, values);
		if (invalid) throw new Refusal(`That change does not fit: ${invalid}`);
	}
	const row = await findRow(tx, table, id);
	if (operation === 'delete' && (!row || row.deletedAt)) return;

	const verdict = checkPermission(actor, {
		table,
		operation,
		columns: Object.keys(values),
		values: operation === 'put' ? { ...values, organizationId: actor.organizationId } : undefined,
		row,
		project: await findProject(tx, table, { ...row, ...values })
	});
	if (!verdict.isAllowed) throw new Refusal(verdict.reason);

	const target = TABLES[table];
	const where = eq(columnOf(table, 'id'), id);
	let after: unknown;
	if (operation === 'delete') {
		[after] = await tx
			.update(target)
			.set({ deletedAt: sql`now()`, updatedAt: sql`now()` } as never)
			.where(where)
			.returning();
	} else {
		if ('name' in values) await checkName(tx, table, id, values.name);
		[after] = row
			? await tx
					.update(target)
					.set({ ...values, updatedAt: sql`now()` } as never)
					.where(where)
					.returning()
			: await tx
					.insert(target)
					.values({ ...values, id, organizationId: actor.organizationId } as never)
					.returning();
	}
	await tx.insert(changes).values({
		id: change.changeId,
		organizationId: actor.organizationId ?? '',
		userId: actor.userId,
		tableName: table,
		rowId: id,
		operation,
		before: row ?? null,
		after: after ?? null
	});
}

function toReason(error: unknown) {
	if (error instanceof Refusal) return error.message;
	const cause = (error as { cause?: { code?: string } }).cause ?? error;
	const code = (cause as { code?: string }).code;
	if (code === '23505') return 'That name is already there.';
	if (code === '23503') return 'Something that change points at is not saved.';
	if (code === '42501') return 'That belongs to another organization.';
	return undefined;
}

/** The save command's work: the batch applied as `actor`, all of it or none of it. */
export async function saveBatch(
	claims: ClaimsType,
	actor: ActorType,
	batch: BatchType
): Promise<SaveResultType> {
	if (!actor.organizationId) {
		return { isSaved: false, reason: 'You are waiting for access. Nothing was saved.' };
	}
	const rank = (table: TableNameType) => TABLE_NAMES.indexOf(table);
	const puts = batch.changes
		.filter((change) => change.operation === 'put')
		.sort((a, b) => rank(a.table) - rank(b.table));
	const deletes = batch.changes.filter((change) => change.operation === 'delete');
	try {
		await claims.run(actor, async (tx) => {
			for (const change of [...puts, ...deletes]) await applyChange(tx, actor, change);
		});
		return { isSaved: true };
	} catch (error) {
		const reason = toReason(error);
		if (reason) return { isSaved: false, reason };
		throw error;
	}
}

/**
 * The rows of every table of a scope, as the server holds them, oldest first. Rows in the Trash are left out, except
 * for a table whose rows are named (customers), whose Trash still loads so the screens can show an old name.
 */
export async function readRows(
	claims: ClaimsType,
	actor: ActorType,
	scope: 'organization' = 'organization'
): Promise<SavedRowType[]> {
	if (!actor.organizationId) return [];
	return claims.run(actor, async (tx) => {
		const rows: SavedRowType[] = [];
		for (const table of TABLE_NAMES) {
			const spec = SPECS[table];
			if (spec.scope !== scope) continue;
			const found = await tx
				.select()
				.from(TABLES[table])
				.where('isNamed' in spec ? undefined : isNull(columnOf(table, 'deletedAt')))
				.orderBy(asc(columnOf(table, 'createdAt')), asc(columnOf(table, 'id')));
			for (const row of found) rows.push(toSaved(table, row as StoredRowType));
		}
		return rows;
	});
}

/**
 * The one permission check for a put of `values` on the row `id` of `table`, as the save command would ask it, with
 * the row as it is now (none for a row not made yet). Asked before a file for that row gets an upload address.
 */
export async function checkPut(
	tx: TransactionType,
	actor: ActorType,
	table: TableNameType,
	id: string | undefined,
	values: Record<string, unknown>
) {
	const row = id ? await findRow(tx, table, id) : undefined;
	return checkPermission(actor, {
		table,
		operation: 'put',
		columns: Object.keys(values),
		values: { ...values, organizationId: actor.organizationId },
		row,
		project: await findProject(tx, table, { ...row, ...values })
	});
}

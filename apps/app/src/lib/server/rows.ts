// The server half of saving (ADR 0005 and its 2026-11-12 amendment; spec #179; #183). `saveBatch` is what the one
// save command does with a batch of row changes; `readRows` is what the queries load. Both read the row registry
// (`#lib/rows/rows.schema.ts`), so a new table needs its Drizzle table in `TABLES` below and nothing else here.
//
// A batch, in one transaction through the claims helper, all or nothing: for each change, a change id already in the
// change record is done and skipped; otherwise its columns are checked against the registry, the one permission check
// is asked with the row as it is now, a name is checked against its page, and the change is applied with the times
// set by the server and written to the change record (who, when, table, row, what, before, after). The first refusal
// rolls everything back and comes back as a plain reason.
//
// Projects (#186) add the rules a project's rows need: every row inside a project names it (`projectId`), so the
// permission check is handed the project's status (the freeze), a change inside it moves its updated time, and
// deleting it sends its rows to the Trash with it. The server sets who made a project and its J count, remembers its
// status before Sent, and moves a Draft to In Progress once its Project panel is complete.
import { and, asc, eq, isNull, max, ne, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
	checkValues,
	type BatchType,
	type RowChangeType,
	type RowType,
	type SavedRowType,
	type SaveResultType,
	TABLE_NAMES,
	TABLES as SPECS,
	type TableNameType,
	type TableSpecType,
	readsOf
} from '#lib/rows/rows.schema.js';
import type { ActorType, ClaimsType, TransactionType } from './db/claims';
import {
	change as changes,
	contact,
	customer,
	disclaimerPoint,
	facility,
	member,
	organization,
	organizationDetails,
	panel,
	personnelCompany,
	personnelPerson,
	place,
	project,
	projectTeam,
	team,
	transport,
	stop,
	item,
	itemAttachment,
	timeLogDay,
	timeLogEntry,
	user as users
} from './db/schema';
import { photo, photoGroup } from './db/photo.schema';
import { checkPermission, FROZEN_STATUSES, type ChangeType } from './permission';

function toBatchState(): BatchStateType {
	return { statusAtStart: new Map(), touched: new Set(), statusSet: new Set(), reads: [] };
}

/** The Drizzle table of each registry entry. */
export const TABLES: Record<TableNameType, PgTable> = {
	customer,
	contact,
	team,
	// #184
	transport,
	facility,
	place,
	organization,
	organization_details: organizationDetails,
	disclaimer_point: disclaimerPoint,
	// #186
	project,
	project_team: projectTeam,
	personnel_company: personnelCompany,
	personnel_person: personnelPerson,
	panel,
	// #189
	photo_group: photoGroup,
	photo,
	// #188
	stop,
	item,
	item_attachment: itemAttachment,
	time_log_day: timeLogDay,
	time_log_entry: timeLogEntry
};

// What one batch learns as it goes: each project's status before the batch began, the projects it changed and
// those whose status it set, and the server-set columns of the rows it put.
type BatchStateType = {
	statusAtStart: Map<string, string>;
	touched: Set<string>;
	statusSet: Set<string>;
	reads: RowType[];
};

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

/** The tables whose rows sit inside a project (they carry `projectId`), the project itself left out. */
const INSIDE_PROJECT = TABLE_NAMES.filter(
	(table) => table !== 'project' && columnOf(table, 'projectId')
);

function toSaved(table: TableNameType, row: StoredRowType): SavedRowType {
	return {
		table,
		id: row.id,
		values: Object.fromEntries(
			readsOf(table).map((column) => {
				const value = row[column];
				return [column, value instanceof Date ? value.toISOString() : value];
			})
		),
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

// The project a row belongs to (for the project table, itself), for the freeze of a Sent, Complete or Archived
// project. A batch that changes a project's status and its contents together is judged by whichever of the two
// statuses (before the batch, or now) is not frozen, so marking Sent right after an edit, or editing right after
// Unsend, saves as one batch.
async function findProject(
	tx: TransactionType,
	batch: BatchStateType,
	table: TableNameType,
	row: Record<string, unknown>
): Promise<ChangeType['project']> {
	const id = table === 'project' ? row.id : row.projectId;
	if (typeof id !== 'string') return undefined;
	const [found] = await tx
		.select({ status: project.status, createdBy: project.createdBy, deletedAt: project.deletedAt })
		.from(project)
		.where(eq(project.id, id));
	if (!found) return undefined;
	if (!batch.statusAtStart.has(id)) batch.statusAtStart.set(id, found.status);
	const before = batch.statusAtStart.get(id) ?? found.status;
	const status = FROZEN_STATUSES.includes(found.status) ? before : found.status;
	return { status, createdBy: found.createdBy, isDeleted: Boolean(found.deletedAt) };
}

// A project's J count: the next of its customer's jobs on its day, the Trash included, so a number once given is
// never given again when another project is deleted. Two devices adding a job for one customer and day at once wait
// for each other.
async function toJob(tx: TransactionType, id: string, customerId: unknown, day: unknown) {
	const customerKey = typeof customerId === 'string' ? customerId : null;
	const dayKey = typeof day === 'string' ? day : '';
	await tx.execute(
		sql`select pg_advisory_xact_lock(hashtext(${`job/${customerKey ?? ''}/${dayKey}`}))`
	);
	const [found] = await tx
		.select({ last: max(project.job) })
		.from(project)
		.where(
			and(
				customerKey ? eq(project.customerId, customerKey) : isNull(project.customerId),
				eq(project.day, dayKey),
				ne(project.id, id)
			)
		);
	return (found?.last ?? 0) + 1;
}

// The columns of a project only the server sets, for a put of it: who made a new one, its J count when it is new or
// its customer or day change, and the status it had before it was marked Sent.
async function toProjectValues(
	tx: TransactionType,
	actor: ActorType,
	id: string,
	row: StoredRowType | undefined,
	values: Record<string, unknown>
) {
	const set: Record<string, unknown> = {};
	if (!row) set.createdBy = actor.userId;
	const isMoved =
		!row ||
		('customerId' in values && values.customerId !== row.customerId) ||
		('day' in values && values.day !== row.day);
	if (isMoved) {
		const next = { ...row, ...values };
		set.job = await toJob(tx, id, next.customerId, next.day);
	}
	if ('status' in values && values.status !== row?.status) {
		const before = String(row?.status ?? 'Draft');
		set.statusBeforeSent = values.status === 'Sent' ? before : '';
	}
	return set;
}

// A Draft becomes In Progress once its Project panel is complete (the glossary's Status; Justin, 2026-11-10): a
// title, subtitle, project type, customer, Team Lead and someone assigned. A batch that set the status by hand keeps
// what it set.
async function advanceDrafts(tx: TransactionType, actor: ActorType, batch: BatchStateType) {
	for (const id of batch.touched) {
		if (batch.statusSet.has(id)) continue;
		const [found] = await tx.select().from(project).where(eq(project.id, id));
		if (!found || found.deletedAt || found.status !== 'Draft') continue;
		const isFilled = [found.title, found.subtitle, found.projectType].every((text) => text.trim());
		if (!isFilled || !found.customerId || !found.teamLeadId) continue;
		const [assigned] = await tx
			.select({ id: projectTeam.id })
			.from(projectTeam)
			.where(and(eq(projectTeam.projectId, id), isNull(projectTeam.deletedAt)));
		if (!assigned) continue;
		const [after] = await tx
			.update(project)
			.set({ status: 'In Progress', statusBeforeSent: '', updatedAt: sql`now()` })
			.where(eq(project.id, id))
			.returning();
		await tx.insert(changes).values({
			id: crypto.randomUUID(),
			organizationId: actor.organizationId ?? '',
			userId: actor.userId,
			tableName: 'project',
			rowId: id,
			operation: 'put',
			before: found,
			after
		});
	}
}

// A project in the Trash takes its rows with it.
async function trashInside(tx: TransactionType, projectId: string) {
	for (const table of INSIDE_PROJECT)
		await tx
			.update(TABLES[table])
			.set({ deletedAt: sql`now()`, updatedAt: sql`now()` } as never)
			.where(
				and(eq(columnOf(table, 'projectId'), projectId), isNull(columnOf(table, 'deletedAt')))
			);
}

// The server-set columns of a put row, when one changed, for the device to take in.
function toReads(table: TableNameType, before: StoredRowType | undefined, after: StoredRowType) {
	const spec: TableSpecType = SPECS[table];
	const { values } = toSaved(table, after);
	const old = before ? toSaved(table, before).values : {};
	const isChanged = (spec.reads ?? []).some(
		(column) => (old[column] ?? null) !== (values[column] ?? null)
	);
	return isChanged ? values : undefined;
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

// What the one permission check needs to keep the organization's Admins (#185): for a Team record a User has
// signed in as, whether it is the Super admin's and how many Admins there are now. A record nobody has signed in as
// is nobody's membership, so demoting it never leaves the organization without an Admin.
async function readAdmins(
	tx: TransactionType,
	actor: ActorType,
	table: TableNameType,
	row: StoredRowType | undefined
): Promise<Pick<ChangeType, 'isSuperAdmin' | 'adminCount'>> {
	if (table !== 'team' || !row) return {};
	const userId = row.userId as string | null;
	if (!userId) return { isSuperAdmin: false, adminCount: Number.POSITIVE_INFINITY };
	const [owner] = await tx
		.select({ isSuperAdmin: users.isSuperAdmin })
		.from(users)
		.where(eq(users.id, userId));
	const admins = await tx
		.select({ id: member.id })
		.from(member)
		.where(and(eq(member.organizationId, actor.organizationId ?? ''), eq(member.role, 'admin')));
	return { isSuperAdmin: owner?.isSuperAdmin ?? false, adminCount: admins.length };
}

// A Team record's role is its User's membership's role (#185): changing one changes the other.
async function moveMembership(
	tx: TransactionType,
	actor: ActorType,
	table: TableNameType,
	row: StoredRowType | undefined,
	values: Record<string, unknown>
) {
	if (table !== 'team' || !row?.userId || !('role' in values)) return;
	await tx
		.update(member)
		.set({ role: values.role as 'admin' | 'manager' | 'team' })
		.where(
			and(
				eq(member.organizationId, actor.organizationId ?? ''),
				eq(member.userId, row.userId as string)
			)
		);
}

async function applyChange(
	tx: TransactionType,
	actor: ActorType,
	batch: BatchStateType,
	change: RowChangeType
) {
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
		project: await findProject(tx, batch, table, { ...row, ...values, id }),
		...(await readAdmins(tx, actor, table, row))
	});
	if (!verdict.isAllowed) throw new Refusal(verdict.reason);
	const projectId = table === 'project' ? id : (values.projectId ?? row?.projectId);
	if (typeof projectId === 'string') batch.touched.add(projectId);
	if (table === 'project' && 'status' in values) batch.statusSet.add(id);
	const server =
		table === 'project' && operation === 'put'
			? await toProjectValues(tx, actor, id, row, values)
			: {};

	const target = TABLES[table];
	const where = eq(columnOf(table, 'id'), id);
	let after: unknown;
	if (operation === 'delete') {
		[after] = await tx
			.update(target)
			.set({ deletedAt: sql`now()`, updatedAt: sql`now()` } as never)
			.where(where)
			.returning();
		if (table === 'project') await trashInside(tx, id);
	} else {
		if ('name' in values) await checkName(tx, table, id, values.name);
		[after] = row
			? await tx
					.update(target)
					.set({ ...values, ...server, updatedAt: sql`now()` } as never)
					.where(where)
					.returning()
			: await tx
					.insert(target)
					.values({ ...values, ...server, id, organizationId: actor.organizationId } as never)
					.returning();
		await moveMembership(tx, actor, table, row, values);
		const reads = toReads(table, row, after as StoredRowType);
		if (reads) batch.reads.push({ table, id, values: reads });
	}
	// A change inside a project is a change to the project.
	if (table !== 'project' && typeof projectId === 'string')
		await tx
			.update(project)
			.set({ updatedAt: sql`now()` })
			.where(eq(project.id, projectId));
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
	// Deletes go parents first: a deleted project takes its rows to the Trash, so theirs are already done.
	const deletes = batch.changes
		.filter((change) => change.operation === 'delete')
		.sort((a, b) => rank(a.table) - rank(b.table));
	const state = toBatchState();
	try {
		await claims.run(actor, async (tx) => {
			for (const change of [...puts, ...deletes]) await applyChange(tx, actor, state, change);
			await advanceDrafts(tx, actor, state);
		});
		return state.reads.length > 0 ? { isSaved: true, reads: state.reads } : { isSaved: true };
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
	return claims.run(actor, (tx) => readScope(tx, scope));
}

// The rows of every table of a scope, or with `projectId`, of every table inside that project whatever its scope.
async function readScope(
	tx: TransactionType,
	scope: 'organization' | 'project',
	projectId?: string
): Promise<SavedRowType[]> {
	const rows: SavedRowType[] = [];
	for (const table of TABLE_NAMES) {
		const spec = SPECS[table];
		if (projectId ? !INSIDE_PROJECT.includes(table) : spec.scope !== scope) continue;
		const found = await tx
			.select()
			.from(TABLES[table])
			.where(
				and(
					'isNamed' in spec ? undefined : isNull(columnOf(table, 'deletedAt')),
					projectId ? eq(columnOf(table, 'projectId'), projectId) : undefined
				)
			)
			.orderBy(asc(columnOf(table, 'createdAt')), asc(columnOf(table, 'id')));
		for (const row of found) rows.push(toSaved(table, row as StoredRowType));
	}
	return rows;
}

/** What opening a project loads: the project as it is now and every row inside it, or why there is none. */
export type ProjectRowsType =
	| { isFound: true; project: SavedRowType; rows: SavedRowType[] }
	| { isFound: false; isTrashed: boolean; reason: string };

/**
 * One project's rows (#186): the project row and every row inside it (its Team Assigned, personnel and panels, and
 * what #188 and #189 put in them), or why there are none: it went to the Trash, or it is not there.
 */
export async function readProject(
	claims: ClaimsType,
	actor: ActorType,
	id: string
): Promise<ProjectRowsType> {
	const gone = 'This project is no longer there.';
	if (!actor.organizationId) return { isFound: false, isTrashed: false, reason: gone };
	return claims.run(actor, async (tx) => {
		const [found] = await tx.select().from(project).where(eq(project.id, id));
		if (!found) return { isFound: false, isTrashed: false, reason: gone };
		if (found.deletedAt) {
			const title = found.title.trim() || 'Untitled project';
			return {
				isFound: false,
				isTrashed: true,
				reason: `"${title}" was moved to the Trash by someone else.`
			};
		}
		return {
			isFound: true,
			project: toSaved('project', found as StoredRowType),
			rows: await readScope(tx, 'project', id)
		};
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
		project: await findProject(tx, toBatchState(), table, { ...row, ...values, id })
	});
}

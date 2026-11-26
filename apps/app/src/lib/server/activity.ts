// The Activity's read (#306; the glossary's Activity): the organization's running list of what happens in the app,
// newest first, and when each person last signed in. It is read whole each time the Activity opens; nothing here
// waits for or pushes what happens next. A live source (the live updates research, #282) plugs in behind this one
// function, so the screen and its query keep their shape.
//
// Everything comes from what the database already keeps, read through the claims helper as the Admin who asked:
// - a sign-in is the record Better Auth's session hook leaves at every sign-in, by any way (`sign_in`): who, when and
//   the device its browser named, never the session itself. Log Out keeps it. A User with no sign-in recorded (all
//   theirs came before the record began) has their account's making, their first sign-in, stand in for their last;
// - a project added and every other change is the change record (the History): who, when, which row and what it was
//   before and after, of which only the names and the columns that changed are read, never the rows themselves. The
//   rows a new project starts with (its panels, their photo groups, its first stop), added in the same save, are
//   counted on the project's own line ("7 panels") rather than given a line each.
import { and, desc, isNotNull, ne, type SQL, sql } from 'drizzle-orm';
import type {
	ActivityEventType,
	ActivityResultType,
	ChangeEventType,
	LastSignInType,
	SignInEventType
} from '#lib/activity/activity.types.js';
import { toDevice } from '#lib/presence/presence.utils.js';
import { TABLE_NAMES, type TableNameType } from '#lib/rows/rows.schema.js';
import type { ActorType, ClaimsType, TransactionType } from './db/claims';
import { change, project, signIn, team, user } from './db/schema';
import { checkActivity } from './permission';

// What each table's row is called in a sentence, as the app's screens say it: one ("added the customer Harbor
// Lines"), and a few of a kind, on a new project's line ("7 panels").
const ROW_NAMES: Record<TableNameType, { one: string; many: string }> = {
	customer: { one: 'customer', many: 'customers' },
	contact: { one: 'contact', many: 'contacts' },
	team: { one: 'Team', many: 'Team' },
	transport: { one: 'Transport Mode', many: 'Transport Modes' },
	facility: { one: 'Facility', many: 'Facilities' },
	place: { one: 'place', many: 'places' },
	organization: { one: 'Organization', many: 'Organizations' },
	organization_details: { one: 'Organization', many: 'Organizations' },
	disclaimer_point: { one: 'disclaimer point', many: 'disclaimer points' },
	help_text: { one: 'Help text', many: 'Help texts' },
	project: { one: 'project', many: 'projects' },
	project_team: { one: 'Team Assigned', many: 'Team Assigned' },
	personnel_company: { one: 'Personnel company', many: 'Personnel companies' },
	personnel_person: { one: 'Personnel', many: 'Personnel' },
	panel: { one: 'panel', many: 'panels' },
	photo_group: { one: 'photo group', many: 'photo groups' },
	photo: { one: 'photo', many: 'photos' },
	stop: { one: 'stop', many: 'stops' },
	item: { one: 'item', many: 'items' },
	item_attachment: { one: 'attachment', many: 'attachments' },
	time_log_day: { one: 'Time Log day', many: 'Time Log days' },
	time_log_entry: { one: 'Time Log entry', many: 'Time Log entries' },
	// Never shown: pins stay out of the Activity (#346).
	pinned: { one: 'pin', many: 'pins' }
};

/** How many sign-ins and changes a page of the Activity reads: the newest, then the next ones on Show Older. */
export const ACTIVITY_LIMIT = 200;

// A photo spot holds a PDF or a video too (#327).
const PHOTO_KINDS: Record<string, string> = { pdf: 'PDF', video: 'video' };

// The columns the server sets on every change, which say nothing about what someone changed.
const SERVER_COLUMNS = new Set([
	'id',
	'organizationId',
	'createdAt',
	'updatedAt',
	'deletedAt',
	'createdBy',
	'statusBeforeSent',
	'userId',
	'lastSeen',
	'onlineSince',
	'device',
	'deviceName'
]);

// A column's label where the screens call it something its name does not say; any other is its name in words
// ("projectType" is "Project Type").
const COLUMN_LABELS: Record<string, string> = {
	customerId: 'Customer',
	contactId: 'Contact',
	teamLeadId: 'Team Lead',
	teamId: 'Team',
	transportId: 'Transport',
	facilityId: 'Facility',
	day: 'Date',
	job: 'Job Number',
	customerReference: 'Customer Reference Number',
	isEnabled: 'On or Off',
	position: 'Order',
	grid: 'Item List',
	link: 'URL',
	pageCount: 'Pages'
};

function toLabel(column: string) {
	return (
		COLUMN_LABELS[column] ??
		column
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/^./, (first) => first.toUpperCase())
			.replace(/ ([a-z])/g, (_, next: string) => ` ${next.toUpperCase()}`)
	);
}

// The row a change describes, as it is after it, or as it was before a delete.
const ROW = sql`coalesce(${change.after}, ${change.before})`;

// The SQL that reads one of the row's values as text, or null when it is empty: its `name`, its `title`.
function toRowText(key: string) {
	return sql<string | null>`nullif(${ROW} ->> ${key}, '')`;
}

// A time to the millisecond, as a JavaScript date holds it: Show Older's `before` is one, so a page ends between two
// milliseconds and never between two rows of the same one.
function toMillisecond(at: SQL) {
	return sql`date_trunc('milliseconds', ${at})`;
}

const CHANGE_AT = toMillisecond(sql`${change.at}`);
const SIGN_IN_AT = toMillisecond(sql`${signIn.createdAt}`);

// The newest changes that match `where`, each with the names its row goes by and the columns it changed, never the
// row itself.
function readChanges(tx: TransactionType, where: SQL, limit?: number) {
	const query = tx
		.select({
			id: change.id,
			at: change.at,
			userId: change.userId,
			table: change.tableName,
			rowId: change.rowId,
			operation: change.operation,
			isNew: sql<boolean>`${change.before} is null`,
			title: toRowText('title'),
			name: toRowText('name'),
			company: toRowText('company'),
			label: toRowText('label'),
			kind: toRowText('kind'),
			projectId: toRowText('projectId'),
			columns: sql<
				string[]
			>`case when ${change.before} is null or ${change.after} is null then array[]::text[]
				else array(select each.key from jsonb_each(${change.after}) as each
					where each.value is distinct from ${change.before} -> each.key order by each.key) end`
		})
		.from(change)
		// A pin (#346) is one person's own way into their menu, not a change to the organization's work.
		.where(and(where, ne(change.tableName, 'pinned')))
		.orderBy(desc(change.at), desc(change.id));
	return limit === undefined ? query : query.limit(limit);
}

type ChangeRowType = Awaited<ReturnType<typeof readChanges>>[number];

// The newest sign-ins that match `where`: who, when and on what.
function readSignIns(tx: TransactionType, where: SQL, limit?: number) {
	const query = tx
		.select({
			id: signIn.id,
			userId: signIn.userId,
			at: signIn.createdAt,
			userAgent: signIn.userAgent
		})
		.from(signIn)
		.where(where)
		.orderBy(desc(signIn.createdAt), desc(signIn.id));
	return limit === undefined ? query : query.limit(limit);
}

type PageType<T> = {
	rows: T[];
	/** The millisecond the oldest row falls in, when older rows are left; every row of it is in `rows`. */
	cut?: number;
};

// One source's newest rows older than `before`: at most `limit`, then the rest of the millisecond the oldest of them
// falls in, so what one save did is never split between two pages.
async function readPage<T extends { at: Date }>(
	read: (where: SQL, limit?: number) => Promise<T[]>,
	at: SQL,
	before: string | undefined,
	limit: number
): Promise<PageType<T>> {
	const rows = await read(before ? sql`${at} < ${before}::timestamptz` : sql`true`, limit + 1);
	if (rows.length <= limit) return { rows };
	const oldest = rows[limit - 1].at;
	const rest = await read(sql`${at} = ${oldest.toISOString()}::timestamptz`);
	const cut = oldest.getTime();
	return {
		rows: [...rows.slice(0, limit).filter((row) => row.at.getTime() !== cut), ...rest],
		cut
	};
}

function toDeviceOf(userAgent: string | null) {
	const device = toDevice(userAgent ?? '');
	return { device: device.name || undefined, deviceKind: device.kind || undefined };
}

function toProjectTitle(title: string | null | undefined) {
	return title?.trim() || 'Untitled project';
}

// One save of one User into one project: its changes share the save's time.
function toSaveKey(row: ChangeRowType, projectId: string | null) {
	return `${row.userId} ${row.at.getTime()} ${projectId}`;
}

// The rows a new project starts with, added in the same save as it, fold into the project's own line: `lines` are the
// changes that keep a line of their own, and `startedWith` says, for a new project's change, how many of each kind it
// started with, in the registry's order ("7 panels").
function foldProjectStarts(changes: ChangeRowType[]) {
	const counts = new Map<string, Map<TableNameType, number>>();
	for (const row of changes)
		if (row.table === 'project' && row.isNew && row.operation === 'put')
			counts.set(toSaveKey(row, row.rowId), new Map());
	const lines = changes.filter((row) => {
		if (row.table === 'project' || !row.isNew || row.operation !== 'put') return true;
		const started = counts.get(toSaveKey(row, row.projectId));
		if (!started) return true;
		const table = row.table as TableNameType;
		started.set(table, (started.get(table) ?? 0) + 1);
		return false;
	});
	function startedWith(row: ChangeRowType) {
		const started = counts.get(toSaveKey(row, row.rowId));
		if (!started?.size) return undefined;
		return TABLE_NAMES.filter((table) => started.has(table)).map((table) => {
			const count = started.get(table) ?? 0;
			return `${count} ${count === 1 ? ROW_NAMES[table].one : ROW_NAMES[table].many}`;
		});
	}
	return { lines, startedWith };
}

function toChangeEvent(
	row: ChangeRowType,
	who: string,
	projects: Map<string, string>,
	parts?: string[]
): ChangeEventType {
	const table = row.table as TableNameType;
	const kind = row.operation === 'delete' ? 'trash' : row.isNew ? 'add' : 'change';
	const thing =
		(table === 'photo' ? PHOTO_KINDS[row.kind ?? ''] : undefined) ??
		ROW_NAMES[table]?.one ??
		row.table.replaceAll('_', ' ');
	// A project goes by its title now, so a project added untitled and named a moment later reads by its name.
	const name =
		table === 'project'
			? toProjectTitle(projects.get(row.rowId) ?? row.title)
			: (row.name ?? row.title ?? row.company ?? row.label ?? undefined);
	const inside = table !== 'project' && row.projectId ? projects.get(row.projectId) : undefined;
	const columns =
		kind === 'change'
			? row.columns.filter((column) => !SERVER_COLUMNS.has(column)).map(toLabel)
			: [];
	return {
		id: row.id,
		at: row.at.toISOString(),
		kind,
		who,
		userId: row.userId,
		thing,
		table,
		...(name ? { name } : {}),
		...(inside !== undefined ? { project: toProjectTitle(inside) } : {}),
		...(parts ? { parts } : {}),
		columns
	};
}

// Where a line stands among those of the same moment: a sign-in first, then parents before their rows (a project
// before its panels), in the registry's order.
function toRank(event: ActivityEventType) {
	return event.kind === 'signIn' ? -1 : TABLE_NAMES.indexOf(event.table);
}

// Newest first; what one save did at once lists parents first.
function byNewest(a: ActivityEventType, b: ActivityEventType) {
	return Date.parse(b.at) - Date.parse(a.at) || toRank(a) - toRank(b) || b.id.localeCompare(a.id);
}

/** Which page of the Activity to read: the newest, or the one `before` the oldest shown (Show Older). */
export type ActivityPageType = {
	/** How many sign-ins and changes, about: a millisecond's rows are never split, so a page may hold a few more. */
	limit?: number;
	/** An ISO time: only what happened before it. */
	before?: string;
};

/**
 * The Activity as `actor` may see it: their organization's newest sign-ins and changes (or the next ones `before` the
 * oldest shown), newest first, and when each of its people last signed in, latest first. Only an Admin may (the one
 * permission check).
 */
export async function readActivity(
	claims: ClaimsType,
	actor: ActorType,
	{ limit = ACTIVITY_LIMIT, before }: ActivityPageType = {}
): Promise<ActivityResultType> {
	const verdict = checkActivity(actor);
	if (!verdict.isAllowed) return verdict;
	return claims.run(actor, async (tx) => {
		const changePage = await readPage(
			(where, most) => readChanges(tx, where, most),
			CHANGE_AT,
			before,
			limit
		);
		const signInPage = await readPage(
			(where, most) => readSignIns(tx, where, most),
			SIGN_IN_AT,
			before,
			limit
		);
		const changes = changePage.rows;
		const signIns = signInPage.rows;
		const latest = await tx
			.selectDistinctOn([signIn.userId], {
				userId: signIn.userId,
				at: signIn.createdAt,
				userAgent: signIn.userAgent
			})
			.from(signIn)
			.orderBy(signIn.userId, desc(signIn.createdAt), desc(signIn.id));
		const users = await tx
			.select({ id: user.id, name: user.name, createdAt: user.createdAt })
			.from(user);
		// A User's Team record names them, the one outside the Trash first.
		const records = await tx
			.select({ userId: team.userId, name: team.name, deletedAt: team.deletedAt })
			.from(team)
			.where(isNotNull(team.userId))
			.orderBy(sql`${team.deletedAt} is not null`);
		const projects = new Map(
			(await tx.select({ id: project.id, title: project.title }).from(project)).map((each) => [
				each.id,
				each.title
			])
		);

		const folded = foldProjectStarts(changes);
		const names = new Map<string, string>();
		for (const record of records)
			if (record.userId && !names.has(record.userId)) names.set(record.userId, record.name);
		for (const each of users) if (!names.has(each.id)) names.set(each.id, each.name);
		function whoOf(userId: string | null) {
			return (userId ? names.get(userId) : undefined) ?? 'Someone';
		}

		const events: ActivityEventType[] = [
			...signIns.map((row): SignInEventType => ({
				id: row.id,
				at: row.at.toISOString(),
				kind: 'signIn',
				who: whoOf(row.userId),
				userId: row.userId,
				...toDeviceOf(row.userAgent)
			})),
			...folded.lines.map((row) =>
				toChangeEvent(row, whoOf(row.userId), projects, folded.startedWith(row))
			)
		];

		const lastOf = new Map(latest.map((row) => [row.userId, row]));
		const people = users.map((each): LastSignInType => {
			const last = lastOf.get(each.id);
			return {
				userId: each.id,
				who: whoOf(each.id),
				at: (last?.at ?? each.createdAt).toISOString(),
				isFirst: !last,
				...toDeviceOf(last?.userAgent ?? null)
			};
		});

		// Where this page ends: both sources hold every row from there on, and it keeps about `limit` lines. What is
		// older waits for the next page, which reads before it.
		events.sort(byNewest);
		const ends = [changePage.cut, signInPage.cut];
		if (events.length > limit) ends.push(Date.parse(events[limit - 1].at));
		const end = Math.max(...ends.filter((each) => each !== undefined));

		return {
			isAllowed: true,
			events: Number.isFinite(end) ? events.filter((event) => Date.parse(event.at) >= end) : events,
			people: people.sort(
				(a, b) => Date.parse(b.at) - Date.parse(a.at) || a.who.localeCompare(b.who)
			),
			...(Number.isFinite(end) ? { olderBefore: new Date(end).toISOString() } : {})
		};
	});
}

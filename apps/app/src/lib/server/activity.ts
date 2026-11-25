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
import { desc, isNotNull, sql } from 'drizzle-orm';
import type {
	ActivityEventType,
	ActivityResultType,
	LastSignInType
} from '#lib/activity/activity.types.js';
import { toDevice } from '#lib/presence/presence.utils.js';
import { TABLE_NAMES, type TableNameType } from '#lib/rows/rows.schema.js';
import type { ActorType, ClaimsType, TransactionType } from './db/claims';
import { change, project, signIn, team, user } from './db/schema';
import { checkActivity } from './permission';

// What each table's row is called in a sentence ("added the customer Harbor Lines"), as the app's screens say it.
const THINGS: Record<TableNameType, string> = {
	customer: 'customer',
	contact: 'contact',
	team: 'Team',
	transport: 'Transport Mode',
	facility: 'Facility',
	place: 'place',
	organization: 'Organization',
	organization_details: 'Organization',
	disclaimer_point: 'disclaimer point',
	help_text: 'Help text',
	project: 'project',
	project_team: 'Team Assigned',
	personnel_company: 'Personnel company',
	personnel_person: 'Personnel',
	panel: 'panel',
	photo_group: 'photo group',
	photo: 'photo',
	stop: 'stop',
	item: 'item',
	item_attachment: 'attachment',
	time_log_day: 'Time Log day',
	time_log_entry: 'Time Log entry'
};

/** How many of the newest sign-ins and changes the Activity reads. */
export const ACTIVITY_LIMIT = 200;

// A few of a kind, on a new project's line: "7 panels".
const PLURALS: Partial<Record<TableNameType, string>> = {
	project_team: 'Team Assigned',
	personnel_company: 'Personnel companies',
	personnel_person: 'Personnel',
	panel: 'panels',
	photo_group: 'photo groups',
	photo: 'photos',
	stop: 'stops',
	item: 'items',
	item_attachment: 'attachments',
	time_log_day: 'Time Log days',
	time_log_entry: 'Time Log entries'
};

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

function field(key: string) {
	return sql<string | null>`nullif(${ROW} ->> ${key}, '')`;
}

// The newest changes, each with the names its row goes by and the columns it changed, never the row itself.
function readChanges(tx: TransactionType, limit: number) {
	return tx
		.select({
			id: change.id,
			at: change.at,
			userId: change.userId,
			table: change.tableName,
			rowId: change.rowId,
			operation: change.operation,
			isNew: sql<boolean>`${change.before} is null`,
			title: field('title'),
			name: field('name'),
			company: field('company'),
			label: field('label'),
			kind: field('kind'),
			projectId: field('projectId'),
			columns: sql<
				string[]
			>`case when ${change.before} is null or ${change.after} is null then array[]::text[]
				else array(select each.key from jsonb_each(${change.after}) as each
					where each.value is distinct from ${change.before} -> each.key order by each.key) end`
		})
		.from(change)
		.orderBy(desc(change.at), desc(change.id))
		.limit(limit);
}

type ChangeRowType = Awaited<ReturnType<typeof readChanges>>[number];

function toDeviceOf(userAgent: string | null) {
	const device = toDevice(userAgent ?? '');
	return { device: device.name || undefined, deviceKind: device.kind || undefined };
}

function toProjectTitle(title: string | null | undefined) {
	return title?.trim() || 'Untitled project';
}

// The rows of a new project added in the same save as it, by the project's change: how many of each kind, in the
// registry's order. Those rows get no line of their own.
function toStarts(changes: ChangeRowType[]) {
	const saveOf = (row: ChangeRowType, projectId: string | null) =>
		`${row.userId} ${row.at.getTime()} ${projectId}`;
	const counts = new Map<string, Map<TableNameType, number>>();
	for (const row of changes)
		if (row.table === 'project' && row.isNew && row.operation === 'put')
			counts.set(saveOf(row, row.rowId), new Map());
	const kept = changes.filter((row) => {
		if (row.table === 'project' || !row.isNew || row.operation !== 'put') return true;
		const started = counts.get(saveOf(row, row.projectId));
		if (!started) return true;
		const table = row.table as TableNameType;
		started.set(table, (started.get(table) ?? 0) + 1);
		return false;
	});
	function partsOf(row: ChangeRowType) {
		const started = counts.get(saveOf(row, row.rowId));
		if (!started?.size) return undefined;
		return TABLE_NAMES.filter((table) => started.has(table)).map((table) => {
			const count = started.get(table) ?? 0;
			return `${count} ${count === 1 ? THINGS[table] : (PLURALS[table] ?? THINGS[table])}`;
		});
	}
	return { kept, partsOf };
}

function toChangeEvent(
	row: ChangeRowType,
	who: string,
	projects: Map<string, string>,
	parts?: string[]
): ActivityEventType {
	const table = row.table as TableNameType;
	const kind = row.operation === 'delete' ? 'trash' : row.isNew ? 'add' : 'change';
	const thing =
		(table === 'photo' ? PHOTO_KINDS[row.kind ?? ''] : undefined) ??
		THINGS[table] ??
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

// Newest first; what one save did at once lists parents first (a project before its panels).
function byNewest(a: ActivityEventType, b: ActivityEventType) {
	const rankOf = (event: ActivityEventType) =>
		event.table ? TABLE_NAMES.indexOf(event.table) : -1;
	return Date.parse(b.at) - Date.parse(a.at) || rankOf(a) - rankOf(b) || b.id.localeCompare(a.id);
}

/**
 * The Activity as `actor` may see it: their organization's newest sign-ins and changes, newest first, and when each
 * of its people last signed in, latest first. Only an Admin may (the one permission check).
 */
export async function readActivity(
	claims: ClaimsType,
	actor: ActorType,
	{ limit = ACTIVITY_LIMIT }: { limit?: number } = {}
): Promise<ActivityResultType> {
	const verdict = checkActivity(actor);
	if (!verdict.isAllowed) return verdict;
	return claims.run(actor, async (tx) => {
		const changes = await readChanges(tx, limit);
		const signIns = await tx
			.select({
				id: signIn.id,
				userId: signIn.userId,
				at: signIn.createdAt,
				userAgent: signIn.userAgent
			})
			.from(signIn)
			.orderBy(desc(signIn.createdAt), desc(signIn.id))
			.limit(limit);
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

		const starts = toStarts(changes);
		const names = new Map<string, string>();
		for (const record of records)
			if (record.userId && !names.has(record.userId)) names.set(record.userId, record.name);
		for (const each of users) if (!names.has(each.id)) names.set(each.id, each.name);
		const whoOf = (userId: string | null) => (userId ? names.get(userId) : undefined) ?? 'Someone';

		const events: ActivityEventType[] = [
			...signIns.map((row): ActivityEventType => ({
				id: row.id,
				at: row.at.toISOString(),
				kind: 'signIn',
				who: whoOf(row.userId),
				userId: row.userId,
				...toDeviceOf(row.userAgent)
			})),
			...starts.kept.map((row) =>
				toChangeEvent(row, whoOf(row.userId), projects, starts.partsOf(row))
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

		return {
			isAllowed: true,
			events: events.sort(byNewest).slice(0, limit),
			people: people.sort(
				(a, b) => Date.parse(b.at) - Date.parse(a.at) || a.who.localeCompare(b.who)
			),
			// Older sign-ins or changes are left out.
			isCut: changes.length >= limit || signIns.length >= limit || events.length > limit
		};
	});
}

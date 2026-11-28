// The Activity's read (#306; the glossary's Activity): the organization's running list of what happens in the app,
// newest first, and when each person last signed in. It is read whole each time the Activity opens; nothing here
// waits for or pushes what happens next. A live source (the live updates research, #282) plugs in behind this one
// function, so the screen and its query keep their shape.
//
// Everything comes from what the database already keeps, read through the claims helper as the Admin who asked:
// - a sign-in is the record the database leaves at every sign-in, by any way (`sign_in`): who, when and
//   the device its browser named, never the session itself, for the organization's people and every Guest, waiting
//   for access, whom an Admin lets in. Log Out keeps it. A User with no sign-in recorded (all
//   theirs came before the record began) has their account's making, their first sign-in, stand in for their last;
// - a project added and every other change is the change record (the History): who, when, which row and what it was
//   before and after, of which only the names and the columns that changed are read, never the rows themselves. The
//   rows a new project starts with (its panels, their photo groups, its first stop), added in the same save, are
//   counted on the project's own line ("7 panels") rather than given a line each.
import {
	and,
	desc,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	notInArray,
	or,
	type SQL,
	sql
} from 'drizzle-orm';
import type {
	ActivityAboutType,
	ActivityEventType,
	ActivityResultType,
	ChangeEventType,
	LastSignInType,
	NotificationsResultType,
	ProjectActivityType,
	SignInEventType
} from '#lib/activity/activity.types.js';
import { toDevice } from '#lib/presence/presence.utils.js';
import { TABLE_NAMES, type TableNameType } from '#lib/rows/rows.schema.js';
import type { ActorType, ClaimsType, TransactionType } from './db/claims';
import { toNameOfEmail } from './access';
import { CODE_MINUTES } from './auth';
import {
	activityEvent,
	change,
	member,
	project,
	projectTeam,
	signIn,
	team,
	user
} from './db/schema';
import { checkActivity, checkNotifications } from './permission';

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
	translation: { one: 'English translation', many: 'English translations' },
	panel: { one: 'panel', many: 'panels' },
	photo_group: { one: 'photo group', many: 'photo groups' },
	photo: { one: 'photo', many: 'photos' },
	stop: { one: 'stop', many: 'stops' },
	item: { one: 'item', many: 'items' },
	item_attachment: { one: 'attachment', many: 'attachments' },
	time_log_day: { one: 'Time Log day', many: 'Time Log days' },
	time_log_entry: { one: 'Time Log entry', many: 'Time Log entries' },
	// Never shown: pins stay out of the Activity (#346), and so does what each person has seen (#403).
	pinned: { one: 'pin', many: 'pins' },
	seen: { one: 'seen mark', many: 'seen marks' }
};

// Each person's own ways into the app, not changes to the organization's work: pins (#346) and what they have seen in
// the bell and the Activity Log (#403).
const OWN_TABLES = ['pinned', 'seen'];

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
const EVENT_AT = toMillisecond(sql`${activityEvent.createdAt}`);

/** How long someone may come back to a project and it still counts as the one opening: 30 minutes. */
export const OPEN_GAP_MINUTES = 30;

// A sign-in code still running may yet sign someone in, and one that did shows as their sign-in: of the codes, only
// those that ran out unused are read.
const CODE_TIME = sql.raw(`interval '${CODE_MINUTES} minutes'`);
const UNLESS_USED_CODE = sql`(${activityEvent.kind} <> 'code' or (${activityEvent.createdAt} < now() - ${CODE_TIME}
	and not exists (select 1 from public.sign_in s join public."user" u on u.id = s.user_id
		where lower(u.email) = ${activityEvent.email} and s.created_at >= ${activityEvent.createdAt}
		and s.created_at <= ${activityEvent.createdAt} + ${CODE_TIME})))`;

// The newest sign-outs, unused sign-in codes, projects opened and PDFs downloaded that match `where`.
function readEvents(tx: TransactionType, where: SQL, limit?: number) {
	const query = tx
		.select({
			id: activityEvent.id,
			kind: activityEvent.kind,
			userId: activityEvent.userId,
			email: activityEvent.email,
			projectId: activityEvent.projectId,
			userAgent: activityEvent.userAgent,
			at: activityEvent.createdAt
		})
		.from(activityEvent)
		.where(and(where, UNLESS_USED_CODE))
		.orderBy(desc(activityEvent.createdAt), desc(activityEvent.id));
	return limit === undefined ? query : query.limit(limit);
}

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
			teamId: toRowText('teamId'),
			columns: sql<
				string[]
			>`case when ${change.before} is null or ${change.after} is null then array[]::text[]
				else array(select each.key from jsonb_each(${change.after}) as each
					where each.value is distinct from ${change.before} -> each.key order by each.key) end`
		})
		.from(change)
		.where(and(where, notInArray(change.tableName, OWN_TABLES)))
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
	const projectId = table === 'project' ? row.rowId : (row.projectId ?? undefined);
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
		rowId: row.rowId,
		...(projectId ? { projectId } : {}),
		...(name ? { name } : {}),
		...(inside !== undefined ? { project: toProjectTitle(inside) } : {}),
		...(parts ? { parts } : {}),
		columns
	};
}

// Where a line stands among those of the same moment: a sign-in, sign-out, code, opening or download first, then
// parents before their rows (a project before its panels), in the registry's order.
function toRank(event: ActivityEventType) {
	return 'table' in event ? TABLE_NAMES.indexOf(event.table) : -1;
}

// Newest first; what one save did at once lists parents first.
function byNewest(a: ActivityEventType, b: ActivityEventType) {
	return Date.parse(b.at) - Date.parse(a.at) || toRank(a) - toRank(b) || b.id.localeCompare(a.id);
}

// What each User goes by: their Team record's name, the one outside the Trash first; else their own name; else, for
// a User who gave none (a Guest who signed in with an email code), their email's: "Sam Lee".
async function readNames(
	tx: TransactionType,
	users: { id: string; name: string | null; email: string }[]
) {
	const records = await tx
		.select({ userId: team.userId, name: team.name, deletedAt: team.deletedAt })
		.from(team)
		.where(isNotNull(team.userId))
		.orderBy(sql`${team.deletedAt} is not null`);
	const names = new Map<string, string>();
	for (const record of records)
		if (record.userId && !names.has(record.userId)) names.set(record.userId, record.name);
	for (const each of users)
		if (!names.has(each.id)) names.set(each.id, each.name || toNameOfEmail(each.email));
	return names;
}

// Every project's title, by its id.
async function readTitles(tx: TransactionType) {
	const rows = await tx.select({ id: project.id, title: project.title }).from(project);
	return new Map(rows.map((each) => [each.id, each.title]));
}

/** Which page of the Activity to read: the newest, or the one `before` the oldest shown (Show Older). */
export type ActivityPageType = {
	/** How many sign-ins and changes, about: a millisecond's rows are never split, so a page may hold a few more. */
	limit?: number;
	/** An ISO time: only what happened before it. */
	before?: string;
	/** One project's or record's own Activity, from its ⋮ menu's View Activity, rather than the organization's. */
	about?: ActivityAboutType;
};

// The id of the project a change's row is, or is inside, as text.
const PROJECT_OF_ROW = sql`case when ${change.tableName} = 'project' then ${change.rowId}::text
	else ${ROW} ->> 'projectId' end`;

// The SQL list of `ids`, for `in (...)`.
function toList(ids: string[]) {
	return sql.join(
		ids.map((id) => sql`${id}`),
		sql`, `
	);
}

// What one read of the Activity covers: which changes, which sign-ins and which of the rest (sign-outs, codes,
// openings, downloads), none when left out, and whether it is the whole organization's, which lists its people.
type ScopeType = { changes: SQL; signIns?: SQL; events?: SQL; isWhole?: boolean };

// The projects `actor` is on, as the bell reads them (#403): on its Team Assigned, its Team Lead, or who started it,
// and their own Team records.
async function readMine(tx: TransactionType, actor: ActorType) {
	const mine = (
		await tx
			.select({ id: team.id })
			.from(team)
			.where(and(eq(team.userId, actor.userId), isNull(team.deletedAt)))
	).map((row) => row.id);
	const assigned = mine.length
		? await tx
				.select({ id: projectTeam.projectId })
				.from(projectTeam)
				.where(and(inArray(projectTeam.teamId, mine), isNull(projectTeam.deletedAt)))
		: [];
	const own = await tx
		.select({ id: project.id })
		.from(project)
		.where(
			or(
				eq(project.createdBy, actor.userId),
				mine.length ? inArray(project.teamLeadId, mine) : undefined
			)
		);
	return { mine, projectIds: [...new Set([...assigned, ...own].map((row) => row.id))] };
}

// The changes about what `mine` and `projectIds` name: every change in those projects, and what was done to those
// Team records: changed, put on or taken off a project's Team Assigned.
function aboutMine(mine: string[], projectIds: string[]) {
	return or(
		projectIds.length ? sql`${PROJECT_OF_ROW} in (${toList(projectIds)})` : undefined,
		mine.length ? and(eq(change.tableName, 'team'), inArray(change.rowId, mine)) : undefined,
		mine.length
			? and(eq(change.tableName, 'project_team'), sql`${ROW} ->> 'teamId' in (${toList(mine)})`)
			: undefined
	);
}

// The changes one project or record's Activity holds: a project's, everything inside it; a customer's, its contacts
// too; a Team member's, their places on projects too; a Transport Mode's or a Facility's, its own.
function aboutOne({ table, rowId }: ActivityAboutType): SQL {
	const own = and(eq(change.tableName, table), eq(change.rowId, rowId)) as SQL;
	if (table === 'project') return sql`${PROJECT_OF_ROW} = ${rowId}`;
	if (table === 'customer')
		return or(
			own,
			and(eq(change.tableName, 'contact'), sql`${ROW} ->> 'customerId' = ${rowId}`)
		) as SQL;
	if (table === 'team')
		return or(
			own,
			and(eq(change.tableName, 'project_team'), sql`${ROW} ->> 'teamId' = ${rowId}`)
		) as SQL;
	return own;
}

// The openings and PDF downloads of the Activity: what the database lets `actor` read of them (an Admin's, everyone's;
// anyone else's, their own).
const OPENED = inArray(activityEvent.kind, ['open', 'download']);

// What `actor` reads of the Activity (#403, Justin, 2026-11-28): an Admin the whole organization's; anyone else what
// they are privy to, as their bell has it but in full: every change in the projects they are on, theirs too, what was
// done to them, whatever else they did, and their own openings and downloads. A project's or a record's own Activity
// holds what is about it, and a project's its openings and downloads, for anyone who can see it.
async function readScope(
	tx: TransactionType,
	actor: ActorType,
	isWhole: boolean,
	about?: ActivityAboutType
): Promise<ScopeType> {
	if (about)
		return {
			changes: aboutOne(about),
			...(about.table === 'project'
				? { events: and(OPENED, eq(activityEvent.projectId, about.rowId)) }
				: {})
		};
	if (isWhole) return { changes: sql`true`, signIns: sql`true`, events: sql`true`, isWhole };
	const { mine, projectIds } = await readMine(tx, actor);
	return {
		changes: or(eq(change.userId, actor.userId), aboutMine(mine, projectIds)) as SQL,
		events: and(OPENED, eq(activityEvent.userId, actor.userId))
	};
}

/**
 * The Activity as `actor` may see it (the one permission check): newest first, the newest sign-ins and changes (or the
 * next ones `before` the oldest shown), and, for an Admin's whole organization, when each of its people last signed
 * in, latest first. Anyone else on the staff reads what they are privy to (`readScope`); `about` narrows it to one
 * project's or record's own.
 */
export async function readActivity(
	claims: ClaimsType,
	actor: ActorType,
	{ limit = ACTIVITY_LIMIT, before, about }: ActivityPageType = {}
): Promise<ActivityResultType> {
	const verdict = checkActivity(actor);
	if (!verdict.isAllowed) return verdict;
	return claims.run(actor, async (tx) => {
		const scope = await readScope(tx, actor, verdict.isWhole, about);
		const none: PageType<never> = { rows: [] };
		const changePage = await readPage(
			(where, most) => readChanges(tx, and(where, scope.changes) as SQL, most),
			CHANGE_AT,
			before,
			limit
		);
		const { signIns: signInsOf, events: eventsOf } = scope;
		const signInPage = signInsOf
			? await readPage(
					(where, most) => readSignIns(tx, and(where, signInsOf) as SQL, most),
					SIGN_IN_AT,
					before,
					limit
				)
			: none;
		const eventPage = eventsOf
			? await readPage(
					(where, most) => readEvents(tx, and(where, eventsOf) as SQL, most),
					EVENT_AT,
					before,
					limit
				)
			: none;
		const changes = changePage.rows;
		const signIns = signInPage.rows;
		const latest = scope.isWhole
			? await tx
					.selectDistinctOn([signIn.userId], {
						userId: signIn.userId,
						at: signIn.createdAt,
						userAgent: signIn.userAgent
					})
					.from(signIn)
					.orderBy(signIn.userId, desc(signIn.createdAt), desc(signIn.id))
			: [];
		const users = await tx
			.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
			.from(user);
		// The Users it reads are the organization's own and every Guest, waiting for access: those with no membership.
		const members = new Set(
			(await tx.select({ userId: member.userId }).from(member)).map((row) => row.userId)
		);
		function guestOf(userId: string) {
			return members.has(userId) ? {} : { isGuest: true };
		}
		const projects = await readTitles(tx);
		const folded = foldProjectStarts(changes);
		const names = await readNames(tx, users);
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
				...guestOf(row.userId),
				...toDeviceOf(row.userAgent)
			})),
			...eventPage.rows.map((row): ActivityEventType => {
				const line = { id: row.id, at: row.at.toISOString(), userId: row.userId };
				const guest = row.userId ? guestOf(row.userId) : {};
				if (row.kind === 'signOut')
					return {
						...line,
						kind: 'signOut',
						who: whoOf(row.userId),
						...guest,
						...toDeviceOf(row.userAgent)
					};
				if (row.kind === 'code') {
					const email = row.email ?? '';
					// Someone who has signed in goes by their name; an address nobody has, by itself.
					const who = (row.userId ? names.get(row.userId) : undefined) ?? email;
					return { ...line, kind: 'code', who, email, ...guest };
				}
				const projectId = row.projectId ?? '';
				const title = projects.get(projectId);
				return {
					...line,
					kind: row.kind === 'download' ? 'download' : 'open',
					who: whoOf(row.userId),
					projectId,
					...(projects.has(projectId) ? { project: toProjectTitle(title) } : {})
				};
			}),
			...folded.lines.map((row) =>
				toChangeEvent(row, whoOf(row.userId), projects, folded.startedWith(row))
			)
		];

		const lastOf = new Map(latest.map((row) => [row.userId, row]));
		const people = (scope.isWhole ? users : []).map((each): LastSignInType => {
			const last = lastOf.get(each.id);
			return {
				userId: each.id,
				who: whoOf(each.id),
				at: (last?.at ?? each.createdAt).toISOString(),
				isFirst: !last,
				// A Guest's email too, which an Admin lets them in with.
				...(members.has(each.id) ? {} : { isGuest: true, email: each.email }),
				...toDeviceOf(last?.userAgent ?? null)
			};
		});

		// Where this page ends: both sources hold every row from there on, and it keeps about `limit` lines. What is
		// older waits for the next page, which reads before it.
		events.sort(byNewest);
		const ends = [changePage.cut, signInPage.cut, eventPage.cut];
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

/** How many lines the bell's Notifications read: the newest. */
export const NOTIFICATIONS_LIMIT = 50;

/**
 * The bell's Notifications (#403, Justin, 2026-11-27: only what is about you): the newest changes someone else made in
 * the projects `actor` is on (on its Team Assigned, its Team Lead, or who started it), and what was done to them: put
 * on or taken off a project's Team Assigned, their own Team record changed. Never their own doing, and never a
 * sign-in, a project opened or a PDF downloaded. Anyone on the staff reads their own.
 */
export async function readNotifications(
	claims: ClaimsType,
	actor: ActorType,
	{ limit = NOTIFICATIONS_LIMIT }: { limit?: number } = {}
): Promise<NotificationsResultType> {
	const verdict = checkNotifications(actor);
	if (!verdict.isAllowed) return verdict;
	return claims.run(actor, async (tx) => {
		const { mine, projectIds } = await readMine(tx, actor);
		const about = aboutMine(mine, projectIds);
		if (!about) return { isAllowed: true, events: [] };
		const rows = await readChanges(
			tx,
			and(sql`${change.userId} is distinct from ${actor.userId}`, about) as SQL,
			limit
		);

		// A put on or a taking off of their own Team Assigned keeps a line of its own, even in the save that started
		// the project; every other row a new project started with folds into the project's line.
		function isAboutYou(row: ChangeRowType) {
			if (row.table === 'team') return mine.includes(row.rowId);
			return row.table === 'project_team' && mine.includes(row.teamId ?? '');
		}
		const folded = foldProjectStarts(rows.filter((row) => !isAboutYou(row)));
		const users = await tx.select({ id: user.id, name: user.name, email: user.email }).from(user);
		const names = await readNames(tx, users);
		const projects = await readTitles(tx);
		const lines = [...folded.lines, ...rows.filter(isAboutYou)];
		const events = lines
			.map((row) => ({
				...toChangeEvent(
					row,
					(row.userId ? names.get(row.userId) : undefined) ?? 'Someone',
					projects,
					folded.startedWith(row)
				),
				...(isAboutYou(row) ? { isAboutYou: true } : {})
			}))
			// A change that changed nothing anyone sees (only what the server keeps), or a Team Assigned only moved in
			// its order, says nothing.
			.filter(
				(event) =>
					event.kind !== 'change' || (event.columns.length > 0 && event.table !== 'project_team')
			);
		return { isAllowed: true, events: events.sort(byNewest) };
	});
}

/**
 * Records that `actor` opened a project or downloaded its PDF, for the Activity (#306). An opening is recorded once
 * while they keep coming back to it: not again within `OPEN_GAP_MINUTES` of their last. Every download is. A project
 * that is not there, or not in their organization, records nothing. True when it recorded something.
 */
export async function recordProjectActivity(
	claims: ClaimsType,
	actor: ActorType,
	{ kind, projectId }: ProjectActivityType
): Promise<boolean> {
	const { userId, organizationId } = actor;
	if (!userId || !organizationId) return false;
	return claims.run(actor, async (tx) => {
		const [found] = await tx
			.select({ id: project.id })
			.from(project)
			.where(eq(project.id, projectId));
		if (!found) return false;
		if (kind === 'open') {
			const [recent] = await tx
				.select({ id: activityEvent.id })
				.from(activityEvent)
				.where(
					and(
						eq(activityEvent.userId, userId),
						eq(activityEvent.kind, 'open'),
						eq(activityEvent.projectId, projectId),
						gt(
							activityEvent.createdAt,
							sql`now() - ${sql.raw(`interval '${OPEN_GAP_MINUTES} minutes'`)}`
						)
					)
				)
				.limit(1);
			if (recent) return false;
		}
		await tx.insert(activityEvent).values({ kind, userId, organizationId, projectId });
		return true;
	});
}

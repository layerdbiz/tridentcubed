// The one permission check (#182; ADR 0003 and its 2026-11-12 amendment): who may do what to which row. It is the
// only place these rules live. The save command (#183) asks it once for every row change in a batch, before it
// applies the change through the claims helper; Row Level Security is the net behind it.
//
// - A Guest may do nothing.
// - Manager and Team may change everything in their organization except: the organization and its details, a
//   member, a Team record's role, the Archived status, and deleting a project that is not their own Draft.
// - An Admin (and the Super admin) may do all of it.
// - Nobody demotes or removes the Super admin or the organization's last Admin.
// - Access grants are never changed from the app.
// - A Sent, Complete or Archived project refuses every change to it or to its contents but a change of status.
//
// It is pure: the save command reads what it needs (the row as it is, its project, the admins) and passes it in.
// Tables are named as in the database; columns by their Drizzle names (`createdBy`, not `created_by`). A table with
// no rule of its own below is an ordinary organization table that staff may change; a new table needs an entry in
// `TABLE_RULES` only when it has a rule of its own.
import type { ActorType } from './db/claims';

export type OperationType = 'put' | 'delete';

export type RowType = Record<string, unknown>;

export type ChangeType = {
	/** The table, as named in the database: `customer`, `team`, `project`. */
	table: string;
	/** `put` makes or changes the row; `delete` sends it to the Trash. */
	operation: OperationType;
	/** The columns a put sets. */
	columns?: readonly string[];
	/** What a put sets them to. */
	values?: RowType;
	/** The row as it is now; absent for a new row. */
	row?: RowType;
	/** The project the row belongs to (for the project table, the project itself), as it is now. */
	project?: { status: string; createdBy?: string | null };
	/** For a member or Team record: whether it is the Super admin's. */
	isSuperAdmin?: boolean;
	/** For a member or Team record: how many Admins the organization has now. */
	adminCount?: number;
};

export type VerdictType = { isAllowed: true } | { isAllowed: false; reason: string };

type RuleType = (actor: ActorType, change: ChangeType) => string | undefined;

export const FROZEN_STATUSES = ['Sent', 'Complete', 'Archived'];

/** The project columns a frozen project still takes. */
export const STATUS_COLUMNS = ['status', 'statusBeforeSent'];

const REASONS = {
	guest: 'You are waiting for access. An Admin of the organization can let you in.',
	otherOrganization: 'That belongs to another organization.',
	grant: 'Access grants are kept in the database only.',
	organization: 'Only an Admin can change the organization.',
	organizationDelete: 'An organization cannot be deleted from the app.',
	member: 'Only an Admin can change who is in the organization.',
	role: 'Only an Admin can change a Team role.',
	superAdmin: 'The Super admin is always an Admin.',
	lastAdmin: 'The organization must keep at least one Admin.',
	archived: 'Only an Admin can archive a project or bring it back.',
	deleteProject: 'Only an Admin can delete a project that is not your own Draft.',
	frozen: (status: string) =>
		`This project is ${status}, so only its status can change. Change its status to edit it.`
};

function isAdmin(actor: ActorType) {
	return actor.isSuperAdmin || actor.role === 'admin';
}

function touches(change: ChangeType, column: string) {
	return change.operation === 'put' && (change.columns ?? []).includes(column);
}

// Demoting or removing an Admin: never the Super admin, never the last Admin. Counts unknown count as one.
const keepAdmins: RuleType = (_actor, change) => {
	if (change.row?.role !== 'admin') return undefined;
	const isLeaving =
		change.operation === 'delete' || (touches(change, 'role') && change.values?.role !== 'admin');
	if (!isLeaving) return undefined;
	if (change.isSuperAdmin) return REASONS.superAdmin;
	if ((change.adminCount ?? 1) <= 1) return REASONS.lastAdmin;
	return undefined;
};

const adminsOnly =
	(reason: string): RuleType =>
	(actor) =>
		isAdmin(actor) ? undefined : reason;

const TABLE_RULES: Record<string, RuleType[]> = {
	access_grant: [() => REASONS.grant],
	organization: [
		(_actor, change) => (change.operation === 'delete' ? REASONS.organizationDelete : undefined),
		adminsOnly(REASONS.organization)
	],
	organization_details: [adminsOnly(REASONS.organization)],
	member: [adminsOnly(REASONS.member), keepAdmins],
	// Team records (#185): staff edit them, but only an Admin changes a role, and an Admin stays one.
	team: [
		(actor, change) => (touches(change, 'role') && !isAdmin(actor) ? REASONS.role : undefined),
		keepAdmins
	],
	// Projects (#186).
	project: [
		(actor, change) => {
			if (isAdmin(actor) || !touches(change, 'status')) return undefined;
			const isArchiving = change.values?.status === 'Archived' || change.row?.status === 'Archived';
			return isArchiving ? REASONS.archived : undefined;
		},
		(actor, change) => {
			if (change.operation !== 'delete' || isAdmin(actor)) return undefined;
			const isOwnDraft = change.row?.status === 'Draft' && change.row?.createdBy === actor.userId;
			return isOwnDraft ? undefined : REASONS.deleteProject;
		}
	]
};

// A Sent, Complete or Archived project takes nothing but a change of its own status.
const keepFrozen: RuleType = (_actor, change) => {
	const status = change.project?.status;
	if (!status || !FROZEN_STATUSES.includes(status)) return undefined;
	// Deleting the project itself is the delete rule's to decide (an Admin deletes any project).
	if (change.table === 'project' && change.operation === 'delete') return undefined;
	const isStatusChange =
		change.table === 'project' &&
		change.operation === 'put' &&
		(change.columns ?? []).length > 0 &&
		(change.columns ?? []).every((column) => STATUS_COLUMNS.includes(column));
	return isStatusChange ? undefined : REASONS.frozen(status);
};

function isOtherOrganization(actor: ActorType, change: ChangeType) {
	for (const row of [change.row, change.values]) {
		const organizationId =
			change.table === 'organization' ? row?.id : (row?.organizationId ?? undefined);
		if (organizationId !== undefined && organizationId !== actor.organizationId) return true;
	}
	return false;
}

export function checkPermission(actor: ActorType, change: ChangeType): VerdictType {
	if (!actor.organizationId) return { isAllowed: false, reason: REASONS.guest };
	if (isOtherOrganization(actor, change)) {
		return { isAllowed: false, reason: REASONS.otherOrganization };
	}
	for (const rule of [...(TABLE_RULES[change.table] ?? []), keepFrozen]) {
		const reason = rule(actor, change);
		if (reason) return { isAllowed: false, reason };
	}
	return { isAllowed: true };
}

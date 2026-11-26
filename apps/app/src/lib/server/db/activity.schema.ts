// What else happens, for the Activity (#306; Justin, 2026-11-26: "every possible thing that happens"), beside the
// record of every sign-in (`sign_in`) and the change record (`change`): a sign-out, a sign-in code asked for, a
// project opened and a report's PDF downloaded. Who, when, the organization it happened in (none for a Guest, nor for
// an address nobody has signed in with) and what it was about; never a code itself, a session's token or an address
// it came from.
//
// The database writes a sign-out and a code asked for (`triggers.ts`), whatever copy of the app made them; the app
// writes an opening and a download, as the acting User, in their organization. The restricted role reads only as an
// Admin (or the Super admin): the acting organization's, and a Guest's or a stranger's, someone an Admin lets in.
import { sql } from 'drizzle-orm';
import { index, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { appRole, IS_ADMIN, isGuestShown, ORGANIZATION_ID, USER_ID } from './policy';

/** What a line of it records: a sign-out, a sign-in code asked for, a project opened, a PDF downloaded. */
export const ACTIVITY_EVENT_KINDS = ['signOut', 'code', 'open', 'download'] as const;

export const activityEvent = pgTable(
	'activity_event',
	{
		id: uuid('id')
			.default(sql`pg_catalog.gen_random_uuid()`)
			.primaryKey(),
		/** One of `ACTIVITY_EVENT_KINDS`. */
		kind: text('kind').notNull(),
		/** Who: none for a code asked for an address nobody has signed in with. */
		userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
		/** The organization it happened in: none for a Guest or a stranger. */
		organizationId: uuid('organization_id'),
		/** The address a sign-in code was asked for. */
		email: text('email'),
		/** The project opened, or whose PDF was downloaded. */
		projectId: uuid('project_id'),
		/** The device a sign-out came from, as its browser named it. */
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('activity_event_at_idx').on(table.createdAt),
		index('activity_event_user_idx').on(table.userId, table.kind, table.createdAt),
		pgPolicy('activity_event is read by an Admin', {
			for: 'select',
			to: appRole,
			using: sql`${IS_ADMIN} and ("activity_event".organization_id = ${ORGANIZATION_ID} or ("activity_event".organization_id is null and ("activity_event".user_id is null or ${isGuestShown(sql`"activity_event".user_id`)})))`
		}),
		// The acting User's own openings and downloads: the app writes them, and reads them back only to count a
		// project opened again soon after as one.
		pgPolicy('activity_event of the acting user', {
			for: 'select',
			to: appRole,
			using: sql`"activity_event".user_id = ${USER_ID} and "activity_event".organization_id = ${ORGANIZATION_ID}`
		}),
		pgPolicy('activity_event is added by the acting user', {
			for: 'insert',
			to: appRole,
			withCheck: sql`"activity_event".user_id = ${USER_ID} and "activity_event".organization_id = ${ORGANIZATION_ID} and "activity_event".kind in ('open', 'download')`
		})
	]
).enableRLS();

// Pins (#346; Justin, 2026-11-25): what a person pinned to the top of their menu, a project or a record, each by its
// page and id. Each person has their own: the server sets whose a pin is (`user_id`) and its policy shows the acting
// User only their own, in their own organization. The list is newest pin first (`pinned_at`). Unpinning moves a pin to the Trash, where it no longer loads.
import { sql } from 'drizzle-orm';
import { index, pgPolicy, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { appRole, ORGANIZATION_ID, USER_ID } from './policy';
import { rowColumns } from './rows';

export const pinned = pgTable(
	'pinned',
	{
		...rowColumns(),
		/** Whose pin it is. Set by the server only, from the acting User. */
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** The page of what it pins, as the screens name it: `projects`, `customers`, `team`... */
		page: text('page').notNull(),
		/** The project's or record's id. */
		recordId: uuid('record_id').notNull(),
		/**
		 * When it was pinned, as the device's ISO time, kept as text so it loads back byte for byte: the list's order,
		 * newest on top, even for pins saved in one batch (whose created times are one).
		 */
		pinnedAt: text('pinned_at').notNull()
	},
	(table) => [
		index('pinned_user_idx').on(table.organizationId, table.userId),
		pgPolicy('pinned of the acting user', {
			for: 'all',
			to: appRole,
			using: sql`organization_id = ${ORGANIZATION_ID} and user_id = ${USER_ID}`,
			withCheck: sql`organization_id = ${ORGANIZATION_ID} and user_id = ${USER_ID}`
		})
	]
).enableRLS();

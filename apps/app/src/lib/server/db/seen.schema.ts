// What each person has seen (#403; Justin, 2026-11-27): a line of the bell's Notifications stays light blue, and
// counts on the bell, until its person opens it; the Activity Log shows in light blue what came since they last
// opened it. Each person has their own: the server sets whose a row is (`user_id`) and its policy shows the acting
// User only their own, in their own organization.
import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { userPolicy } from './policy';
import { rowColumns } from './rows';

export const seen = pgTable(
	'seen',
	{
		...rowColumns(),
		/** Whose it is. Set by the server only, from the acting User. */
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** What was seen: a Notifications line's id, or `log` for the Activity Log. */
		line: text('line').notNull(),
		/** When, as the device's ISO time, kept as text so it loads back byte for byte. */
		seenAt: text('seen_at').notNull()
	},
	(table) => [index('seen_user_idx').on(table.organizationId, table.userId), userPolicy('seen')]
).enableRLS();

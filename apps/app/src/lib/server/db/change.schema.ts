// The change record (the glossary's History; ADR 0005, spec #179, #183): every row change the save command applies,
// with who, when, which table and row, what was done, and the row before and after. Its id is the change id the
// device made, so a change sent twice is found here and counted once. The app's role reads and adds records of its
// own organization and never changes one.
import { sql } from 'drizzle-orm';
import { index, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { organization } from './organization.schema';
import { appRole, ORGANIZATION_ID } from './policy';

export const change = pgTable(
	'change',
	{
		/** The change id the device made. */
		id: uuid('id').primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
		at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
		tableName: text('table_name').notNull(),
		rowId: uuid('row_id').notNull(),
		/** `put` or `delete` (to the Trash). */
		operation: text('operation', { enum: ['put', 'delete'] }).notNull(),
		before: jsonb('before'),
		after: jsonb('after')
	},
	(table) => [
		index('change_row_idx').on(table.tableName, table.rowId),
		pgPolicy('change is read in the acting organization', {
			for: 'select',
			to: appRole,
			using: sql`organization_id = ${ORGANIZATION_ID}`
		}),
		pgPolicy('change is added in the acting organization', {
			for: 'insert',
			to: appRole,
			withCheck: sql`organization_id = ${ORGANIZATION_ID}`
		})
	]
).enableRLS();

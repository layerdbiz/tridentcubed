// Group emails (Justin, 2026-11-28: "this is something that an admin would be able to add on their end, any admin,
// and it would automatically populate"): the shared addresses an Admin added for people to show under their email
// signature (engineering@, sales@ and the like), beside the shared mailboxes the signature Sheet lists. One row per
// address; anyone in the organization reads them, only an Admin adds (the one permission check, `checkSignature`).
// Row Level Security keeps the table to the acting organization.
import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizationPolicy } from './policy';
import { rowColumns } from './rows';

export const groupEmail = pgTable(
	'group_email',
	{
		...rowColumns(),
		email: text('email').notNull(),
		/** What it is called in the list: "Engineering". */
		name: text('name').default('').notNull()
	},
	(table) => [
		uniqueIndex('group_email_idx')
			.on(table.organizationId, sql`lower(email)`)
			.where(sql`deleted_at is null`),
		organizationPolicy('group_email')
	]
).enableRLS();

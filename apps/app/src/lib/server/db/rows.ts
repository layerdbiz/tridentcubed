// What every table that saves through the save command has (spec #179 "Tables", #183): a UUID id made on the device,
// its organization, the created and updated times the server sets, and the deleted time that puts it in the Trash.
// A new table spreads `rowColumns()` into its columns and adds `organizationPolicy('<table>')` to its extra config.
import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { organization } from './organization.schema';

function time(name: string) {
	return timestamp(name, { withTimezone: true });
}

export function rowColumns() {
	return {
		/** Made on the device (ADR 0005), never by the database. */
		id: uuid('id').primaryKey(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		createdAt: time('created_at').defaultNow().notNull(),
		updatedAt: time('updated_at').defaultNow().notNull(),
		/** Set when the row moves to the Trash; the row itself stays. */
		deletedAt: time('deleted_at')
	};
}

/** Names unique per page among the rows not in the Trash, whatever their capitals. */
export function lowerName() {
	return sql`lower(name)`;
}

export const NOT_IN_TRASH = sql`deleted_at is null`;

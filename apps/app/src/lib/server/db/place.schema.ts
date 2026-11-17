// Saved places (spec #179 "Tables", #184): what a location field's words mean on the map. A place is looked up once,
// picked, and kept here for every member, so nobody looks it up again. Its id is worked out from the organization and
// its name (`toStableId`), so two members picking the same new place save one row.
import { doublePrecision, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizationPolicy } from './policy';
import { lowerName, NOT_IN_TRASH, rowColumns } from './rows';

export const place = pgTable(
	'place',
	{
		...rowColumns(),
		/** What the field shows: "Houston, TX". */
		name: text('name').notNull(),
		latitude: doublePrecision('latitude').notNull(),
		longitude: doublePrecision('longitude').notNull(),
		/** The full address the lookup gave. */
		detail: text('detail').default('').notNull()
	},
	(table) => [
		uniqueIndex('place_name_idx').on(table.organizationId, lowerName()).where(NOT_IN_TRASH),
		organizationPolicy('place')
	]
).enableRLS();

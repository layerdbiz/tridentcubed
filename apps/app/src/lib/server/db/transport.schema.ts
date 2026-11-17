// Transport Modes and Facilities (spec #179 "Tables", #184): the organization's ships, planes, trains and trucks, and
// the ports, airports, rail yards and depots they call at. Each is named by its name on every screen, so two of a
// page outside the Trash never share one, whatever its capitals; the database refuses it too. A Transport Mode's
// type (Sea, Air, Rail, Road) is not kept: it is read from its mode. Its particulars are one small map, by label.
import { jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizationPolicy } from './policy';
import { lowerName, NOT_IN_TRASH, rowColumns } from './rows';

function words(name: string) {
	return text(name).default('').notNull();
}

export const transport = pgTable(
	'transport',
	{
		...rowColumns(),
		name: text('name').notNull(),
		/** Vessel, Barge, Plane, Train, Railcar, Truck or Trailer. */
		mode: text('mode').notNull(),
		picture: words('picture'),
		/** `manual` when typed in; `api` once a tracking service merges its ships and planes in. */
		source: text('source').default('manual').notNull(),
		/** Its mode's particulars, by label: `{ "IMO number": "9321483" }`. */
		particulars: jsonb('particulars').$type<Record<string, string>>().default({}).notNull()
	},
	(table) => [
		uniqueIndex('transport_name_idx').on(table.organizationId, lowerName()).where(NOT_IN_TRASH),
		organizationPolicy('transport')
	]
).enableRLS();

export const facility = pgTable(
	'facility',
	{
		...rowColumns(),
		name: text('name').notNull(),
		/** Port, Airport, Rail yard or Depot. */
		kind: text('kind').notNull(),
		city: words('city'),
		address: words('address'),
		picture: words('picture'),
		contactName: words('contact_name'),
		phone: words('phone'),
		email: words('email')
	},
	(table) => [
		uniqueIndex('facility_name_idx').on(table.organizationId, lowerName()).where(NOT_IN_TRASH),
		organizationPolicy('facility')
	]
).enableRLS();

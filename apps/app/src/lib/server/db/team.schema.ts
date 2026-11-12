// Team records (spec #179 "Tables", #185; the glossary's Team record): one person on the organization's Team page.
// A staff User is tied to one at sign-in (`user_id`, set by the server only), and a tied record's role is their
// membership's role. `last_seen` is stamped by the server when its User uses the app, at most once a minute; the
// online dots read it. Names are unique among the records outside the Trash, whatever their capitals. Row Level
// Security keeps the table to the acting organization.
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { ROLES, roleCheck } from './organization.schema';
import { organizationPolicy } from './policy';
import { lowerName, NOT_IN_TRASH, rowColumns } from './rows';

function words(name: string) {
	return text(name).default('').notNull();
}

export const team = pgTable(
	'team',
	{
		...rowColumns(),
		name: text('name').notNull(),
		title: words('title'),
		/** What they do, as typed: "Port Captain, Marine Surveyor". */
		labels: words('labels'),
		role: text('role', { enum: ROLES }).default('team').notNull(),
		phone: words('phone'),
		email: words('email'),
		location: words('location'),
		photo: words('photo'),
		/** Their profile page elsewhere (LinkedIn), kept from the team sheet. */
		link: words('link'),
		/** The order the Team page lists people in: partners 1, then 2, then 3. */
		rank: integer('rank').default(3).notNull(),
		/** The User this record is, once they have signed in. Set by the server only. */
		userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
		/** When its User last used the app. Set by the server only. */
		lastSeen: timestamp('last_seen', { withTimezone: true })
	},
	(table) => [
		uniqueIndex('team_name_idx').on(table.organizationId, lowerName()).where(NOT_IN_TRASH),
		uniqueIndex('team_user_idx').on(table.organizationId, table.userId),
		roleCheck('team'),
		organizationPolicy('team')
	]
).enableRLS();

// Customers and their contacts (spec #179 "Tables", #183). A customer is named by its name on every screen, so two
// customers outside the Trash never share one, whatever its capitals; the database refuses it too. Contacts are the
// customer's people, in order. Row Level Security keeps both to the acting organization.
import { integer, pgTable, text, uniqueIndex, uuid, index } from 'drizzle-orm/pg-core';
import { organizationPolicy } from './policy';
import { lowerName, NOT_IN_TRASH, rowColumns } from './rows';

function words(name: string) {
	return text(name).default('').notNull();
}

export const customer = pgTable(
	'customer',
	{
		...rowColumns(),
		name: text('name').notNull(),
		/** The short code a project number starts with. */
		code: words('code'),
		/** What kind of business it is, as typed: "Stevedore, Terminal". */
		types: words('types'),
		icon: words('icon'),
		logo: words('logo'),
		picture: words('picture'),
		city: words('city'),
		address: words('address'),
		email: words('email'),
		phone: words('phone'),
		website: words('website')
	},
	(table) => [
		uniqueIndex('customer_name_idx').on(table.organizationId, lowerName()).where(NOT_IN_TRASH),
		organizationPolicy('customer')
	]
).enableRLS();

export const contact = pgTable(
	'contact',
	{
		...rowColumns(),
		customerId: uuid('customer_id')
			.notNull()
			.references(() => customer.id, { onDelete: 'cascade' }),
		position: integer('position').default(0).notNull(),
		name: words('name'),
		title: words('title'),
		email: words('email'),
		phone: words('phone'),
		photo: words('photo')
	},
	(table) => [index('contact_customer_idx').on(table.customerId), organizationPolicy('contact')]
).enableRLS();

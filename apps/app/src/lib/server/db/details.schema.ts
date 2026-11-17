// The organization's own details (spec #179 "Tables", #184): one row per organization with its letterhead (logo,
// address, phone, emails, website), the report's standard wording (the disclaimer's opening and note, the closing
// line and the sign-off) and the email domain whose verified Users join it as staff; the disclaimer's points are
// ordered rows of it. Its name is the organization's own (organization.schema.ts). Only an Admin changes any of it
// (the one permission check); the email domain is set in the database only, never from the app.
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizationPolicy } from './policy';
import { rowColumns } from './rows';

function words(name: string) {
	return text(name).default('').notNull();
}

export const organizationDetails = pgTable(
	'organization_details',
	{
		...rowColumns(),
		/** A verified address at this domain joins the organization with the Team role. Lower case, no `@`. */
		emailDomain: text('email_domain'),
		logo: words('logo'),
		address: words('address'),
		phone: words('phone'),
		email: words('email'),
		/** The shared inbox printed last in the sign-off. */
		groupEmail: words('group_email'),
		website: words('website'),
		disclaimerOpening: words('disclaimer_opening'),
		disclaimerNote: words('disclaimer_note'),
		/** The line before the sign-off. */
		closing: words('closing'),
		signoff: words('signoff')
	},
	(table) => [
		uniqueIndex('organization_details_organization_idx').on(table.organizationId),
		uniqueIndex('organization_details_email_domain_idx').on(table.emailDomain),
		// Typed in the database only: a domain with capitals or an `@` would silently let nobody in.
		check(
			'organization_details_email_domain_check',
			sql`email_domain = lower(btrim(email_domain)) and position('@' in email_domain) = 0`
		),
		organizationPolicy('organization_details')
	]
).enableRLS();

export const disclaimerPoint = pgTable(
	'disclaimer_point',
	{
		...rowColumns(),
		detailsId: uuid('details_id')
			.notNull()
			.references(() => organizationDetails.id, { onDelete: 'cascade' }),
		position: integer('position').default(0).notNull(),
		title: words('title'),
		text: words('text')
	},
	(table) => [
		index('disclaimer_point_details_idx').on(table.detailsId),
		organizationPolicy('disclaimer_point')
	]
).enableRLS();

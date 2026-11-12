// Who belongs where (ADR 0003 and its 2026-11-12 amendment, #182). Organization, member and invitation are the
// tables of Better Auth's organization plugin, with UUID ids; the app writes memberships itself at sign-in, since
// the plugin has no email-domain join. An organization's details (its letterhead and email domain) are in
// `details.schema.ts`. Access grants are a private list filled in the database only, never in this repository.
// Row Level Security is on for every table. The app's restricted role sees only its own organization's rows,
// through the claims the claims helper sets (`policy.ts`, `claims.ts`); access grants have no policy at all, so only
// the server, as the database owner, reads them.
import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	pgPolicy,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { appRole, ORGANIZATION_ID, organizationPolicy, USER_ID } from './policy';

/** Admin, Manager and Team (the glossary's roles). Manager and Team may do the same things for now. */
export const ROLES = ['admin', 'manager', 'team'] as const;

export type RoleType = (typeof ROLES)[number];

function id() {
	return uuid('id')
		.default(sql`pg_catalog.gen_random_uuid()`)
		.primaryKey();
}

function time(name: string) {
	return timestamp(name, { withTimezone: true });
}

export const organization = pgTable(
	'organization',
	{
		id: id(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		logo: text('logo'),
		metadata: text('metadata'),
		createdAt: time('created_at').defaultNow().notNull(),
		// What the save command needs to save its name like any other row (#184); it never goes to the Trash.
		updatedAt: time('updated_at').defaultNow().notNull(),
		deletedAt: time('deleted_at')
	},
	() => [
		pgPolicy('organization is the acting one', {
			for: 'select',
			to: appRole,
			using: sql`id = ${ORGANIZATION_ID}`
		}),
		pgPolicy('organization name changes in the acting one', {
			for: 'update',
			to: appRole,
			using: sql`id = ${ORGANIZATION_ID}`,
			withCheck: sql`id = ${ORGANIZATION_ID}`
		})
	]
).enableRLS();

export const member = pgTable(
	'member',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ROLES }).default('team').notNull(),
		createdAt: time('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('member_organization_user_idx').on(table.organizationId, table.userId),
		index('member_userId_idx').on(table.userId),
		organizationPolicy('member'),
		// A User reads their own memberships before they know their organization: that is how they find it.
		pgPolicy('member is the acting user', {
			for: 'select',
			to: appRole,
			using: sql`user_id = ${USER_ID}`
		})
	]
).enableRLS();

// Better Auth's organization plugin expects this table; invitations are out of scope (spec #179), so it has no
// policy and stays empty.
export const invitation = pgTable(
	'invitation',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		role: text('role'),
		status: text('status').default('pending').notNull(),
		expiresAt: time('expires_at').notNull(),
		createdAt: time('created_at').defaultNow().notNull(),
		inviterId: uuid('inviter_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [
		index('invitation_organizationId_idx').on(table.organizationId),
		index('invitation_email_idx').on(table.email)
	]
).enableRLS();

export const accessGrant = pgTable(
	'access_grant',
	{
		id: id(),
		/** Lower case. */
		email: text('email').notNull(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ROLES }).notNull(),
		isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
		/** The email of the Team record this User signs in as, when it is not their own (#185). */
		teamEmail: text('team_email'),
		createdAt: time('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('access_grant_email_organization_idx').on(table.email, table.organizationId)
	]
).enableRLS();

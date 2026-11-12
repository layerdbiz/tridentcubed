// Better Auth's four tables (ADR 0002, #181), first written by `auth generate` (auth CLI 1.7.22, Drizzle adapter,
// `generateId: "uuid"`, email OTP plugin) and conformed: times carry their time zone, and Row Level Security is on
// with no policy, so Supabase's publishable key reads none of them. Only the server, as the database owner, reaches
// these rows; Better Auth and the sign-in rule (`access.ts`) are their only writers. #182 added the organization
// plugin's active organization to the session, the Super admin flag to the user, and one policy: the app's
// restricted role reads the acting User's own user row.
import { relations, sql } from 'drizzle-orm';
import { boolean, index, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { appRole, ORGANIZATION_ID, USER_ID } from './policy';

function id() {
	return uuid('id')
		.default(sql`pg_catalog.gen_random_uuid()`)
		.primaryKey();
}

function time(name: string) {
	return timestamp(name, { withTimezone: true });
}

export const user = pgTable(
	'user',
	{
		id: id(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		emailVerified: boolean('email_verified').default(false).notNull(),
		image: text('image'),
		/** The one User above every organization (glossary), marked at sign-in by their access grant. */
		isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
		createdAt: time('created_at').defaultNow().notNull(),
		updatedAt: time('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	() => [
		pgPolicy('user is the acting user', {
			for: 'select',
			to: appRole,
			using: sql`id = ${USER_ID}`
		}),
		// The acting organization's own Users, so the save command knows whose Team record is the Super admin's
		// (#185). Read only; nobody changes another User from the app.
		pgPolicy('user is in the acting organization', {
			for: 'select',
			to: appRole,
			using: sql`exists (select 1 from public.member m where m.user_id = "user".id and m.organization_id = ${ORGANIZATION_ID})`
		})
	]
).enableRLS();

export const session = pgTable(
	'session',
	{
		id: id(),
		expiresAt: time('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: time('created_at').defaultNow().notNull(),
		updatedAt: time('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		/** Better Auth's organization plugin: the organization this session acts in, set at sign-in. */
		activeOrganizationId: uuid('active_organization_id'),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
).enableRLS();

export const account = pgTable(
	'account',
	{
		id: id(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: uuid('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: time('access_token_expires_at'),
		refreshTokenExpiresAt: time('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: time('created_at').defaultNow().notNull(),
		updatedAt: time('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
).enableRLS();

export const verification = pgTable(
	'verification',
	{
		id: id(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: time('expires_at').notNull(),
		createdAt: time('created_at').defaultNow().notNull(),
		updatedAt: time('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
).enableRLS();

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

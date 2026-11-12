// The SQL side of the claims helper (ADR 0002, #182). The server connects as the database owner, which skips Row
// Level Security; every app query instead runs in a transaction that sets the acting User's claims and switches to
// the restricted role `trident_app` (`claims.ts`), and the tables' policies read those claims through the app's own
// SQL helpers, `app.user_id()` and `app.organization_id()`, so the same policies run on Supabase and in PGlite.
//
// `trident_app` is the app's own role, not Supabase's `authenticated`: Supabase Auth keeps running and hands out
// `authenticated` tokens to anyone who signs up through it, so no policy of this app is ever granted to that role.
//
// `CLAIMS_SQL` is what drizzle-kit cannot write: the role, the `app` schema with its helpers, and the role's table
// privileges. It runs before `schema.sql` (the policies name the role and the helpers), on the in-process database
// at boot and at the head of the one initial migration (#194). It is safe to run twice.
import { type SQL, sql } from 'drizzle-orm';
import { pgPolicy, pgRole } from 'drizzle-orm/pg-core';

export const APP_ROLE = 'trident_app';

/** The restricted role, for policies. `.existing()`: `CLAIMS_SQL` creates it, drizzle-kit does not. */
export const appRole = pgRole(APP_ROLE).existing();

/** The acting User's id and organization, as the claims helper set them; null for nobody and for a Guest. */
export const USER_ID = sql`app.user_id()`;
export const ORGANIZATION_ID = sql`app.organization_id()`;

/**
 * The usual policy of an organization's table: the restricted role reads and writes only the rows of the acting
 * User's organization. A Guest has no organization, so they see nothing. Copy this into a new table's extra config:
 * `(table) => [organizationPolicy('customer')]`.
 */
export function organizationPolicy(table: string, column: SQL = sql`organization_id`) {
	return pgPolicy(`${table} in the acting organization`, {
		for: 'all',
		to: appRole,
		using: sql`${column} = ${ORGANIZATION_ID}`,
		withCheck: sql`${column} = ${ORGANIZATION_ID}`
	});
}

export const CLAIMS_SQL = `
DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_ROLE}') THEN
		CREATE ROLE ${APP_ROLE} NOLOGIN NOINHERIT NOBYPASSRLS;
	END IF;
END $$;
GRANT ${APP_ROLE} TO CURRENT_USER;
CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO ${APP_ROLE};
GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
CREATE OR REPLACE FUNCTION app.claims() RETURNS jsonb
	LANGUAGE sql STABLE SET search_path = ''
	AS $$ SELECT coalesce(nullif(pg_catalog.current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
CREATE OR REPLACE FUNCTION app.user_id() RETURNS uuid
	LANGUAGE sql STABLE SET search_path = ''
	AS $$ SELECT nullif(app.claims() ->> 'sub', '')::uuid $$;
CREATE OR REPLACE FUNCTION app.organization_id() RETURNS uuid
	LANGUAGE sql STABLE SET search_path = ''
	AS $$ SELECT nullif(app.claims() ->> 'org', '')::uuid $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE};
`;

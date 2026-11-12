// The one place a Drizzle client is made (#181; ADR 0002). Two kinds, one schema:
// - `createDatabase(url)`: Supabase's Postgres through its transaction pooler, so prepared statements are off.
// - `createMemoryDatabase()`: an in-process Postgres (PGlite) built from `CLAIMS_SQL` and `schema.sql`, for development, preview
//   and tests with no settings and no network. Each call is a fresh, empty database: one is booted and given the
//   schema per process, and every call clones it, which takes a fraction of the boot.
// App code never imports this file: it reaches the database only through the claims helper (`claims.ts`), which runs
// each query in a transaction that sets the acting User's claims (#182; `access.test.ts` fails on another path).
import type { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { CLAIMS_SQL } from './policy';
import * as schema from './schema';
import SCHEMA_SQL from './schema.sql?raw';

export type DatabaseType = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDatabase(url: string): DatabaseType {
	return drizzlePostgres(postgres(url, { prepare: false }), { schema });
}

let template: Promise<PGlite> | undefined;

async function bootTemplate() {
	// Imported here, so a deployment with a database never loads PGlite.
	const { PGlite } = await import('@electric-sql/pglite');
	const client = new PGlite();
	await client.exec(CLAIMS_SQL);
	await client.exec(SCHEMA_SQL);
	return client;
}

export async function createMemoryDatabase(): Promise<DatabaseType> {
	template ??= bootTemplate();
	const client = (await (await template).clone()) as PGlite;
	return drizzlePglite(client, { schema });
}

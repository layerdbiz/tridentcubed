// `schema.sql` is the schema as SQL, written by drizzle-kit from `schema.ts`: the in-process database is built from
// it in development and tests (#181). It is a file snapshot, so a schema change fails here until it is rewritten
// with `pnpm --filter app db:sql`. It is not a migration: the one initial migration is generated at the end of the
// run (spec #179), and Vercel builds never change a database.
import { count, sql } from 'drizzle-orm';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { expect, it } from 'vite-plus/test';
import { createTestSignIn } from '../testing';
import * as schema from './schema';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

it('schema.sql is the schema as drizzle-kit writes it', async () => {
	const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));

	await expect(`${statements.join('\n--> statement-breakpoint\n')}\n`).toMatchFileSnapshot(
		'./schema.sql'
	);
});

it('gives users and sessions UUID ids, and shows Supabase’s publishable key none of them', async () => {
	const { db, signIn } = await createTestSignIn();
	const { user } = await signIn('ana@example.com');
	expect(user.id).toMatch(UUID);

	// `anon` is the role Supabase's publishable key acts as. Even granted every table, it sees no row.
	await db.execute(sql`create role anon nologin`);
	await db.execute(sql`grant select on all tables in schema public to anon`);
	const seen = await db.transaction(async (tx) => {
		await tx.execute(sql`set local role anon`);
		const counts = [];
		for (const table of [schema.user, schema.session, schema.account, schema.verification]) {
			const [row] = await tx.select({ rows: count() }).from(table);
			counts.push(row.rows);
		}
		return counts;
	});
	expect(seen).toEqual([0, 0, 0, 0]);

	// The server, as the owner, still sees them.
	const sessions = await db.select({ id: schema.session.id }).from(schema.session);
	expect(sessions).toEqual([{ id: expect.stringMatching(UUID) }]);
});

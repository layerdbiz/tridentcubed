// The one seed as SQL (#194): Supabase gets its starting rows through the connector, which takes SQL only. The SQL is
// printed from the TypeScript seed itself (`pnpm --silent --filter app db:seed-sql`), so its rows and ids are the seed's.
import { sql } from 'drizzle-orm';
import { expect, it } from 'vite-plus/test';
import { createMemoryDatabase, type DatabaseType } from './index';
import { toSeedSql } from './seed';

async function readAll(db: DatabaseType) {
	const result = await db.execute(sql`
		select table_name from information_schema.tables
		where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`);
	const tables = ('rows' in result ? result.rows : result) as { table_name: string }[];
	const all: Record<string, unknown[]> = {};
	for (const { table_name: table } of tables) {
		const found = await db.execute(
			sql.raw(`select to_jsonb(t) as row from public."${table}" t order by to_jsonb(t)::text`)
		);
		const rows = ('rows' in found ? found.rows : found) as { row: unknown }[];
		if (rows.length > 0) all[table] = rows.map(({ row }) => row);
	}
	return all;
}

async function apply(db: DatabaseType, script: string) {
	for (const statement of script.split(';\n').filter((each) => each.trim()))
		await db.execute(sql.raw(statement));
}

it('prints SQL that gives a fresh database exactly the seed’s rows, twice over', async () => {
	const seeded = await createMemoryDatabase();
	const script = await toSeedSql(seeded);
	const fresh = await createMemoryDatabase();

	await apply(fresh, script);
	await apply(fresh, script);

	const rows = await readAll(seeded);
	expect(Object.keys(rows)).toEqual([
		'customer',
		'disclaimer_point',
		'organization',
		'organization_details',
		'place',
		'team'
	]);
	expect(await readAll(fresh)).toEqual(rows);
});

it('holds no access grant and no address outside tridentcubed.com', async () => {
	const script = await toSeedSql(await createMemoryDatabase());

	expect(script).not.toMatch(/access_grant/);
	const addresses = script.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
	expect(addresses.length).toBeGreaterThan(0);
	for (const address of addresses) expect(address.toLowerCase()).toMatch(/@tridentcubed\.com$/);
});

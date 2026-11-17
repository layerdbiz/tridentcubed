// `CLAIMS_SQL` on Supabase (#194): the migration may run as another role than the one the app connects as. The app
// connects through the pooler as `postgres`, and every request switches to the restricted role, so `postgres` must be
// a member of it whoever ran the migration.
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vite-plus/test';
import { APP_ROLE, CLAIMS_SQL } from './policy';

async function isMember(client: PGlite, member: string) {
	const { rows } = await client.query(
		`select 1 from pg_catalog.pg_auth_members m
			join pg_catalog.pg_roles r on r.oid = m.roleid
			join pg_catalog.pg_roles u on u.oid = m.member
		where r.rolname = $1 and u.rolname = $2`,
		[APP_ROLE, member]
	);
	return rows.length > 0;
}

it('makes postgres and the role that ran it members of the restricted role, and runs twice', async () => {
	const client = new PGlite();
	await client.exec(`
		create role migrator createrole;
		grant create on database template1 to migrator;
		grant create on database postgres to migrator;
		grant create on schema public to migrator;
	`);
	await client.exec('set role migrator');
	await client.exec(CLAIMS_SQL);
	await client.exec(CLAIMS_SQL);
	await client.exec('reset role');

	expect(await isMember(client, 'postgres')).toBe(true);
	expect(await isMember(client, 'migrator')).toBe(true);
	await client.close();
});

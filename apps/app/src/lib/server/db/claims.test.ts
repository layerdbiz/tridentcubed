// The claims helper (#182; ADR 0002, 0003). Row Level Security on its own: with the permission check skipped on
// purpose, a query run through the claims helper still sees only the acting User's organization, and a Guest sees
// nothing at all. And the guard: no other way to the database appears in app code.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vite-plus/test';
import { createClaims } from './claims';
import { createMemoryDatabase, type DatabaseType } from './index';
import * as schema from './schema';

const ORGANIZATIONS = {
	ours: { id: '11111111-1111-4111-8111-111111111111', slug: 'ours', domain: 'ours.example' },
	theirs: { id: '22222222-2222-4222-8222-222222222222', slug: 'theirs', domain: 'theirs.example' }
};

async function createTwoOrganizations() {
	const db = await createMemoryDatabase();
	const users: Record<string, string> = {};
	for (const [name, org] of Object.entries(ORGANIZATIONS)) {
		await db.insert(schema.organization).values({ id: org.id, name, slug: org.slug });
		await db
			.insert(schema.organizationDetails)
			.values({ id: org.id, organizationId: org.id, emailDomain: org.domain });
		const [made] = await db
			.insert(schema.user)
			.values({ name, email: `ana@${org.domain}`, emailVerified: true })
			.returning({ id: schema.user.id });
		users[name] = made.id;
		await db
			.insert(schema.member)
			.values({ organizationId: org.id, userId: made.id, role: 'admin' });
		await db
			.insert(schema.accessGrant)
			.values({ email: `ana@${org.domain}`, organizationId: org.id, role: 'admin' });
	}
	const [guest] = await db
		.insert(schema.user)
		.values({ name: 'Guest', email: 'guest@elsewhere.example', emailVerified: true })
		.returning({ id: schema.user.id });
	return { db, users, guestId: guest.id };
}

// Drizzle wraps Postgres's error; its cause carries Postgres's own words.
async function readRefusal(work: Promise<unknown>) {
	try {
		await work;
	} catch (error) {
		return String((error as Error).cause ?? error);
	}
	return 'nothing was refused';
}

async function readEverything(
	db: DatabaseType,
	actor: { userId: string; organizationId: string | null }
) {
	return createClaims(db).run(actor, async (tx) => ({
		organizations: await tx.select({ slug: schema.organization.slug }).from(schema.organization),
		details: await tx
			.select({ domain: schema.organizationDetails.emailDomain })
			.from(schema.organizationDetails),
		members: await tx.select({ userId: schema.member.userId }).from(schema.member),
		users: await tx.select({ email: schema.user.email }).from(schema.user),
		grants: await tx.select({ email: schema.accessGrant.email }).from(schema.accessGrant),
		sessions: await tx.select({ id: schema.session.id }).from(schema.session)
	}));
}

describe('Row Level Security alone', () => {
	it('shows an organization’s User only their own organization’s rows', async () => {
		const { db, users } = await createTwoOrganizations();

		const seen = await readEverything(db, {
			userId: users.ours,
			organizationId: ORGANIZATIONS.ours.id
		});

		expect(seen).toEqual({
			organizations: [{ slug: 'ours' }],
			details: [{ domain: 'ours.example' }],
			members: [{ userId: users.ours }],
			users: [{ email: 'ana@ours.example' }],
			grants: [],
			sessions: []
		});
	});

	it('shows a Guest nothing, not even their own organization claim’s rows', async () => {
		const { db, guestId } = await createTwoOrganizations();

		const seen = await readEverything(db, { userId: guestId, organizationId: null });

		expect(seen).toEqual({
			organizations: [],
			details: [],
			members: [],
			users: [{ email: 'guest@elsewhere.example' }],
			grants: [],
			sessions: []
		});
	});

	it('refuses a write into another organization and leaves it as it was', async () => {
		const { db, users, guestId } = await createTwoOrganizations();
		const claims = createClaims(db);

		const refusal = await readRefusal(
			claims.run({ userId: users.ours, organizationId: ORGANIZATIONS.ours.id }, (tx) =>
				tx
					.insert(schema.member)
					.values({ organizationId: ORGANIZATIONS.theirs.id, userId: guestId, role: 'admin' })
			)
		);
		expect(refusal).toMatch(/row-level security/);

		const changed = await claims.run(
			{ userId: users.ours, organizationId: ORGANIZATIONS.ours.id },
			(tx) =>
				tx
					.update(schema.organizationDetails)
					.set({ emailDomain: 'taken.example' })
					.returning({ id: schema.organizationDetails.organizationId })
		);
		expect(changed).toEqual([{ id: ORGANIZATIONS.ours.id }]);

		const theirs = await readEverything(db, {
			userId: users.theirs,
			organizationId: ORGANIZATIONS.theirs.id
		});
		expect(theirs.members).toEqual([{ userId: users.theirs }]);
		expect(theirs.details).toEqual([{ domain: 'theirs.example' }]);
	});

	it('keeps access grants from every app query, an Admin’s included', async () => {
		const { db, users } = await createTwoOrganizations();

		const refusal = await readRefusal(
			createClaims(db).run(
				{ userId: users.ours, organizationId: ORGANIZATIONS.ours.id, role: 'admin' },
				(tx) =>
					tx.insert(schema.accessGrant).values({
						email: 'new@ours.example',
						organizationId: ORGANIZATIONS.ours.id,
						role: 'admin'
					})
			)
		);
		expect(refusal).toMatch(/row-level security/);

		const grants = await db.select({ email: schema.accessGrant.email }).from(schema.accessGrant);
		expect(grants.map((grant) => grant.email).sort()).toEqual([
			'ana@ours.example',
			'ana@theirs.example'
		]);
	});

	it('turns Row Level Security on for the organization, membership and access grant tables', async () => {
		const db = await createMemoryDatabase();
		const tables = ['access_grant', 'invitation', 'member', 'organization', 'organization_details'];

		const result = await db.execute(
			sql`select relname from pg_class where relrowsecurity and relname in ${tables} order by relname`
		);

		// The in-process database answers `{ rows }`.
		expect((result as { rows: unknown[] }).rows).toEqual(tables.map((relname) => ({ relname })));
	});
});

// The claims helper is the only way app code reaches the database (ADR 0002): no file but the ones that make the
// one client may import a database driver or the client module. A type-only import reaches nothing, so it is fine.
const SOURCE = join(import.meta.dirname, '../../..');
const CLIENT_MAKERS = ['lib/server/db/index.ts', 'lib/server/server.ts', 'lib/server/testing.ts'];
const DRIVERS = [
	'postgres',
	'pg',
	'@electric-sql/pglite',
	'drizzle-orm/pglite',
	'drizzle-orm/postgres-js',
	'drizzle-orm/node-postgres',
	'@supabase/supabase-js'
];
const IMPORTS =
	/(?:^|[\s;])import\s+(type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function findDatabaseImports(source: string) {
	const found: string[] = [];
	for (const [, isType, staticPath, dynamicPath] of source.matchAll(IMPORTS)) {
		const path = staticPath ?? dynamicPath;
		if (isType) continue;
		const isClient =
			/(^|\/)db\/index(\.js|\.ts)?$/.test(path) || /^\.\/index(\.js|\.ts)?$/.test(path);
		if (DRIVERS.includes(path) || isClient) found.push(path);
	}
	return found;
}

function listSourceFiles(folder: string): string[] {
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		const path = join(folder, entry.name);
		if (entry.isDirectory()) return listSourceFiles(path);
		const isSource = /\.(ts|js|svelte)$/.test(entry.name) && !entry.name.endsWith('.test.ts');
		return isSource ? [path] : [];
	});
}

describe('the only way to the database', () => {
	it('spots a driver or the client module imported anywhere', () => {
		expect(
			findDatabaseImports(`
				import { sql } from 'drizzle-orm';
				import type { DatabaseType } from './db/index';
				import { createDatabase } from '#lib/server/db/index.js';
				import postgres from 'postgres';
				const { PGlite } = await import('@electric-sql/pglite');
			`)
		).toEqual(['#lib/server/db/index.js', 'postgres', '@electric-sql/pglite']);
	});

	it('is the claims helper: no app file but the client’s makers imports a driver or the client', () => {
		const offenders = listSourceFiles(SOURCE)
			.map((path) => ({
				file: relative(SOURCE, path),
				imports: findDatabaseImports(readFileSync(path, 'utf8'))
			}))
			.filter(({ file, imports }) => imports.length > 0 && !CLIENT_MAKERS.includes(file));

		expect(offenders).toEqual([]);
	});
});

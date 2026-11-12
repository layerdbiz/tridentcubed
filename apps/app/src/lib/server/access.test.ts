// The sign-in rule (#182; ADR 0003, amended 2026-11-12), through the real sign-in on the in-process database:
// an access grant, then the organization's email domain, otherwise a Guest; signing in again changes nothing.
// Every email here is made up; real access grants live only in the database.
import { count, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vite-plus/test';
import { TRIDENT_CUBED } from './db/seed';
import * as schema from './db/schema';
import { createTestSignIn } from './testing';

const TRIDENT = TRIDENT_CUBED.id;

async function grant(
	db: Awaited<ReturnType<typeof createTestSignIn>>['db'],
	email: string,
	role: 'admin' | 'manager' | 'team',
	isSuperAdmin = false
) {
	await db
		.insert(schema.accessGrant)
		.values({ email, organizationId: TRIDENT, role, isSuperAdmin });
}

describe('the sign-in rule', () => {
	it('makes a User with an Admin access grant an Admin of the organization at their first sign-in', async () => {
		const { db, signIn } = await createTestSignIn();
		await grant(db, 'boss@tridentcubed.com', 'admin');

		const { actor } = await signIn('boss@tridentcubed.com');

		expect(actor).toMatchObject({
			organizationId: TRIDENT,
			role: 'admin',
			isSuperAdmin: false
		});
	});

	it('marks the Super admin from their grant, at an address outside the email domain', async () => {
		const { db, signIn } = await createTestSignIn();
		await grant(db, 'owner@personal.example', 'admin', true);

		const { actor } = await signIn('Owner@Personal.example');

		expect(actor).toMatchObject({ organizationId: TRIDENT, role: 'admin', isSuperAdmin: true });
	});

	it('gives a grant’s role over the email domain’s', async () => {
		const { db, signIn } = await createTestSignIn();
		await grant(db, 'lead@tridentcubed.com', 'manager');

		const { actor } = await signIn('lead@tridentcubed.com');

		expect(actor).toMatchObject({ organizationId: TRIDENT, role: 'manager' });
	});

	it('lets a verified address at the organization’s email domain in as Team, with no one inviting them', async () => {
		const { signIn } = await createTestSignIn();

		const { actor } = await signIn('deckhand@TridentCubed.com');

		expect(actor).toMatchObject({ organizationId: TRIDENT, role: 'team', isSuperAdmin: false });
	});

	it('keeps anyone else a Guest, with no membership', async () => {
		const { db, signIn } = await createTestSignIn();

		const { user, actor } = await signIn('someone@tridentcubed.com.example');

		expect(actor).toEqual({
			userId: user.id,
			email: 'someone@tridentcubed.com.example',
			organizationId: null,
			role: null,
			isSuperAdmin: false
		});
		const [memberships] = await db
			.select({ rows: count() })
			.from(schema.member)
			.where(eq(schema.member.userId, user.id));
		expect(memberships.rows).toBe(0);
	});

	it('changes nothing when a User signs in again: no second membership, no changed role', async () => {
		const { db, signIn } = await createTestSignIn();
		const first = await signIn('deckhand@tridentcubed.com');
		// An Admin made them a Manager since, and a grant now says Admin: their membership stays as it is.
		await db
			.update(schema.member)
			.set({ role: 'manager' })
			.where(eq(schema.member.userId, first.user.id));
		await grant(db, 'deckhand@tridentcubed.com', 'admin');

		const again = await signIn('deckhand@tridentcubed.com');

		expect(again.actor).toMatchObject({ organizationId: TRIDENT, role: 'manager' });
		const rows = await db
			.select({ role: schema.member.role })
			.from(schema.member)
			.where(eq(schema.member.userId, first.user.id));
		expect(rows).toEqual([{ role: 'manager' }]);
	});

	it('lets a Guest in at their next sign-in once they have a grant', async () => {
		const { db, signIn } = await createTestSignIn();
		const first = await signIn('visitor@elsewhere.example');
		expect(first.actor.organizationId).toBeNull();
		await grant(db, 'visitor@elsewhere.example', 'team');

		const again = await signIn('visitor@elsewhere.example');

		expect(again.actor).toMatchObject({ organizationId: TRIDENT, role: 'team' });
	});
});

describe('the one seed', () => {
	it('makes the Trident Cubed organization with its email domain', async () => {
		const { claims, signIn } = await createTestSignIn();
		const { actor } = await signIn('deckhand@tridentcubed.com');

		const seen = await claims.run(actor, async (tx) => ({
			organizations: await tx.select({ name: schema.organization.name }).from(schema.organization),
			details: await tx
				.select({ domain: schema.organizationDetails.emailDomain })
				.from(schema.organizationDetails)
		}));

		expect(seen).toEqual({
			organizations: [{ name: 'Trident Cubed' }],
			details: [{ domain: 'tridentcubed.com' }]
		});
	});
});

describe('a Guest', () => {
	it('gets nothing from any data request', async () => {
		const { claims, signIn } = await createTestSignIn();
		await signIn('deckhand@tridentcubed.com');
		const { actor } = await signIn('visitor@elsewhere.example');

		const seen = await claims.run(actor, async (tx) => ({
			organizations: await tx.select().from(schema.organization),
			details: await tx.select().from(schema.organizationDetails),
			members: await tx.select().from(schema.member),
			grants: await tx.select().from(schema.accessGrant)
		}));

		expect(seen).toEqual({ organizations: [], details: [], members: [], grants: [] });
	});
});

// The tie to a Team record (#185; spec #179 stories 16 to 18): a staff User is the Team record with their email, or
// the one their access grant names, or a new one made from their name, email and picture. The tied record's role is
// their membership's. Every email here is made up.
describe('the tie to a Team record', () => {
	type DbType = Awaited<ReturnType<typeof createTestSignIn>>['db'];

	async function addRecord(
		db: DbType,
		name: string,
		email: string,
		role: 'admin' | 'manager' | 'team'
	) {
		const id = crypto.randomUUID();
		await db.insert(schema.team).values({ id, organizationId: TRIDENT, name, email, role });
		return id;
	}

	async function recordsOf(db: DbType, userId: string) {
		return db
			.select({ id: schema.team.id, name: schema.team.name, role: schema.team.role })
			.from(schema.team)
			.where(eq(schema.team.userId, userId));
	}

	it('ties a staff User to the Team record with their email, whatever its capitals, with the role it showed', async () => {
		const { db, signIn } = await createTestSignIn();
		const id = await addRecord(db, 'Rosa Vega', 'R.Vega@TridentCubed.com', 'manager');

		const { user, actor } = await signIn('r.vega@tridentcubed.com');

		expect(actor).toMatchObject({ organizationId: TRIDENT, role: 'manager' });
		expect(await recordsOf(db, user.id)).toEqual([{ id, name: 'Rosa Vega', role: 'manager' }]);
	});

	it('ties a User to the Team record their access grant names, and gives the grant’s role', async () => {
		const { db, signIn } = await createTestSignIn();
		const id = await addRecord(db, 'Sam Ortiz', 's.ortiz@tridentcubed.com', 'team');
		await db.insert(schema.accessGrant).values({
			email: 'sam@personal.example',
			organizationId: TRIDENT,
			role: 'admin',
			isSuperAdmin: true,
			teamEmail: 'S.Ortiz@tridentcubed.com'
		});

		const { user, actor } = await signIn('sam@personal.example');

		expect(actor).toMatchObject({ organizationId: TRIDENT, role: 'admin', isSuperAdmin: true });
		expect(await recordsOf(db, user.id)).toEqual([{ id, name: 'Sam Ortiz', role: 'admin' }]);
		const named = await db.select().from(schema.team).where(eq(schema.team.name, 'Sam Ortiz'));
		expect(named).toHaveLength(1);
	});

	it('makes a new Team record from the User’s name, email and picture when none has their email', async () => {
		const { db, signInWith } = await createTestSignIn();

		const { user } = await signInWith('google', {
			sub: 'google-kim',
			email: 'kim.lee@tridentcubed.com',
			email_verified: true,
			name: 'Kim Lee',
			picture: 'https://example.com/kim.png'
		});

		const [record] = await db.select().from(schema.team).where(eq(schema.team.userId, user!.id));
		expect(record).toMatchObject({
			name: 'Kim Lee',
			email: 'kim.lee@tridentcubed.com',
			photo: 'https://example.com/kim.png',
			role: 'team'
		});
	});

	it('never duplicates a name: a new User named like a Team record gets a name of their own', async () => {
		const { db, signIn } = await createTestSignIn();
		await addRecord(db, 'Tom', 'tom.elsewhere@tridentcubed.com', 'team');

		const { user } = await signIn('tom@tridentcubed.com');

		const [record] = await recordsOf(db, user.id);
		expect(record.name).not.toBe('Tom');
		expect(record.name.toLowerCase()).toContain('tom');
		const names = (await db.select({ name: schema.team.name }).from(schema.team)).map((each) =>
			each.name.toLowerCase()
		);
		expect(new Set(names).size).toBe(names.length);
	});

	it('changes nothing when the User signs in again: the same record, edited since, and no second one', async () => {
		const { db, signIn } = await createTestSignIn();
		const id = await addRecord(db, 'Rosa Vega', 'r.vega@tridentcubed.com', 'team');
		const first = await signIn('r.vega@tridentcubed.com');
		await db.update(schema.team).set({ name: 'Rosa M. Vega' }).where(eq(schema.team.id, id));

		const again = await signIn('r.vega@tridentcubed.com');

		expect(again.actor.role).toBe('team');
		expect(await recordsOf(db, first.user.id)).toEqual([
			{ id, name: 'Rosa M. Vega', role: 'team' }
		]);
	});

	it('gives a Guest no Team record', async () => {
		const { db, signIn } = await createTestSignIn();

		const { user } = await signIn('visitor@elsewhere.example');

		expect(await recordsOf(db, user.id)).toEqual([]);
	});
});

// Access grants are typed into the database by hand (#194), so the database refuses one the sign-in rule would
// silently read as nothing: an email with capitals or spaces, a role that is not one, a domain with capitals. (The
// Team record's email a grant names is matched whatever its capitals, so it may have them.)
describe('what the database refuses of a grant typed by hand', () => {
	async function refusal(work: () => Promise<unknown>) {
		try {
			await work();
		} catch (error) {
			return String((error as { cause?: unknown }).cause ?? error);
		}
		return 'saved';
	}

	it('refuses an email with capitals or spaces and an unknown role, and takes a team email in any capitals', async () => {
		const { db } = await createTestSignIn();
		const insert = (values: Partial<typeof schema.accessGrant.$inferInsert>) =>
			refusal(() =>
				db.insert(schema.accessGrant).values({
					email: 'ok@personal.example',
					organizationId: TRIDENT,
					role: 'admin',
					...values
				})
			);

		expect(await insert({ email: 'Owner@Personal.example' })).toMatch(/check constraint/);
		expect(await insert({ email: ' owner@personal.example' })).toMatch(/check constraint/);
		expect(await insert({ role: 'Admin' as 'admin' })).toMatch(/check constraint/);
		expect(await insert({ role: 'owner' as 'admin' })).toMatch(/check constraint/);
		expect(await insert({ teamEmail: 'J.Doe@tridentcubed.com' })).toBe('saved');
	});

	it('refuses a membership or Team record with an unknown role, and an email domain with capitals or @', async () => {
		const { db, signIn } = await createTestSignIn();
		const { user } = await signIn('visitor@elsewhere.example');

		expect(
			await refusal(() =>
				db
					.insert(schema.member)
					.values({ organizationId: TRIDENT, userId: user.id, role: 'boss' as 'admin' })
			)
		).toMatch(/check constraint/);
		expect(
			await refusal(() =>
				db
					.update(schema.team)
					.set({ role: 'boss' as 'admin' })
					.where(eq(schema.team.organizationId, TRIDENT))
			)
		).toMatch(/check constraint/);
		for (const emailDomain of ['TridentCubed.com', '@tridentcubed.com'])
			expect(
				await refusal(() =>
					db
						.update(schema.organizationDetails)
						.set({ emailDomain })
						.where(eq(schema.organizationDetails.organizationId, TRIDENT))
				)
			).toMatch(/check constraint/);
	});
});

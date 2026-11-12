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

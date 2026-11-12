// The one seed (spec #179): the starting data every database begins with. The in-process database gets it when the
// server starts, and tests through `createTestSignIn()`; Supabase gets the same rows in the one initial load (#194),
// never from a Vercel build. Running it twice changes nothing. Later tickets add their starting rows here (the real
// customers #183, the organization's details #184, the team #185, the places). Access grants are never seeded:
// they are filled in the database only.
import type { DatabaseType } from './index';
import { organization, organizationDetails } from './organization.schema';

export const TRIDENT_CUBED = {
	id: 'f94512cb-9fa2-4581-a2c0-c63611ce2d9f',
	name: 'Trident Cubed',
	slug: 'trident-cubed',
	emailDomain: 'tridentcubed.com'
} as const;

export async function seedDatabase(db: DatabaseType) {
	const { id, name, slug, emailDomain } = TRIDENT_CUBED;
	await db.transaction(async (tx) => {
		await tx.insert(organization).values({ id, name, slug }).onConflictDoNothing();
		await tx
			.insert(organizationDetails)
			.values({ organizationId: id, emailDomain })
			.onConflictDoNothing();
	});
}

// The one seed (spec #179): the starting data every database begins with. The in-process database gets it when the
// server starts, and tests through `createTestSignIn()`; Supabase gets the same rows in the one initial load (#194),
// never from a Vercel build. Running it twice changes nothing. Later tickets add their starting rows here (the real
// customers #183, the organization's details and the places #184, the team #185). Access grants are never seeded:
// they are filled in the database only.
import { toStableId } from '#lib/rows/rows.utils.js';
import { ORGANIZATION } from '#lib/start/organization.js';
import { PLACES } from '#lib/start/places.js';
import { customer } from './customer.schema';
import type { DatabaseType } from './index';
import { disclaimerPoint, organizationDetails } from './details.schema';
import { organization } from './organization.schema';
import { place } from './place.schema';

export const TRIDENT_CUBED = {
	id: 'f94512cb-9fa2-4581-a2c0-c63611ce2d9f',
	name: 'Trident Cubed',
	slug: 'trident-cubed',
	emailDomain: 'tridentcubed.com'
} as const;

// The real customers (#183): [id, name, icon file, types, office city, short code]. The short codes are placeholders
// until the customers' own arrive. Icons and trimmed logos ship with the app (`src/lib/start/clients`) and are served
// at `/start/...` (routes/start). Ids are fixed, so seeding twice changes nothing.
const CUSTOMERS = [
	[
		'444021cf-3044-551d-b7c8-b7bef53ffa5c',
		'US Ocean',
		'us-ocean.png',
		'Ocean carrier',
		'Houston, TX',
		'USO'
	],
	[
		'981530d8-6aac-55cf-8ee6-81a86079ce0d',
		'KOGA',
		'koga.png',
		'Ocean carrier',
		'Houston, TX',
		'KOG'
	],
	[
		'f91a4408-4d0f-57cb-922d-63b22329d706',
		'dship Carriers',
		'dship-carriers.jpg',
		'Ocean carrier',
		'Houston, TX',
		'DSC'
	],
	[
		'9a24e777-d077-5cad-8874-d6b89ed95c89',
		'Oslo Caribbean Carrier',
		'oslo-caribbean-carrier.png',
		'Ocean carrier',
		'Houston, TX',
		'OCC'
	],
	[
		'3c299506-9878-5019-9c06-4abb500502d1',
		'UTC Overseas',
		'utc-overseas.jpg',
		'Freight forwarder',
		'Houston, TX',
		'UTC'
	],
	[
		'e6597928-9995-5789-a770-d7679fa3fee0',
		'CEVA Logistics',
		'ceva-logistics.jpg',
		'Freight forwarder',
		'Houston, TX',
		'CVA'
	],
	[
		'7308d24b-7648-50e5-b8be-fd6cb8e872eb',
		'DIX Shipping',
		'dix-industries.ico',
		'Stevedore, Terminal',
		'Brownsville, TX',
		'DIX'
	],
	[
		'70c57f12-5120-51ca-bb34-6275107f6f54',
		'Zurich North America',
		'zurich-north-america.jpg',
		'Insurer',
		'Schaumburg, IL',
		'ZNA'
	],
	[
		'76fb53f6-1712-56f9-9330-d67373b1e3e6',
		'AXA XL',
		'axa-xl.png',
		'Insurer',
		'Stamford, CT',
		'AXA'
	],
	[
		'baea6b49-f2f0-5609-8968-2a2b6b560e45',
		'Liberty Specialty Markets',
		'liberty-specialty-markets.png',
		'Insurer',
		'London, UK',
		'LSM'
	]
] as const;

// When the starting customers were made: a second apart, so they list in this order.
const SEEDED_AT = Date.parse('2026-11-12T00:00:00Z');

export async function seedDatabase(db: DatabaseType) {
	const { id, name, slug, emailDomain } = TRIDENT_CUBED;
	await db.transaction(async (tx) => {
		await tx.insert(organization).values({ id, name, slug }).onConflictDoNothing();
		await seedDetails(tx, id, emailDomain);
		await tx
			.insert(customer)
			.values(
				CUSTOMERS.map(([customerId, customerName, file, types, city, code], index) => {
					const icon = `/start/clients/${file}`;
					const logo = `/start/clients/trimmed/${file.replace(/\.\w+$/, '.png')}`;
					const at = new Date(SEEDED_AT + index * 1000);
					return {
						id: customerId,
						organizationId: id,
						name: customerName,
						types,
						city,
						code,
						icon,
						logo,
						createdAt: at,
						updatedAt: at
					};
				})
			)
			.onConflictDoNothing();
		await seedPlaces(tx, id);
	});
}

type SeedTransactionType = Parameters<Parameters<DatabaseType['transaction']>[0]>[0];

// The organization's real details and report wording (#184), one row with the organization's own id, and the
// disclaimer's points in order.
async function seedDetails(tx: SeedTransactionType, organizationId: string, emailDomain: string) {
	const { disclaimer, ...details } = ORGANIZATION;
	await tx
		.insert(organizationDetails)
		.values({
			id: organizationId,
			organizationId,
			emailDomain,
			logo: details.logo,
			address: details.address,
			phone: details.phone,
			email: details.email,
			groupEmail: details.groupEmail,
			website: details.website,
			disclaimerOpening: disclaimer.opening,
			disclaimerNote: disclaimer.note,
			closing: details.closing,
			signoff: details.signoff
		})
		.onConflictDoNothing();
	await tx
		.insert(disclaimerPoint)
		.values(
			disclaimer.points.map((point, position) => ({
				id: toStableId(organizationId, 'disclaimer point', String(position + 1)),
				organizationId,
				detailsId: organizationId,
				position,
				title: point.title,
				text: point.text
			}))
		)
		.onConflictDoNothing();
}

// The starting places (#184), a second apart so they list in this order. A place's id is worked out from its name,
// as the app does for a place it saves.
async function seedPlaces(tx: SeedTransactionType, organizationId: string) {
	await tx
		.insert(place)
		.values(
			Object.entries(PLACES).map(([name, [longitude, latitude]], index) => {
				const at = new Date(SEEDED_AT + index * 1000);
				return {
					id: toStableId(organizationId, 'place', name.toLowerCase()),
					organizationId,
					name,
					latitude,
					longitude,
					createdAt: at,
					updatedAt: at
				};
			})
		)
		.onConflictDoNothing();
}

// The one seed (spec #179): the starting data every database begins with. The in-process database gets it when the
// server starts, and tests through `createTestSignIn()`; Supabase gets the same rows in the one initial load (#194),
// never from a Vercel build. Running it twice changes nothing. Later tickets add their starting rows here (the real
// customers #183, the organization's details and the places #184, the team #185). Access grants are never seeded:
// they are filled in the database only.
import { sql } from 'drizzle-orm';
import { toStableId } from '#lib/rows/rows.utils.js';
import { ORGANIZATION } from '#lib/start/organization.js';
import { PLACES } from '#lib/start/places.js';
import { customer } from './customer.schema';
import type { DatabaseType } from './index';
import { disclaimerPoint, organizationDetails } from './details.schema';
import { organization } from './organization.schema';
import { place } from './place.schema';
import { team } from './team.schema';

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

// The real team (#185), from the team sheet in Justin's Drive (he chose to show their work phones and emails, 2026-10-21):
// [id, name, title, labels, role, rank, phone, email, location, profile link, photo file]. Photos ship with the app
// (`src/lib/start/team`) and are served at `/start/team/...`; two have none yet. Ids are uuid5 of `team/<name>` under
// the organization's id, so seeding twice changes nothing. A staff User signing in with one of these emails is tied
// to that record and takes its role (`#lib/server/access.ts`).
const TEAM = [
	[
		'361c87a6-0121-5fe5-b4a9-598f7da4f63b',
		'Capt. Cezary Poninski',
		'Partner / Head of Finance',
		'Partner, Finance',
		'admin',
		1,
		'+1 (570) 575-1179',
		'C.Poninski@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/cezary-poninski-455b8665',
		'cezary-poninski-profile.webp'
	],
	[
		'e08f47f9-fdce-5439-b52d-59664f9a82c0',
		'Duncan Cooke',
		'Partner / Head of Engineering',
		'Partner, Engineering',
		'admin',
		1,
		'+1 (609) 947-5219',
		'D.Cooke@TridentCubed.com',
		'Fort Myers, FL',
		'https://www.linkedin.com/in/duncan-cooke-780a09113',
		'duncan-cooke-profile.webp'
	],
	[
		'cd2a31e8-da4b-5bd0-8d1b-70761de4ab3e',
		'Michael Boone',
		'Partner / Business Development',
		'Partner, Business',
		'admin',
		1,
		'+1 (409) 543-2725',
		'M.Boone@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/michael-boone-79350757',
		'michael-boone-profile.webp'
	],
	[
		'11321ce9-3f95-5ef2-b4c0-8ce08f0f0786',
		'Capt. Hector Ramirez',
		'Partner / Head of Projects',
		'Partner, Projects',
		'admin',
		1,
		'+1 (832) 477-6974',
		'H.Ramirez@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/hector-ramirez-15860543',
		'hector-ramirez-profile.webp'
	],
	[
		'a02d3446-386b-5117-9e12-98273f52b6ce',
		'Justin ONeill',
		'Frontend Developer',
		'Developer',
		'admin',
		1,
		'+1 (512) 663-5940',
		'J.ONeill@TridentCubed.com',
		'Beaumont, TX',
		'https://www.linkedin.com/in/oneezy',
		'justin-oneill-profile.webp'
	],
	[
		'92e34e06-4f80-5778-8259-ccdc7b76310c',
		'Oziel Lara',
		'Operations Manager',
		'Operations, Manager',
		'manager',
		2,
		'+1 (832) 296-4324',
		'O.Lara@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/oziel-l-a31651222',
		''
	],
	[
		'33567f6e-b729-5952-af38-0138ebe97433',
		'Collin Tippit',
		'Port Captain / Marine Surveyor',
		'Port Captain, Marine Surveyor',
		'manager',
		2,
		'+1 (832) 684-7955',
		'C.Tippit@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/collin-tippit-26aa5798',
		'collin-tippit-linkedin-updated.webp'
	],
	[
		'ab9389cd-1dd1-5a77-8abb-25e226b82b67',
		'Gustavo Ruiz',
		'Field Specialist',
		'Field Specialist',
		'manager',
		2,
		'+52 833-1065391',
		'G.Ruiz@TridentCubed.com',
		'Tampico, TAM',
		'https://www.linkedin.com/in/gustavo-ruiz-842578328',
		'gustavo-ruiz-linkedin-updated.webp'
	],
	[
		'a3e79ffe-9f04-5ec4-a988-17f827497c2b',
		'Alfredo Llanes',
		'Port Captain / Marine Surveyor',
		'Port Captain, Marine Surveyor',
		'manager',
		2,
		'+1 (832) 349-0099',
		'A.Llanes@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/alfredo-llanes-34902159',
		'alfredo-llanes-linkedin-updated.webp'
	],
	[
		'a4299618-1fb4-5a75-8248-8eac42fb13d8',
		'Tynequa Shaw',
		'Field Specialist / Junior Surveyor',
		'Field Specialist, Junior Surveyor',
		'team',
		3,
		'+1 (832) 493-1406',
		'T.Shaw@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/tynequa-shaw-3a893b385',
		'tynequa-shaw-linkedin-updated.webp'
	],
	[
		'c10a36ff-b548-5e8b-aaae-2e3f6ac8d849',
		'Juan David Arias',
		'Junior Project Engineer',
		'Engineering, Project Engineer',
		'team',
		3,
		'+57 316-049-7396',
		'J.Arias@TridentCubed.com',
		'Cartagena De Indias',
		'https://www.linkedin.com/in/ariasjd',
		'juan-david-arias-linkedin-updated.webp'
	],
	[
		'28a02d0e-3cca-5d6f-b9cc-8f6e1350e759',
		'Aaron Davis',
		'Field Specialist / Marine Surveyor',
		'Field Specialist, Marine Surveyor',
		'team',
		3,
		'+1 (832) 683-3321',
		'A.Davis@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/pc-aarondavis/',
		'aaron-davis-linkedin-updated.webp'
	],
	[
		'5da6c662-7389-58cb-910e-fa3a32dcf650',
		'Orlando Alexander',
		'Field Engineer / Marine Surveyor',
		'Field Engineer, Marine Surveyor',
		'team',
		3,
		'+592-684-3209',
		'O.Alexander@TridentCubed.com',
		'Georgetown, GY',
		'https://www.linkedin.com/in/orlando-alexander-247987268/',
		'orlando-alexander-linkedin-updated.webp'
	],
	[
		'83fa2adb-ad5b-5514-9713-f380a3cc4180',
		'Chris Fox',
		'Field Specialist / Surveyor',
		'Field Specialist, Surveyor',
		'team',
		3,
		'+1 (832) 392-4145',
		'C.Fox@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/chris-fox-857015115/',
		''
	],
	[
		'5559b54e-d40d-5b00-9346-a08e6c66b0fc',
		'Ian Derda',
		'Field Specialist / Junior Surveyor',
		'Field Specialist, Junior Surveyor',
		'team',
		3,
		'+1 (281) 770-0191',
		'I.Derda@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/ian-derda-99b24226b/',
		'ian-derda-linkedin-updated.webp'
	],
	[
		'6236d29f-b8bc-5bca-b72c-d958403522f1',
		'Capt. Jim DeStefano',
		'Senior Port Captain',
		'Port Captain',
		'manager',
		2,
		'+1 (832) 392-6554',
		'J.DeStefano@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/jim-destefano-67b868297/',
		'jim-destefano-linkedin-updated.webp'
	],
	[
		'd72647c3-2c0d-5798-885b-2d3df9b58f5e',
		'Natzul Reyes Flores',
		'Junior Planner / Surveyor',
		'Planner, Surveyor',
		'team',
		3,
		'+1 (832) 523-7047',
		'N.Reyes@TridentCubed.com',
		'Houston, TX',
		'https://www.linkedin.com/in/natzul-reyes-206a2b80/',
		'natzul-reyes-flores-linkedin-updated.webp'
	]
] as const;

export async function seedTeam(db: DatabaseType) {
	const { id } = TRIDENT_CUBED;
	await db
		.insert(team)
		.values(
			TEAM.map(
				([teamId, name, title, labels, role, rank, phone, email, location, link, file], index) => {
					const at = new Date(SEEDED_AT + index * 1000);
					const photo = file ? `/start/team/${file}` : '';
					return {
						id: teamId,
						organizationId: id,
						name,
						title,
						labels,
						role,
						rank,
						phone,
						email,
						location,
						link,
						photo,
						createdAt: at,
						updatedAt: at
					};
				}
			)
		)
		.onConflictDoNothing();
}

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
	await seedTeam(db);
}

/** The tables the seed fills, parents first: the order its SQL inserts them in. */
export const SEED_TABLES = [
	'organization',
	'organization_details',
	'disclaimer_point',
	'customer',
	'place',
	'team'
] as const;

/**
 * The seed as SQL (#194: Supabase takes its starting rows through the connector, SQL only), from the seed itself:
 * `db` (a fresh in-process database) is seeded, and each table's rows are printed as one insert that skips a row
 * already there, so running it twice changes nothing and the ids are the seed's. Access grants are never in it.
 * Print it with `pnpm --silent --filter app db:seed-sql`.
 */
export async function toSeedSql(db: DatabaseType) {
	await seedDatabase(db);
	const lines = [
		'-- The one seed (apps/app/src/lib/server/db/seed.ts), printed by `pnpm --silent --filter app db:seed-sql`.',
		'-- Safe to run twice: a row already there is skipped.'
	];
	for (const table of SEED_TABLES) {
		const found: unknown = await db.execute(
			sql.raw(
				`select coalesce(jsonb_agg(t order by t.created_at, t.id), '[]')::text as rows from public."${table}" t`
			)
		);
		// PGlite answers `{ rows }`, postgres-js the rows themselves.
		const [{ rows }] = (Array.isArray(found) ? found : (found as { rows: unknown[] }).rows) as {
			rows: string;
		}[];
		lines.push(
			`insert into public."${table}" select * from jsonb_populate_recordset(null::public."${table}", '${rows.replaceAll("'", "''")}') on conflict do nothing;`
		);
	}
	return `${lines.join('\n')}\n`;
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

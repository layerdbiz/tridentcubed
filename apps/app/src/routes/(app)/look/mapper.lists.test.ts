// The save round trip for the organization's other lists (spec #179 Testing Decisions; #184): Transport Modes,
// Facilities, saved places and the organization's own details, through the mapper, the save command's work as an
// acting User, the in-process Postgres with the real schema and policies, and back. The helpers are mapper.test.ts's.
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import * as schema from '#lib/server/db/schema.js';
import { readRows, saveBatch } from '#lib/server/rows.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { draftOf, type FacilityType, type TransportType } from './look.data';
import { LookState } from './look.state.svelte';
import {
	takeRows,
	toFacilityId,
	toFacilityName,
	toRows,
	toTransportId,
	toTransportName
} from './mapper';

type TestType = Awaited<ReturnType<typeof createTestSignIn>>;

let test: TestType;
let team: ActorType;

beforeEach(async () => {
	test = await createTestSignIn();
	team = (await test.signIn('tom@tridentcubed.com')).actor;
});

async function open(actor: ActorType) {
	const look = new LookState();
	takeRows(look, await readRows(test.claims, actor));
	return { look, confirmed: toRows(look) };
}

async function save(device: { look: LookState; confirmed: RowType[] }, actor: ActorType) {
	const changes = toChanges(device.confirmed, toRows(device.look));
	const result = await saveBatch(test.claims, actor, { changes });
	if (result.isSaved) device.confirmed = toRows(device.look);
	return { result, changes };
}

async function signInAs(email: string, role: 'admin' | 'manager') {
	await test.db
		.insert(schema.accessGrant)
		.values({ email, organizationId: team.organizationId!, role });
	return (await test.signIn(email)).actor;
}

function addTransport(look: LookState, name: string, mode = 'Vessel') {
	const draft = draftOf('transport') as TransportType;
	draft.name = name;
	draft.mode = mode;
	expect(look.add('transport', draft)).toBe(true);
}

function addFacility(look: LookState, name: string) {
	const draft = draftOf('facilities') as FacilityType;
	draft.name = name;
	draft.kind = 'Port';
	draft.city = 'Houston, TX';
	expect(look.add('facilities', draft)).toBe(true);
}

const LIST_TABLES = [
	'transport',
	'facility',
	'place',
	'organization',
	'organization_details',
	'disclaimer_point'
];

// The rows of the tables this file is about (a member's first sign-in adds their own Team row, #185).
function listRows(look: LookState) {
	return toRows(look).filter((row) => LIST_TABLES.includes(row.table));
}

// What a screen shows of a record, without the times only the server knows.
function shown<T extends { created?: string; updated?: string }>(item: T | undefined) {
	const { created: _created, updated: _updated, ...rest } = item ?? ({} as T);
	return rest;
}

function transportOf(look: LookState, name: string) {
	return shown(look.transports.find((transport) => transport.name === name));
}

function facilityOf(look: LookState, name: string) {
	return shown(look.facilities.find((facility) => facility.name === name));
}

describe('Transport Modes', () => {
	it('starts with none: the seed has no sample transports', async () => {
		const { look } = await open(team);

		expect(look.transports).toEqual([]);
	});

	it('saves a new one with its picture and particulars, and another member sees the same', async () => {
		const mine = await open(team);
		addTransport(mine.look, 'MV Ocean Star');
		mine.look.patch('transport', 'MV Ocean Star', {
			photo: 'data:image/webp;base64,AAAA',
			details: { 'IMO number': '9321483', Flag: 'Panama' }
		});

		const { result } = await save(mine, team);
		const theirs = await open((await test.signIn('mia@tridentcubed.com')).actor);

		expect(result).toEqual({ isSaved: true });
		expect(transportOf(theirs.look, 'MV Ocean Star')).toEqual({
			id: expect.any(String),
			name: 'MV Ocean Star',
			type: 'Sea',
			mode: 'Vessel',
			source: 'manual',
			photo: 'data:image/webp;base64,AAAA',
			details: { 'IMO number': '9321483', Flag: 'Panama' }
		});
		expect(listRows(theirs.look)).toEqual(listRows(mine.look));
	});

	it('reads its type from its mode, and keeps only the particulars its mode has', async () => {
		const device = await open(team);
		addTransport(device.look, 'Rig 7', 'Truck');
		device.look.patch('transport', 'Rig 7', {
			details: { 'Plate number': 'TX 123', 'IMO number': 'not a truck’s' }
		});
		await save(device, team);
		device.look.patch('transport', 'Rig 7', { mode: 'Plane', type: 'Air' });
		device.look.patch('transport', 'Rig 7', {
			details: { 'Plate number': 'TX 123', Registration: 'N123TC' }
		});
		await save(device, team);

		const again = await open(team);

		expect(transportOf(again.look, 'Rig 7')).toMatchObject({
			mode: 'Plane',
			type: 'Air',
			details: { Registration: 'N123TC' }
		});
	});

	it('keeps a renamed one as the same row, sends nothing more once saved, and moves a deleted one to the Trash', async () => {
		const device = await open(team);
		addTransport(device.look, 'MV Ocean Star');
		await save(device, team);
		const id = toTransportId(device.look, 'MV Ocean Star');

		device.look.rename('transport', 'MV Ocean Star', 'MV Ocean Queen');
		await save(device, team);
		const renamed = await open(team);
		renamed.look.removeRecord('transport', 'MV Ocean Queen');
		await save(renamed, team);
		const again = await open(team);
		const [row] = await test.db.select().from(schema.transport).where(eq(schema.transport.id, id!));

		expect(toTransportName(renamed.look, id!)).toBe('MV Ocean Queen');
		expect(toChanges(renamed.confirmed, toRows(renamed.look))).toEqual([]);
		expect(again.look.transports).toEqual([]);
		expect(toTransportName(again.look, id!)).toBe('MV Ocean Queen');
		expect(row.deletedAt).toBeInstanceOf(Date);
	});

	it('refuses a second one with the same name whatever its capitals', async () => {
		const device = await open(team);
		const other = await open(team);
		addTransport(device.look, 'MV Ocean Star');
		await save(device, team);
		addTransport(other.look, 'mv ocean star');

		const { result } = await save(other, team);

		expect(result).toMatchObject({ isSaved: false, reason: 'mv ocean star is already there.' });
	});
});

describe('Facilities', () => {
	it('starts with none: the seed has no sample facilities', async () => {
		const { look } = await open(team);

		expect(look.facilities).toEqual([]);
	});

	it('saves a new one with every field, an edit and a rename, and another member sees the same', async () => {
		const mine = await open(team);
		addFacility(mine.look, 'Port of Houston');
		mine.look.patch('facilities', 'Port of Houston', {
			address: '111 East Loop N, Houston, TX 77029',
			photo: 'data:image/webp;base64,BBBB',
			contact: 'Dana Wharf',
			phone: '+1 713 555 0100',
			email: 'dana@porthouston.example'
		});
		await save(mine, team);
		const id = toFacilityId(mine.look, 'Port of Houston');
		mine.look.rename('facilities', 'Port of Houston', 'Port Houston');
		mine.look.patch('facilities', 'Port Houston', { kind: 'Depot' });

		const { changes } = await save(mine, team);
		const theirs = await open((await test.signIn('mia@tridentcubed.com')).actor);

		expect(changes.map(({ table, values }) => ({ table, values }))).toEqual([
			{ table: 'facility', values: { name: 'Port Houston', kind: 'Depot' } }
		]);
		expect(facilityOf(theirs.look, 'Port Houston')).toEqual({
			id,
			name: 'Port Houston',
			kind: 'Depot',
			city: 'Houston, TX',
			address: '111 East Loop N, Houston, TX 77029',
			photo: 'data:image/webp;base64,BBBB',
			contact: 'Dana Wharf',
			phone: '+1 713 555 0100',
			email: 'dana@porthouston.example'
		});
		expect(listRows(theirs.look)).toEqual(listRows(mine.look));
	});

	it('moves a deleted one to the Trash, where a project can still find its name, and frees the name', async () => {
		const device = await open(team);
		addFacility(device.look, 'Port of Houston');
		await save(device, team);
		const id = toFacilityId(device.look, 'Port of Houston');

		device.look.removeRecord('facilities', 'Port of Houston');
		await save(device, team);
		const again = await open(team);
		addFacility(again.look, 'Port of Houston');
		const { result } = await save(again, team);

		expect(toFacilityName(again.look, id!)).toBe('Port of Houston');
		expect(result).toEqual({ isSaved: true });
		expect(again.look.facilities.map((facility) => facility.name)).toEqual(['Port of Houston']);
	});
});

describe('places', () => {
	it('loads the starting places from the seed', async () => {
		const { look } = await open(team);

		expect(look.places).toHaveLength(30);
		expect(look.placeOf('houston, tx')).toMatchObject({
			name: 'Houston, TX',
			lat: 29.7604,
			lng: -95.3698
		});
	});

	it('saves a picked place once, and offers it to every member', async () => {
		const mine = await open(team);
		const theirs = await open((await test.signIn('mia@tridentcubed.com')).actor);
		const paris = { name: 'Paris, France', lat: 48.8566, lng: 2.3522, detail: 'Paris, France' };

		mine.look.keepPlace(paris);
		mine.look.keepPlace({ ...paris, name: 'PARIS, FRANCE' });
		theirs.look.keepPlace(paris);
		const first = await save(mine, team);
		const second = await save(theirs, team);
		const again = await open(team);

		expect(first.result).toEqual({ isSaved: true });
		expect(second.result).toEqual({ isSaved: true });
		expect(again.look.places.filter((place) => place.name === 'Paris, France')).toEqual([
			{ ...paris, id: expect.any(String), created: expect.any(String) }
		]);
		expect(listRows(again.look)).toEqual(listRows(mine.look));
	});
});

describe('the organization', () => {
	it('loads its real details and disclaimer points from the seed', async () => {
		const { look } = await open(team);

		expect(look.organization).toMatchObject({
			name: 'Trident Cubed',
			address: '800 Town and Country, Ste 500, Houston, TX 77024',
			email: 'operations@tridentcubed.com',
			signoff: 'Best Regards,'
		});
		expect(look.organization.disclaimer.points.map((point) => point.title)).toEqual([
			'Scope Limitation',
			'No Warranty',
			'Use Limitation',
			'Liability Limitation',
			'Accuracy of Information',
			'Right to Amend',
			'Legal Context',
			'No Endorsement'
		]);
	});

	it('saves an Admin’s changes to its name, details, points in order, closing line and sign-off', async () => {
		const admin = await signInAs('ada@tridentcubed.com', 'admin');
		const device = await open(admin);
		const { organization } = device.look;
		const [first, second, third] = organization.disclaimer.points;

		device.look.nameOrganization('Trident Cubed, LLC');
		organization.phone = '+1 409 000 0000';
		organization.disclaimer.points = [
			third,
			{ ...first, text: 'Seen, not taken apart.' },
			{ id: crypto.randomUUID(), title: 'Weather', text: 'Rain stops a survey.' }
		];
		organization.closing = 'Thank you.';
		organization.signoff = 'Kind regards,';
		const { result } = await save(device, admin);
		const again = await open(team);

		expect(result).toEqual({ isSaved: true });
		expect(again.look.organization).toMatchObject({
			name: 'Trident Cubed, LLC',
			phone: '+1 409 000 0000',
			closing: 'Thank you.',
			signoff: 'Kind regards,'
		});
		expect(again.look.organization.disclaimer.points).toEqual([
			third,
			{ ...first, text: 'Seen, not taken apart.' },
			{ id: expect.any(String), title: 'Weather', text: 'Rain stops a survey.' }
		]);
		expect(again.look.organization.disclaimer.points).not.toContainEqual(second);
		expect(listRows(again.look)).toEqual(listRows(device.look));
	});

	it('refuses Manager and Team, on the server, and changes nothing', async () => {
		const manager = await signInAs('mia@tridentcubed.com', 'manager');
		const changes = [
			(look: LookState) => look.nameOrganization('Taken over'),
			(look: LookState) => (look.organization.website = 'example.com'),
			(look: LookState) => look.organization.disclaimer.points.pop(),
			(look: LookState) => (look.organization.disclaimer.points[0].title = 'Changed')
		];

		for (const actor of [team, manager])
			for (const change of changes) {
				const device = await open(actor);
				change(device.look);

				const { result } = await save(device, actor);

				expect(result).toMatchObject({
					isSaved: false,
					reason: 'Only an Admin can change the organization.'
				});
			}
		const again = await open(team);

		expect(again.look.organization.name).toBe('Trident Cubed');
		expect(again.look.organization.website).toBe('tridentcubed.com');
		expect(again.look.organization.disclaimer.points).toHaveLength(8);
		expect(again.look.organization.disclaimer.points[0].title).toBe('Scope Limitation');
	});
});

describe('Row Level Security', () => {
	it('keeps another organization’s transports, facilities, places and details from it', async () => {
		const device = await open(team);
		addTransport(device.look, 'MV Ocean Star');
		addFacility(device.look, 'Port of Houston');
		await save(device, team);
		const elsewhere = { userId: team.userId, organizationId: crypto.randomUUID() };
		await test.db
			.insert(schema.organization)
			.values({ id: elsewhere.organizationId, name: 'Elsewhere', slug: 'elsewhere' });

		const seen = await test.claims.run(elsewhere, async (tx) => ({
			transports: await tx.select().from(schema.transport),
			facilities: await tx.select().from(schema.facility),
			places: await tx.select().from(schema.place),
			details: await tx.select().from(schema.organizationDetails),
			points: await tx.select().from(schema.disclaimerPoint)
		}));

		expect(seen).toEqual({ transports: [], facilities: [], places: [], details: [], points: [] });
	});
});

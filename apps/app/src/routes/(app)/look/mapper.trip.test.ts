// The save round trip for the trip, the items and the time log (spec #179 Testing Decisions, stories 54 to 56, 58
// and 59; #188): the Transport Mode, Items and Time Log panels through the mapper, the save command's work as an
// acting User, the in-process Postgres with the real schema and policies, the lists query and a project's own query,
// and the mapper again. What is checked is what another device or member would see: the legs and their facilities
// in order, the items and their attachments, the days and their entries, the route and percent, and the server's
// freeze of a Sent, Complete or Archived project. The helpers are mapper.projects.test.ts's.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { UploadRequestType } from '#lib/files/files.schema.js';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges, toMerged } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import * as schema from '#lib/server/db/schema.js';
import { TRIDENT_CUBED } from '#lib/server/db/seed.js';
import { createUpload } from '#lib/server/files.js';
import { readProject, readRows, saveBatch } from '#lib/server/rows.js';
import { createLocalStore } from '#lib/server/store.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { addLeg, addRow, moveRow, setTransport } from './legs';
import {
	draftOf,
	draftPanel,
	itemOf,
	routeOf,
	stopOf,
	typeOfMode,
	type FacilityType,
	type PanelType,
	type TransportType
} from './look.data';
import { LookState, metricsOf } from './look.state.svelte';
import { isOfProject, takeProject, takeReads, takeRows, toRows } from './mapper';

type TestType = Awaited<ReturnType<typeof createTestSignIn>>;
type DeviceType = { look: LookState; confirmed: RowType[]; actor: ActorType };

let test: TestType;
let tom: ActorType;
let mia: ActorType;

beforeEach(async () => {
	test = await createTestSignIn();
	tom = (await test.signIn('tom@tridentcubed.com')).actor;
	mia = (await test.signIn('mia@tridentcubed.com')).actor;
});

async function signInAdmin() {
	await test.db
		.insert(schema.accessGrant)
		.values({ email: 'ada@tridentcubed.com', organizationId: TRIDENT_CUBED.id, role: 'admin' });
	return (await test.signIn('ada@tridentcubed.com')).actor;
}

// A device of the signed-in `actor`, as the lists left it when the app started.
async function open(actor: ActorType): Promise<DeviceType> {
	const look = new LookState();
	look.userId = actor.userId;
	look.role = actor.role ?? '';
	takeRows(look, await readRows(test.claims, actor));
	return { look, confirmed: toRows(look), actor };
}

// Opening a project on a device: its rows load and count as confirmed (the sync loop's `merge`).
async function openProject(device: DeviceType, id: string) {
	const found = await readProject(test.claims, device.actor, id);
	if (!found.isFound) throw new Error(found.reason);
	const rows = [found.project, ...found.rows];
	takeProject(device.look, id, rows);
	device.confirmed = toMerged(device.confirmed, rows, isOfProject(id));
	device.look.open(id, 'edit');
}

// The sync loop's one step: send the difference since the last confirmed rows.
async function save(device: DeviceType) {
	const changes = toChanges(device.confirmed, toRows(device.look));
	const result = await saveBatch(test.claims, device.actor, { changes });
	if (result.isSaved) {
		device.confirmed = toRows(device.look);
		if (result.reads) takeReads(device.look, result.reads);
	}
	return { result, changes };
}

// The + sheet: a new project from its Project panel, the signed-in person as Team Lead.
function create(look: LookState, title = 'BBC Kimberly') {
	const draft = draftPanel(look.organization.name, look.me?.name ?? '');
	const field = draft.fields.find((item) => item.label === 'Title');
	if (field) field.value = title;
	look.create(draft);
	return look.projectId;
}

function panelOf(look: LookState, kind: PanelType['kind'], id = look.projectId) {
	return look.workspaces[id].find((panel) => panel.kind === kind) as PanelType;
}

function addTransport(look: LookState, name: string, mode: string) {
	const draft = draftOf('transport') as TransportType;
	draft.name = name;
	draft.mode = mode;
	draft.type = typeOfMode(mode) ?? 'Sea';
	expect(look.add('transport', draft)).toBe(true);
}

function addFacility(look: LookState, name: string, city: string) {
	const draft = draftOf('facilities') as FacilityType;
	draft.name = name;
	draft.kind = 'Port';
	draft.city = city;
	expect(look.add('facilities', draft)).toBe(true);
}

// The trip as the Transport Mode panel builds it: a vessel calling at three ports, then a truck from the last to a
// depot.
function buildTrip(look: LookState) {
	addTransport(look, 'MV Coral Dawn', 'Vessel');
	addTransport(look, 'Truck 12', 'Truck');
	addFacility(look, 'Port of Houston', 'Houston, TX');
	addFacility(look, 'Port of Mobile', 'Mobile, AL');
	addFacility(look, 'Port of Tampa', 'Tampa, FL');
	addFacility(look, 'Tampa Depot', 'Tampa, FL');
	const { stops } = panelOf(look, 'transport');
	const [first] = stops;
	first.facility = 'Port of Houston';
	first.point = 'Start';
	const vessel = (() => {
		addRow(stops, stops[0].leg ?? `leg-${first.id}`, stopOf);
		return stops[0].leg!;
	})();
	setTransport(stops, vessel, { mode: 'Vessel', type: 'Sea', name: 'MV Coral Dawn' });
	stops[1].facility = 'Port of Tampa';
	addRow(stops, vessel, stopOf);
	stops[1].facility = 'Port of Mobile';
	const truck = addLeg(stops, stopOf);
	setTransport(stops, truck, { mode: 'Truck', type: 'Road', name: 'Truck 12' });
	addRow(stops, truck, stopOf);
	stops[4].facility = 'Tampa Depot';
	return { vessel, truck };
}

// What a stop shows: its point, leg, mode, type, transport and facility.
function tripOf(look: LookState, id = look.projectId) {
	return panelOf(look, 'transport', id).stops.map((stop) => ({
		id: stop.id,
		point: stop.point,
		leg: stop.leg,
		type: stop.type,
		mode: stop.mode,
		name: stop.name,
		facility: stop.facility
	}));
}

describe('the trip', () => {
	it('saves the legs and their facilities in order, and another member sees the same trip and route', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const { vessel, truck } = buildTrip(mine.look);
		const trip = tripOf(mine.look);
		expect(trip.map((stop) => [stop.point, stop.name, stop.facility])).toEqual([
			['Start', 'MV Coral Dawn', 'Port of Houston'],
			['Stop', 'MV Coral Dawn', 'Port of Mobile'],
			['End', 'MV Coral Dawn', 'Port of Tampa'],
			['Start', 'Truck 12', 'Port of Tampa'],
			['End', 'Truck 12', 'Tampa Depot']
		]);
		expect(trip.map((stop) => stop.leg)).toEqual([vessel, vessel, vessel, truck, truck]);

		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		const listed = theirs.look.projects.find((project) => project.id === id)!;
		expect(routeOf(listed, theirs.look.facilities)).toEqual({
			from: 'Houston, TX',
			to: 'Tampa, FL'
		});
		expect(listed.stops.map((stop) => stop.facility)).toEqual([
			'Port of Houston',
			'Port of Mobile',
			'Port of Tampa',
			'Port of Tampa',
			'Tampa Depot'
		]);

		await openProject(theirs, id);
		expect(tripOf(theirs.look)).toEqual(trip);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

describe('the items', () => {
	it('saves the item rows and the attached photo and spreadsheet in order, and another member sees them', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const panel = panelOf(mine.look, 'items');
		panel.items[0].quantity = '2';
		panel.items[0].description = 'Transformers';
		panel.items.push(itemOf('27', 'Accessory crates'), itemOf('', 'Spare parts'));
		const photo = crypto.randomUUID();
		const sheet = crypto.randomUUID();
		panel.attachments = [
			{ id: photo, name: 'list.jpg', src: `/files/${crypto.randomUUID()}`, kind: 'photo' },
			{ id: sheet, name: 'manifest.xlsx', src: `/files/${crypto.randomUUID()}`, kind: 'file' }
		];
		const items = JSON.parse(JSON.stringify(panel.items));
		const attachments = JSON.parse(JSON.stringify(panel.attachments));

		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);
		expect(panelOf(theirs.look, 'items').items).toEqual(items);
		expect(panelOf(theirs.look, 'items').attachments).toEqual(attachments);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		// Taken out and moved: the rest come back in the new order.
		const shown = panelOf(theirs.look, 'items');
		shown.items.splice(1, 1);
		shown.items.reverse();
		shown.attachments!.reverse();
		expect((await save(theirs)).result.isSaved).toBe(true);
		const again = await open(tom);
		await openProject(again, id);
		expect(panelOf(again.look, 'items').items.map((item) => item.description)).toEqual([
			'Spare parts',
			'Transformers'
		]);
		expect(panelOf(again.look, 'items').attachments?.map((file) => file.id)).toEqual([
			sheet,
			photo
		]);
	});
});

describe('the time log', () => {
	it('saves the days and their entries in order, and keeps a day or entry moved', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const panel = panelOf(mine.look, 'timelog');
		const entry = (time: string, activity: string) => ({
			id: crypto.randomUUID(),
			time,
			activity
		});
		panel.days.push(
			{
				id: crypto.randomUUID(),
				date: '2026-11-03',
				entries: [entry('07:30', 'Arrived alongside'), entry('09:00', 'Hatch 2 opened')]
			},
			{ id: crypto.randomUUID(), date: '2026-11-04', entries: [entry('', '')] },
			{ id: crypto.randomUUID(), date: '', entries: [] }
		);
		const days = JSON.parse(JSON.stringify(panel.days));

		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);
		expect(panelOf(theirs.look, 'timelog').days).toEqual(days);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		// An entry dragged above another and a day moved: still so after a reload.
		const shown = panelOf(theirs.look, 'timelog');
		shown.days[0].entries.reverse();
		shown.days.splice(0, 0, shown.days.splice(1, 1)[0]);
		expect((await save(theirs)).result.isSaved).toBe(true);
		const again = await open(tom);
		await openProject(again, id);
		const back = panelOf(again.look, 'timelog').days;
		expect(back.map((day) => day.date)).toEqual(['2026-11-04', '2026-11-03', '']);
		expect(back[1].entries.map((item) => item.activity)).toEqual([
			'Hatch 2 opened',
			'Arrived alongside'
		]);
	});
});

describe('order and percent', () => {
	it('keeps a stop dragged to a new place on its leg after a reload, its points following the order', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const { vessel } = buildTrip(mine.look);
		await save(mine);

		moveRow(panelOf(mine.look, 'transport').stops, vessel, 2, 0);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);
		expect(tripOf(theirs.look).map((stop) => [stop.point, stop.facility])).toEqual([
			['Start', 'Port of Tampa'],
			['Stop', 'Port of Houston'],
			['End', 'Port of Mobile'],
			['Start', 'Port of Tampa'],
			['End', 'Tampa Depot']
		]);
	});

	it('gives a second member the same percent and panel statuses once the panels’ rows load', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		buildTrip(mine.look);
		const items = panelOf(mine.look, 'items');
		items.items[0].quantity = '2';
		items.items[0].description = 'Transformers';
		items.items.push(itemOf('', 'Crates'));
		panelOf(mine.look, 'timelog').days.push({
			id: crypto.randomUUID(),
			date: '2026-11-03',
			entries: [{ id: crypto.randomUUID(), time: '07:30', activity: '' }]
		});
		await save(mine);
		const percent = mine.look.overall;
		const statuses = mine.look.workspaces[id].map((panel) => metricsOf(panel).status);
		expect(percent).toBeGreaterThan(0);

		const theirs = await open(mia);
		expect(theirs.look.projects.find((project) => project.id === id)?.progress).toBe(percent);
		await openProject(theirs, id);
		expect(theirs.look.overall).toBe(percent);
		expect(theirs.look.workspaces[id].map((panel) => metricsOf(panel).status)).toEqual(statuses);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

// One edit of each kind of row these panels hold, on a device with the project open.
const EDITS: [string, (look: LookState) => void][] = [
	['a stop', (look) => (panelOf(look, 'transport').stops[0].facility = 'Tampa Depot')],
	['a new stop', (look) => panelOf(look, 'transport').stops.push(stopOf())],
	['an item', (look) => (panelOf(look, 'items').items[0].description = 'Changed')],
	['an item taken out', (look) => panelOf(look, 'items').items.splice(0, 1)],
	['an attachment', (look) => (panelOf(look, 'items').attachments![0].name = 'changed.jpg')],
	['a day', (look) => (panelOf(look, 'timelog').days[0].date = '2026-12-01')],
	['an entry', (look) => (panelOf(look, 'timelog').days[0].entries[0].activity = 'Changed')],
	['an entry moved', (look) => panelOf(look, 'timelog').days[0].entries.reverse()]
];

describe('the freeze', () => {
	it('refuses every change to the trip, items and time log of a Sent, Complete or Archived project', async () => {
		const ada = await signInAdmin();
		const mine = await open(tom);
		const id = create(mine.look);
		buildTrip(mine.look);
		panelOf(mine.look, 'items').attachments = [
			{ id: crypto.randomUUID(), name: 'list.jpg', src: '', kind: 'photo' }
		];
		panelOf(mine.look, 'timelog').days.push({
			id: crypto.randomUUID(),
			date: '2026-11-03',
			entries: [
				{ id: crypto.randomUUID(), time: '07:30', activity: 'Arrived' },
				{ id: crypto.randomUUID(), time: '09:00', activity: 'Opened' }
			]
		});
		expect((await save(mine)).result.isSaved).toBe(true);

		for (const status of ['Sent', 'Complete', 'Archived'] as const) {
			const setter = status === 'Archived' ? await open(ada) : mine;
			setter.look.setStatus(
				setter.look.projects.find((item) => item.id === id)!,
				status
			);
			expect((await save(setter)).result.isSaved).toBe(true);
			for (const [what, edit] of EDITS) {
				const other = await open(mia);
				await openProject(other, id);
				edit(other.look);
				const { result, changes } = await save(other);
				expect(changes.length, what).toBeGreaterThan(0);
				expect(result, what).toMatchObject({
					isSaved: false,
					reason: `This project is ${status}, so only its status can change. Change its status to edit it.`
				});
			}
		}
	});
});

describe('asking to upload an item attachment', () => {
	it('is refused for a Sent project, and gives a spreadsheet an address once it is unsent', async () => {
		const store = createLocalStore({
			folder: join(tmpdir(), 'trident-files-188'),
			secret: 'test-secret-that-is-at-least-32-characters-long'
		});
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const request = (): UploadRequestType => ({
			for: { table: 'item_attachment', column: 'file', id: crypto.randomUUID(), projectId: id },
			name: 'manifest.xlsx',
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			size: 1000,
			taken: { from: '' }
		});

		mine.look.markSent(mine.look.projects.find((item) => item.id === id)!);
		await save(mine);
		expect(await createUpload(test.claims, mia, store, request())).toEqual({
			isAllowed: false,
			reason: 'This project is Sent, so only its status can change. Change its status to edit it.'
		});
		const theirs = await open(mia);
		theirs.look.unsend(theirs.look.projects.find((item) => item.id === id)!);
		expect((await save(theirs)).result.isSaved).toBe(true);
		expect(await createUpload(test.claims, mia, store, request())).toMatchObject({
			isAllowed: true
		});
	});
});

describe('Row Level Security', () => {
	it('keeps another organization from the stops, items, attachments, days and entries', async () => {
		const mine = await open(tom);
		create(mine.look);
		buildTrip(mine.look);
		panelOf(mine.look, 'items').attachments = [
			{ id: crypto.randomUUID(), name: 'list.jpg', src: '', kind: 'photo' }
		];
		panelOf(mine.look, 'timelog').days.push({
			id: crypto.randomUUID(),
			date: '2026-11-03',
			entries: [{ id: crypto.randomUUID(), time: '07:30', activity: 'Arrived' }]
		});
		expect((await save(mine)).result.isSaved).toBe(true);
		const otherId = crypto.randomUUID();
		const elsewhere: ActorType = { ...tom, organizationId: otherId };
		await test.db
			.insert(schema.organization)
			.values({ id: otherId, name: 'Elsewhere', slug: 'elsewhere' });

		const count = async (actor: ActorType) =>
			test.claims.run(actor, async (tx) => [
				(await tx.select().from(schema.stop)).length,
				(await tx.select().from(schema.item)).length,
				(await tx.select().from(schema.itemAttachment)).length,
				(await tx.select().from(schema.timeLogDay)).length,
				(await tx.select().from(schema.timeLogEntry)).length
			]);
		expect(await count(tom)).toEqual([5, 1, 1, 1, 1]);
		expect(await count(elsewhere)).toEqual([0, 0, 0, 0, 0]);
	});
});

describe('a project not opened', () => {
	it('keeps its trip when its status changes from the lists, and shows it when it opens mid-save', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const { vessel, truck } = buildTrip(mine.look);
		await save(mine);
		const trip = tripOf(mine.look);

		const theirs = await open(mia);
		theirs.look.setStatus(
			theirs.look.projects.find((item) => item.id === id)!,
			'Review'
		);
		const { result, changes } = await save(theirs);
		expect(result.isSaved).toBe(true);
		expect(changes.map((change) => [change.table, change.operation])).toEqual([['project', 'put']]);

		// Opened while a change waits to be sent: only the rows inside it come (look.svelte), and the stops are the
		// ones the lists gave.
		const found = await readProject(test.claims, theirs.actor, id);
		if (!found.isFound) throw new Error(found.reason);
		const inside = found.rows.filter((row) => row.table !== 'stop' && row.table !== 'project_team');
		takeProject(theirs.look, id, inside);
		theirs.look.open(id, 'edit');
		expect(tripOf(theirs.look)).toEqual(trip);
		expect(tripOf(theirs.look).map((stop) => stop.leg)).toEqual([
			vessel,
			vessel,
			vessel,
			truck,
			truck
		]);
	});
});

describe('transports and facilities on stops', () => {
	it('saves one added from a stop as a record in the same batch, and the stop points at it', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const [stop] = panelOf(mine.look, 'transport').stops;
		// "Add new" in the stop's Facility drop-down: the + sheet's record, then the stop picks it.
		addFacility(mine.look, 'Port of Mobile', 'Mobile, AL');
		stop.facility = 'Port of Mobile';
		stop.point = 'Start';

		const { result, changes } = await save(mine);
		expect(result.isSaved).toBe(true);
		const facility = changes.find((change) => change.table === 'facility')!;
		expect(changes.find((change) => change.table === 'stop')?.values).toMatchObject({
			facilityId: facility.id
		});
		const theirs = await open(mia);
		expect(theirs.look.facilities.map((item) => item.name)).toContain('Port of Mobile');
		await openProject(theirs, id);
		expect(panelOf(theirs.look, 'transport').stops[0].facility).toBe('Port of Mobile');
	});

	it('shows a renamed transport and facility on every stop that uses them, without changing the stop rows', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		buildTrip(mine.look);
		await save(mine);

		mine.look.rename('transport', 'MV Coral Dawn', 'MV Coral Sunrise');
		mine.look.rename('facilities', 'Port of Tampa', 'Port Tampa Bay');
		const { result, changes } = await save(mine);
		expect(result.isSaved).toBe(true);
		expect(changes.map((change) => change.table).sort()).toEqual(['facility', 'transport']);

		const theirs = await open(mia);
		expect(theirs.look.projects.find((project) => project.id === id)?.stops).toEqual([
			{ point: 'Start', transport: 'MV Coral Sunrise', facility: 'Port of Houston' },
			{ point: 'Stop', transport: 'MV Coral Sunrise', facility: 'Port of Mobile' },
			{ point: 'End', transport: 'MV Coral Sunrise', facility: 'Port Tampa Bay' },
			{ point: 'Start', transport: 'Truck 12', facility: 'Port Tampa Bay' },
			{ point: 'End', transport: 'Truck 12', facility: 'Tampa Depot' }
		]);
		await openProject(theirs, id);
		expect(tripOf(theirs.look).map((stop) => [stop.name, stop.facility])).toEqual([
			['MV Coral Sunrise', 'Port of Houston'],
			['MV Coral Sunrise', 'Port of Mobile'],
			['MV Coral Sunrise', 'Port Tampa Bay'],
			['Truck 12', 'Port Tampa Bay'],
			['Truck 12', 'Tampa Depot']
		]);
	});
});

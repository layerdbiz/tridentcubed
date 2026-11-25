// The save round trip for photo panels (spec #179 stories 57, 58, 67 to 70; #189): a photo panel's groups and
// photos through the mapper, the save command's work as an acting User, the in-process Postgres with the real schema
// and policies, a project's own query and the mapper again. What is checked is what another member would see: the
// groups with their title, description and layout, the photos with their file and description, both in order; a
// photo still uploading or whose upload failed is not saved and keeps its place; a removed group or photo is gone;
// a Sent, Complete or Archived project takes none of it. Every email of a made-up person here is made up.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { Progress } from '@layerd/ui';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { UploadAnswerType, UploadRequestType } from '#lib/files/files.schema.js';
import type { UploadStepsType } from '#lib/files/files.state.svelte.js';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges, toMerged, toRead } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import * as schema from '#lib/server/db/schema.js';
import { TRIDENT_CUBED } from '#lib/server/db/seed.js';
import { createUpload } from '#lib/server/files.js';
import { readProject, readRows, saveBatch } from '#lib/server/rows.js';
import { createLocalStore } from '#lib/server/store.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { draftPanel, type GroupType, type PanelType } from './look.data';
import { LookState } from './look.state.svelte';
import { isOfProject, takeProject, takeReads, takeRows, toRows } from './mapper';
import { addGroup, addPhotos, countLabelOf, movePhoto, type ReadersType, uploadOf } from './photos';

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
		device.confirmed = toRead(toRows(device.look), result.reads ?? []);
		if (result.reads) takeReads(device.look, result.reads);
	}
	return { result, changes };
}

function create(look: LookState) {
	look.create(draftPanel(look.organization.name, look.me?.name ?? ''));
	return look.projectId;
}

function panelOf(look: LookState, key: string) {
	return look.panels.find((panel) => panel.key === key) as PanelType;
}

// A photo whose file is already in storage: what a finished upload leaves on the photo.
function stored(description = '') {
	return { id: crypto.randomUUID(), src: `/files/${crypto.randomUUID()}`, description };
}

function groupOf(values: Partial<GroupType>): GroupType {
	return {
		id: crypto.randomUUID(),
		title: '',
		description: '',
		layout: 4,
		isEnabled: true,
		photos: [],
		...values
	};
}

function shown(panel: PanelType) {
	return panel.groups.map((group) => ({
		title: group.title,
		description: group.description,
		layout: group.layout,
		isEnabled: group.isEnabled,
		photos: group.photos.map((photo) => [photo.src, photo.description])
	}));
}

// Uploads that wait until `settle`, so a test sees a photo while it is on its way. A file named in `failing` does not
// reach storage.
function createUploads() {
	const asked: UploadRequestType[] = [];
	const names = new Map<string, string>();
	const failing = new Set<string>();
	const waiting: Array<() => void> = [];
	const steps: UploadStepsType = {
		toPreview: (file) => `blob:${file.name}`,
		async prepare() {
			return {
				blob: new Blob(['webp'], { type: 'image/webp' }),
				width: 2048,
				height: 1536,
				taken: { from: 'file', at: '2026-05-12T09:30:00.000Z', latitude: 29.7, longitude: -95 }
			};
		},
		async ask(request): Promise<UploadAnswerType> {
			asked.push(request);
			const id = crypto.randomUUID();
			names.set(id, request.name);
			return {
				isAllowed: true,
				id,
				address: `/files/${id}`,
				upload: { method: 'PUT', url: id, headers: {} }
			};
		},
		async put(target) {
			await new Promise<void>((resolve) => waiting.push(resolve));
			if (failing.has(names.get(target.url) ?? '')) throw new TypeError('Failed to fetch');
		},
		async convert() {
			return { isDone: true };
		}
	};
	async function settle() {
		for (let round = 0; round < 5; round += 1) {
			for (const resolve of waiting.splice(0)) resolve();
			await new Promise((resolve) => setTimeout(resolve));
		}
	}
	return { steps, asked, failing, settle };
}

function picture(name: string) {
	return new File(['raw'], name, { type: 'image/jpeg' });
}

describe('photo groups and photos', () => {
	it('come back the same for another member: titles, descriptions, layouts and photos, in order', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const operations = panelOf(mine.look, 'operations');
		const damages = panelOf(mine.look, 'damages');
		operations.groups.push(
			groupOf({
				title: 'Hatch 2 before discharge',
				description: 'Lashing intact.',
				layout: 2,
				photos: [stored('Port side'), stored(), stored('Starboard')]
			}),
			groupOf({ title: 'Deck cargo', layout: 6, photos: [stored()] })
		);
		damages.isEnabled = true;
		damages.groups.push(groupOf({ title: 'Dent on crate 7', layout: 1, photos: [stored('Dent')] }));

		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(shown(panelOf(theirs.look, 'operations'))).toEqual(shown(operations));
		expect(shown(panelOf(theirs.look, 'damages'))).toEqual(shown(damages));
		expect(panelOf(theirs.look, 'discharge').groups).toEqual([]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

describe('a group switched off', () => {
	it('stays off for another member with everything it holds, and comes back when switched on', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');
		discharge.groups.push(
			groupOf({ title: 'Hold 1', description: 'Dry.', photos: [stored('Aft'), stored()] }),
			groupOf({ title: 'Hold 2', isEnabled: false, photos: [stored('Forward')] })
		);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(shown(panelOf(theirs.look, 'discharge'))).toEqual(shown(discharge));
		expect(panelOf(theirs.look, 'discharge').groups.map((group) => group.isEnabled)).toEqual([
			true,
			false
		]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		panelOf(theirs.look, 'discharge').groups[1].isEnabled = true;
		const { result, changes } = await save(theirs);
		expect(result.isSaved).toBe(true);
		// The project's percent moves with it: the group counts again.
		expect(changes.map((change) => [change.table, Object.keys(change.values ?? {})])).toEqual([
			['project', ['progress']],
			['photo_group', ['isEnabled']]
		]);
		const again = await open(tom);
		await openProject(again, id);
		expect(shown(panelOf(again.look, 'discharge'))[1]).toEqual({
			title: 'Hold 2',
			description: '',
			layout: 4,
			isEnabled: true,
			photos: [[expect.any(String), 'Forward']]
		});
	});
});

// A project as it was saved before stages (#215): its Operations panel was an Inspection panel.
async function createOld(device: DeviceType, groups: GroupType[]) {
	const id = create(device.look);
	const panel = panelOf(device.look, 'operations');
	Object.assign(panel, { key: 'inspection', name: 'Inspection', groups });
	expect((await save(device)).result.isSaved).toBe(true);
	return id;
}

describe('a project from before stages', () => {
	it('opens with its Operations panel, keeps what it held, and saves that once', async () => {
		const mine = await open(tom);
		const preloading = groupOf({
			title: 'Preloading',
			description: 'On the quay.',
			layout: 6,
			photos: [stored('Crate 1'), stored()]
		});
		const id = await createOld(mine, [
			preloading,
			groupOf({ title: 'Overview', photos: [stored()] })
		]);

		const theirs = await open(mia);
		await openProject(theirs, id);
		const panel = panelOf(theirs.look, 'operations');

		expect(panel.name).toBe('Operations');
		expect(shown(panel)[0]).toEqual(shown({ groups: [preloading] } as PanelType)[0]);
		expect(panel.groups[1].photos).toHaveLength(1);
		expect(panel.groups.map((group) => [group.title, group.isEnabled])).toEqual([
			['Preloading', true],
			['Overview', true],
			['Loading Operations', false],
			['Securing', false],
			['Lifting Gear', false]
		]);
		const { result, changes } = await save(theirs);
		expect(result.isSaved).toBe(true);
		// The project's row goes too: as the Operations panel it has one input more, its link (#233), so its
		// percent is worked out again.
		expect(changes.map((change) => [change.table, change.operation])).toEqual([
			['project', 'put'],
			['panel', 'put'],
			['photo_group', 'put'],
			['photo_group', 'put'],
			['photo_group', 'put']
		]);

		// The next person to open it finds it carried over, and has nothing to save.
		const next = await open(tom);
		await openProject(next, id);
		expect(shown(panelOf(next.look, 'operations'))).toEqual(shown(panel));
		expect(toChanges(next.confirmed, toRows(next.look))).toEqual([]);

		// A stage removed afterwards stays removed.
		panelOf(next.look, 'operations').groups.splice(2, 1);
		expect((await save(next)).result.isSaved).toBe(true);
		const last = await open(mia);
		await openProject(last, id);
		expect(panelOf(last.look, 'operations').groups.map((group) => group.title)).toEqual([
			'Preloading',
			'Overview',
			'Securing',
			'Lifting Gear'
		]);
	});

	it('is left as it was while it is Sent, and is carried over once it is unsent', async () => {
		const mine = await open(tom);
		const id = await createOld(mine, [groupOf({ title: 'Overview', photos: [stored()] })]);
		const project = () => mine.look.projects.find((item) => item.id === id)!;
		mine.look.setStatus(project(), 'Sent');
		expect((await save(mine)).result.isSaved).toBe(true);

		const theirs = await open(mia);
		await openProject(theirs, id);
		const sent = panelOf(theirs.look, 'inspection');
		expect(sent.name).toBe('Inspection');
		expect(sent.groups.map((group) => group.title)).toEqual(['Overview']);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		mine.look.unsend(project());
		expect((await save(mine)).result.isSaved).toBe(true);
		const after = await open(mia);
		await openProject(after, id);
		expect(panelOf(after.look, 'operations').name).toBe('Operations');
		expect((await save(after)).result.isSaved).toBe(true);
	});
});

describe('order and removal', () => {
	it('keeps groups and photos dragged into a new order, and what was removed is gone for another member', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');
		discharge.groups.push(
			groupOf({ title: 'First', photos: [stored('A'), stored('B'), stored('C')] }),
			groupOf({ title: 'Second', photos: [stored('D')] }),
			groupOf({ title: 'Third' })
		);
		await save(mine);

		// Dragged: Third to the top, C before A. Then one photo and one group removed.
		discharge.groups.unshift(discharge.groups.pop()!);
		const first = discharge.groups[1];
		first.photos.unshift(first.photos.pop()!);
		expect((await save(mine)).result.isSaved).toBe(true);
		first.photos.splice(1, 1);
		discharge.groups.splice(2, 1);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(
			panelOf(theirs.look, 'discharge').groups.map((group) => [
				group.title,
				group.photos.map((photo) => photo.description)
			])
		).toEqual([
			['Third', []],
			['First', ['C', 'B']]
		]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});

	it('moves a photo dragged into another group, to where it was dropped or to the end, for another member', async () => {
		// Michael's second "Loading Operations" stage on MSC Susanna (Justin, 2026-11-21): its photos belong in the
		// first, and a photo could only be dragged about inside its own group.
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');
		const damages = panelOf(mine.look, 'damages');
		discharge.groups.push(
			groupOf({ title: 'Loading', photos: [stored('A'), stored('B')] }),
			groupOf({ title: 'Loading again', photos: [stored('C'), stored('D'), stored('E')] })
		);
		damages.isEnabled = true;
		damages.groups.push(groupOf({ title: 'Dent', photos: [stored('F')] }));
		expect((await save(mine)).result.isSaved).toBe(true);
		const [first, second] = discharge.groups;
		const panels = mine.look.panels;

		// D is dropped on B and takes its place; E is dropped on the group itself and goes to its end.
		expect(movePhoto(panels, second.id, 1, first.id, 1)).toBe(true);
		expect(movePhoto(panels, second.id, 1, first.id)).toBe(true);
		// A drop on its own group, or from a place that holds no photo, moves nothing.
		expect(movePhoto(panels, first.id, 0, first.id)).toBe(false);
		expect(movePhoto(panels, second.id, 9, first.id)).toBe(false);
		// A group of another photo panel takes one too.
		expect(movePhoto(panels, damages.groups[0].id, 0, second.id, 0)).toBe(true);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(
			panelOf(theirs.look, 'discharge').groups.map((group) => [
				group.title,
				group.photos.map((photo) => photo.description)
			])
		).toEqual([
			['Loading', ['A', 'D', 'B', 'E']],
			['Loading again', ['F', 'C']]
		]);
		expect(shown(panelOf(theirs.look, 'discharge'))).toEqual(shown(discharge));
		expect(panelOf(theirs.look, 'damages').groups[0].photos).toEqual([]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

describe('a crop', () => {
	// #312: a photo's crop belongs to its spot in the report and is kept on its row, as three numbers: how far in and
	// the point of the photo at the middle of its box. The photo's file never changes.
	it('comes back the same for another member, moves with its photo to another stage, and a whole photo has none', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const operations = panelOf(mine.look, 'operations');
		operations.groups.push(
			groupOf({
				title: 'Hatch 2',
				photos: [{ ...stored('Lashing'), crop: { zoom: 2.5, x: 0.3, y: 0.7 } }, stored('Deck')]
			}),
			groupOf({ title: 'Hatch 3' })
		);
		expect((await save(mine)).result.isSaved).toBe(true);
		const hatch2 = operations.groups.find((group) => group.title === 'Hatch 2') as GroupType;
		const hatch3 = operations.groups.find((group) => group.title === 'Hatch 3') as GroupType;
		expect(movePhoto(mine.look.panels, hatch2.id, 0, hatch3.id)).toBe(true);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		const cropsOf = (title: string) =>
			panelOf(theirs.look, 'operations')
				.groups.find((group) => group.title === title)
				?.photos.map((photo) => [photo.description, photo.crop]);
		expect(cropsOf('Hatch 2')).toEqual([['Deck', undefined]]);
		expect(cropsOf('Hatch 3')).toEqual([['Lashing', { zoom: 2.5, x: 0.3, y: 0.7 }]]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
		expect(toChanges(mine.confirmed, toRows(mine.look))).toEqual([]);
	});

	it('taken off leaves the whole photo for another member', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const operations = panelOf(mine.look, 'operations');
		operations.groups.push(
			groupOf({
				title: 'Hatch 2',
				photos: [{ ...stored('Lashing'), crop: { zoom: 2, x: 0.5, y: 0.25 } }]
			})
		);
		expect((await save(mine)).result.isSaved).toBe(true);
		const photo = operations.groups.find((group) => group.title === 'Hatch 2')?.photos[0];
		if (photo) photo.crop = undefined;
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		const hatch2 = panelOf(theirs.look, 'operations').groups.find(
			(group) => group.title === 'Hatch 2'
		);
		expect(hatch2?.photos.map((photo) => photo.crop)).toEqual([undefined]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

describe('the freeze', () => {
	it('refuses groups and photos added, changed or removed on a Sent, Complete or Archived project', async () => {
		await test.db
			.insert(schema.accessGrant)
			.values({ email: 'ada@tridentcubed.com', organizationId: TRIDENT_CUBED.id, role: 'admin' });
		const ada = (await test.signIn('ada@tridentcubed.com')).actor;
		const mine = await open(tom);
		const id = create(mine.look);
		panelOf(mine.look, 'discharge').groups.push(groupOf({ title: 'Hatch 2', photos: [stored()] }));
		await save(mine);
		const admin = await open(ada);
		const other = await open(mia);
		await openProject(other, id);
		const project = () => admin.look.projects.find((item) => item.id === id)!;
		const groups = () => panelOf(other.look, 'discharge').groups;

		for (const status of ['Sent', 'Complete', 'Archived'] as const) {
			admin.look.setStatus(project(), status);
			expect((await save(admin)).result.isSaved).toBe(true);
			const refusal = {
				isSaved: false,
				reason: `This project is ${status}, so only its status can change. Change its status to edit it.`
			};

			groups()[0].title = 'Changed';
			expect((await save(other)).result).toMatchObject(refusal);
			groups()[0].title = 'Hatch 2';
			groups()[0].photos.push(stored());
			expect((await save(other)).result).toMatchObject(refusal);
			groups()[0].photos.pop();
			const [photo] = groups()[0].photos.splice(0, 1);
			expect((await save(other)).result).toMatchObject(refusal);
			groups()[0].photos.push(photo);
			groups().push(groupOf({ title: 'New' }));
			expect((await save(other)).result).toMatchObject(refusal);
			groups().pop();
		}

		const again = await open(mia);
		await openProject(again, id);
		expect(shown(panelOf(again.look, 'discharge'))).toEqual([
			{
				title: 'Hatch 2',
				description: '',
				layout: 4,
				isEnabled: true,
				photos: [[expect.any(String), '']]
			}
		]);
	});
});

describe('asking to upload a photo', () => {
	it('is refused for a new photo in a Sent project, and allowed once it is unsent', async () => {
		const store = createLocalStore({
			folder: join(tmpdir(), 'trident-files-189'),
			secret: 'test-secret-that-is-at-least-32-characters-long'
		});
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const request = (): UploadRequestType => ({
			for: { table: 'photo', column: 'file', id: crypto.randomUUID(), projectId: id },
			name: 'hatch.webp',
			type: 'image/webp',
			size: 1000,
			taken: { from: 'device', at: '2026-11-12T10:00:00.000Z' }
		});
		const project = () => mine.look.projects.find((item) => item.id === id)!;

		mine.look.markSent(project());
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
	it('is on for the photo group and photo tables', async () => {
		const tables = ['photo', 'photo_group'];
		const result = await test.db.execute(
			sql`select relname from pg_class where relrowsecurity and relname in ${tables} order by relname`
		);
		expect((result as { rows: unknown[] }).rows).toEqual(tables.map((relname) => ({ relname })));
	});
});

describe('adding photos', () => {
	it('shows each dropped photo in place at once while it uploads, and saves it once its file is stored', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');
		const group = addGroup(discharge);
		group.title = 'Hatch 2';
		await save(mine);

		const files = [picture('one.jpg'), picture('two.jpg'), picture('three.jpg')];
		expect(addPhotos(discharge, files, { group, projectId: id, steps: uploads.steps })).toBe(3);
		expect(group.photos.map((photo) => photo.src)).toEqual([
			'blob:one.jpg',
			'blob:two.jpg',
			'blob:three.jpg'
		]);
		expect(group.photos.every((photo) => uploadOf(photo)?.isUploading)).toBe(true);
		expect((await save(mine)).changes).toEqual([]);

		await uploads.settle();
		expect(uploads.asked.map((request) => request.for)).toEqual(
			group.photos.map((photo) => ({ table: 'photo', column: 'file', id: photo.id, projectId: id }))
		);
		expect(uploads.asked[0].taken).toEqual({
			from: 'file',
			at: '2026-05-12T09:30:00.000Z',
			latitude: 29.7,
			longitude: -95
		});
		expect(group.photos.every((photo) => photo.src.startsWith('/files/'))).toBe(true);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);
		expect(shown(panelOf(theirs.look, 'discharge'))).toEqual(shown(discharge));
	});

	it('gives photos picked together one toast that counts them until each is stored (#293)', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');
		const group = addGroup(discharge);
		const toast = new Progress();

		addPhotos(discharge, [picture('one.jpg'), picture('two.jpg')], {
			group,
			projectId: id,
			steps: uploads.steps,
			toast: () => toast
		});
		expect(toast.label).toBe('Uploading 1 of 2 photos');
		expect(group.photos.every((photo) => uploadOf(photo)?.isUploading)).toBe(true);

		await uploads.settle();
		expect(toast.label).toBe('2 photos uploaded');
		expect(group.photos.every((photo) => photo.src.startsWith('/files/'))).toBe(true);
		expect(group.photos.some((photo) => uploadOf(photo))).toBe(false);
		toast.close();
	});

	it('puts photos dropped on a panel with no group into a first group made for them', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');

		addPhotos(discharge, [picture('a.jpg'), new File(['x'], 'notes.txt', { type: 'text/plain' })], {
			projectId: id,
			steps: uploads.steps
		});
		await uploads.settle();
		await save(mine);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(panelOf(theirs.look, 'discharge').groups.map((group) => group.photos.length)).toEqual([
			1
		]);
	});

	it('takes a HEIC dropped with no type from the browser, as Windows can hand one over (#294)', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');

		const added = addPhotos(discharge, [new File(['heic'], 'IMG_0001.HEIC', { type: '' })], {
			projectId: id,
			steps: uploads.steps
		});

		expect(added).toBe(1);
		expect(uploads.asked).toHaveLength(0);
		await uploads.settle();
		expect(uploads.asked.map((request) => request.name)).toEqual(['IMG_0001.HEIC']);
	});

	it('marks a failed upload on its photo, saves the others, and Retry saves it in its place', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const discharge = panelOf(mine.look, 'discharge');
		const group = addGroup(discharge);
		uploads.failing.add('two.jpg');

		addPhotos(discharge, [picture('one.jpg'), picture('two.jpg'), picture('three.jpg')], {
			group,
			projectId: id,
			steps: uploads.steps
		});
		await uploads.settle();
		const failed = group.photos[1];
		expect(uploadOf(failed)).toMatchObject({ isUploading: false, isFailed: true });
		expect(failed.src).toBe('blob:two.jpg');
		expect((await save(mine)).result.isSaved).toBe(true);
		const before = await open(mia);
		await openProject(before, id);
		expect(panelOf(before.look, 'discharge').groups[0].photos).toHaveLength(2);

		uploads.failing.clear();
		void uploadOf(failed)?.retry();
		await uploads.settle();
		expect(uploadOf(failed)).toBeUndefined();
		expect(failed.src).toMatch(/^\/files\//);
		expect((await save(mine)).result.isSaved).toBe(true);
		const after = await open(mia);
		await openProject(after, id);
		expect(panelOf(after.look, 'discharge').groups[0].photos.map((photo) => photo.id)).toEqual(
			group.photos.map((photo) => photo.id)
		);
	});
});

describe('PDFs and videos in a photo group (#327)', () => {
	// What the device reads of a PDF and a video: a picture of the first page or a frame, and its pages or length.
	const readers: ReadersType = {
		pdf: async () => ({
			picture: new File(['page'], 'manifest.jpg', { type: 'image/jpeg' }),
			pageCount: 3
		}),
		video: async () => ({
			picture: new File(['frame'], 'lift.jpg', { type: 'image/jpeg' }),
			duration: 12.4
		})
	};

	it('go where photos go, save once their picture and their file are both stored, and come back the same', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const operations = panelOf(mine.look, 'operations');
		const group = addGroup(operations);
		group.title = 'Loading Operations';
		await save(mine);
		const toast = new Progress();
		const files = [
			picture('deck.jpg'),
			new File(['%PDF-1.7'], 'manifest.pdf', { type: 'application/pdf' }),
			// An iPhone video dropped on Windows can come with no type: it is known by its name.
			new File(['mov'], 'lift.MOV', { type: '' })
		];

		expect(
			addPhotos(operations, files, {
				group,
				projectId: id,
				steps: uploads.steps,
				readers,
				toast: () => toast
			})
		).toBe(3);
		expect(group.photos.map((photo) => photo.kind)).toEqual([undefined, 'pdf', 'video']);
		expect(toast.label).toBe('Uploading 1 of 3 files');
		expect((await save(mine)).changes).toEqual([]);

		await uploads.settle();
		expect(toast.label).toBe('3 files uploaded');
		const [, pdf, video] = group.photos;
		const askedFor = (photoId: string) =>
			uploads.asked
				.filter((request) => request.for.id === photoId)
				.map((request) => `${request.for.column} ${request.type}`)
				.sort();
		expect(askedFor(pdf.id)).toEqual(['file image/webp', 'source application/pdf']);
		expect(askedFor(video.id)).toEqual(['file image/webp', 'source video/quicktime']);
		expect(pdf).toMatchObject({ kind: 'pdf', pageCount: 3 });
		expect(video).toMatchObject({ kind: 'video', duration: 12.4 });
		for (const each of [pdf, video]) {
			expect(each.src).toMatch(/^\/files\//);
			expect(each.source).toMatch(/^\/files\//);
			expect(each.source).not.toBe(each.src);
			expect(uploadOf(each)).toBeUndefined();
		}
		expect(countLabelOf(group.photos)).toBe('1 photo, 1 PDF, 1 video');

		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);
		const theirGroup = panelOf(theirs.look, 'operations').groups.find(
			(each) => each.id === group.id
		);
		expect(theirGroup?.photos).toEqual(group.photos);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
		toast.close();
	});

	it('says why on its tile when the device cannot read it, and saves nothing of it', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const operations = panelOf(mine.look, 'operations');
		const group = addGroup(operations);
		const { PictureError } = await import('#lib/files/files.schema.js');
		addPhotos(operations, [new File(['x'], 'locked.pdf', { type: 'application/pdf' })], {
			group,
			projectId: id,
			steps: uploads.steps,
			readers: {
				...readers,
				pdf: async () => {
					throw new PictureError('This PDF needs a password to open.');
				}
			}
		});
		await uploads.settle();
		const [locked] = group.photos;
		expect(uploadOf(locked)?.isFailed).toBe(true);
		expect(uploadOf(locked)?.reason).toBe('This PDF needs a password to open.');
		expect(uploads.asked).toEqual([]);
		expect((await save(mine)).changes.filter((change) => change.table === 'photo')).toEqual([]);
	});

	it('says at once that a video over 20 MB is too big, before reading it or sending anything', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const operations = panelOf(mine.look, 'operations');
		const group = addGroup(operations);
		const { MAX_FILE_BYTES } = await import('#lib/files/files.schema.js');
		let isRead = false;
		addPhotos(
			operations,
			[new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'crane.mp4', { type: 'video/mp4' })],
			{
				group,
				projectId: id,
				steps: uploads.steps,
				readers: {
					...readers,
					video: async (file) => {
						isRead = true;
						return readers.video(file);
					}
				}
			}
		);
		await uploads.settle();
		const [video] = group.photos;
		expect(uploadOf(video)?.isFailed).toBe(true);
		expect(uploadOf(video)?.reason).toBe(
			'This video is bigger than 20 MB, the most the app takes for now.'
		);
		expect(isRead).toBe(false);
		expect(uploads.asked).toEqual([]);
		expect((await save(mine)).changes.filter((change) => change.table === 'photo')).toEqual([]);
	});
});

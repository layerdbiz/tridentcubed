// The save round trip for photo panels (spec #179 stories 57, 58, 67 to 70; #189): a photo panel's groups and
// photos through the mapper, the save command's work as an acting User, the in-process Postgres with the real schema
// and policies, a project's own query and the mapper again. What is checked is what another member would see: the
// groups with their title, description and layout, the photos with their file and description, both in order; a
// photo still uploading or whose upload failed is not saved and keeps its place; a removed group or photo is gone;
// a Sent, Complete or Archived project takes none of it. Every email of a made-up person here is made up.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { UploadAnswerType, UploadRequestType } from '#lib/files/files.schema.js';
import type { UploadStepsType } from '#lib/files/files.state.svelte.js';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges, toMerged } from '#lib/rows/rows.utils.js';
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
import { addGroup, addPhotos, uploadOf } from './photos';

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
		device.confirmed = toRows(device.look);
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
		photos: [],
		...values
	};
}

function shown(panel: PanelType) {
	return panel.groups.map((group) => ({
		title: group.title,
		description: group.description,
		layout: group.layout,
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
		const inspection = panelOf(mine.look, 'inspection');
		const damages = panelOf(mine.look, 'damages');
		inspection.groups.push(
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

		expect(shown(panelOf(theirs.look, 'inspection'))).toEqual(shown(inspection));
		expect(shown(panelOf(theirs.look, 'damages'))).toEqual(shown(damages));
		expect(panelOf(theirs.look, 'discharge').groups).toEqual([]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

describe('order and removal', () => {
	it('keeps groups and photos dragged into a new order, and what was removed is gone for another member', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const inspection = panelOf(mine.look, 'inspection');
		inspection.groups.push(
			groupOf({ title: 'First', photos: [stored('A'), stored('B'), stored('C')] }),
			groupOf({ title: 'Second', photos: [stored('D')] }),
			groupOf({ title: 'Third' })
		);
		await save(mine);

		// Dragged: Third to the top, C before A. Then one photo and one group removed.
		inspection.groups.unshift(inspection.groups.pop()!);
		const first = inspection.groups[1];
		first.photos.unshift(first.photos.pop()!);
		expect((await save(mine)).result.isSaved).toBe(true);
		first.photos.splice(1, 1);
		inspection.groups.splice(2, 1);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(
			panelOf(theirs.look, 'inspection').groups.map((group) => [
				group.title,
				group.photos.map((photo) => photo.description)
			])
		).toEqual([
			['Third', []],
			['First', ['C', 'B']]
		]);
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
		panelOf(mine.look, 'inspection').groups.push(groupOf({ title: 'Hatch 2', photos: [stored()] }));
		await save(mine);
		const admin = await open(ada);
		const other = await open(mia);
		await openProject(other, id);
		const project = () => admin.look.projects.find((item) => item.id === id)!;
		const groups = () => panelOf(other.look, 'inspection').groups;

		for (const status of ['Sent', 'Complete', 'Archived'] as const) {
			admin.look.setStatus(project(), status);
			expect((await save(admin)).result.isSaved).toBe(true);
			const refusal = {
				isSaved: false,
				reason: `This project is ${status}, so only its status can change. Change its status to edit it.`
			};

			groups()[0].title = 'Changed';
			expect((await save(other)).result).toEqual(refusal);
			groups()[0].title = 'Hatch 2';
			groups()[0].photos.push(stored());
			expect((await save(other)).result).toEqual(refusal);
			groups()[0].photos.pop();
			const [photo] = groups()[0].photos.splice(0, 1);
			expect((await save(other)).result).toEqual(refusal);
			groups()[0].photos.push(photo);
			groups().push(groupOf({ title: 'New' }));
			expect((await save(other)).result).toEqual(refusal);
			groups().pop();
		}

		const again = await open(mia);
		await openProject(again, id);
		expect(shown(panelOf(again.look, 'inspection'))).toEqual([
			{ title: 'Hatch 2', description: '', layout: 4, photos: [[expect.any(String), '']] }
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
		const inspection = panelOf(mine.look, 'inspection');
		const group = addGroup(inspection);
		group.title = 'Hatch 2';
		await save(mine);

		const files = [picture('one.jpg'), picture('two.jpg'), picture('three.jpg')];
		expect(addPhotos(inspection, files, { group, projectId: id, steps: uploads.steps })).toBe(3);
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
		expect(shown(panelOf(theirs.look, 'inspection'))).toEqual(shown(inspection));
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

	it('marks a failed upload on its photo, saves the others, and Retry saves it in its place', async () => {
		const uploads = createUploads();
		const mine = await open(tom);
		const id = create(mine.look);
		const inspection = panelOf(mine.look, 'inspection');
		const group = addGroup(inspection);
		uploads.failing.add('two.jpg');

		addPhotos(inspection, [picture('one.jpg'), picture('two.jpg'), picture('three.jpg')], {
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
		expect(panelOf(before.look, 'inspection').groups[0].photos).toHaveLength(2);

		uploads.failing.clear();
		void uploadOf(failed)?.retry();
		await uploads.settle();
		expect(uploadOf(failed)).toBeUndefined();
		expect(failed.src).toMatch(/^\/files\//);
		expect((await save(mine)).result.isSaved).toBe(true);
		const after = await open(mia);
		await openProject(after, id);
		expect(panelOf(after.look, 'inspection').groups[0].photos.map((photo) => photo.id)).toEqual(
			group.photos.map((photo) => photo.id)
		);
	});
});

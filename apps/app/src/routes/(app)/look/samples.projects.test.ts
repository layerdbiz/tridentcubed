// The sample projects through the save round trip (as mapper.projects.test.ts does it): made on one device, saved by
// the one save command as an Admin, and read back by another member on another device.
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges, toMerged } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import * as schema from '#lib/server/db/schema.js';
import { TRIDENT_CUBED } from '#lib/server/db/seed.js';
import { readProject, readRows, saveBatch } from '#lib/server/rows.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { LookState, metricsOf } from './look.state.svelte';
import { isOfProject, takeProject, takeReads, takeRows, toRows } from './mapper';
import {
	addSampleProjects,
	finishSampleProjects,
	hasSamples,
	SAMPLE_MARK,
	SAMPLE_PROJECTS,
	unfinishedSamples
} from './samples.projects';

type TestType = Awaited<ReturnType<typeof createTestSignIn>>;
type DeviceType = { look: LookState; confirmed: RowType[]; actor: ActorType };

let test: TestType;

beforeEach(async () => {
	test = await createTestSignIn();
});

async function signIn(email: string, role?: 'admin') {
	if (role)
		await test.db
			.insert(schema.accessGrant)
			.values({ email, organizationId: TRIDENT_CUBED.id, role });
	return (await test.signIn(email)).actor;
}

async function open(actor: ActorType): Promise<DeviceType> {
	const look = new LookState();
	look.userId = actor.userId;
	look.role = actor.role ?? '';
	takeRows(look, await readRows(test.claims, actor));
	return { look, confirmed: toRows(look), actor };
}

// The sync loop's one step: send the difference since the last confirmed rows.
async function save(device: DeviceType) {
	const changes = toChanges(device.confirmed, toRows(device.look));
	const result = await saveBatch(test.claims, device.actor, { changes });
	if (result.isSaved) {
		device.confirmed = toRows(device.look);
		if (result.reads) takeReads(device.look, result.reads);
	}
	return result;
}

async function openProject(device: DeviceType, id: string) {
	const found = await readProject(test.claims, device.actor, id);
	if (!found.isFound) throw new Error('No such project.');
	const rows = [found.project, ...found.rows];
	takeProject(device.look, id, rows);
	device.confirmed = toMerged(device.confirmed, rows, isOfProject(id));
}

describe('the sample projects', () => {
	it('are one for every state, saved and seen by another member as they were made', async () => {
		const mine = await open(await signIn('ada@tridentcubed.com', 'admin'));

		const added = await addSampleProjects(mine.look, async () => {
			const result = await save(mine);
			if (!result.isSaved) throw new Error(result.reason);
			return true;
		});
		const theirs = await open(await signIn('mia@tridentcubed.com'));
		const samples = theirs.look.projects.filter((project) => project.title.startsWith(SAMPLE_MARK));

		expect(added).toBe(SAMPLE_PROJECTS.length);
		expect(samples.map((project) => project.status).toSorted()).toEqual(
			SAMPLE_PROJECTS.map((sample) => sample.status).toSorted()
		);
		expect(new Set(samples.map((project) => project.status)).size).toBe(8);
	});

	it('use the customers, transport modes and facilities that are really there, and show on the map', async () => {
		const mine = await open(await signIn('ada@tridentcubed.com', 'admin'));
		await addSampleProjects(mine.look, async () => (await save(mine)).isSaved);
		const theirs = await open(await signIn('mia@tridentcubed.com'));

		const ready = theirs.look.projects.find((project) => project.status === 'Ready');
		expect(ready).toMatchObject({
			title: 'Sample: Turbine rotor heavy lift',
			client: 'dship Carriers',
			type: 'Cargo',
			location: 'Houston, TX'
		});
		expect(ready?.stops.map((stop) => [stop.point, stop.transport, stop.facility])).toEqual([
			['Start', 'Jumbo Kinetic', 'Turning Basin Terminal'],
			['End', 'Jumbo Kinetic', 'Union Pacific Englewood Yard']
		]);
		for (const project of theirs.look.projects.filter((each) => each.location))
			expect(theirs.look.placeOf(project.location)).toBeDefined();
	});

	it('fill every panel of a finished sample, and leave the Draft unfinished', async () => {
		const mine = await open(await signIn('ada@tridentcubed.com', 'admin'));
		await addSampleProjects(mine.look, async () => (await save(mine)).isSaved);
		const theirs = await open(await signIn('mia@tridentcubed.com'));
		const complete = theirs.look.projects.find((project) => project.status === 'Complete')!;
		const draft = theirs.look.projects.find((project) => project.status === 'Draft')!;
		await openProject(theirs, complete.id);
		await openProject(theirs, draft.id);

		const statuses = (id: string) =>
			theirs.look.workspaces[id]
				.filter((panel) => panel.isEnabled)
				.map((panel) => metricsOf(panel).status);
		expect(new Set(statuses(complete.id))).toEqual(new Set(['Complete']));
		expect(complete.progress).toBe(100);
		// The Draft's Project panel is the unfinished one; its photo panels have their photos like every sample's.
		expect(statuses(draft.id)[0]).not.toBe('Complete');
		expect(draft.status).toBe('Draft');
	});

	it('are never made twice', async () => {
		const mine = await open(await signIn('ada@tridentcubed.com', 'admin'));
		const settle = async () => (await save(mine)).isSaved;
		await addSampleProjects(mine.look, settle);

		expect(hasSamples(mine.look)).toBe(true);
		expect(await addSampleProjects(mine.look, settle)).toBe(0);
		expect(mine.look.projects).toHaveLength(SAMPLE_PROJECTS.length);
	});

	it('get their states afterwards when the first save was not in time', async () => {
		const mine = await open(await signIn('ada@tridentcubed.com', 'admin'));
		// The save comes through, but too late for the one who waited.
		const added = await addSampleProjects(mine.look, async () => {
			await save(mine);
			return false;
		});
		const waiting = unfinishedSamples(mine.look).length;

		const finished = await finishSampleProjects(mine.look, async () => (await save(mine)).isSaved);
		const theirs = await open(await signIn('mia@tridentcubed.com'));

		expect(added).toBe(0);
		expect(waiting).toBe(6);
		expect(finished).toBe(6);
		expect(unfinishedSamples(mine.look)).toEqual([]);
		expect(new Set(theirs.look.projects.map((project) => project.status)).size).toBe(8);
	});

	it('leave a sample alone that someone moved back, once the samples have their states', async () => {
		const mine = await open(await signIn('ada@tridentcubed.com', 'admin'));
		const settle = async () => (await save(mine)).isSaved;
		await addSampleProjects(mine.look, settle);
		const review = mine.look.projects.find((project) => project.status === 'Review')!;

		mine.look.setStatus(review, 'In Progress');

		expect(unfinishedSamples(mine.look)).toEqual([]);
		expect(await finishSampleProjects(mine.look, settle)).toBe(0);
	});

	it('all have photos, so every card and report shows some', async () => {
		const mine = await open(await signIn('ada@tridentcubed.com', 'admin'));
		await addSampleProjects(mine.look, async () => (await save(mine)).isSaved);
		const theirs = await open(await signIn('mia@tridentcubed.com'));
		for (const project of theirs.look.projects) await openProject(theirs, project.id);

		const counts = theirs.look.projects.map(
			(project) =>
				theirs.look.workspaces[project.id]
					.filter((panel) => panel.kind === 'photos' && panel.isEnabled)
					.flatMap((panel) => panel.groups.flatMap((group) => group.photos)).length
		);

		expect(counts).toHaveLength(8);
		expect(counts.every((count) => count >= 4)).toBe(true);
	});

	it('leave out the Archived one for someone who is not an Admin', async () => {
		const mine = await open(await signIn('tom@tridentcubed.com'));

		const added = await addSampleProjects(mine.look, async () => (await save(mine)).isSaved);

		expect(added).toBe(SAMPLE_PROJECTS.length - 1);
		expect(mine.look.projects.map((project) => project.status)).not.toContain('Archived');
	});
});

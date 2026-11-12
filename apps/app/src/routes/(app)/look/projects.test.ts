// The save round trip for projects (spec #179 Testing Decisions; #186): the screens' state through the mapper, the
// save command's work as an acting User, the in-process Postgres with the real schema and policies, the lists query
// and a project's own query, and the mapper again. What is checked is what another device or member would see: the
// project and its Project panel, its Team Assigned and personnel, its panels in order, its number, and the server's
// rules on status, the freeze of a Sent project and deleting. Every email of a made-up person here is made up.
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges, toMerged } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import * as schema from '#lib/server/db/schema.js';
import { TRIDENT_CUBED } from '#lib/server/db/seed.js';
import { readProject, readRows, saveBatch } from '#lib/server/rows.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { draftPanel, newPerson, numberOf, type PanelType } from './look.data';
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
	if (!found.isFound) return found;
	const rows = [found.project, ...found.rows];
	takeProject(device.look, id, rows);
	device.confirmed = toMerged(device.confirmed, rows, isOfProject(id));
	device.look.open(id, 'edit');
	return found;
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

function projectPanel(look: LookState, id = look.projectId) {
	return look.workspaces[id].find((panel) => panel.kind === 'project') as PanelType;
}

function fill(panel: PanelType, values: Record<string, string>) {
	for (const [label, value] of Object.entries(values)) {
		const field = panel.fields.find((item) => item.label === label);
		if (field) field.value = value;
	}
}

// The + sheet: a new project from its Project panel, the signed-in person as Team Lead.
function create(look: LookState, values: Record<string, string> = {}) {
	const draft = draftPanel(look.organization.name, look.me?.name ?? '');
	fill(draft, values);
	look.create(draft);
	return look.projectId;
}

function projectOf(look: LookState, id: string) {
	return look.projects.find((project) => project.id === id);
}

describe('making a project', () => {
	it('saves a project from the plus with its built-in panels, open on Edit, the signed-in person its Team Lead', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Title: 'Kimberly discharge' });

		expect(mine.look.screen).toBe('workspace');
		expect(mine.look.tab).toBe('edit');
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);

		expect(projectOf(theirs.look, id)).toMatchObject({
			title: 'Kimberly discharge',
			status: 'Draft',
			team: ['Tom'],
			createdBy: tom.userId,
			job: 1
		});
		expect(theirs.look.isLoaded(id)).toBe(false);
		await openProject(theirs, id);
		expect(
			theirs.look.workspaces[id].map((panel) => [panel.key, panel.name, panel.isEnabled])
		).toEqual([
			['project', 'Project', true],
			['transport', 'Transport Mode', true],
			['items', 'Items', true],
			['timelog', 'Time Log', true],
			['inspection', 'Inspection', true],
			['damages', 'Damages', false],
			['discharge', 'Discharge', true]
		]);
		expect(projectPanel(theirs.look).owner).toBe('Tom');
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

describe('the Project panel', () => {
	it('saves what it holds, the Team Assigned and personnel in order, and another member sees it all', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		const panel = projectPanel(mine.look);
		fill(panel, {
			Title: 'BBC Kimberly',
			Subtitle: 'Discharge survey',
			'Project Type': 'Cargo',
			Customer: 'KOGA'
		});
		panel.owner = 'Duncan Cooke';
		panel.assigned = ['Mia', 'Tom', 'Capt. Cezary Poninski'];
		panel.personnel = [
			{
				id: crypto.randomUUID(),
				company: 'KOGA',
				people: [
					{ ...newPerson(), name: 'Ana', title: 'Surveyor' },
					{ ...newPerson(), name: 'Bo', title: 'Agent' }
				]
			},
			{
				id: crypto.randomUUID(),
				company: 'Port of Houston',
				people: [{ ...newPerson(), name: 'Cy', title: 'Pilot' }]
			}
		];

		expect((await save(mine)).result).toMatchObject({ isSaved: true });
		const theirs = await open(mia);

		expect(projectOf(theirs.look, id)).toMatchObject({
			title: 'BBC Kimberly',
			subtitle: 'Discharge survey',
			type: 'Cargo',
			client: 'KOGA',
			team: ['Duncan Cooke', 'Mia', 'Tom', 'Capt. Cezary Poninski']
		});
		expect(numberOf(projectOf(theirs.look, id)!, theirs.look.projects)).toMatch(/-J01$/);
		await openProject(theirs, id);
		const shown = projectPanel(theirs.look);
		expect(shown.fields.map((field) => [field.label, field.value])).toEqual([
			['Title', 'BBC Kimberly'],
			['Subtitle', 'Discharge survey'],
			['Project Type', 'Cargo'],
			['Organization', 'Trident Cubed'],
			['Customer', 'KOGA']
		]);
		expect(shown.owner).toBe('Duncan Cooke');
		expect(shown.assigned).toEqual(['Mia', 'Tom', 'Capt. Cezary Poninski']);
		expect(
			shown.personnel?.map((company) => [
				company.company,
				company.people.map((person) => person.name)
			])
		).toEqual([
			['KOGA', ['Ana', 'Bo']],
			['Port of Houston', ['Cy']]
		]);

		// Reordered, one taken off and put back, a person moved: the same rows, in the new order.
		shown.assigned = ['Capt. Cezary Poninski', 'Mia'];
		expect((await save(theirs)).result.isSaved).toBe(true);
		shown.assigned = ['Capt. Cezary Poninski', 'Mia', 'Tom'];
		shown.personnel?.reverse();
		expect((await save(theirs)).result.isSaved).toBe(true);
		const again = await open(tom);
		await openProject(again, id);
		expect(projectPanel(again.look).assigned).toEqual(['Capt. Cezary Poninski', 'Mia', 'Tom']);
		expect(projectPanel(again.look).personnel?.map((company) => company.company)).toEqual([
			'Port of Houston',
			'KOGA'
		]);
	});

	it('shows a renamed customer and Team record on the project without changing its rows', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Customer: 'KOGA' });
		projectPanel(mine.look).owner = 'Duncan Cooke';
		await save(mine);

		const editor = await open(mia);
		editor.look.rename('customers', 'KOGA', 'KOGA Group');
		editor.look.rename('team', 'Duncan Cooke', 'Duncan R. Cooke');
		const { changes } = await save(editor);
		const theirs = await open(tom);

		expect(changes.map((change) => change.table)).toEqual(['customer', 'team']);
		expect(projectOf(theirs.look, id)).toMatchObject({
			client: 'KOGA Group',
			team: ['Duncan R. Cooke']
		});
	});
});

describe('panels', () => {
	it('saves panels switched off, renamed, added, removed and reordered, in that order after a reload', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const look = mine.look;
		const named = (name: string) => look.panels.findIndex((panel) => panel.name === name);

		look.panels[named('Inspection')].isEnabled = false;
		look.panels[named('Damages')].isEnabled = true;
		look.panels[named('Discharge')].name = 'Discharge at Houston';
		look.addPanel();
		look.panels[named('Custom')].name = 'Lashing';
		look.addPanel();
		look.removePanel(look.panels[named('Custom 2')].id);
		look.movePanel(named('Lashing'), named('Inspection'));
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(theirs.look.panels.map((panel) => [panel.name, panel.isEnabled])).toEqual([
			['Project', true],
			['Transport Mode', true],
			['Items', true],
			['Time Log', true],
			['Lashing', true],
			['Inspection', false],
			['Damages', true],
			['Discharge at Houston', true]
		]);
		expect(theirs.look.panels.map((panel) => panel.control)).toEqual(
			look.panels.map((panel) => panel.control)
		);
	});

	it('gives a second member the same percent and the same panel statuses', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Title: 'BBC Kimberly', 'Project Type': 'Cargo' });
		await save(mine);
		const theirs = await open(mia);

		expect(projectOf(theirs.look, id)?.progress).toBe(mine.look.overall);
		await openProject(theirs, id);
		expect(theirs.look.overall).toBe(mine.look.overall);
		expect(theirs.look.panels.map((panel) => metricsOf(panel).status)).toEqual(
			mine.look.panels.map((panel) => metricsOf(panel).status)
		);
	});
});

describe('status', () => {
	it('moves a Draft to In Progress on the server once its Project panel is complete', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const panel = projectPanel(mine.look);
		fill(panel, {
			Title: 'BBC Kimberly',
			Subtitle: 'Discharge survey',
			'Project Type': 'Cargo',
			Customer: 'KOGA'
		});
		expect((await save(mine)).result.isSaved).toBe(true);
		expect(projectOf((await open(mia)).look, id)?.status).toBe('Draft');

		panel.assigned = ['Mia'];
		expect((await save(mine)).result.isSaved).toBe(true);

		expect(projectOf((await open(mia)).look, id)?.status).toBe('In Progress');
	});

	it('keeps a status set by hand, and Mark Sent then Unsend returns to the status before', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const project = projectOf(mine.look, id)!;

		mine.look.setStatus(project, 'Review');
		await save(mine);
		expect(projectOf((await open(mia)).look, id)?.status).toBe('Review');
		mine.look.markSent(project);
		await save(mine);
		const sent = await open(mia);
		expect(projectOf(sent.look, id)).toMatchObject({ status: 'Sent', before: 'Review' });

		sent.look.unsend(projectOf(sent.look, id)!);
		expect((await save(sent)).result.isSaved).toBe(true);
		expect(projectOf((await open(tom)).look, id)).toMatchObject({ status: 'Review' });
	});

	it('refuses every change to a Sent, Complete or Archived project but its status, and the screen is frozen', async () => {
		const ada = await signInAdmin();
		const mine = await open(tom);
		const id = create(mine.look, { Title: 'BBC Kimberly' });
		await save(mine);
		const other = await open(mia);
		await openProject(other, id);

		for (const status of ['Sent', 'Complete'] as const) {
			mine.look.setStatus(projectOf(mine.look, id)!, status);
			expect((await save(mine)).result.isSaved).toBe(true);
			fill(projectPanel(other.look), { Title: 'Changed' });
			expect((await save(other)).result).toEqual({
				isSaved: false,
				reason: `This project is ${status}, so only its status can change. Change its status to edit it.`
			});
			fill(projectPanel(other.look), { Title: 'BBC Kimberly' });
		}

		const admin = await open(ada);
		admin.look.setStatus(projectOf(admin.look, id)!, 'Archived');
		expect((await save(admin)).result.isSaved).toBe(true);
		const archived = await open(mia);
		await openProject(archived, id);
		expect(archived.look.isFrozen).toBe(true);
		archived.look.panels[4].isEnabled = false;
		expect((await save(archived)).result).toMatchObject({ isSaved: false });

		admin.look.setStatus(projectOf(admin.look, id)!, 'Review');
		await save(admin);
		const back = await open(mia);
		await openProject(back, id);
		expect(back.look.isFrozen).toBe(false);
		fill(projectPanel(back.look), { Title: 'BBC Kimberly II' });
		expect((await save(back)).result.isSaved).toBe(true);
	});

	it('lets only an Admin set Archived', async () => {
		const ada = await signInAdmin();
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);

		mine.look.projects.find((project) => project.id === id)!.status = 'Archived';
		expect((await save(mine)).result).toEqual({
			isSaved: false,
			reason: 'Only an Admin can archive a project or bring it back.'
		});
		const admin = await open(ada);
		admin.look.setStatus(projectOf(admin.look, id)!, 'Archived');
		expect((await save(admin)).result.isSaved).toBe(true);
	});
});

describe('deleting', () => {
	it('lets a Team user delete their own Draft, to the Trash with everything in it', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);

		mine.look.remove(id);
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);

		expect(projectOf(theirs.look, id)).toBeUndefined();
		expect(await readProject(test.claims, mia, id)).toEqual({
			isFound: false,
			isTrashed: true,
			reason: '"Untitled project" was moved to the Trash by someone else.'
		});
		const panels = await test.db.select().from(schema.panel).where(eq(schema.panel.projectId, id));
		expect(panels).toHaveLength(7);
		expect(panels.every((panel) => panel.deletedAt)).toBe(true);
	});

	it('refuses a Team user deleting another’s project, and lets an Admin delete any, Sent too', async () => {
		const ada = await signInAdmin();
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);

		const theirs = await open(mia);
		theirs.look.projects = theirs.look.projects.filter((project) => project.id !== id);
		expect((await save(theirs)).result).toEqual({
			isSaved: false,
			reason: 'Only an Admin can delete a project that is not your own Draft.'
		});
		mine.look.setStatus(projectOf(mine.look, id)!, 'Sent');
		await save(mine);
		const admin = await open(ada);
		admin.look.remove(id);
		expect((await save(admin)).result.isSaved).toBe(true);
		expect(projectOf((await open(tom)).look, id)).toBeUndefined();
	});

	it('tells a member saving to a project someone else deleted', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const other = await open(tom);
		await openProject(other, id);

		mine.look.remove(id);
		await save(mine);
		fill(projectPanel(other.look), { Title: 'Too late' });

		expect((await save(other)).result).toEqual({
			isSaved: false,
			reason: 'Someone moved this project to the Trash, so it cannot change.'
		});
	});
});

describe('the project number', () => {
	it('counts a customer’s jobs of a day once, and keeps each J count when another is deleted', async () => {
		const mine = await open(tom);
		const first = create(mine.look, { Customer: 'KOGA' });
		const second = create(mine.look, { Customer: 'KOGA' });
		const other = create(mine.look, { Customer: 'AXA XL' });
		await save(mine);

		mine.look.remove(first);
		await save(mine);
		const third = create(mine.look, { Customer: 'KOGA' });
		await save(mine);
		const theirs = await open(mia);

		const jobOf = (id: string) => numberOf(projectOf(theirs.look, id)!, theirs.look.projects);
		expect(jobOf(second)).toMatch(/^KOG.*-J02$/);
		expect(jobOf(third)).toMatch(/-J03$/);
		expect(jobOf(other)).toMatch(/-J01$/);
		expect(numberOf(projectOf(mine.look, third)!, mine.look.projects)).toBe(jobOf(third));
	});
});

describe('loading', () => {
	it('loads the lists with no project panels, and a project’s panels only when it opens', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const theirs = await open(mia);

		expect(toRows(theirs.look).some((row) => row.table === 'panel')).toBe(false);
		await openProject(theirs, id);
		expect(toRows(theirs.look).filter((row) => row.table === 'panel')).toHaveLength(7);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

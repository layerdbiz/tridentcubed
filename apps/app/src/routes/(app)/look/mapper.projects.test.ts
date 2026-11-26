// The save round trip for projects (spec #179 Testing Decisions; #186): the screens' state through the mapper, the
// save command's work as an acting User, the in-process Postgres with the real schema and policies, the lists query
// and a project's own query, and the mapper again. What is checked is what another device or member would see: the
// project and its Project panel, its Team Assigned and personnel, its panels in order, its number, and the server's
// rules on status, the freeze of a Sent project and deleting. Every email of a made-up person here is made up.
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges, toMerged, toRead } from '#lib/rows/rows.utils.js';
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
		device.confirmed = toRead(toRows(device.look), result.reads ?? []);
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
			['operations', 'Operations', true],
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
					{
						...newPerson(),
						name: 'Ana',
						title: 'Surveyor',
						phone: '+1 713 555 0100',
						email: 'ana@koga.example'
					},
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
		// How to reach someone of another company comes back with them (#326); one left empty stays empty.
		expect(shown.personnel?.[0].people.map(({ phone, email }) => [phone, email])).toEqual([
			['+1 713 555 0100', 'ana@koga.example'],
			['', '']
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

	it('saves the English of texts typed in Spanish in order, and another member sees it (#360)', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		projectPanel(mine.look).translations = [
			{ id: crypto.randomUUID(), source: 'Llegada del buque', english: 'Vessel arrived' },
			{
				id: crypto.randomUUID(),
				source: 'Grúa detenida por lluvia',
				english: 'Crane stopped by rain'
			}
		];

		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);
		const shown = projectPanel(theirs.look);
		expect(shown.translations?.map(({ source, english }) => [source, english])).toEqual([
			['Llegada del buque', 'Vessel arrived'],
			['Grúa detenida por lluvia', 'Crane stopped by rain']
		]);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		// One cleared in the Translate window goes; the other stays.
		shown.translations?.shift();
		expect((await save(theirs)).result.isSaved).toBe(true);
		const again = await open(tom);
		await openProject(again, id);
		expect(projectPanel(again.look).translations?.map(({ source }) => source)).toEqual([
			'Grúa detenida por lluvia'
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

		look.panels[named('Operations')].isEnabled = false;
		look.panels[named('Damages')].isEnabled = true;
		look.panels[named('Discharge')].name = 'Discharge at Houston';
		look.addPanel();
		look.panels[named('Custom')].name = 'Lashing';
		look.addPanel();
		look.removePanel(look.panels[named('Custom 2')].id);
		look.movePanel(named('Lashing'), named('Operations'));
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);

		expect(theirs.look.panels.map((panel) => [panel.name, panel.isEnabled])).toEqual([
			['Project', true],
			['Transport Mode', true],
			['Items', true],
			['Time Log', true],
			['Lashing', true],
			['Operations', false],
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
		expect(theirs.look.panels.map((panel) => metricsOf(panel, theirs.look).status)).toEqual(
			mine.look.panels.map((panel) => metricsOf(panel, mine.look).status)
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

	it('unsends, and moves a frozen project on, from a device whose stored percent is out of date', async () => {
		const ada = await signInAdmin();
		const mine = await open(tom);
		const id = create(mine.look, { Title: 'BBC Kimberly' });
		await save(mine);
		mine.look.markSent(projectOf(mine.look, id)!);
		expect((await save(mine)).result.isSaved).toBe(true);
		// The percent the server keeps no longer matches what the panels work out (another device saved it).
		const stale = () =>
			test.db.update(schema.project).set({ progress: 7 }).where(eq(schema.project.id, id));
		await stale();

		const device = await open(mia);
		await openProject(device, id);
		device.look.unsend(projectOf(device.look, id)!);
		const unsent = await save(device);

		expect(unsent.changes[0].values).toMatchObject({ status: 'Draft' });
		expect(unsent.changes[0].values).toHaveProperty('progress');
		expect(unsent.result.isSaved).toBe(true);
		expect(projectOf((await open(tom)).look, id)).toMatchObject({ status: 'Draft' });

		device.look.markSent(projectOf(device.look, id)!);
		expect((await save(device)).result.isSaved).toBe(true);
		await stale();
		const admin = await open(ada);
		await openProject(admin, id);
		admin.look.setStatus(projectOf(admin.look, id)!, 'Complete');
		projectOf(admin.look, id)!.progress = 55;
		const moved = await save(admin);

		expect(moved.changes[0].values).toMatchObject({ status: 'Complete', progress: 55 });
		expect(moved.result.isSaved).toBe(true);
		expect(projectOf((await open(tom)).look, id)).toMatchObject({
			status: 'Complete',
			progress: 7
		});
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
			expect((await save(other)).result).toMatchObject({
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
		expect((await save(mine)).result).toMatchObject({
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
		expect((await save(theirs)).result).toMatchObject({
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

		expect((await save(other)).result).toMatchObject({
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

	// #217: Project Creation Date and Job Sequence Number are the two parts of the number a User may type.
	it('follows a typed Project Creation Date, with the next J count of that customer and day', async () => {
		const mine = await open(tom);
		const first = create(mine.look, { Customer: 'KOGA' });
		const second = create(mine.look, { Customer: 'KOGA' });
		await save(mine);
		expect(projectPanel(mine.look, second).job).toBe(2);

		// The second job was accepted on another day: it is that day's first.
		projectPanel(mine.look, second).day = '2026-10-27';
		expect((await save(mine)).result.isSaved).toBe(true);
		expect(projectPanel(mine.look, second).job).toBe(1);

		// The first follows it there and takes the next one.
		projectPanel(mine.look, first).day = '2026-10-27';
		await save(mine);
		expect(projectPanel(mine.look, first).job).toBe(2);

		const theirs = await open(mia);
		const numberIn = (id: string) => numberOf(projectOf(theirs.look, id)!, theirs.look.projects);
		expect(numberIn(second)).toBe('KOG-2026-10-27-J01');
		expect(numberIn(first)).toBe('KOG-2026-10-27-J02');
		await openProject(theirs, second);
		expect(projectPanel(theirs.look)).toMatchObject({ day: '2026-10-27', job: 1 });
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});

	it('keeps a typed Job Sequence Number, and gives the next one when it is cleared', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Customer: 'KOGA' });
		const other = create(mine.look, { Customer: 'KOGA' });
		await save(mine);
		const panel = projectPanel(mine.look, id);
		expect(panel.job).toBe(1);

		panel.job = 7;
		expect((await save(mine)).result.isSaved).toBe(true);
		// Typing anything else in the project leaves its number alone.
		fill(panel, { Title: 'MSC Susana Loading' });
		await save(mine);
		const theirs = await open(mia);
		expect(numberOf(projectOf(theirs.look, id)!, theirs.look.projects)).toMatch(/^KOG-.*-J07$/);

		// Cleared, it is the next after that customer's others of the day.
		panel.job = undefined;
		await save(mine);
		expect(projectPanel(mine.look, id).job).toBe(3);
		expect(projectOf(mine.look, other)?.job).toBe(2);
	});

	it('keeps the number through a Time Log edit, on this device and the next', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Customer: 'KOGA' });
		await save(mine);
		projectPanel(mine.look).day = '2026-10-27';
		await save(mine);

		const timelog = mine.look.workspaces[id].find((panel) => panel.kind === 'timelog')!;
		timelog.days.push({
			id: crypto.randomUUID(),
			date: '2026-11-18',
			entries: [{ id: crypto.randomUUID(), time: '07:30', activity: 'On site' }]
		});
		expect((await save(mine)).result.isSaved).toBe(true);
		expect(projectPanel(mine.look)).toMatchObject({ day: '2026-10-27', job: 1 });

		const theirs = await open(mia);
		expect(numberOf(projectOf(theirs.look, id)!, theirs.look.projects)).toBe('KOG-2026-10-27-J01');
		await openProject(theirs, id);
		expect(numberOf(projectOf(theirs.look, id)!, theirs.look.projects)).toBe('KOG-2026-10-27-J01');
		expect(projectPanel(theirs.look).day).toBe('2026-10-27');
	});

	it('refuses a Job Sequence Number that is not a count', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Customer: 'KOGA' });
		await save(mine);
		projectPanel(mine.look, id).job = 0;
		expect((await save(mine)).result.isSaved).toBe(false);
	});
});

describe('the Customer Reference Number', () => {
	it('saves with the project and another member sees it, before the project opens and after', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Customer: 'KOGA' });
		await save(mine);
		expect(projectPanel(mine.look).customerReference ?? '').toBe('');

		projectPanel(mine.look).customerReference = 'SO025484';
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		expect(projectOf(theirs.look, id)?.customerReference).toBe('SO025484');
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
		await openProject(theirs, id);
		expect(projectPanel(theirs.look).customerReference).toBe('SO025484');
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
	});
});

describe('the report’s opening sentence as typed (#244)', () => {
	it('saves with the project, another member sees it, and clearing it saves too', async () => {
		const mine = await open(tom);
		const id = create(mine.look, { Customer: 'KOGA' });
		await save(mine);
		expect(projectPanel(mine.look).introduction ?? '').toBe('');

		const typed = 'Trident Cubed attended the loading of cargo on board the MSC Susanna.';
		projectPanel(mine.look).introduction = `  ${typed}  `;
		expect((await save(mine)).result.isSaved).toBe(true);
		const theirs = await open(mia);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);
		await openProject(theirs, id);
		expect(projectPanel(theirs.look).introduction).toBe(typed);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		projectPanel(theirs.look).introduction = '';
		expect((await save(theirs)).result.isSaved).toBe(true);
		const again = await open(tom);
		await openProject(again, id);
		expect(projectPanel(again.look).introduction).toBe('');
	});
});

describe('the Operations panel’s link to the project’s files (#233)', () => {
	it('saves as typed, another member sees it, and clearing it saves too', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const operations = (look: LookState) =>
			look.workspaces[id].find((panel) => panel.key === 'operations') as PanelType;
		expect(operations(mine.look).link ?? '').toBe('');

		operations(mine.look).link = '  https://1drv.ms/f/s!AkR3xyz ';
		const first = await save(mine);
		expect(first.result.isSaved).toBe(true);
		// Only the Operations panel's row changes, and the project's (its percent).
		expect(first.changes.filter((change) => change.table === 'panel').length).toBe(1);
		const theirs = await open(mia);
		await openProject(theirs, id);
		expect(operations(theirs.look).link).toBe('https://1drv.ms/f/s!AkR3xyz');
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		operations(theirs.look).link = '';
		expect((await save(theirs)).result.isSaved).toBe(true);
		const again = await open(tom);
		await openProject(again, id);
		expect(operations(again.look).link).toBe('');
	});
});

describe('the Items panel’s item list as a table (#242)', () => {
	it('saves its cells as read, another member sees them, and removing the list saves too', async () => {
		const mine = await open(tom);
		const id = create(mine.look);
		await save(mine);
		const items = (look: LookState) =>
			look.workspaces[id].find((panel) => panel.kind === 'items') as PanelType;
		expect(items(mine.look).grid).toBeUndefined();

		const grid = {
			name: 'packing-list.xlsx',
			cells: [
				['Qty', 'Description', 'Dimensions (IN)'],
				['2', 'Pump skid "A"', '472 × 204 × 151']
			]
		};
		items(mine.look).grid = grid;
		const first = await save(mine);
		expect(first.result.isSaved).toBe(true);
		const theirs = await open(mia);
		await openProject(theirs, id);
		expect(items(theirs.look).grid).toEqual(grid);
		expect(toChanges(theirs.confirmed, toRows(theirs.look))).toEqual([]);

		items(theirs.look).grid = undefined;
		expect((await save(theirs)).result.isSaved).toBe(true);
		const again = await open(tom);
		await openProject(again, id);
		expect(items(again.look).grid).toBeUndefined();
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

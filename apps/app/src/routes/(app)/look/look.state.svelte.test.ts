import { describe, expect, it } from 'vite-plus/test';
import { draftOf, draftPanel, itemOf, STAGES, type ClientType } from './look.data';
import { LookState, metricsOf, toFollowing } from './look.state.svelte';
import { sectionsOf, tallyOf } from './tally';

// The tests run on Svelte's server build, where LookState's effects do nothing: what is checked here is the state
// itself, not what the screens draw from it.
function fresh() {
	return new LookState();
}

function contact(name: string) {
	return { id: crypto.randomUUID(), name, title: '', email: '', phone: '', photo: '' };
}

describe('a new app', () => {
	it('starts with no projects, transports or facilities', () => {
		const look = fresh();
		expect(look.projects).toEqual([]);
		expect(look.transports).toEqual([]);
		expect(look.facilities).toEqual([]);
	});

	it('starts with the real organization, and no customers, team or places until the server sends them', () => {
		const look = fresh();
		expect(look.organization.name).toBe('Trident Cubed');
		expect(look.members).toEqual([]);
		expect(look.customers).toEqual([]);
		expect(look.places).toEqual([]);
	});

	it('lets an Admin, the Super admin and a Manager edit the organization, not Team (#303)', () => {
		function isEditableAs(role: LookState['role'], isSuperAdmin = false) {
			const look = fresh();
			look.role = role;
			look.isSuperAdmin = isSuperAdmin;
			return look.isOrganizationEditable;
		}

		expect(isEditableAs('admin')).toBe(true);
		expect(isEditableAs('manager')).toBe(true);
		expect(isEditableAs('team', true)).toBe(true);
		expect(isEditableAs('team')).toBe(false);
		expect(isEditableAs('')).toBe(false);
	});

	it('opens on the dashboard with nothing open', () => {
		const look = fresh();
		expect(look.screen).toBe('dashboard');
		expect(look.project).toBeUndefined();
		expect(look.panels).toEqual([]);
		expect(look.overall).toBe(0);
		expect(look.isFrozen).toBe(false);
	});

	it('makes a project from the + sheet and opens it on Edit with empty panels', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		expect(look.projects).toHaveLength(1);
		expect(look.screen).toBe('workspace');
		expect(look.tab).toBe('edit');
		const kinds = look.panels.map((panel) => panel.kind);
		expect(kinds.slice(0, 4)).toEqual(['project', 'transport', 'items', 'timelog']);
		const items = look.panels.find((panel) => panel.kind === 'items')!;
		expect(items.items.every((item) => !item.quantity && !item.description)).toBe(true);
		const timelog = look.panels.find((panel) => panel.kind === 'timelog')!;
		expect(timelog.days).toEqual([]);
		// The Operations panel starts with its stages, each empty (#215); the other photo panels with no group.
		for (const panel of look.panels.filter((item) => item.kind === 'photos')) {
			expect(panel.groups.map((group) => group.title)).toEqual(
				panel.key === 'operations' ? STAGES : []
			);
			expect(panel.groups.every((group) => !group.photos.length && !group.description)).toBe(true);
		}
	});
});

describe('the page of what is open', () => {
	it('is the list on show on the dashboard', () => {
		const look = fresh();
		look.pick('transport');
		expect(look.place).toBe('transport');
	});

	it('is the page a record belongs to, whatever list was last on show', () => {
		const look = fresh();
		look.pick('projects');
		look.openRecord('team', 'Justin ONeill');
		expect(look.place).toBe('team');
	});

	it('is Projects for an open project, and the list behind it for the Organization', () => {
		const look = fresh();
		look.pick('facilities');
		look.openSettings();
		expect(look.place).toBe('facilities');
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		expect(look.place).toBe('projects');
	});
});

describe('where a project opens', () => {
	it('is Edit while it is still being worked on, and its Page once it is sent', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		const project = look.projects[0];
		look.home();

		look.open(project.id);
		expect(look.tab).toBe('edit');

		look.home();
		look.setStatus(project, 'Sent');
		look.open(project.id);
		expect(look.tab).toBe('page');
	});

	it('is the tab asked for, when one is', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		look.home();

		look.open(look.projects[0].id, 'preview');
		expect(look.tab).toBe('preview');
	});
});

describe('a panel switched off', () => {
	it('reads as not planned, with nothing of its total done (#225)', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		const panel = look.panels.find((item) => item.kind === 'photos')!;
		// A new Operations panel has its stages titled, so some of it is done before it is switched off.
		const { done, total } = metricsOf(panel, look);
		expect(done).toBeGreaterThan(0);

		panel.isEnabled = false;

		expect(metricsOf(panel, look)).toEqual({ done: 0, total, percent: 0, status: 'Not planned' });
	});
});

describe('a panel’s count (#229)', () => {
	it('is its sections’ counts added up, for every panel of a new project', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		for (const panel of look.panels) {
			const values = sectionsOf(panel).flatMap((section) =>
				section.inputs.map((input) => input.value)
			);
			const { done, total } = tallyOf(values);
			expect([panel.name, metricsOf(panel, look).total]).toEqual([panel.name, Math.max(1, total)]);
			expect(metricsOf(panel, look).done).toBe(panel.isEnabled ? done : 0);
		}
	});

	it('reads a new project’s Project panel as 6 of 11: its introduction, date, job number, organization, Team Lead and so its team (#328)', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		const panel = look.panels.find((item) => item.kind === 'project')!;
		expect(metricsOf(panel, look)).toMatchObject({ done: 6, total: 11 });
	});

	it('counts the Contact once the picked customer has contacts', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		const panel = look.panels.find((item) => item.kind === 'project')!;
		const before = metricsOf(panel, look).total;
		look.added.push({
			...(draftOf('customers') as ClientType),
			name: 'NMT Projects',
			contacts: [contact('Steve')]
		});
		panel.fields.find((field) => field.label === 'Customer')!.value = 'NMT Projects';
		expect(metricsOf(panel, look).total).toBe(before + 1);
	});
});

describe('a Draft', () => {
	it('becomes In Progress once its Project panel has all but the optional reference number', () => {
		const look = fresh();
		const draft = draftPanel(look.organization.name, 'Capt. Cezary Poninski');
		for (const field of draft.fields) field.value ||= 'Barge move';
		draft.assigned = ['Michael Boone'];
		look.create(draft);
		expect(look.project.status).toBe('In Progress');
		const panel = look.panels.find((item) => item.kind === 'project')!;
		expect(metricsOf(panel, look).status).toBe('In progress');
	});

	it('becomes In Progress with only its Team Lead picked, nobody else assigned (#328)', () => {
		const look = fresh();
		const draft = draftPanel(look.organization.name, 'Capt. Cezary Poninski');
		for (const field of draft.fields) field.value ||= 'Barge move';
		look.create(draft);
		expect(look.project.status).toBe('In Progress');
	});

	it('stays a Draft while an input that is not optional is empty', () => {
		const look = fresh();
		const draft = draftPanel(look.organization.name, 'Capt. Cezary Poninski');
		for (const field of draft.fields) field.value ||= 'Barge move';
		draft.fields.find((field) => field.label === 'Subtitle')!.value = '';
		look.create(draft);
		expect(look.project.status).toBe('Draft');
	});

	it('stays a Draft with no Team Lead, whoever is assigned', () => {
		const look = fresh();
		const draft = draftPanel(look.organization.name, '');
		for (const field of draft.fields) field.value ||= 'Barge move';
		draft.assigned = ['Michael Boone'];
		look.create(draft);
		expect(look.project.status).toBe('Draft');
	});
});

// A new project whose Project panel is filled in, and then every other switched-on panel: a trip with its mode,
// vessel and facility, an item, a day of the time log, and the photo panels switched off.
function finished() {
	const look = fresh();
	const draft = draftPanel(look.organization.name, 'Capt. Cezary Poninski');
	for (const field of draft.fields) field.value ||= 'Barge move';
	draft.customerReference = 'S00025484';
	look.create(draft);
	for (const panel of look.panels) {
		if (panel.kind === 'photos') panel.isEnabled = false;
		if (panel.kind === 'transport')
			panel.stops = panel.stops.map((stop) => ({
				...stop,
				mode: 'Vessel',
				name: 'BBC Amber',
				facility: 'Port of Galveston'
			}));
		if (panel.kind === 'items') panel.items = [itemOf('2', 'Power transformers')];
		if (panel.kind === 'timelog')
			panel.days = [
				{
					id: 'day',
					date: '2026-11-25',
					entries: [{ id: 'entry', time: '08:00', activity: 'Arrived' }]
				}
			];
	}
	return look;
}

describe('a project’s status following its work (#328)', () => {
	it('turns Ready once every input is filled in, at 100%', () => {
		const look = finished();
		expect(look.overall).toBe(100);
		look.advance();
		expect(look.project.status).toBe('Ready');
	});

	it('stays In Progress with one input still empty, and does not read 100% for it', () => {
		const look = finished();
		const timelog = look.panels.find((panel) => panel.kind === 'timelog')!;
		timelog.days[0].entries[0].activity = '';
		look.advance();
		expect(look.overall).toBeLessThan(100);
		expect(look.project.status).toBe('In Progress');
	});

	it('goes from Draft straight to Ready when the last input filled is in the Project panel', () => {
		const look = finished();
		look.project.status = 'Draft';
		look.advance();
		expect(look.project.status).toBe('Ready');
	});

	it('never moves Ready back, nor Review, Revision or any state after it', () => {
		const done = { isStarted: true, isDone: true };
		const undone = { isStarted: false, isDone: false };
		expect(toFollowing('Ready', undone)).toBe('Ready');
		for (const status of ['Review', 'Revision', 'Sent', 'Complete', 'Archived'] as const)
			expect(toFollowing(status, done)).toBe(status);
		expect(toFollowing('In Progress', undone)).toBe('In Progress');
	});
});

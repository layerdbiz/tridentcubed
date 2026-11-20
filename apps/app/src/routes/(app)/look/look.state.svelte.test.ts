import { describe, expect, it } from 'vite-plus/test';
import { draftOf, draftPanel, STAGES, type ClientType } from './look.data';
import { LookState, metricsOf } from './look.state.svelte';
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

	it('reads a new project’s Project panel as 5 of 11: its introduction, date, job number, organization and Team Lead', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		const panel = look.panels.find((item) => item.kind === 'project')!;
		expect(metricsOf(panel, look)).toMatchObject({ done: 5, total: 11 });
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

	it('stays a Draft while an input that is not optional is empty', () => {
		const look = fresh();
		const draft = draftPanel(look.organization.name, 'Capt. Cezary Poninski');
		for (const field of draft.fields) field.value ||= 'Barge move';
		look.create(draft);
		expect(look.project.status).toBe('Draft');
	});
});

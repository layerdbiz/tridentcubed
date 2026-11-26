import { describe, expect, it } from 'vite-plus/test';
import { draftOf, draftPanel, itemOf, STAGES, type ClientType } from './look.data';
import {
	emptyInputsOf,
	isMovedOn,
	LookState,
	metricsOf,
	themeOf,
	toFollowing,
	toWorkBefore
} from './look.state.svelte';
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

describe('what keeps a percent under 100% (#305)', () => {
	function project(owner = 'Capt. Ana Reyes') {
		const look = fresh();
		look.create(draftPanel(look.organization.name, owner));
		return look;
	}

	it('names the five empty inputs that keep a new project’s Project panel at 6 of 11, as "input, panel"', () => {
		const look = project();
		const panel = look.panels.find((item) => item.kind === 'project')!;
		expect(emptyInputsOf([panel], look).map((input) => input.text)).toEqual([
			'Title, Project panel',
			'Subtitle, Project panel',
			'Project Type, Project panel',
			'Customer, Project panel',
			'Reference Number, Project panel'
		]);
	});

	it('names the Team Lead and the Team Assigned of a project with nobody on its team', () => {
		const look = project('');
		const panel = look.panels.find((item) => item.kind === 'project')!;
		expect(emptyInputsOf([panel], look).map((input) => input.text)).toContain(
			'Team Assigned, Project panel'
		);
		expect(emptyInputsOf([panel], look).map((input) => input.text)).toContain(
			'Team Lead, Project panel'
		);
	});

	it('names, for the project, every input its percent is short of, and none of a panel switched off', () => {
		const look = project();
		const empty = emptyInputsOf(look.panels, look);
		let short = 0;
		for (const panel of look.panels.filter((item) => item.isEnabled)) {
			const { done, total } = metricsOf(panel, look);
			short += total - done;
		}
		expect(empty.length).toBe(short);
		const off = look.panels.find((item) => !item.isEnabled)!;
		expect(empty.some((input) => input.panelId === off.id)).toBe(false);
		// Panel by panel, in the order the Edit tab shows them: the Project panel's first, then the trip's.
		expect(empty[0].text).toBe('Title, Project panel');
		expect(empty[5].text).toBe('Transport Mode, Transport Mode panel');
	});

	it('lists a panel’s when its percent is tapped, and only while its project is the one open', () => {
		const look = project();
		const panel = look.panels.find((item) => item.kind === 'project')!;
		expect(look.empties).toEqual([]);
		look.showEmpty(panel.id);
		expect(look.empties.map((input) => input.label)).toEqual([
			'Title',
			'Subtitle',
			'Project Type',
			'Customer',
			'Reference Number'
		]);
		look.home();
		expect(look.empties).toEqual([]);
	});

	it('lists the whole project’s when the project’s percent is tapped, and goes once it is closed', () => {
		const look = project();
		look.showEmpty();
		expect(look.empties).toEqual(emptyInputsOf(look.panels, look));
		look.closeEmpty();
		expect(look.empties).toEqual([]);
	});

	it('says everything is filled in when a panel has nothing empty, and lists nothing', () => {
		const look = project();
		const panel = look.panels.find((item) => item.kind === 'items')!;
		panel.items = [itemOf()];
		Object.assign(panel.items[0], { quantity: '2', description: 'Transformers' });
		look.showEmpty(panel.id);
		expect(look.empties).toEqual([]);
		expect(look.toast).toBe('Everything in Items is filled in');
	});

	it('opens an input: the Edit tab, its panel, and the input to put the focus on', () => {
		const look = project();
		look.tab = 'preview';
		look.showEmpty();
		const [first] = look.empties;
		look.openInput(first);
		expect(look.tab).toBe('edit');
		expect(look.panelId).toBe(first.panelId);
		expect(look.reaching).toEqual(first);
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

	it('moves a project opened whose work moved on since it was saved: a lead-only Draft saved at 99%', () => {
		const before = toWorkBefore({ status: 'Draft', progress: 99 });
		expect(isMovedOn(before, { isStarted: true, isDone: true })).toBe(true);
		expect(isMovedOn(before, { isStarted: true, isDone: false })).toBe(true);
	});

	it('leaves a status picked by hand until the work moves on: 100% kept In Progress stays In Progress', () => {
		const before = toWorkBefore({ status: 'In Progress', progress: 100 });
		expect(isMovedOn(before, { isStarted: true, isDone: true })).toBe(false);
		const undone = { isStarted: true, isDone: false };
		expect(isMovedOn(undone, { isStarted: true, isDone: true })).toBe(true);
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

describe('a project’s Edit tab colour (#335)', () => {
	it('draws a Sent, Complete or Archived project all in its status colour', () => {
		expect(themeOf('Sent')).toContain('violet');
		expect(themeOf('Complete')).toContain('success');
		expect(themeOf('Archived')).toContain('slate');
	});

	it('keeps the progress colours while a project is in work, Review and Ready included', () => {
		for (const status of ['Draft', 'In Progress', 'Review', 'Ready', 'Revision'] as const)
			expect(themeOf(status)).toBe('');
	});
});

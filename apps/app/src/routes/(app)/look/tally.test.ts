import { describe, expect, it } from 'vite-plus/test';
import { createPanels, draftPanel, type PanelType, type ProjectType } from './look.data';
import {
	emptyOf,
	hasRequired,
	organizationSectionsOf,
	sectionsOf,
	tallyOf,
	toEmptyNote,
	toPercent,
	toTally,
	valuesOf
} from './tally';

// A new project's panels, as the app makes them.
function panelsOf() {
	const project = {
		title: 'Barge move',
		subtitle: '',
		type: 'Cargo',
		client: 'NMT Projects',
		team: ['Ana', 'Ben'],
		stops: []
	} as unknown as ProjectType;
	return createPanels(project);
}

function panelOf(key: string) {
	return panelsOf().find((panel) => panel.key === key) as PanelType;
}

function labelsOf(panel: PanelType, id: string) {
	return sectionsOf(panel)
		.find((section) => section.id === id)
		?.inputs.map((input) => input.label);
}

describe('how much of a section is filled in', () => {
	it('counts words, picks, lists with something in them and a plain yes', () => {
		expect(tallyOf(['Barge move', '  ', undefined, ['Ana'], [], true, false])).toEqual({
			done: 3,
			total: 7
		});
	});

	it('reads the way a panel does', () => {
		expect(toTally(['Barge move', '', ''])).toBe('1 of 3 complete');
	});

	it('has one thing to do when nothing is in it yet', () => {
		expect(toTally([])).toBe('0 of 1 complete');
	});
});

describe('a percent', () => {
	it('reads 100 only once everything is done, and 0 only while nothing is (#328)', () => {
		expect(toPercent(199, 200)).toBe(99);
		expect(toPercent(200, 200)).toBe(100);
		expect(toPercent(1, 300)).toBe(1);
		expect(toPercent(0, 300)).toBe(0);
		expect(toPercent(1, 2)).toBe(50);
		expect(toPercent(0, 0)).toBe(0);
	});
});

describe('the inputs each section of the Project panel holds', () => {
	it('counts the five inputs of the Project section (Justin, 2026-11-18: it read 2 of 3)', () => {
		const panel = panelOf('project');
		expect(labelsOf(panel, 'project')).toEqual([
			'Title',
			'Subtitle',
			'Description',
			'Project Type',
			'Created Date',
			'Job Number'
		]);
	});

	it('counts the three inputs of the Customer section (it read 1 of 1)', () => {
		const panel = panelOf('project');
		const [, customer] = sectionsOf(panel, [{ id: 'steve' }]);
		expect(customer.inputs.map((input) => input.label)).toEqual([
			'Customer',
			'Contact',
			'Reference Number'
		]);
	});

	it('leaves the Contact out while it is greyed out: a customer with no contacts has none to pick', () => {
		expect(labelsOf(panelOf('project'), 'customer')).toEqual(['Customer', 'Reference Number']);
	});

	it('reads MSC Susana as his screenshot should have, plus the Introduction (#244): 5 of 6 and 3 of 3', () => {
		const panel = panelOf('project');
		panel.customerReference = 'S00025484';
		const contacts = [{ id: 'steve' }];
		const sections = sectionsOf(panel, contacts);
		expect(toTally(valuesOf(sections, 'project'))).toBe('5 of 6 complete');
		expect(toTally(valuesOf(sections, 'customer'))).toBe('3 of 3 complete');
	});

	it('shows the date and the job number as done: one is always there, typed or given', () => {
		const panel = panelOf('project');
		panel.day = undefined;
		panel.job = undefined;
		const values = sectionsOf(panel)[0]
			.inputs.filter((input) => /Date|Number/.test(input.label))
			.map((input) => input.value);
		expect(tallyOf(values)).toEqual({ done: 2, total: 2 });
	});

	it('counts the contact the field shows: the one picked, else the customer’s first', () => {
		const panel = panelOf('project');
		const contactOf = (contacts: { id: string }[]) =>
			sectionsOf(panel, contacts)[1].inputs.find((input) => input.label === 'Contact')?.value;
		expect(contactOf([{ id: 'a' }])).toBe('a');
		panel.contact = 'b';
		expect(contactOf([{ id: 'a' }, { id: 'b' }])).toBe('b');
	});

	it('counts the organization, the Team Lead and the Team Assigned', () => {
		expect(labelsOf(panelOf('project'), 'team')).toEqual([
			'Organization',
			'Team Lead',
			'Team Assigned'
		]);
	});

	it('counts the Team Assigned as done with only a Team Lead: the lead alone is the team (Justin, 2026-11-25)', () => {
		const panel = draftPanel('Trident Cubed', 'Ana');
		expect(toTally(valuesOf(sectionsOf(panel), 'team'))).toBe('3 of 3 complete');
		panel.owner = '';
		expect(toTally(valuesOf(sectionsOf(panel), 'team'))).toBe('1 of 3 complete');
		panel.assigned = ['Ben'];
		expect(toTally(valuesOf(sectionsOf(panel), 'team'))).toBe('2 of 3 complete');
	});

	it('counts a company of personnel: its name, then a name and a title for each person', () => {
		const panel = panelOf('project');
		panel.personnel = [
			{
				id: 'crew',
				company: 'Mammoet',
				people: [{ id: 'p1', name: 'Ilse', title: '', phone: '', email: '' }]
			}
		];
		expect(labelsOf(panel, 'crew')).toEqual(['Company', 'Name', 'Title']);
		expect(toTally(valuesOf(sectionsOf(panel), 'crew'))).toBe('2 of 3 complete');
	});

	it("leaves a person's phone and email out of the count: a job is complete without them (#326)", () => {
		const panel = panelOf('project');
		const person = { id: 'p1', name: 'Ilse', title: 'Rigger', phone: '', email: '' };
		panel.personnel = [{ id: 'crew', company: 'Mammoet', people: [person] }];
		expect(toTally(valuesOf(sectionsOf(panel), 'crew'))).toBe('3 of 3 complete');
		person.phone = '+31 10 555 0100';
		person.email = 'ilse@mammoet.example';
		expect(labelsOf(panel, 'crew')).toEqual(['Company', 'Name', 'Title']);
	});
});

describe('what a status waits for', () => {
	it('is every input but the optional ones: a project waits for no reference number', () => {
		const panel = draftPanel('Trident Cubed', 'Ana');
		for (const field of panel.fields) field.value ||= 'filled';
		panel.assigned = ['Ben'];
		expect(hasRequired(sectionsOf(panel))).toBe(true);
		panel.fields[1].value = '';
		expect(hasRequired(sectionsOf(panel))).toBe(false);
	});
});

describe('the inputs the other panels hold', () => {
	it('counts a trip section: the mode, the transport once a mode is picked, and each facility', () => {
		const panel = panelOf('transport');
		const [leg] = sectionsOf(panel);
		expect(leg.inputs.map((input) => input.label)).toEqual(['Transport Mode', 'Facility']);

		Object.assign(panel.stops[0], {
			mode: 'Vessel',
			name: 'MSC Susana',
			facility: 'Port of Houston'
		});
		expect(sectionsOf(panel)[0].inputs.map((input) => input.label)).toEqual([
			'Transport Mode',
			'Vessel',
			'Facility'
		]);
		expect(toTally(valuesOf(sectionsOf(panel), sectionsOf(panel)[0].id))).toBe('3 of 3 complete');
	});

	it('counts both boxes of an item row', () => {
		const panel = panelOf('items');
		panel.items = [
			{ id: 'a', quantity: '2', description: 'Transformers' },
			{ id: 'b', quantity: '', description: 'Accessory crates' }
		];
		const [items] = sectionsOf(panel);
		expect(items.inputs.map((input) => input.label)).toEqual([
			'Quantity',
			'Description',
			'Quantity',
			'Description'
		]);
		expect(tallyOf(items.inputs.map((input) => input.value))).toEqual({ done: 3, total: 4 });
	});

	it('counts the item list read from a spreadsheet as one more input (#242)', () => {
		const panel = panelOf('items');
		panel.items = [];
		panel.grid = {
			name: 'list.xlsx',
			cells: [
				['Qty', 'Description'],
				['2', 'Pump skid']
			]
		};
		const [items] = sectionsOf(panel);
		expect(items.inputs.map((input) => input.label)).toEqual(['Item List']);
		expect(tallyOf(items.inputs.map((input) => input.value))).toEqual({ done: 1, total: 1 });
	});

	it('counts a day of the time log: its date, then a time and an activity for each entry', () => {
		const panel = panelOf('timelog');
		panel.days = [
			{
				id: 'day',
				date: '2026-10-27',
				entries: [
					{ id: 'a', time: '07:30', activity: 'Gangway down' },
					{ id: 'b', time: '', activity: '' }
				]
			}
		];
		expect(labelsOf(panel, 'day')).toEqual(['Date', 'Time', 'Activity', 'Time', 'Activity']);
		expect(toTally(valuesOf(sectionsOf(panel), 'day'))).toBe('3 of 5 complete');
	});

	it('counts a photo panel’s own title, then a title, a description and the photos of each stage', () => {
		const panel = panelOf('operations');
		const [own, stage] = sectionsOf(panel);
		expect(own.inputs.map((input) => input.label)).toEqual(['Title', 'Project Files URL']);
		expect(stage.inputs.map((input) => input.label)).toEqual(['Title', 'Description', 'Photos']);
		// A new stage has its name and nothing else.
		expect(tallyOf(stage.inputs.map((input) => input.value))).toEqual({ done: 1, total: 3 });
	});

	it('counts the Operations panel’s link once it is an address the report can print (#233)', () => {
		const panel = panelOf('operations');
		const linkOf = () =>
			sectionsOf(panel)[0].inputs.find((input) => input.label === 'Project Files URL');
		expect(tallyOf([linkOf()?.value])).toEqual({ done: 0, total: 1 });
		panel.link = 'ask Michael';
		expect(tallyOf([linkOf()?.value])).toEqual({ done: 0, total: 1 });
		panel.link = '1drv.ms/f/s!AkR3xyz';
		expect(tallyOf([linkOf()?.value])).toEqual({ done: 1, total: 1 });
		// It is optional: empty, it never holds a status back.
		expect(linkOf()?.isOptional).toBe(true);
		// Only the Operations panel has one.
		expect(sectionsOf(panelOf('damages'))[0].inputs.map((input) => input.label)).not.toContain(
			'Project Files URL'
		);
	});

	it('counts a photo once its file is stored, not while it is on its way', () => {
		const panel = panelOf('operations');
		const group = panel.groups[0];
		const photosOf = () =>
			sectionsOf(panel)[1].inputs.find((input) => input.label === 'Photos')?.value;
		group.photos = [{ id: 'p', src: 'blob:on-its-way', description: '' }];
		expect(photosOf()).toBe(false);
		group.photos = [{ id: 'p', src: '/files/p', description: '' }];
		expect(photosOf()).toBe(true);
	});

	it('leaves a stage that is switched off out of the count', () => {
		const panel = panelOf('operations');
		const before = sectionsOf(panel).length;
		panel.groups[0].isEnabled = false;
		expect(sectionsOf(panel).length).toBe(before - 1);
	});

	it('has one thing to do in a photo panel with no stage switched on, beside its title', () => {
		const panel = panelOf('discharge');
		const inputs = sectionsOf(panel).flatMap((section) => section.inputs);
		expect(tallyOf(inputs.map((input) => input.value))).toEqual({ done: 1, total: 2 });
	});
});

describe('the empty inputs that keep a panel under 100% (#305)', () => {
	it('names the one input MSC Susana’s Project section reads 5 of 6 for: its Subtitle', () => {
		const panel = panelOf('project');
		const sections = sectionsOf(panel, [{ id: 'steve' }]).filter(
			(section) => section.id === 'project'
		);
		expect(emptyOf(sections)).toEqual([{ section: 'project', label: 'Subtitle', nth: 0 }]);
	});

	it('names the Team Lead and the Team Assigned of a team with nobody on it, in the order the panel draws them', () => {
		const panel = draftPanel('Trident Cubed', '');
		const team = sectionsOf(panel).filter((section) => section.id === 'team');
		expect(emptyOf(team)).toEqual([
			{ section: 'team', label: 'Team Lead', nth: 0 },
			{ section: 'team', label: 'Team Assigned', nth: 0 }
		]);
	});

	it('says which of the inputs with the same label it is: the second row’s Quantity', () => {
		const panel = panelOf('items');
		panel.items = [
			{ id: 'a', quantity: '2', description: 'Transformers' },
			{ id: 'b', quantity: '', description: 'Accessory crates' }
		];
		expect(emptyOf(sectionsOf(panel))).toEqual([{ section: 'items', label: 'Quantity', nth: 1 }]);
	});

	it('names an optional input too, since it counts toward the percent: a stage’s Description', () => {
		const panel = panelOf('operations');
		const [, stage] = sectionsOf(panel);
		expect(emptyOf([stage]).map((input) => input.label)).toEqual(['Description', 'Photos']);
	});

	it('names the one thing to do of a panel with no rows yet: a day, an item, a transport mode', () => {
		const timelog = panelOf('timelog');
		timelog.days = [];
		const items = panelOf('items');
		items.items = [];
		const transport = panelOf('transport');
		transport.stops = [];
		expect(emptyOf(sectionsOf(timelog))).toEqual([{ section: 'timelog', label: 'Day', nth: 0 }]);
		expect(emptyOf(sectionsOf(items))).toEqual([{ section: 'items', label: 'Item', nth: 0 }]);
		expect(emptyOf(sectionsOf(transport))).toEqual([
			{ section: 'transport', label: 'Transport Mode', nth: 0 }
		]);
		// Each reads as it did, 0 of 1.
		expect(
			tallyOf(sectionsOf(timelog).flatMap((section) => valuesOf([section], section.id)))
		).toEqual({ done: 0, total: 1 });
	});

	it('says how many there are, and where', () => {
		expect(toEmptyNote(1, 'Items')).toBe('1 empty input in the Items panel');
		expect(toEmptyNote(3, 'Project')).toBe('3 empty inputs in the Project panel');
		expect(toEmptyNote(12)).toBe('12 empty inputs in this project');
	});

	it('names nothing once every input holds something', () => {
		const panel = panelOf('items');
		panel.items = [{ id: 'a', quantity: '2', description: 'Transformers' }];
		expect(emptyOf(sectionsOf(panel))).toEqual([]);
	});
});

describe('the inputs the Settings sections hold', () => {
	it('counts both boxes of a disclaimer point', () => {
		const sections = organizationSectionsOf({
			logo: '',
			name: 'Trident Cubed',
			address: '',
			phone: '',
			email: '',
			groupEmail: '',
			website: '',
			disclaimer: { opening: 'Opening', points: [{ id: 'p', title: 'Scope', text: '' }], note: '' },
			closing: '',
			signoff: ''
		});
		expect(sections.map((section) => section.inputs.length)).toEqual([7, 4, 2]);
		expect(toTally(valuesOf(sections, 'disclaimer'))).toBe('2 of 4 complete');
	});
});

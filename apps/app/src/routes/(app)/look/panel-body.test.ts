// The Project panel on the library's inputs (#57): every input the notched field with its ? and, where the app makes
// the value, the Generated value look, in the panel's order, each section drawing exactly the inputs its count reads
// (tally.ts); what it saves and when unchanged; and the whole project number under Job Number (#300).
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import { toState } from '../../../test-state.svelte';
import { createPanels, draftPanel, itemOf, type PanelType, type ProjectType } from './look.data';
import type { LookState } from './look.state.svelte';
import PanelBody from './panel-body.svelte';
import { inputIn } from './focus';
import { contactsOf } from './records.data';
import { MARKED_LABELS, sectionsOf } from './tally';

const CUSTOMER = {
	name: 'Gulf Lines',
	kind: '',
	icon: '',
	logo: '',
	city: '',
	code: 'GUL',
	contacts: [{ id: 'c1', name: 'Sam Lee', title: 'Manager', email: '', phone: '', photo: '' }]
};

// The app's state as far as the Project panel reads it: one project, made on 27 October, with this panel.
function lookOf(panel: PanelType) {
	const project = {
		id: 'p1',
		title: '',
		subtitle: '',
		type: '',
		client: '',
		stops: [],
		location: '',
		created: '2026-10-27T09:00',
		updated: '2026-10-27T09:00',
		status: 'Draft',
		team: [],
		progress: 0,
		day: '2026-10-27'
	};
	return {
		organization: { name: 'Trident Cubed', logo: '' },
		project,
		projects: [project],
		projectId: 'p1',
		panels: [panel],
		members: [{ name: 'Ana Ruiz' }, { name: 'Ben Cho' }],
		customers: [CUSTOMER.name],
		added: [CUSTOMER],
		isFrozen: false,
		helpOf: (key: string) => (key.startsWith('project.') ? `Help for ${key}.` : ''),
		saved: vi.fn(),
		say: vi.fn(),
		confirm: vi.fn(),
		addFor: vi.fn(),
		editRecord: vi.fn()
	} as unknown as LookState & { saved: ReturnType<typeof vi.fn> };
}

function show(change: (panel: PanelType) => void = () => {}) {
	const panel = toState(draftPanel('Trident Cubed', 'Ana Ruiz'));
	panel.day = '2026-10-27';
	change(panel);
	const look = lookOf(panel);
	const view = render(PanelBody, { props: { look, panel } });
	return { ...view, look, panel };
}

function fieldOf(name: string) {
	return screen.getByRole('textbox', { name }) as HTMLInputElement;
}

// The labels of the library's inputs drawn, in order: the label on each one's border.
function labelsOf(container: HTMLElement) {
	return [...container.querySelectorAll('fieldset.field > legend > span:first-child')].map(
		(label) => label.textContent?.trim()
	);
}

async function openSection(name: string) {
	await fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}\\b`) }));
}

describe('the Project panel', () => {
	it('draws every input of each section on the library’s field, exactly the inputs its count reads', async () => {
		const { container, look, panel } = show((panel) => {
			panel.fields.find((field) => field.label === 'Customer')!.value = CUSTOMER.name;
		});
		await openSection('Customer');
		await openSection('Organization');

		const counted = sectionsOf(panel, contactsOf(look, CUSTOMER.name))
			.filter((section) => ['project', 'customer', 'team'].includes(section.id))
			.flatMap((section) => section.inputs.map((input) => input.label));
		expect(counted).toEqual([
			'Title',
			'Subtitle',
			'Description',
			'Project Type',
			'Created Date',
			'Job Number',
			'Customer',
			'Contact',
			'Reference Number',
			'Organization',
			'Team Lead',
			'Team Assigned'
		]);
		expect(labelsOf(container)).toEqual(counted);
	});

	// #305: an entry of the list of what keeps a percent under 100% puts the focus on its input, found by its label
	// and which of its section's inputs with that label it is.
	it('lets the empty-inputs list find every input it may name, each a control of its own', async () => {
		const { container, look, panel } = show((panel) => {
			panel.fields.find((field) => field.label === 'Customer')!.value = CUSTOMER.name;
		});
		await openSection('Customer');
		await openSection('Organization');
		const root = container.querySelector('fieldset')!;

		const entries = sectionsOf(panel, contactsOf(look, CUSTOMER.name))
			.filter((section) => ['project', 'customer', 'team'].includes(section.id))
			.flatMap((section) =>
				section.inputs.map((input) => ({ section: section.id, label: input.label, nth: 0 }))
			);
		const found = entries.map((entry) => inputIn(root, entry));

		expect(entries).toHaveLength(12);
		expect(found.every(Boolean)).toBe(true);
		expect(new Set(found).size).toBe(found.length);
		expect(found[0]).toBe(fieldOf('Title'));
		expect(found[3]).toBe(screen.getByRole('button', { name: 'Project Type' }));
	});

	it('puts each input’s ? after its label, with its Help text', () => {
		show();

		for (const name of ['Title', 'Subtitle', 'Description', 'Project Type', 'Job Number'])
			expect(screen.getByRole('button', { name: `What goes in ${name}?` })).toBeTruthy();
	});

	it('shows the whole project number under Job Number, as a value the app made', () => {
		const { container } = show((panel) => {
			panel.fields.find((field) => field.label === 'Customer')!.value = CUSTOMER.name;
		});

		const line = screen.getByText('GUL-2026-10-27-J01').closest('p')!;
		expect(within(line).getByTitle('Made by the app')).toBeTruthy();
		const job = fieldOf('Job Number').closest('fieldset')!;
		expect(job.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(container.textContent).not.toContain('GUL-2026-10-27-J02');
	});

	it('follows a typed Job Number in the project number', async () => {
		show((panel) => {
			panel.fields.find((field) => field.label === 'Customer')!.value = CUSTOMER.name;
		});

		await fireEvent.input(fieldOf('Job Number'), { target: { value: '7' } });

		expect(screen.getByText('GUL-2026-10-27-J07')).toBeTruthy();
	});

	it('saves the Project Type picked from its list, and the worked-out Description follows it', async () => {
		const { panel, look } = show();

		await fireEvent.click(screen.getByRole('button', { name: 'Project Type' }));
		await fireEvent.click(screen.getByRole('option', { name: 'Draft Survey' }));

		expect(panel.fields.find((field) => field.label === 'Project Type')?.value).toBe(
			'Draft Survey'
		);
		expect(fieldOf('Description').value).toMatch(/conducting a draft survey\b/);
		expect(look.saved).toHaveBeenCalled();
	});

	it('keeps the phone’s capitals, autocorrect and spelling on the words people type', () => {
		show();

		const title = fieldOf('Title');
		expect(title.getAttribute('autocapitalize')).toBe('sentences');
		expect(title.getAttribute('autocorrect')).toBe('on');
		expect(title.getAttribute('spellcheck')).toBe('true');
		const description = screen.getByRole('textbox', { name: /Description/ }) as HTMLTextAreaElement;
		expect(description.getAttribute('autocapitalize')).toBe('sentences');
		expect(description.getAttribute('spellcheck')).toBe('true');
	});

	it('saves the title as it is typed', async () => {
		const { panel, look } = show();

		await fireEvent.input(fieldOf('Title'), { target: { value: 'Cargo at the pier' } });

		expect(panel.fields.find((field) => field.label === 'Title')?.value).toBe('Cargo at the pier');
		expect(look.saved).toHaveBeenCalled();
	});

	it('keeps only the digits of a Job Number, and asks the server for one when it is cleared', async () => {
		const { panel, look } = show();
		const job = fieldOf('Job Number');

		await fireEvent.input(job, { target: { value: '12a' } });
		expect(panel.job).toBe(12);
		expect(job.value).toBe('12');
		expect(look.saved).toHaveBeenCalled();

		await fireEvent.input(job, { target: { value: '' } });
		expect(panel.job).toBeUndefined();
	});

	it('keeps the Created Date when it is cleared', async () => {
		const { panel } = show();
		const day = screen.getByLabelText('Created Date') as HTMLInputElement;
		expect(day.value).toBe('2026-10-27');

		// A browser tells a date field's change twice, as it is typed and as it is done.
		await fireEvent.input(day, { target: { value: '2026-10-29' } });
		await fireEvent.change(day);
		expect(panel.day).toBe('2026-10-29');

		await fireEvent.input(day, { target: { value: '' } });
		await fireEvent.change(day);
		expect(panel.day).toBe('2026-10-29');
		expect(day.value).toBe('2026-10-29');
	});

	it('shows the worked-out Description until it is reworded, and its reset brings it back', async () => {
		const { panel, look } = show();
		const description = fieldOf('Description') as unknown as HTMLTextAreaElement;
		const sentence = description.value;
		expect(sentence).toMatch(/^This is to report that Trident Cubed/);

		await fireEvent.input(description, { target: { value: 'Our own words.' } });
		expect(panel.introduction).toBe('Our own words.');

		await fireEvent.click(screen.getByRole('button', { name: /Bring back|Reset/ }));
		expect(panel.introduction).toBe('');
		expect(description.value).toBe(sentence);
		expect(look.saved).toHaveBeenCalled();
	});

	it('keeps nothing when the worked-out Description is typed as it was', async () => {
		const { panel } = show();
		const description = fieldOf('Description') as unknown as HTMLTextAreaElement;

		await fireEvent.input(description, { target: { value: description.value } });

		expect(panel.introduction).toBe('');
	});
});

// #305: the inputs a panel marks for the empty-inputs list by their label (`data-input`), which tally.ts names the
// same: a rename on either side would leave an entry that opens nothing.
describe('the inputs the empty-inputs list may name in the other panels', () => {
	function showPanel(kind: PanelType['kind'], change: (panel: PanelType) => void = () => {}) {
		const panels = createPanels({ stops: [], team: [] } as unknown as ProjectType);
		const panel = toState(panels.find((each) => each.kind === kind)!);
		change(panel);
		const look = Object.assign(lookOf(panel), {
			transports: [],
			facilities: [],
			variant: () => 'A',
			has: () => false
		});
		const view = render(PanelBody, { props: { look, panel } });
		return { ...view, panel };
	}

	function entriesOf(panel: PanelType) {
		return sectionsOf(panel).flatMap((section) => {
			const seen = new Map<string, number>();
			return section.inputs.map((input) => {
				const nth = seen.get(input.label) ?? 0;
				seen.set(input.label, nth + 1);
				return { section: section.id, label: input.label, nth };
			});
		});
	}

	it.each([
		['an Items panel with no item', 'items', (panel: PanelType) => (panel.items = [])],
		[
			'an Items panel with two rows',
			'items',
			(panel: PanelType) => (panel.items = [itemOf(), itemOf()])
		],
		['a Time Log with no day', 'timelog', () => {}],
		[
			'a Time Log day with two entries',
			'timelog',
			(panel: PanelType) =>
				(panel.days = [
					{
						id: 'd1',
						date: '2026-10-27',
						entries: [
							{ id: 'e1', time: '', activity: '' },
							{ id: 'e2', time: '', activity: '' }
						]
					}
				])
		],
		['a photo panel with no group', 'photos', (panel: PanelType) => (panel.groups = [])],
		['a Transport Mode panel with no stop', 'transport', (panel: PanelType) => (panel.stops = [])]
	] as const)('finds every entry of %s', (_, kind, change) => {
		const { container, panel } = showPanel(kind, change);
		const root = container.firstElementChild as HTMLElement;

		const entries = entriesOf(panel).filter((entry) =>
			Object.values<string>(MARKED_LABELS).includes(entry.label)
		);
		const found = entries.map((entry) => inputIn(root, entry));

		expect(entries.length).toBeGreaterThan(0);
		expect(found.every(Boolean)).toBe(true);
		expect(new Set(found).size).toBe(found.length);
	});
});

// #374: the photo panels and the Time Log on the library's inputs, as the Project panel is: the panel Title with the
// panel's own name as the app's value, each group's Title and Description, and each day's Date, each with its ?.
describe('the photo panels and the Time Log on the library’s inputs', () => {
	function showPanel(kind: 'photos' | 'timelog', change: (panel: PanelType) => void = () => {}) {
		const panels = createPanels({ stops: [], team: [] } as unknown as ProjectType);
		const found = panels.find((each) => each.kind === kind && each.key !== 'operations')!;
		const panel = toState({ ...found, isEnabled: true });
		change(panel);
		const look = Object.assign(lookOf(panel), {
			helpOf: (key: string) => `Help for ${key}.`
		});
		const view = render(PanelBody, { props: { look, panel } });
		return { ...view, look, panel };
	}

	const GROUP: PanelType['groups'][number] = {
		id: 'g1',
		title: '',
		description: '',
		layout: 4,
		isEnabled: true,
		photos: []
	};
	const DAY = { id: 'd1', date: '', entries: [] };

	it('draws the panel Title, a group’s Title and Description, each with its ?', () => {
		const { container } = showPanel('photos', (panel) => (panel.groups = [{ ...GROUP }]));

		expect(labelsOf(container)).toEqual(['Title', 'Title', 'Description']);
		expect(screen.getAllByRole('button', { name: 'What goes in Title?' })).toHaveLength(2);
		expect(screen.getByRole('button', { name: 'What goes in Description?' })).toBeTruthy();
	});

	it('shows the panel’s own name as the app’s value, and a cleared title goes back to it', async () => {
		const { container, panel, look } = showPanel('photos');
		const own = panel.name;
		const title = screen.getAllByRole('textbox', { name: 'Title' })[0] as HTMLInputElement;

		await fireEvent.input(title, { target: { value: 'Hatch survey' } });
		expect(panel.name).toBe('Hatch survey');
		await fireEvent.input(title, { target: { value: '' } });
		expect(title.value).toBe('');
		await fireEvent.blur(title);
		await fireEvent.focusOut(title);

		expect(panel.name).toBe(own);
		expect(title.value).toBe(own);
		expect(container.querySelector('fieldset.field')!.classList).toContain('field-generated');
		expect(look.saved).toHaveBeenCalled();
	});

	it('saves a group’s Title and Description as they are typed, keeping the phone’s capitals', async () => {
		const { panel, look } = showPanel('photos', (panel) => (panel.groups = [{ ...GROUP }]));
		const title = screen.getAllByRole('textbox', { name: 'Title' })[1] as HTMLInputElement;
		const description = screen.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement;

		await fireEvent.input(title, { target: { value: 'Hatch 2 before discharge' } });
		await fireEvent.input(description, { target: { value: 'Seen from the deck.' } });

		expect(panel.groups[0].title).toBe('Hatch 2 before discharge');
		expect(panel.groups[0].description).toBe('Seen from the deck.');
		expect(look.saved).toHaveBeenCalled();
		expect(title.getAttribute('autocapitalize')).toBe('sentences');
		expect(description.getAttribute('autocapitalize')).toBe('sentences');
	});

	it('draws a Time Log day’s Date as the library’s date input with its ?, and saves it', async () => {
		const { container, panel, look } = showPanel('timelog', (panel) => (panel.days = [{ ...DAY }]));

		expect(labelsOf(container)).toContain('Date');
		expect(screen.getByRole('button', { name: 'What goes in Date?' })).toBeTruthy();
		const date = screen.getByLabelText('Date') as HTMLInputElement;
		expect(date.type).toBe('date');

		await fireEvent.input(date, { target: { value: '2026-11-26' } });

		expect(panel.days[0].date).toBe('2026-11-26');
		expect(look.saved).toHaveBeenCalled();
	});
});

// #393: the Operations panel's Project Files URL on the library's box, its open arrow and its error line inside it.
describe('the Operations panel’s link on the library’s box', () => {
	function showOperations(link: string) {
		const panels = createPanels({ stops: [], team: [] } as unknown as ProjectType);
		const found = panels.find((each) => each.key === 'operations')!;
		const panel = toState({ ...found, isEnabled: true, link });
		const look = Object.assign(lookOf(panel), {
			helpOf: (key: string) => `Help for ${key}.`
		});
		const view = render(PanelBody, { props: { look, panel } });
		return { ...view, look, panel };
	}

	function linkField() {
		return screen.getByRole('textbox', { name: 'Project Files URL' }) as HTMLInputElement;
	}

	it('is the library’s field with its ?, and opens a folder’s address in a new tab', () => {
		showOperations('1drv.ms/f/s!folder');

		expect(linkField().closest('fieldset.field')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'What goes in Project Files URL?' })).toBeTruthy();
		const open = screen.getByRole('link', { name: 'Open the URL' }) as HTMLAnchorElement;
		expect(open.href).toBe('https://1drv.ms/f/s!folder');
		expect(open.target).toBe('_blank');
		expect(open.title).toBe('Open in OneDrive');
		expect(open.closest('fieldset')).toBe(linkField().closest('fieldset'));
	});

	it('says under the box when what is typed is not an address, and offers nothing to open', async () => {
		const { panel, look } = showOperations('');

		await fireEvent.input(linkField(), { target: { value: 'the project folder' } });

		expect(panel.link).toBe('the project folder');
		expect(look.saved).toHaveBeenCalled();
		expect(linkField().getAttribute('aria-invalid')).toBe('true');
		const line = document.getElementById(linkField().getAttribute('aria-describedby') ?? '');
		expect(line?.textContent?.trim()).toBe(
			'That does not look like a URL. Paste the folder’s full address.'
		);
		expect(screen.queryByRole('link', { name: 'Open the URL' })).toBeNull();
	});
});

// #387: the Items rows and the Time Log entries on the library's compact field: no label on each box, named for
// screen readers by the list's heading row, whose words carry the ?; typing, a pasted list and the clock as before.
describe('the Items and Time Log rows on the library’s compact field', () => {
	function showPanel(kind: 'items' | 'timelog', change: (panel: PanelType) => void) {
		const panels = createPanels({ stops: [], team: [] } as unknown as ProjectType);
		const panel = toState(panels.find((each) => each.kind === kind)!);
		change(panel);
		const say = vi.fn();
		const look = Object.assign(lookOf(panel), {
			helpOf: (key: string) => `Help for ${key}.`,
			say
		});
		const view = render(PanelBody, { props: { look, panel } });
		return { ...view, look, panel, say };
	}

	function compactOf(name: string) {
		const input = fieldOf(name);
		expect(input.classList).toContain('field-compact');
		expect(input.closest('fieldset.field')).toBeNull();
		return input;
	}

	const DAY = {
		id: 'd1',
		date: '2026-10-27',
		entries: [
			{ id: 'e1', time: '07:30', activity: 'Gangway rigged' },
			{ id: 'e2', time: '', activity: '' }
		]
	};

	it('names each item’s boxes by the heading row, whose words carry the ?', () => {
		showPanel('items', (panel) => (panel.items = [itemOf(), itemOf()]));

		compactOf('Quantity of item 1');
		compactOf('Description of item 1');
		compactOf('Quantity of item 2');
		compactOf('Description of item 2');
		expect(screen.getByRole('button', { name: 'What goes in Quantity?' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'What goes in Description?' })).toBeTruthy();
	});

	it('saves an item as it is typed, and turns rows pasted into a box into the table', async () => {
		const { panel, look, say } = showPanel('items', (panel) => (panel.items = [itemOf()]));

		await fireEvent.input(compactOf('Quantity of item 1'), { target: { value: '2' } });
		await fireEvent.input(compactOf('Description of item 1'), {
			target: { value: 'Accessory crates' }
		});
		expect(panel.items[0]).toMatchObject({ quantity: '2', description: 'Accessory crates' });
		expect(look.saved).toHaveBeenCalled();

		await fireEvent.paste(compactOf('Description of item 1'), {
			clipboardData: { getData: () => 'Qty\tDescription\n1\tPump skid\n2\tSpare parts' }
		});
		expect(panel.grid).toBeTruthy();
		expect(say).toHaveBeenCalledWith('2 items added as a table');
	});

	it('names each entry’s boxes by the heading row, whose words carry the ?', () => {
		showPanel('timelog', (panel) => (panel.days = [structuredClone(DAY)]));

		expect(compactOf('Time of entry 1').value).toBe('07:30');
		expect(compactOf('Activity of entry 1').value).toBe('Gangway rigged');
		compactOf('Time of entry 2');
		compactOf('Activity of entry 2');
		expect(screen.getByRole('button', { name: 'What goes in Time?' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'What goes in Activity?' })).toBeTruthy();
	});

	it('keeps a time on the 24-hour clock, sorts the day by it, and saves an activity as it is typed', async () => {
		const { panel, look } = showPanel('timelog', (panel) => (panel.days = [structuredClone(DAY)]));

		const time = compactOf('Time of entry 2');
		await fireEvent.change(time, { target: { value: '615' } });
		expect(panel.days[0].entries.map((entry) => entry.time)).toEqual(['06:15', '07:30']);

		await fireEvent.input(compactOf('Activity of entry 1'), {
			target: { value: 'Pilot on board' }
		});
		expect(panel.days[0].entries[0]).toMatchObject({ time: '06:15', activity: 'Pilot on board' });
		expect(look.saved).toHaveBeenCalled();
	});
});

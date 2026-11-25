// The Project panel on the library's inputs (#57): every input the notched field with its ? and, where the app makes
// the value, the Generated value look, in the panel's order, each section drawing exactly the inputs its count reads
// (tally.ts); what it saves and when unchanged.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import { toState } from '../../../test-state.svelte';
import { draftPanel, type PanelType } from './look.data';
import type { LookState } from './look.state.svelte';
import PanelBody from './panel-body.svelte';
import { contactsOf } from './records.data';
import { sectionsOf } from './tally';

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

	it('puts each input’s ? after its label, with its Help text', () => {
		show();

		for (const name of ['Title', 'Subtitle', 'Description', 'Project Type', 'Job Number'])
			expect(screen.getByRole('button', { name: `What goes in ${name}?` })).toBeTruthy();
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

// The record forms on the library's inputs (#373): the Edit tab and the + sheet of a customer, a team member, a
// transport mode and a facility draw every input as the notched field with its ?, typing keeps each change as
// before, a record is renamed when its Name is left (the old name back when the rename is turned down), and Short Code
// shows the code made from the name, a Generated value, until someone types over it.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import { toState } from '../../../test-state.svelte';
import { draftOf, type ClientType, type FacilityType, type TransportType } from './look.data';
import type { LookState, RecordDraftType } from './look.state.svelte';
import RecordFields from './record-fields.svelte';
import type { PageType } from './records.data';
import type { TeamMemberType } from './team.data';

const CUSTOMER: ClientType = {
	id: 'c1',
	name: 'Gulf Lines',
	kind: 'Carrier',
	icon: '',
	logo: '',
	city: 'Houston, TX',
	code: 'GUL',
	email: '',
	phone: '',
	website: '',
	contacts: [{ id: 'p1', name: 'Sam Lee', title: 'Manager', email: '', phone: '', photo: '' }]
};

const MEMBER: TeamMemberType = {
	id: 't1',
	rank: 9,
	name: 'Ana Ruiz',
	title: 'Surveyor',
	label: '',
	role: 'team',
	phone: '',
	email: '',
	location: '',
	href: ''
};

const VESSEL: TransportType = {
	id: 'v1',
	name: 'MV Coral Dawn',
	type: 'Sea',
	mode: 'Vessel',
	source: 'manual',
	details: { 'IMO number': '9563706' }
};

const FACILITY: FacilityType = {
	id: 'f1',
	name: 'Berth 12',
	kind: 'Port',
	city: 'Galveston, TX',
	contact: '',
	phone: '',
	email: ''
};

// The app's state as far as the record forms read it: Help text for every input, no saved places yet.
function lookOf() {
	return {
		isAdmin: true,
		places: [],
		placeOf: () => undefined,
		keepPlace: vi.fn(),
		helpOf: (key: string) => `Help for ${key}.`
	} as unknown as LookState;
}

function show(
	page: PageType,
	record: RecordDraftType,
	{ isNew = false, onname = undefined as ((name: string) => boolean) | undefined } = {}
) {
	const value = toState(structuredClone(record) as RecordDraftType);
	const set = vi.fn((change: Record<string, unknown>) => Object.assign(value, change));
	const view = render(RecordFields, {
		props: { look: lookOf(), page, value, set, isNew, onname }
	});
	return { ...view, value, set };
}

// The labels on the borders of the library's inputs drawn, in order.
function labelsOf(container: HTMLElement) {
	return [...container.querySelectorAll('fieldset.field > legend > span:first-child')].map(
		(label) => label.textContent?.trim()
	);
}

function textbox(name: string) {
	return screen.getByRole('textbox', { name }) as HTMLInputElement;
}

describe('the record forms', () => {
	it.each([
		[
			'customers',
			CUSTOMER,
			[
				'Name',
				'Short Code',
				'Type',
				'Location',
				'Email',
				'Phone',
				'Website',
				'Name',
				'Title',
				'Email',
				'Phone'
			]
		],
		['team', MEMBER, ['Name', 'Role', 'Title', 'Labels', 'Phone', 'Email', 'Location']],
		[
			'transport',
			VESSEL,
			[
				'Name',
				'Transport Mode',
				'IMO number',
				'Flag',
				'Year built',
				'Gross tonnage',
				'Length overall'
			]
		],
		['facilities', FACILITY, ['Name', 'Kind', 'Location', 'Name', 'Phone', 'Email']]
	] as const)(
		'draws every input of a %s record on the library’s notched field',
		(page, record, labels) => {
			const { container } = show(page, record);

			expect(labelsOf(container)).toEqual(labels);
			// Nothing is left on the old grey dropdown or the form's own white box: every input typed into is inside a
			// notched field (the pictures' file pickers aside).
			expect(
				container.querySelector('input:not([type="file"]):not(fieldset.field input)')
			).toBeNull();
		}
	);

	it('puts each input’s ? on its border, with its Help text', async () => {
		show('customers', CUSTOMER);

		for (const name of ['Name', 'Short Code', 'Type', 'Location', 'Email', 'Phone', 'Website'])
			expect(
				screen.getAllByRole('button', { name: `What goes in ${name}?` }).length
			).toBeGreaterThan(0);
	});

	it('keeps each change as it is typed', async () => {
		const { set } = show('customers', CUSTOMER);

		await fireEvent.input(textbox('Website'), { target: { value: 'gulflines.com' } });
		expect(set).toHaveBeenLastCalledWith({ website: 'gulflines.com' });

		const [, contactName] = screen.getAllByRole('textbox', { name: 'Name' });
		await fireEvent.input(contactName, { target: { value: 'Sam Leigh' } });
		expect(set).toHaveBeenLastCalledWith({
			contacts: [{ ...CUSTOMER.contacts![0], name: 'Sam Leigh' }]
		});
	});

	it('keeps a vessel’s particulars as they are typed', async () => {
		const { set } = show('transport', VESSEL);

		await fireEvent.input(textbox('Flag'), { target: { value: 'Malta' } });
		expect(set).toHaveBeenLastCalledWith({ details: { 'IMO number': '9563706', Flag: 'Malta' } });
	});

	describe('Name', () => {
		it('renames a record once its Name is left, not as it is typed', async () => {
			const onname = vi.fn(() => true);
			const { set } = show('customers', CUSTOMER, { onname });
			const [name] = screen.getAllByRole('textbox', { name: 'Name' });

			await fireEvent.input(name, { target: { value: 'Gulf Lines Ltd' } });
			expect(onname).not.toHaveBeenCalled();
			expect(set).not.toHaveBeenCalled();

			await fireEvent.change(name);
			expect(onname).toHaveBeenCalledWith('Gulf Lines Ltd');
		});

		it('leaves the Name on Enter', async () => {
			const onname = vi.fn(() => true);
			show('facilities', FACILITY, { onname });
			const [name] = screen.getAllByRole('textbox', { name: 'Name' });
			name.focus();

			await fireEvent.keyDown(name, { key: 'Enter' });
			expect(document.activeElement).not.toBe(name);
		});

		it('puts the old name back when the rename is turned down', async () => {
			const onname = vi.fn(() => false);
			show('team', MEMBER, { onname });
			const [name] = screen.getAllByRole('textbox', { name: 'Name' }) as HTMLInputElement[];

			await fireEvent.input(name, { target: { value: 'Ben Cho' } });
			await fireEvent.change(name);

			expect(onname).toHaveBeenCalledWith('Ben Cho');
			expect(name.value).toBe('Ana Ruiz');
		});

		it('opens a new record’s form on its Name', async () => {
			show('team', draftOf('team'), { isNew: true });
			await Promise.resolve();

			expect(document.activeElement).toBe(textbox('Name'));
		});

		it('keeps a new record’s name as it is typed', async () => {
			const { set } = show('customers', draftOf('customers'), { isNew: true });

			await fireEvent.input(textbox('Name'), { target: { value: 'Blue Water' } });
			expect(set).toHaveBeenLastCalledWith({ name: 'Blue Water' });
		});
	});

	describe('Short Code', () => {
		it('shows the code made from the name, as a Generated value, while none is typed', async () => {
			const { container } = show('customers', draftOf('customers'), { isNew: true });

			await fireEvent.input(textbox('Name'), { target: { value: 'Blue Water' } });

			expect(textbox('Short Code').value).toBe('BLU');
			expect(container.querySelector('fieldset.field.field-generated')).toBeTruthy();
		});

		it('shows a kept code that matches the name as the Generated value', () => {
			const { container } = show('customers', { ...CUSTOMER, code: 'GUL' });

			expect(textbox('Short Code').value).toBe('GUL');
			expect(container.querySelector('fieldset.field.field-generated')).toBeTruthy();
		});

		it('shows no code before the name is typed', () => {
			show('customers', draftOf('customers'), { isNew: true });

			expect(textbox('Short Code').value).toBe('');
		});

		it('keeps what is typed over it in capitals, letters and digits only', async () => {
			const { set } = show('customers', CUSTOMER);

			await fireEvent.input(textbox('Short Code'), { target: { value: 'gl-1' } });

			expect(set).toHaveBeenLastCalledWith({ code: 'GL1' });
			expect(textbox('Short Code').value).toBe('GL1');
		});

		it('brings the Generated value back with its reset', async () => {
			const { set, value } = show('customers', { ...CUSTOMER, code: 'GLX' });

			await fireEvent.click(screen.getByRole('button', { name: /Bring back the app/ }));

			expect(set).toHaveBeenLastCalledWith({ code: 'GUL' });
			expect((value as ClientType).code).toBe('GUL');
			expect(textbox('Short Code').value).toBe('GUL');
		});

		it('gives a customer that exists the made code when its Short Code is left empty', async () => {
			const { set } = show('customers', { ...CUSTOMER, code: 'GLX' });
			const code = textbox('Short Code');

			await fireEvent.input(code, { target: { value: '' } });
			await fireEvent.change(code);

			expect(set).toHaveBeenLastCalledWith({ code: 'GUL' });
		});

		it('leaves a new customer’s empty Short Code to follow its name until it is added', async () => {
			const { set } = show('customers', draftOf('customers'), { isNew: true });
			const code = textbox('Short Code');

			await fireEvent.input(code, { target: { value: 'X' } });
			await fireEvent.input(code, { target: { value: '' } });
			await fireEvent.change(code);

			expect(set).toHaveBeenLastCalledWith({ code: '' });
		});
	});
});

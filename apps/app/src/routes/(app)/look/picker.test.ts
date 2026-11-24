// What the app's one dropdown does today (#298, written before it merges into the library's Select, so nothing already
// built breaks): its label, Help ? and amber dot; the field showing what is picked as what it is, a face, a logo, an
// icon, or "3 people"; a list with search on every one; Add new, a pencil to open a choice, picking several; the inset
// control inside the field; and a disabled field that opens nothing.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import Picker from './picker.svelte';

const KINDS = [
	{ id: 'Port', label: 'Port', icon: 'icon-[mdi--anchor]' },
	{ id: 'Yard', label: 'Yard', icon: 'icon-[mdi--warehouse]' },
	{ id: 'Dock', label: 'Dock', note: 'Galveston', image: '/dock.webp' }
];

function show(props: Record<string, unknown>) {
	const onpick = vi.fn();
	const view = render(Picker, { props: { label: 'Kind', options: KINDS, onpick, ...props } });
	return { ...view, onpick };
}

// The field is the button the list hangs from, named for its label.
function fieldOf(name = 'Kind') {
	return screen.getByRole('button', { name });
}

async function open(name = 'Kind') {
	await fireEvent.click(fieldOf(name));
	return screen.getByRole('listbox', { name });
}

function namesOf(list: HTMLElement) {
	return within(list)
		.getAllByRole('option')
		.map((option) => option.textContent?.replace(/\s+/g, ' ').trim());
}

describe('the field', () => {
	it('shows its label above, and the name of what is picked', () => {
		const { container } = show({ value: 'Yard' });

		expect(container.querySelector('p')?.textContent?.trim()).toBe('Kind');
		expect(fieldOf().textContent?.trim()).toBe('Yard');
	});

	it('says Choose while nothing is picked', () => {
		show({});
		expect(fieldOf().textContent?.trim()).toBe('Choose');
	});

	it('says what it is told to while nothing is picked', () => {
		show({ placeholder: 'Choose a customer first' });
		expect(fieldOf().textContent?.trim()).toBe('Choose a customer first');
	});

	it('shows a picked value that is not among the choices as it is', () => {
		show({ value: 'Berth 12' });
		expect(fieldOf().textContent?.trim()).toBe('Berth 12');
	});

	it('wears an amber dot while nothing is picked, and loses it once something is', async () => {
		const { rerender } = show({});
		expect(screen.getByTitle('Not picked yet')).toBeTruthy();

		await rerender({ value: 'Port' });
		expect(screen.queryByTitle('Not picked yet')).toBeNull();
	});

	it('wears no amber dot when picking is not required', () => {
		show({ isRequired: false });
		expect(screen.queryByTitle('Not picked yet')).toBeNull();
	});

	it('leaves its label out for a second row of the same fields', () => {
		const { container } = show({ hasLabel: false });
		expect(container.querySelector('p')).toBeNull();
		expect(screen.queryByTitle('Not picked yet')).toBeNull();
	});

	it('puts its Help ? after the label, marked empty until something is picked', async () => {
		const { container, rerender } = show({ help: 'What the facility is.' });
		const block = container.querySelector('.has-help');

		expect(screen.getByRole('button', { name: 'What goes in Kind?' })).toBeTruthy();
		expect(block?.hasAttribute('data-empty')).toBe(true);

		await rerender({ value: 'Port' });
		expect(block?.hasAttribute('data-empty')).toBe(false);
	});

	it('has no Help ? without Help text', () => {
		const { container } = show({});
		expect(container.querySelector('.has-help')).toBeNull();
		expect(screen.queryByRole('button', { name: /What goes in/ })).toBeNull();
	});

	it("shows what is picked as its own icon, the field's icon while nothing is", async () => {
		const { container, rerender } = show({ icon: 'icon-[mdi--domain]' });
		expect(container.querySelector('.icon-\\[mdi--domain\\]')).not.toBeNull();

		await rerender({ value: 'Port' });
		expect(fieldOf().querySelector('.icon-\\[mdi--anchor\\]')).not.toBeNull();
		expect(container.querySelector('.icon-\\[mdi--domain\\]')).toBeNull();
	});

	it('shows a picked choice with a picture as that picture', () => {
		show({ value: 'Dock' });
		expect(fieldOf().querySelector('img')?.getAttribute('src')).toBe('/dock.webp');
	});

	it('shows a person as their face and a customer as its logo', async () => {
		show({ label: 'Team Lead', kind: 'person', options: [], value: 'Ana Ruiz' });
		expect(within(fieldOf('Team Lead')).getByRole('img', { name: 'Ana Ruiz' })).toBeTruthy();

		show({ label: 'Customer', kind: 'customer', options: [], value: 'Gulf Metals' });
		expect(within(fieldOf('Customer')).getByLabelText('Gulf Metals logo')).toBeTruthy();
	});

	it('names several picks by how many, with a face for each', () => {
		show({
			label: 'Team Assigned',
			kind: 'person',
			options: [],
			values: ['Ana Ruiz', 'Ben Cho', 'Cy Park'],
			many: 'people'
		});
		const field = fieldOf('Team Assigned');

		expect(field.textContent?.trim()).toBe('3 people');
		expect(
			within(field)
				.getAllByRole('img')
				.map((face) => face.getAttribute('aria-label'))
		).toEqual(['Ana Ruiz', 'Ben Cho', 'Cy Park']);
	});

	it('shows one pick of several by its name', () => {
		show({ values: ['Yard'], many: 'kinds' });
		expect(fieldOf().textContent?.trim()).toBe('Yard');
	});

	it('opens nothing while disabled, and still shows what is picked', async () => {
		const { container } = show({ value: 'Port', isDisabled: true });

		expect(screen.queryByRole('button', { name: 'Kind' })).toBeNull();
		expect(container.textContent).toContain('Port');
	});

	it('puts a control of its own inside the field, whose tap is its own', async () => {
		const ontap = vi.fn();
		const inset = createRawSnippet(() => ({
			render: () => '<button type="button">Start</button>',
			setup: (node) => {
				node.addEventListener('click', ontap);
			}
		}));
		show({ value: 'Port', inset });

		await fireEvent.click(screen.getByRole('button', { name: 'Start' }));

		expect(ontap).toHaveBeenCalledOnce();
		expect(screen.queryByRole('listbox')).toBeNull();
	});
});

describe('the list', () => {
	it('opens on a tap with every choice, and a search field on top however short it is', async () => {
		show({ value: 'Port' });
		const list = await open();

		expect(namesOf(list)).toEqual(['Port', 'Yard', 'Dock Galveston']);
		expect(screen.getByRole('searchbox', { name: 'Search Kind' })).toBeTruthy();
	});

	it('narrows to what is typed in its search field', async () => {
		show({});
		const list = await open();

		await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'galv' } });

		expect(namesOf(list)).toEqual(['Dock Galveston']);
	});

	it('hands a pick to the place that uses it and closes', async () => {
		const { onpick } = show({ value: 'Port' });
		const list = await open();

		await fireEvent.click(within(list).getByRole('option', { name: 'Yard' }));

		expect(onpick).toHaveBeenCalledWith('Yard');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('picks several when given values: each one ticked, and the list stays open', async () => {
		const { onpick } = show({ values: ['Port', 'Dock'] });
		const list = await open();

		expect(
			within(list)
				.getAllByRole('option')
				.map((option) => option.getAttribute('aria-selected'))
		).toEqual(['true', 'false', 'true']);

		await fireEvent.click(within(list).getByRole('option', { name: 'Yard' }));

		expect(onpick).toHaveBeenCalledWith('Yard');
		expect(screen.getByRole('listbox')).toBeTruthy();
	});

	it('marks each choice with its icon or picture, and one with neither with the field icon', async () => {
		show({ icon: 'icon-[mdi--domain]', options: [...KINDS, { id: 'Shed', label: 'Shed' }] });
		const list = await open();
		const [port, , dock, shed] = within(list).getAllByRole('option');

		expect(port.querySelector('.icon-\\[mdi--anchor\\]')).not.toBeNull();
		expect(dock.querySelector('img')?.getAttribute('src')).toBe('/dock.webp');
		expect(shed.querySelector('.icon-\\[mdi--domain\\]')).not.toBeNull();
	});

	it('shows people as their faces in the list too', async () => {
		show({
			label: 'Team Lead',
			kind: 'person',
			options: [{ id: 'Ana Ruiz', label: 'Ana Ruiz' }]
		});
		const list = await open('Team Lead');

		expect(within(list).getByRole('img', { name: 'Ana Ruiz' })).toBeTruthy();
	});

	it('puts Add new on top, named for the label or what it adds', async () => {
		const onadd = vi.fn();
		show({ label: 'Start', onadd, addLabel: 'Facility' });
		await open('Start');

		await fireEvent.click(screen.getByRole('button', { name: 'Add new Facility' }));

		expect(onadd).toHaveBeenCalledOnce();
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('puts a pencil on each choice that opens it to edit', async () => {
		const onedit = vi.fn();
		show({ onedit });
		await open();

		await fireEvent.click(screen.getByRole('button', { name: 'Edit Yard' }));

		expect(onedit).toHaveBeenCalledWith('Yard');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('has no Add new and no pencils unless asked', async () => {
		show({});
		await open();

		expect(screen.queryByRole('button', { name: /^Add new/ })).toBeNull();
		expect(screen.queryByRole('button', { name: /^Edit / })).toBeNull();
	});
});

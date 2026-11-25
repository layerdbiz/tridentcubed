// The Select (#298): the one dropdown, with search, a picture beside each choice, picking several, Add new and a pencil
// to open a choice each switched on by a prop of its own, and a lookup that finds choices for what is typed. The soft
// variant is the app's dropdown merged in, so its tests are the ones that pinned what that dropdown did before
// (`apps/app/.../look/picker.test.ts`, removed with it); the lookup's are the location field's.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import Select from './select.svelte';
import type { LookupType, SelectOptionType } from './select.svelte.ts';

const KINDS: SelectOptionType[] = [
	{ value: 'Port', label: 'Port', icon: 'icon-[mdi--anchor]' },
	{ value: 'Yard', label: 'Yard', icon: 'icon-[mdi--warehouse]' },
	{ value: 'Dock', label: 'Dock', note: 'Galveston', image: '/dock.webp' }
];

// A picture the place using it draws for each choice: here a face named for the person.
const face = createRawSnippet((name: () => string) => ({
	render: () => `<span role="img" aria-label="${name()}"></span>`
}));

function show(props: Record<string, unknown>) {
	const onpick = vi.fn();
	const view = render(Select, {
		props: { variant: 'soft', label: 'Kind', options: KINDS, onpick, ...props }
	});
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
		const { rerender } = show({ required: true });
		expect(screen.getByTitle('Not picked yet')).toBeTruthy();

		await rerender({ value: 'Port' });
		expect(screen.queryByTitle('Not picked yet')).toBeNull();
	});

	it('wears no amber dot when picking is not required', () => {
		show({});
		expect(screen.queryByTitle('Not picked yet')).toBeNull();
	});

	it('leaves its label out for a second row of the same fields', () => {
		const { container } = show({ hasLabel: false, required: true });
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

	it('shows what is picked as the picture it is given to draw', () => {
		show({ label: 'Team Lead', mark: face, options: [], value: 'Ana Ruiz' });
		expect(within(fieldOf('Team Lead')).getByRole('img', { name: 'Ana Ruiz' })).toBeTruthy();
	});

	it('names several picks by how many, with a picture for each', () => {
		show({
			label: 'Team Assigned',
			mark: face,
			options: [],
			multiple: true,
			value: ['Ana Ruiz', 'Ben Cho', 'Cy Park'],
			many: 'people'
		});
		const field = fieldOf('Team Assigned');

		expect(field.textContent?.trim()).toBe('3 people');
		expect(
			within(field)
				.getAllByRole('img')
				.map((mark) => mark.getAttribute('aria-label'))
		).toEqual(['Ana Ruiz', 'Ben Cho', 'Cy Park']);
	});

	it('shows one pick of several by its name', () => {
		show({ multiple: true, value: ['Yard'], many: 'kinds' });
		expect(fieldOf().textContent?.trim()).toBe('Yard');
	});

	it('opens nothing while disabled, and still shows what is picked', () => {
		const { container } = show({ value: 'Port', disabled: true });

		expect(screen.queryByRole('button', { name: 'Kind' })).toBeNull();
		expect(container.textContent).toContain('Port');
	});

	it('puts a control of its own at the start of the field, whose tap is its own', async () => {
		const ontap = vi.fn();
		const start = createRawSnippet(() => ({
			render: () => '<button type="button">Start</button>',
			setup: (node) => {
				node.addEventListener('click', ontap);
			}
		}));
		show({ value: 'Port', start });

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

	it('has no search field when told not to', async () => {
		show({ isSearchable: false });
		await open();

		expect(screen.queryByRole('searchbox')).toBeNull();
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
		expect(fieldOf().textContent?.trim()).toBe('Yard');
	});

	it('picks several when told to: each one ticked, and the list stays open', async () => {
		const { onpick } = show({ multiple: true, value: ['Port', 'Dock'] });
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

	it('takes a second tap of a pick back when it picks several', async () => {
		const { onpick } = show({ multiple: true, value: ['Port', 'Dock'], many: 'kinds' });
		const list = await open();

		await fireEvent.click(within(list).getByRole('option', { name: 'Port' }));

		expect(onpick).toHaveBeenCalledWith('Port');
		expect(fieldOf().textContent?.trim()).toBe('Dock');
	});

	it('marks each choice with its icon or picture, and one with neither with the field icon', async () => {
		show({ icon: 'icon-[mdi--domain]', options: [...KINDS, { value: 'Shed', label: 'Shed' }] });
		const list = await open();
		const [port, , dock, shed] = within(list).getAllByRole('option');

		expect(port.querySelector('.icon-\\[mdi--anchor\\]')).not.toBeNull();
		expect(dock.querySelector('img')?.getAttribute('src')).toBe('/dock.webp');
		expect(shed.querySelector('.icon-\\[mdi--domain\\]')).not.toBeNull();
	});

	it('draws the picture it is given in the list too', async () => {
		show({
			label: 'Team Lead',
			mark: face,
			options: [{ value: 'Ana Ruiz', label: 'Ana Ruiz' }]
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

describe('the notched field', () => {
	function notched(props: Record<string, unknown>) {
		return render(Select, { props: { label: 'Project Type', options: KINDS, ...props } });
	}

	it('puts a ? after its label', () => {
		notched({ value: 'Port', help: 'The kind of survey.' });

		expect(screen.getByRole('button', { name: 'What goes in Project Type?' })).toBeTruthy();
	});

	it('shows what is picked and opens the same list, search, pictures and all', async () => {
		notched({ value: 'Dock', name: 'type' });
		const field = screen.getByRole('button', { name: 'Project Type' });

		expect(field.textContent?.trim()).toBe('Dock');

		await fireEvent.click(field);
		const list = screen.getByRole('listbox', { name: 'Project Type' });

		expect(screen.getByRole('searchbox', { name: 'Search Project Type' })).toBeTruthy();
		expect(within(list).getByRole('option', { name: /Dock/ }).querySelector('img')).not.toBeNull();
	});

	it('keeps what is picked in a form, under its name', async () => {
		const { container } = notched({ value: 'Port', name: 'type' });
		await fireEvent.click(screen.getByRole('button', { name: 'Project Type' }));

		await fireEvent.click(screen.getByRole('option', { name: 'Yard' }));

		expect(container.querySelector<HTMLSelectElement>('select[name="type"]')?.value).toBe('Yard');
	});

	it('names several picks by their names', () => {
		notched({ multiple: true, value: ['Port', 'Yard'] });

		expect(screen.getByRole('button', { name: 'Project Type' }).textContent?.trim()).toBe(
			'Port, Yard'
		);
	});

	// The look settled on the inputs prototype (#284): the same box as every input, the pick's picture at its start and
	// a chevron at its end (#57 moves the app's panels onto it).
	it('shows what is picked as its picture at the start, and a chevron at the end', () => {
		notched({ value: 'Dock' });
		const field = screen.getByRole('button', { name: 'Project Type' });

		expect(field.querySelector('img')?.getAttribute('src')).toBe('/dock.webp');
		expect(
			field.closest('fieldset')?.querySelector('.icon-\\[mdi--chevron-down\\]')
		).not.toBeNull();
	});

	it("shows the field's own icon while nothing is picked, and none for choices with no picture", async () => {
		const { rerender } = notched({ icon: 'icon-[mdi--domain]' });
		const field = screen.getByRole('button', { name: 'Project Type' });
		expect(field.querySelector('.icon-\\[mdi--domain\\]')).not.toBeNull();

		await rerender({
			icon: undefined,
			options: [{ value: 'Cargo', label: 'Cargo' }],
			value: 'Cargo'
		});
		expect(field.querySelector('img, [class*="icon-"]')).toBeNull();
	});

	it('draws the picture it is given, one for each of several picks', () => {
		notched({
			label: 'Team Assigned',
			mark: face,
			options: [],
			multiple: true,
			value: ['Ana Ruiz', 'Ben Cho'],
			many: 'people'
		});
		const field = screen.getByRole('button', { name: 'Team Assigned' });

		expect(field.textContent?.trim()).toBe('2 people');
		expect(
			within(field)
				.getAllByRole('img')
				.map((mark) => mark.getAttribute('aria-label'))
		).toEqual(['Ana Ruiz', 'Ben Cho']);
	});

	// Focus floats the label to the border and shows its ?, which would slide under a pointer still pressed on an empty
	// field and take the click, so the list would not open.
	it('opens on a click without taking the focus as it is pressed', async () => {
		notched({ help: 'The kind of survey.' });
		const field = screen.getByRole('button', { name: 'Project Type' });

		expect(await fireEvent.mouseDown(field.firstElementChild!)).toBe(false);
		await fireEvent.click(field);

		expect(screen.getByRole('listbox', { name: 'Project Type' })).toBeTruthy();
	});

	it('says why nothing can be picked, with its label on the border', () => {
		const { container } = notched({
			label: 'Contact',
			options: [],
			disabled: true,
			placeholder: 'No contacts on this customer yet'
		});

		expect(container.textContent).toContain('No contacts on this customer yet');
		expect(container.querySelector('fieldset')?.classList.contains('field-filled')).toBe(true);
		expect(screen.queryByRole('button', { name: 'Contact' })).toBeNull();
	});
});

describe('a lookup', () => {
	const SAVED: SelectOptionType[] = [
		{ value: 'Houston, TX', label: 'Houston, TX', icon: 'icon-[mdi--map-marker]', note: 'Saved' },
		{ value: 'Houma, LA', label: 'Houma, LA', icon: 'icon-[mdi--map-marker]', note: 'Saved' },
		{
			value: 'Galveston, TX',
			label: 'Galveston, TX',
			icon: 'icon-[mdi--map-marker]',
			note: 'Saved'
		}
	];

	let asks: string[];
	let lookup: LookupType;

	// What the lookup finds for a text: a place under its own name, with a line that places it.
	function foundFor(text: string): SelectOptionType[] {
		return [
			{ value: `${text} Port`, label: `${text} Port`, note: `${text} Port, Texas` },
			{ value: 'Houston, TX', label: 'Houston, TX', note: 'Houston, Texas' }
		];
	}

	beforeEach(() => {
		// Only the pause is faked: faking every timer stalls Svelte's tick.
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		asks = [];
		lookup = {
			credit: { name: 'Geoapify', href: 'https://www.geoapify.com/' },
			find: vi.fn(async (text: string) => {
				asks.push(text);
				return foundFor(text);
			})
		};
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// The field as a form shows it: typing hands the words up, and the form hands them back as its value.
	function typeIn(props: Record<string, unknown> = {}) {
		const typed: string[] = [];
		const onpick = vi.fn();
		const view = render(Select, {
			props: {
				variant: 'soft',
				label: 'City',
				options: SAVED,
				lookup,
				value: '',
				onpick,
				oninput: (text: string) => typed.push(text),
				...props
			}
		});
		return { ...view, typed, onpick, input: screen.getByRole('combobox', { name: 'City' }) };
	}

	async function type(input: HTMLElement, text: string) {
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: text } });
	}

	function listed() {
		return screen
			.getAllByRole('option')
			.map((option) => option.textContent?.replace(/\s+/g, ' ').trim());
	}

	it('is typed into, under its label', () => {
		const { container } = typeIn({ value: 'Pier 9' });

		expect(container.querySelector('label')?.textContent).toBe('City');
		expect((screen.getByRole('combobox', { name: 'City' }) as HTMLInputElement).value).toBe(
			'Pier 9'
		);
	});

	it('offers the known choices holding the words at once, without asking', async () => {
		const { input } = typeIn();
		await type(input, 'hou');

		expect(listed()).toEqual(['Houston, TX Saved', 'Houma, LA Saved']);
		expect(asks).toEqual([]);
	});

	it('asks once typing pauses, and lists what it finds under the known choices', async () => {
		const { input } = typeIn();
		await type(input, 'Hou');
		await vi.advanceTimersByTimeAsync(349);
		expect(asks).toEqual([]);

		await vi.advanceTimersByTimeAsync(1);

		expect(asks).toEqual(['hou']);
		expect(listed()).toEqual(['Houston, TX Saved', 'Houma, LA Saved', 'hou Port hou Port, Texas']);
		expect(screen.getByRole('link', { name: 'Geoapify' }).getAttribute('href')).toBe(
			'https://www.geoapify.com/'
		);
	});

	it('asks only for the last words when typing goes on', async () => {
		const { input } = typeIn();
		await type(input, 'gal');
		await vi.advanceTimersByTimeAsync(200);
		await type(input, 'galv');
		await vi.advanceTimersByTimeAsync(350);

		expect(asks).toEqual(['galv']);
	});

	it('never asks with fewer letters than the lookup waits for', async () => {
		const { input } = typeIn();
		await type(input, 'ho');
		await vi.advanceTimersByTimeAsync(1000);

		expect(asks).toEqual([]);
	});

	it('asks with as few letters as the lookup says', async () => {
		lookup.letters = 2;
		const { input } = typeIn();
		await type(input, 'ho');
		await vi.advanceTimersByTimeAsync(350);

		expect(asks).toEqual(['ho']);
	});

	it('never asks for the name of a known choice', async () => {
		const { input } = typeIn();
		await type(input, 'galveston, tx');
		await vi.advanceTimersByTimeAsync(1000);

		expect(asks).toEqual([]);
	});

	it('says it is looking until the lookup answers', async () => {
		let answer: (found: SelectOptionType[]) => void = () => {};
		lookup.find = () => new Promise((resolve) => (answer = resolve));
		const { input } = typeIn();
		await type(input, 'corpus');
		await vi.advanceTimersByTimeAsync(350);

		expect(screen.getByText('Looking it up…')).toBeTruthy();

		answer(foundFor('corpus'));
		await vi.advanceTimersByTimeAsync(0);

		expect(screen.queryByText('Looking it up…')).toBeNull();
		expect(listed()).toContain('corpus Port corpus Port, Texas');
	});

	it('remembers what the lookup said for the visit, in every field that asks it', async () => {
		const first = typeIn();
		await type(first.input, 'beaumont');
		await vi.advanceTimersByTimeAsync(350);
		first.unmount();

		const second = typeIn();
		await type(second.input, 'Beaumont');
		await vi.advanceTimersByTimeAsync(350);

		expect(asks).toEqual(['beaumont']);
		expect(listed()).toContain('beaumont Port beaumont Port, Texas');
	});

	it('keeps showing the known choices when the lookup cannot answer', async () => {
		lookup.find = async () => {
			throw new TypeError('Failed to fetch');
		};
		const { input } = typeIn();
		await type(input, 'houst');
		await vi.advanceTimersByTimeAsync(350);

		expect(listed()).toEqual(['Houston, TX Saved']);
		expect(screen.queryByText('Looking it up…')).toBeNull();
	});

	it('keeps words typed and never picked', async () => {
		const { input, typed, onpick } = typeIn();
		await type(input, 'Pier 9');

		expect(typed).toEqual(['Pier 9']);
		expect((input as HTMLInputElement).value).toBe('Pier 9');
		expect(onpick).not.toHaveBeenCalled();
	});

	it('hands a found choice to the place that uses it, and takes its name', async () => {
		const { input, onpick } = typeIn();
		await type(input, 'freeport');
		await vi.advanceTimersByTimeAsync(350);

		await fireEvent.click(screen.getByRole('option', { name: /freeport Port/ }));

		expect(onpick).toHaveBeenCalledWith('freeport Port');
		expect((input as HTMLInputElement).value).toBe('freeport Port');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('hands a known choice over the same way', async () => {
		const { input, onpick } = typeIn();
		await type(input, 'galv');

		await fireEvent.click(screen.getByRole('option', { name: /Galveston, TX/ }));

		expect(onpick).toHaveBeenCalledWith('Galveston, TX');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('shows nothing until something is typed', async () => {
		const { input } = typeIn();
		await fireEvent.focus(input);

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('closes on Escape', async () => {
		const { input } = typeIn();
		await type(input, 'hou');
		await fireEvent.keyDown(input, { key: 'Escape' });

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('closes once the field is left', async () => {
		const { input } = typeIn();
		await type(input, 'hou');
		await fireEvent.blur(input);
		await vi.advanceTimersByTimeAsync(180);

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('marks the known choice the field names as picked', async () => {
		const { input } = typeIn({ value: 'Houston, TX' });
		await type(input, 'Houston, TX');
		const list = screen.getByRole('listbox');

		expect(
			within(list)
				.getByRole('option', { name: /Houston, TX/ })
				.getAttribute('aria-selected')
		).toBe('true');
	});

	it("takes its form's own input look when given one", () => {
		const { input } = typeIn({ inputClass: 'boxed' });
		expect(input.classList.contains('boxed')).toBe(true);
		expect(input.classList.contains('bg-slate-900/[0.04]')).toBe(false);
	});

	it('wears an amber dot while it is empty and required, and never stops a form being sent', async () => {
		const { rerender, input } = typeIn({ required: true });
		expect(screen.getByTitle('Not filled in yet')).toBeTruthy();
		expect((input as HTMLInputElement).required).toBe(false);

		await rerender({ value: 'Pier 9' });
		expect(screen.queryByTitle('Not filled in yet')).toBeNull();
	});
});

describe('a typed field', () => {
	const CUSTOMERS: SelectOptionType[] = [
		{ value: 'US Ocean', label: 'US Ocean' },
		{ value: 'Ocean Freight Co', label: 'Ocean Freight Co' },
		{ value: 'Gulf Lines', label: 'Gulf Lines' }
	];

	function typeIn(props: Record<string, unknown> = {}) {
		const onpick = vi.fn();
		const view = render(Select, {
			props: {
				variant: 'soft',
				label: 'Company',
				options: CUSTOMERS,
				isTyped: true,
				value: '',
				onpick,
				...props
			}
		});
		return { ...view, onpick, input: screen.getByRole('combobox', { name: 'Company' }) };
	}

	it('is typed into without a lookup, offering the known choices holding the words', async () => {
		const { input } = typeIn();
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'ocean' } });

		expect(
			screen.getAllByRole('option').map((option) => option.textContent?.replace(/\s+/g, ' ').trim())
		).toEqual(['US Ocean', 'Ocean Freight Co']);
	});

	it('keeps words no choice holds, and takes a known choice when one is picked', async () => {
		const { input, onpick } = typeIn();
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: 'Pier 9 Stevedores' } });
		expect((input as HTMLInputElement).value).toBe('Pier 9 Stevedores');
		expect(screen.queryByRole('listbox')).toBeNull();

		await fireEvent.input(input, { target: { value: 'gulf' } });
		await fireEvent.click(screen.getByRole('option', { name: 'Gulf Lines' }));

		expect(onpick).toHaveBeenCalledWith('Gulf Lines');
		expect((input as HTMLInputElement).value).toBe('Gulf Lines');
	});
});

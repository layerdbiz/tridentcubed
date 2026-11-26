// The menu list (#297): the list the app's dropdown opens, and the account menu, the ⋮ menus, the list menus and the
// cards' menus. It moved here from the app unchanged (Justin, 2026-11-24: nothing already built may break), so these
// tests pin what it did there: a tap opens it, search sits at the top, anything that takes something away reads red,
// each choice shows its icon, dot, face or logo, it lines up with its button, and a pick, Escape or a tap outside
// closes it.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import Menu from './menu.svelte';

const VIEWS = [
	{ id: 'table', label: 'List', icon: 'icon-[mdi--format-list-bulleted]' },
	{ id: 'cards', label: 'Cards', icon: 'icon-[mdi--view-grid-outline]' },
	{ id: 'board', label: 'Board', icon: 'icon-[mdi--view-column-outline]' }
];

const MORE = [
	{ id: 'edit', label: 'Edit Customer', icon: 'icon-[mdi--pencil-outline]' },
	{ id: 'delete', label: 'Delete', icon: 'icon-[mdi--trash-can-outline]', isDanger: true }
];

const FACILITIES = [
	{ id: 'port', label: 'Port of Houston', note: 'Houston' },
	{ id: 'yard', label: 'Kinder Yard', note: 'Pasadena' },
	{ id: 'dock', label: 'City Dock 27', note: 'Galveston' }
];

// The button the menu hangs from: whatever the place draws, here the picked choice's name.
const trigger = createRawSnippet((current: () => { label: string } | undefined) => ({
	render: () => `<span>${current()?.label ?? 'Choose'}</span>`
}));

function show(props: Record<string, unknown>) {
	const onpick = vi.fn();
	const result = render(Menu, {
		props: { label: 'View', value: '', options: VIEWS, onpick, trigger, ...props }
	});
	return { ...result, onpick };
}

async function open(name = 'View') {
	await fireEvent.click(screen.getByRole('button', { name }));
	return screen.getByRole('listbox', { name });
}

// What each choice in the open list reads, its name and its grey note.
function namesOf(list: HTMLElement) {
	return within(list)
		.getAllByRole('option')
		.map((option) => option.textContent?.replace(/\s+/g, ' ').trim());
}

function listOf() {
	return document.querySelector<HTMLElement>('[popover]');
}

// Where the button sits on the page. jsdom lays nothing out, so every box answers with this one.
function placeButton(box: { top: number; left: number; width: number; height: number }) {
	const rect = {
		...box,
		right: box.left + box.width,
		bottom: box.top + box.height,
		x: box.left,
		y: box.top
	};
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		...rect,
		toJSON: () => rect
	} as DOMRect);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('opening and picking', () => {
	it('shows what is picked on its button, and opens the list on a tap', async () => {
		show({ value: 'cards' });
		const button = screen.getByRole('button', { name: 'View' });

		expect(button.textContent).toBe('Cards');
		expect(button.getAttribute('aria-haspopup')).toBe('listbox');
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByRole('listbox')).toBeNull();

		const list = await open();

		expect(button.getAttribute('aria-expanded')).toBe('true');
		expect(namesOf(list)).toEqual(['List', 'Cards', 'Board']);
	});

	it('marks the picked choice with a tick, and only that one', async () => {
		show({ value: 'cards' });
		const list = await open();
		const options = within(list).getAllByRole('option');

		expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual([
			'false',
			'true',
			'false'
		]);
		expect(options[1].querySelector('.icon-\\[mdi--check\\]')).not.toBeNull();
		expect(options[0].querySelector('.icon-\\[mdi--check\\]')).toBeNull();
		expect(options[1].className).toContain('bg-primary/[0.08]');
	});

	it('hands the pick to the place that uses it and closes', async () => {
		const { onpick } = show({ value: 'table' });
		const list = await open();

		await fireEvent.click(within(list).getByRole('option', { name: 'Board' }));

		expect(onpick).toHaveBeenCalledWith('board');
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(screen.getByRole('button', { name: 'View' }).getAttribute('aria-expanded')).toBe(
			'false'
		);
	});

	it('picks several when given values: every one ticked, and the list stays open', async () => {
		const { onpick } = show({ values: ['table', 'board'] });
		const list = await open();

		expect(
			within(list)
				.getAllByRole('option')
				.map((option) => option.getAttribute('aria-selected'))
		).toEqual(['true', 'false', 'true']);

		await fireEvent.click(within(list).getByRole('option', { name: 'Cards' }));

		expect(onpick).toHaveBeenCalledWith('cards');
		expect(screen.getByRole('listbox')).not.toBeNull();
	});

	it('closes on a second tap of its button', async () => {
		show({});
		await open();
		await fireEvent.click(screen.getByRole('button', { name: 'View' }));

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('hangs from the library Button, whose look is set through button', async () => {
		show({
			trigger: undefined,
			button: { ghost: true, md: true, icon: 'icon-[mdi--chart-donut]' }
		});
		const button = screen.getByRole('button', { name: 'View' });

		expect(button.classList).toContain('btn');
		expect(button.classList).toContain('theme-ghost');
		expect(button.querySelector('.btn-icon')).not.toBeNull();
		expect(button.getAttribute('aria-haspopup')).toBe('listbox');

		await open();

		expect(button.getAttribute('aria-expanded')).toBe('true');
	});
});

describe('closing', () => {
	it('closes on Escape', async () => {
		show({});
		await open();
		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('closes on a tap anywhere outside it, and stays open for a tap inside', async () => {
		show({});
		const list = await open();

		await fireEvent.pointerDown(list);
		expect(screen.getByRole('listbox')).not.toBeNull();

		await fireEvent.pointerDown(document.body);
		expect(screen.queryByRole('listbox')).toBeNull();
	});
});

describe('search at the top of the list', () => {
	it('has no search field unless asked for', async () => {
		show({});
		await open();

		expect(screen.queryByRole('searchbox')).toBeNull();
	});

	it('narrows the list by name or by the grey note as you type', async () => {
		show({ label: 'Start', options: FACILITIES, isSearchable: true });
		const list = await open('Start');
		const search = screen.getByRole('searchbox', { name: 'Search Start' });

		expect(search.getAttribute('placeholder')).toBe('Search');
		expect(list.parentElement?.firstElementChild?.contains(search)).toBe(true);

		await fireEvent.input(search, { target: { value: 'port' } });
		expect(namesOf(list)).toEqual(['Port of Houston Houston']);

		await fireEvent.input(search, { target: { value: 'PASADENA' } });
		expect(namesOf(list)).toEqual(['Kinder Yard Pasadena']);
	});

	it('says so when nothing matches', async () => {
		show({ label: 'Start', options: FACILITIES, isSearchable: true });
		const list = await open('Start');

		await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'zzz' } });

		expect(within(list).queryAllByRole('option')).toHaveLength(0);
		expect(within(list).getByText('Nothing matches')).not.toBeNull();
	});

	it('picks the first choice left on Enter', async () => {
		const { onpick } = show({ label: 'Start', options: FACILITIES, isSearchable: true });
		await open('Start');
		const search = screen.getByRole('searchbox');

		await fireEvent.input(search, { target: { value: 'dock' } });
		await fireEvent.keyDown(search, { key: 'Enter' });

		expect(onpick).toHaveBeenCalledWith('dock');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('starts empty each time the list opens', async () => {
		show({ label: 'Start', options: FACILITIES, isSearchable: true });
		await open('Start');
		await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'port' } });
		await fireEvent.keyDown(window, { key: 'Escape' });

		const list = await open('Start');

		expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
		expect(within(list).getAllByRole('option')).toHaveLength(3);
	});

	it('is ready to type in with a mouse, and waits for a tap on a phone', async () => {
		show({ label: 'Start', options: FACILITIES, isSearchable: true });
		await open('Start');
		expect(document.activeElement).not.toBe(screen.getByRole('searchbox'));
		await fireEvent.keyDown(window, { key: 'Escape' });

		vi.spyOn(window, 'matchMedia').mockImplementation(
			(query) => ({ matches: query === '(pointer: fine)' }) as MediaQueryList
		);
		await open('Start');
		expect(document.activeElement).toBe(screen.getByRole('searchbox'));
	});
});

describe('what each choice shows', () => {
	it('reads red for anything that takes something away, its icon too', async () => {
		show({ label: 'More for KOGA', options: MORE });
		const list = await open('More for KOGA');
		const remove = within(list).getByRole('option', { name: 'Delete' });
		const edit = within(list).getByRole('option', { name: 'Edit Customer' });

		expect(remove.className).toContain('text-danger');
		expect(remove.className).toContain('font-medium');
		expect(remove.querySelector('.icon-\\[mdi--trash-can-outline\\]')?.className).not.toContain(
			'text-base-500'
		);
		expect(edit.className).not.toContain('text-danger');
		expect(edit.className).toContain('text-secondary-400');
		expect(edit.querySelector('.icon-\\[mdi--pencil-outline\\]')?.className).toContain(
			'text-base-500'
		);
	});

	it('shows a dot of colour and a count, as the list filter does', async () => {
		show({
			label: 'Filter',
			value: 'All',
			options: [
				{ id: 'All', label: 'All projects', count: 8 },
				{ id: 'Draft', label: 'Draft', dot: 'bg-slate-400', count: 3 }
			]
		});
		const list = await open('Filter');
		const draft = within(list).getByRole('option', { name: /Draft/ });

		expect(draft.querySelector('.bg-slate-400')?.className).toContain('rounded-full');
		expect(draft.querySelector('.tabular-nums')?.textContent).toBe('3');
	});

	it('shows a round picture, a face or a logo, in place of an icon', async () => {
		show({
			label: 'Customer',
			options: [{ id: 'koga', label: 'KOGA', image: '/logos/koga.png' }]
		});
		const list = await open('Customer');
		const picture = within(list).getByRole('option', { name: 'KOGA' }).querySelector('img');

		expect(picture?.getAttribute('src')).toBe('/logos/koga.png');
		expect(picture?.className).toContain('rounded-full');
	});

	it('puts the grey note under the name, two lines, so a long name leaves room for the pencil', async () => {
		show({ label: 'Start', options: FACILITIES });
		const list = await open('Start');
		const port = within(list).getByRole('option', { name: /Port of Houston/ });
		const name = within(port).getByText('Port of Houston');
		const note = within(port).getByText('Houston');

		expect(note.parentElement).toBe(name.parentElement);
		expect(name.parentElement?.className).toContain('flex-col');
		expect(note.className).toContain('text-base-400');
		expect(name.className).toContain('truncate');
		expect(note.className).toContain('truncate');
	});

	it('lets the place draw the mark at the left, told which choice is picked', async () => {
		const seen: Array<[string, boolean]> = [];
		const mark = createRawSnippet((option: () => { id: string }, isOn: () => boolean) => {
			seen.push([option().id, isOn()]);
			return { render: () => `<i data-face="${option().id}"></i>` };
		});
		show({ value: 'cards', mark });
		const list = await open();

		expect(list.querySelectorAll('[data-face]')).toHaveLength(3);
		expect(list.querySelector('.icon-\\[mdi--view-grid-outline\\]')).toBeNull();
		expect(seen).toEqual([
			['table', false],
			['cards', true],
			['board', false]
		]);
	});
});

describe('Add new and the pencil', () => {
	it('puts Add new at the top of the list, named by addLabel or the label', async () => {
		const onadd = vi.fn();
		show({ label: 'Start', options: FACILITIES, onadd, addLabel: 'Facility', isSearchable: true });
		const list = await open('Start');
		const add = within(list).getAllByRole('button')[0];

		expect(add.textContent?.trim()).toBe('Add new Facility');

		await fireEvent.click(add);

		expect(onadd).toHaveBeenCalledOnce();
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('names Add new after the label when there is no addLabel', async () => {
		show({ label: 'Customer', options: [], onadd: () => {} });
		const list = await open('Customer');

		expect(within(list).getByRole('button', { name: 'Add new Customer' })).not.toBeNull();
	});

	it('puts a pencil at the right of every choice, which opens that one to edit', async () => {
		const onedit = vi.fn();
		const { onpick } = show({ label: 'Start', options: FACILITIES, onedit });
		const list = await open('Start');

		expect(within(list).getAllByRole('button', { name: /^Edit / })).toHaveLength(3);

		await fireEvent.click(within(list).getByRole('button', { name: 'Edit Kinder Yard' }));

		expect(onedit).toHaveBeenCalledWith('yard');
		expect(onpick).not.toHaveBeenCalled();
		expect(screen.queryByRole('listbox')).toBeNull();
	});
});

describe('where the list goes', () => {
	it('hangs under its button, its right edge on the button’s right edge by default', async () => {
		placeButton({ top: 100, left: 600, width: 40, height: 40 });
		show({});
		await open();

		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain(`right: ${innerWidth - 640}px`);
		expect(style).toContain('top: 148px');
		expect(style).toContain('min-width: 192px');
	});

	it('lines up its left edge with the button’s when aligned left', async () => {
		placeButton({ top: 100, left: 24, width: 40, height: 40 });
		show({ align: 'left' });
		await open();

		expect(listOf()?.getAttribute('style')).toContain('left: 24px');
	});

	it('is as wide as a wide button, and the button fills its row', async () => {
		placeButton({ top: 100, left: 24, width: 320, height: 44 });
		show({ align: 'left', isWide: true });
		await open();

		expect(listOf()?.getAttribute('style')).toContain(' width: 320px');
		const button = screen.getByRole('button', { name: 'View' });
		expect(button.className).toContain('w-full');
		expect(button.parentElement?.className).toContain('w-full');
	});

	it('never reaches past the edge of the screen, so the pencil at the right always shows', async () => {
		placeButton({ top: 100, left: 24, width: innerWidth, height: 44 });
		show({ align: 'left', isWide: true });
		await open();
		expect(listOf()?.getAttribute('style')).toContain(` width: ${innerWidth - 32}px`);

		vi.restoreAllMocks();
		document.body.innerHTML = '';
		placeButton({ top: 100, left: innerWidth - 150, width: 40, height: 40 });
		show({ align: 'left', label: 'Kind' });
		await open('Kind');
		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain('min-width: 142px');
		expect(style).toContain('max-width: 142px');
	});

	it('opens upward when there is no room below its button', async () => {
		placeButton({ top: innerHeight - 60, left: 600, width: 40, height: 40 });
		show({});
		await open();

		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain('bottom: 68px');
		expect(style).not.toContain('top:');
	});

	it('opens over its button when asked to and it fits there, as at the foot of a box (#376)', async () => {
		placeButton({ top: 500, left: 600, width: 40, height: 40 });
		show({ opens: 'up' });
		await open();

		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain(`bottom: ${innerHeight - 500 + 8}px`);
		expect(style).not.toContain('top:');
	});

	it('still hangs under its button when asked to open over it but there is no room above', async () => {
		placeButton({ top: 60, left: 600, width: 40, height: 40 });
		show({ opens: 'up' });
		await open();

		expect(listOf()?.getAttribute('style')).toContain('top: 108px');
	});

	it('opens beside its button when asked, centred on it and clear of it (#390, the zoom bar)', async () => {
		placeButton({ top: 400, left: 900, width: 36, height: 36 });
		show({ opens: 'left', options: FACILITIES });
		await open();

		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain(`right: ${innerWidth - 900 + 8}px`);
		// Three choices with a note, 52px each, and the list's own room: centred on the button's middle, 418px.
		expect(style).toContain(`top: ${418 - (3 * 52 + 16) / 2}px`);
		expect(style).not.toContain('bottom:');
	});

	it('opens on the right of its button when asked', async () => {
		placeButton({ top: 400, left: 24, width: 36, height: 36 });
		show({ opens: 'right' });
		await open();

		expect(listOf()?.getAttribute('style')).toContain('left: 68px');
	});

	it('stands as far from its button as asked', async () => {
		placeButton({ top: 400, left: 900, width: 36, height: 36 });
		show({ opens: 'left', offset: 16 });
		await open();
		expect(listOf()?.getAttribute('style')).toContain(`right: ${innerWidth - 900 + 16}px`);

		vi.restoreAllMocks();
		document.body.innerHTML = '';
		placeButton({ top: 100, left: 600, width: 40, height: 40 });
		show({ offset: 16 });
		await open();
		expect(listOf()?.getAttribute('style')).toContain('top: 156px');
	});

	it('lines its bottom or top edge up with its button’s when opened beside it and aligned so', async () => {
		placeButton({ top: 400, left: 900, width: 36, height: 36 });
		show({ opens: 'left', align: 'bottom' });
		await open();
		expect(listOf()?.getAttribute('style')).toContain(`bottom: ${innerHeight - 436}px`);

		vi.restoreAllMocks();
		document.body.innerHTML = '';
		placeButton({ top: 400, left: 900, width: 36, height: 36 });
		show({ opens: 'left', align: 'top' });
		await open();
		expect(listOf()?.getAttribute('style')).toContain('top: 400px');
	});

	it('keeps a list lined up at the bottom on the screen when it is taller than the room above', async () => {
		placeButton({ top: 64, left: 900, width: 36, height: 36 });
		show({ opens: 'left', align: 'bottom', options: FACILITIES });
		await open();

		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain('top: 8px');
		expect(style).not.toContain('bottom:');
	});

	it('keeps a list opened beside its button on the screen', async () => {
		placeButton({ top: 4, left: 900, width: 36, height: 36 });
		show({ opens: 'left', options: FACILITIES });
		await open();
		expect(listOf()?.getAttribute('style')).toContain('top: 8px');

		vi.restoreAllMocks();
		document.body.innerHTML = '';
		placeButton({ top: innerHeight - 40, left: 900, width: 36, height: 36 });
		show({ opens: 'left', options: FACILITIES });
		await open();
		expect(listOf()?.getAttribute('style')).toContain(`top: ${innerHeight - 8 - (3 * 52 + 16)}px`);
	});

	it('is never wider than the room beside its button', async () => {
		placeButton({ top: 400, left: 120, width: 36, height: 36 });
		show({ opens: 'left' });
		await open();

		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain('min-width: 104px');
		expect(style).toContain('max-width: 104px');
	});

	it('floats above the page in a popover, so no scrolling box cuts it off', async () => {
		show({});
		await open();

		const list = listOf();
		expect(list?.getAttribute('popover')).toBe('manual');
		expect(list?.className).toContain('fixed');
		expect(list?.className).toContain('z-[120]');
	});

	it('takes its look from outside on its list, the box that shows, white until it is given one', async () => {
		const plain = show({});
		await open();
		expect(listOf()?.className).toContain('bg-surface');
		plain.unmount();

		show({ color: 'primary', appearance: 'lite', class: 'mine' });
		await open();
		const list = listOf();
		expect(list?.className).toContain('theme-lite-primary');
		expect(list?.className).toContain('mine');
		expect(list?.className).not.toContain('bg-surface');
		expect(list?.className).not.toMatch(/-(slate|gray|zinc)-|white/);
	});
});

describe('a look given from outside (#390, the zoom bar’s dark menu)', () => {
	// jsdom paints nothing: the open list answers with these words and fill, as a browser would for its look.
	function paint(color: string, backgroundColor: string) {
		const real = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation((node, pseudo) => {
			const style = real(node, pseudo);
			if (!(node as HTMLElement).hasAttribute?.('popover')) return style;
			return new Proxy(style, {
				get: (target, key) =>
					key === 'color'
						? color
						: key === 'backgroundColor'
							? backgroundColor
							: Reflect.get(target, key)
			});
		});
	}

	it('draws its choices in the words of its look, the picked one with the look’s colours swapped', async () => {
		show({
			color: 'base',
			appearance: 'heavy',
			value: 'spread',
			options: FACILITIES.map((facility, index) => ({
				...facility,
				id: ['column', 'spread', 'present'][index],
				icon: 'icon-[mdi--play-circle-outline]'
			}))
		});
		const list = await open();
		const [first, picked] = within(list).getAllByRole('option');

		expect(listOf()?.className).toContain('theme-heavy-base');
		expect(first.className).toContain('text-current');
		expect(first.className).toContain('hover:bg-current/10');
		expect(first.className).not.toMatch(/secondary|base-|primary/);
		expect(picked.className).toContain('bg-(--menu-ink)');
		expect(picked.className).toContain('text-(--menu-paper)');
		expect(picked.className).not.toContain('bg-primary');
		// The hint under each name follows the words too, and so does its icon.
		expect(within(first).getByText('Houston').className).toContain('text-current/60');
		expect(first.querySelector('.icon-\\[mdi--play-circle-outline\\]')?.className).not.toContain(
			'text-base-500'
		);
		expect(picked.querySelector('.icon-\\[mdi--check\\]')?.className).not.toContain('text-primary');
	});

	it('hands the picked choice its look’s two colours, read off the list', async () => {
		paint('rgb(250, 250, 251)', 'rgb(1, 1, 2)');
		show({ color: 'base', appearance: 'heavy', value: 'cards' });
		await open();

		const style = listOf()?.getAttribute('style') ?? '';
		expect(style).toContain('--menu-ink: rgb(250, 250, 251)');
		expect(style).toContain('--menu-paper: rgb(1, 1, 2)');
	});

	it('swaps a black fill too: only a see-through fill counts as none', async () => {
		paint('rgb(255, 255, 255)', 'rgb(0, 0, 0)');
		show({ color: 'base', appearance: 'heavy', value: 'cards' });
		const list = await open();

		expect(listOf()?.getAttribute('style')).toContain('--menu-paper: rgb(0, 0, 0)');
		expect(within(list).getByRole('option', { name: 'Cards' }).className).toContain(
			'bg-(--menu-ink)'
		);
	});

	it('marks the picked choice with a tint of its words when its look has no fill of its own', async () => {
		paint('rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)');
		show({ ghost: true, value: 'cards' });
		const list = await open();
		const picked = within(list).getByRole('option', { name: 'Cards' });

		expect(picked.className).toContain('bg-current/15');
		expect(picked.className).not.toContain('--menu-ink');
	});

	it('keeps its own look when given none: the theme’s surface, a blue tint on the picked choice', async () => {
		show({ value: 'cards' });
		const list = await open();
		const picked = within(list).getByRole('option', { name: 'Cards' });

		expect(picked.className).toContain('bg-primary/[0.08]');
		expect(listOf()?.getAttribute('style')).not.toContain('--menu-ink');
	});

	it('names its button with the button’s own label when it has one, and the list with its label', async () => {
		show({
			trigger: undefined,
			label: 'How the pages lie',
			button: {
				icon: 'icon-[mdi--view-grid-outline]',
				'aria-label': 'Spread: choose how the pages lie'
			}
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Spread: choose how the pages lie' }));

		expect(screen.getByRole('listbox', { name: 'How the pages lie' })).not.toBeNull();
	});
});

describe('a row of buttons (the zoom bar’s Slide-out Row)', () => {
	it('stands its choices in a row of library Buttons, each its icon alone, named by its label', async () => {
		show({ isRow: true, opens: 'left', value: 'cards' });
		const list = await open();
		const choices = within(list).getAllByRole('option');

		expect(list.getAttribute('aria-orientation')).toBe('horizontal');
		expect(choices.map((choice) => choice.getAttribute('aria-label'))).toEqual([
			'List',
			'Cards',
			'Board'
		]);
		expect(choices.map((choice) => choice.getAttribute('title'))).toEqual([
			'List',
			'Cards',
			'Board'
		]);
		expect(choices.map((choice) => choice.getAttribute('aria-selected'))).toEqual([
			'false',
			'true',
			'false'
		]);
		for (const choice of choices) {
			expect(choice.classList).toContain('btn');
			expect(choice.querySelector('.btn-icon')).not.toBeNull();
			expect(choice.textContent?.trim()).toBe('');
		}
		expect(choices[1].innerHTML).toContain('icon-[mdi--view-grid-outline]');
	});

	it('lights the picked choice, heavy and the others ghost, and hands every choice any Button prop', async () => {
		show({ isRow: true, value: 'cards', choiceButton: { invert: true, sm: true } });
		const list = await open();
		const [first, picked] = within(list).getAllByRole('option');

		expect(picked.className).toContain('theme-heavy-base-invert');
		expect(first.className).toContain('theme-ghost-invert');
		expect(first.className).not.toContain('theme-heavy');
	});

	it('picks on a tap of a choice and closes', async () => {
		const { onpick } = show({ isRow: true, value: 'cards' });
		const list = await open();
		await fireEvent.click(within(list).getByRole('option', { name: 'Board' }));

		expect(onpick).toHaveBeenCalledWith('board');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('is round, with no fill or shadow of its own: its look comes from outside', async () => {
		show({ isRow: true, class: 'bg-black' });
		await open();
		const list = listOf();

		expect(list?.className).toContain('rounded-full');
		expect(list?.className).toContain('bg-black');
		expect(list?.className).not.toContain('bg-surface');
		expect(list?.className).not.toContain('shadow-menu');
	});

	it('is only as wide as its choices beside its button', async () => {
		placeButton({ top: 400, left: 900, width: 36, height: 36 });
		show({ isRow: true, opens: 'left', offset: 10 });
		await open();
		const style = listOf()?.getAttribute('style') ?? '';

		expect(style).toContain(`right: ${innerWidth - 900 + 10}px`);
		expect(style).not.toContain('min-width');
	});
});

describe('a button told what is picked and whether the list is open', () => {
	it('takes its Button props from a function of the picked choice and the list being open', async () => {
		show({
			trigger: undefined,
			value: 'cards',
			button: (current: { icon?: string } | undefined, isOpen: boolean) => ({
				icon: current?.icon,
				appearance: isOpen ? 'heavy' : 'ghost',
				'aria-label': 'Mode'
			})
		});
		const button = screen.getByRole('button', { name: 'Mode' });

		expect(button.className).toContain('theme-ghost');
		expect(button.innerHTML).toContain('icon-[mdi--view-grid-outline]');

		await fireEvent.click(button);

		expect(button.className).toContain('theme-heavy-base');
		expect(button.getAttribute('aria-expanded')).toBe('true');
	});
});

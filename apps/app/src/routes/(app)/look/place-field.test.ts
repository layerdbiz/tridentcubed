// What the location field does (#298, written before it became the library's Select with the place lookup, so
// nothing already built breaks, and kept passing since): typing offers the saved places at once, and only after a pause, with three letters
// or more and no saved place of that name, asks the server once, remembering its answer for the visit. Picking a
// suggestion saves the place with its coordinates; words typed and never picked are kept, with no pin.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { LookState } from './look.state.svelte';
import type { PlaceType } from './map.data';
import PlaceField from './place-field.svelte';

const SAVED: PlaceType[] = [
	{ id: 'p1', name: 'Houston, TX', lat: 29.76, lng: -95.37 },
	{ id: 'p2', name: 'Houma, LA', lat: 29.6, lng: -90.72 },
	{ id: 'p3', name: 'Galveston, TX', lat: 29.3, lng: -94.8 }
];

// What the server finds for a text: a place under its own name, with a line that places it.
function foundFor(text: string): PlaceType[] {
	return [
		{ name: `${text} Port`, lat: 1, lng: 2, detail: `${text} Port, Texas, United States` },
		{ name: 'Houston, TX', lat: 29.76, lng: -95.37, detail: 'Houston, Texas, United States' }
	];
}

// The app's state as far as the field reads it: the saved places, and keeping a new one.
function lookOf() {
	const places = SAVED.map((place) => ({ ...place }));
	return {
		places,
		placeOf: (name: string) =>
			places.find((place) => place.name.toLowerCase() === name.trim().toLowerCase()),
		keepPlace: vi.fn((place: PlaceType) => places.push(place))
	};
}

let asks: string[] = [];

beforeEach(() => {
	// Only the field's own pause is faked: faking every timer stalls Svelte's tick.
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	asks = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => {
			const text = new URL(url, 'http://app.test').searchParams.get('text') ?? '';
			asks.push(text);
			return new Response(JSON.stringify({ places: foundFor(text) }));
		})
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

// The field as a form shows it: typing hands the words up, and the form hands them back as its value.
function show(value = '') {
	const look = lookOf();
	const typed: string[] = [];
	const view = render(PlaceField, {
		props: {
			look: look as unknown as LookState,
			label: 'City',
			value,
			oninput: (text: string) => {
				typed.push(text);
				void view.rerender({ value: text });
			}
		}
	});
	return { ...view, look, typed, input: screen.getByRole('combobox', { name: 'City' }) };
}

async function type(input: HTMLElement, text: string) {
	await fireEvent.focus(input);
	await fireEvent.input(input, { target: { value: text } });
}

function namesOf() {
	return screen
		.getAllByRole('option')
		.map((option) => option.textContent?.replace(/\s+/g, ' ').trim());
}

describe('typing', () => {
	it('offers the saved places holding the words at once, marked Saved, without asking the server', async () => {
		const { input } = show();
		await type(input, 'hou');

		expect(namesOf()).toEqual(['Houston, TX Saved', 'Houma, LA Saved']);
		expect(asks).toEqual([]);
	});

	it('asks the server once typing pauses, and lists what it finds under the saved places', async () => {
		const { input } = show();
		await type(input, 'Hou');
		await vi.advanceTimersByTimeAsync(349);
		expect(asks).toEqual([]);

		await vi.advanceTimersByTimeAsync(1);

		expect(asks).toEqual(['hou']);
		expect(namesOf()).toEqual([
			'Houston, TX Saved',
			'Houma, LA Saved',
			'hou Port hou Port, Texas, United States'
		]);
		expect(screen.getByRole('link', { name: 'Geoapify' }).getAttribute('href')).toBe(
			'https://www.geoapify.com/'
		);
	});

	it('asks only for the last words when typing goes on', async () => {
		const { input } = show();
		await type(input, 'gal');
		await vi.advanceTimersByTimeAsync(200);
		await type(input, 'galv');
		await vi.advanceTimersByTimeAsync(350);

		expect(asks).toEqual(['galv']);
	});

	it('never asks with fewer than three letters', async () => {
		const { input } = show();
		await type(input, 'ho');
		await vi.advanceTimersByTimeAsync(1000);

		expect(asks).toEqual([]);
	});

	it('never asks for the name of a saved place', async () => {
		const { input } = show();
		await type(input, 'galveston, tx');
		await vi.advanceTimersByTimeAsync(1000);

		expect(asks).toEqual([]);
	});

	it('says it is looking while the server has not answered', async () => {
		let answer: (response: Response) => void = () => {};
		vi.stubGlobal(
			'fetch',
			vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)))
		);
		const { input } = show();
		await type(input, 'corpus');
		await vi.advanceTimersByTimeAsync(350);

		expect(screen.getByText('Looking it up…')).toBeTruthy();

		answer(new Response(JSON.stringify({ places: foundFor('corpus') })));
		await vi.advanceTimersByTimeAsync(0);

		expect(screen.queryByText('Looking it up…')).toBeNull();
		expect(namesOf()).toContain('corpus Port corpus Port, Texas, United States');
	});

	it('remembers what the server said for the visit, in every location field', async () => {
		const first = show();
		await type(first.input, 'beaumont');
		await vi.advanceTimersByTimeAsync(350);
		first.unmount();

		const second = show();
		await type(second.input, 'Beaumont');
		await vi.advanceTimersByTimeAsync(350);

		expect(asks).toEqual(['beaumont']);
		expect(namesOf()).toContain('beaumont Port beaumont Port, Texas, United States');
	});

	it('keeps showing the saved places when the server cannot be reached', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('Failed to fetch');
			})
		);
		const { input } = show();
		await type(input, 'houst');
		await vi.advanceTimersByTimeAsync(350);

		expect(namesOf()).toEqual(['Houston, TX Saved']);
		expect(screen.queryByText('Looking it up…')).toBeNull();
	});

	it('keeps words typed and never picked', async () => {
		const { input, typed } = show();
		await type(input, 'Pier 9');

		expect(typed).toEqual(['Pier 9']);
		expect((input as HTMLInputElement).value).toBe('Pier 9');
	});
});

describe('picking', () => {
	it('saves a place the server found, with its coordinates, and takes its name', async () => {
		const { input, look, typed } = show();
		await type(input, 'freeport');
		await vi.advanceTimersByTimeAsync(350);

		await fireEvent.click(screen.getByRole('option', { name: /freeport Port/ }));

		expect(look.keepPlace).toHaveBeenCalledWith(foundFor('freeport')[0]);
		expect(typed.at(-1)).toBe('freeport Port');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('takes a saved place by its name', async () => {
		const { input, typed } = show();
		await type(input, 'galv');

		await fireEvent.click(screen.getByRole('option', { name: /Galveston, TX/ }));

		expect(typed.at(-1)).toBe('Galveston, TX');
		expect(screen.queryByRole('listbox')).toBeNull();
	});
});

describe('the list', () => {
	it('shows nothing until something is typed', async () => {
		const { input } = show();
		await fireEvent.focus(input);

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('closes on Escape', async () => {
		const { input } = show();
		await type(input, 'hou');
		await fireEvent.keyDown(input, { key: 'Escape' });

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('closes once the field is left', async () => {
		const { input } = show();
		await type(input, 'hou');
		await fireEvent.blur(input);
		await vi.advanceTimersByTimeAsync(180);

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('marks the saved place the field names as picked', async () => {
		const { input } = show('Houston, TX');
		await type(input, 'Houston, TX');
		const list = screen.getByRole('listbox');

		expect(
			within(list)
				.getByRole('option', { name: /Houston, TX/ })
				.getAttribute('aria-selected')
		).toBe('true');
	});
});

describe('under the field', () => {
	it('says a saved place is on the map', () => {
		show('Houston, TX');
		expect(screen.getByText('On the map')).toBeTruthy();
	});

	it('says words that name no saved place have no pin yet', () => {
		show('Pier 9');
		expect(screen.getByText('No pin yet. Pick a suggestion to put it on the map.')).toBeTruthy();
	});

	it('says nothing while the field is empty', () => {
		show('');
		expect(screen.queryByText('On the map')).toBeNull();
		expect(screen.queryByText(/No pin yet/)).toBeNull();
	});
});

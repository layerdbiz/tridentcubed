// The photo pop-up's More (#376): the library's menu, holding a red Delete. Delete still asks first, and only a yes
// takes the photo out of its group. Escape with the menu open shuts the menu and leaves the pop-up open.
// Its Details (#343): when and where the photo was taken, and every metadata field the original had, to copy out.
// Its editor (#295): a back arrow until something changes, then the X and the ✓; undo and redo; Pop out; Original
// back to the whole picture; a PDF with All pages on as its pages stacked in the picture and the page on screen
// alone on the strip, with it off its pages side by side there; a change going to every page or to that one; Open in
// the ⋮.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { GroupType } from './look.data';
import type { LookState } from './look.state.svelte';
import PhotoPopup from './photo-popup.svelte';

const FILE_ID = '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b';

vi.mock('#lib/files/files.state.svelte.js', () => ({
	fileDetailsOf: (address: string) =>
		address.includes(FILE_ID)
			? {
					name: 'PXL_20261126_113512.jpg',
					original: { type: 'image/jpeg', size: 1_200_000, width: 2268, height: 4032 },
					saved: { type: 'image/webp', size: 139_000, width: 1152, height: 2048 },
					carried: 'all',
					hasFieldList: true,
					isOriginalKept: false,
					taken: {
						from: 'file',
						at: '2026-11-26T11:35:12.000Z',
						latitude: 29.760427,
						longitude: -95.369803
					}
				}
			: undefined,
	fieldListOf: () => ({
		exif: { Make: { value: 'Google', description: 'Google' }, Model: { description: 'Pixel 9' } },
		gps: { Latitude: 29.760427 }
	})
}));

// A PDF's pages are drawn by PDF.js on a device; here none is drawn, and each page reads as A4.
vi.mock('#lib/pdf/pdf.state.svelte.js', () => ({
	pagePictureOf: () => undefined,
	pageShapeOf: () => undefined,
	pageCountOf: () => undefined
}));

const PDF = {
	id: 'p',
	src: '/p.webp',
	description: '',
	kind: 'pdf',
	source: '/files/plan',
	pageCount: 3
};

type QuestionType = { title: string; note?: string; onyes: () => void };

function show(photos?: unknown[], id = 'a', layout: Record<string, unknown> = {}) {
	const questions: QuestionType[] = [];
	const look = {
		asking: false,
		confirm: vi.fn((question: QuestionType) => questions.push(question))
	} as unknown as LookState;
	const group = {
		layout: 4,
		...layout,
		photos: photos ?? [
			{ id: 'a', src: '/a.webp', description: '' },
			{ id: 'b', src: '/b.webp', description: '' }
		]
	} as unknown as GroupType;
	const onsave = vi.fn();
	const onclose = vi.fn();
	render(PhotoPopup, { props: { look, group, id, word: 'stage', onsave, onclose } });
	return { look, group, questions, onsave, onclose };
}

async function openMore() {
	await fireEvent.click(screen.getByRole('button', { name: 'More' }));
	return screen.getByRole('listbox', { name: 'More' });
}

describe("the photo pop-up's More", () => {
	it('holds Delete, in red', async () => {
		show();
		const list = await openMore();
		const remove = within(list).getByRole('option', { name: 'Delete' });
		expect(remove.className).toContain('text-danger');
	});

	it('asks before deleting, and deletes only on a yes', async () => {
		const { group, questions, onsave } = show();
		await openMore();
		await fireEvent.click(screen.getByRole('option', { name: 'Delete' }));
		expect(questions).toHaveLength(1);
		expect(questions[0].title).toBe('Delete photo?');
		expect(questions[0].note).toBe('It leaves the stage and the report.');
		expect(group.photos.map((photo) => photo.id)).toEqual(['a', 'b']);
		expect(screen.queryByRole('listbox')).toBeNull();

		questions[0].onyes();
		expect(group.photos.map((photo) => photo.id)).toEqual(['b']);
		expect(onsave).toHaveBeenCalled();
	});

	it('shuts the menu on Escape and stays open itself', async () => {
		const { onclose } = show();
		await openMore();
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(onclose).not.toHaveBeenCalled();

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onclose).toHaveBeenCalled();
	});
});

describe("the photo pop-up's Details", () => {
	function showStored() {
		const look = { asking: false, confirm: vi.fn() } as unknown as LookState;
		const group = {
			photos: [{ id: 'a', src: `/files/${FILE_ID}`, description: '' }]
		} as unknown as GroupType;
		render(PhotoPopup, {
			props: { look, group, id: 'a', word: 'stage', onsave: vi.fn(), onclose: vi.fn() }
		});
	}

	it('say where it was taken, with a map of the place', async () => {
		showStored();
		await fireEvent.click(screen.getByRole('button', { name: 'Details' }));
		const details = screen.getByRole('region', { name: 'Details' });

		expect(within(details).getByText('Read from the photo')).toBeTruthy();
		const place = within(details).getByRole('link', { name: '29.76043, -95.36980' });
		expect(place.getAttribute('href')).toBe(
			'https://www.google.com/maps/search/?api=1&query=29.760427,-95.369803'
		);
	});

	it('list every metadata field, group by group, and copy them all', async () => {
		const writeText = vi.fn(async () => {});
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		showStored();
		await fireEvent.click(screen.getByRole('button', { name: 'Details' }));
		const details = screen.getByRole('region', { name: 'Details' });

		expect(within(details).getByText('Every metadata field · 3')).toBeTruthy();
		expect(within(details).getByRole('heading', { name: 'EXIF 2' })).toBeTruthy();
		expect(within(details).getByText('Pixel 9')).toBeTruthy();

		await fireEvent.click(within(details).getByRole('button', { name: 'Copy all' }));
		expect(writeText).toHaveBeenCalledWith(
			'EXIF\nMake: Google\nModel: Pixel 9\n\nGPS\nLatitude: 29.760427'
		);
	});
});

describe("the photo pop-up's editor", () => {
	it('stands a back arrow at the top until something changes, then the X and the ✓, which keeps it', async () => {
		const { group, onsave, onclose } = show();
		expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();

		await fireEvent.click(screen.getByRole('button', { name: 'Rotate' }));
		expect(screen.getByRole('button', { name: 'Close without saving' })).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(group.photos.map((photo) => photo.edit)).toEqual([{ turns: 1 }, undefined]);
		expect(onsave).toHaveBeenCalled();
		expect(onclose).toHaveBeenCalled();
	});

	it('steps back and on through what was changed', async () => {
		const { group } = show();
		await fireEvent.click(screen.getByRole('button', { name: 'Rotate' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Flip' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
		expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(group.photos[0].edit).toEqual({ turns: 1 });
	});

	it('offers every crop shape under a stage’s Ratio, starting on the stage’s, never locked in', async () => {
		const { group } = show(undefined, 'a', { fit: 'fit', ratio: '4:3' });
		const shapes = screen
			.getAllByRole('button', { pressed: true })
			.filter((each) => each.hasAttribute('data-crop-ratio'))
			.map((each) => each.textContent);
		expect(shapes).toEqual(['Stage']);
		for (const label of ['Free', 'Original', '16:9', '9:16', '1:1', '4:3'])
			expect(screen.getByRole('button', { name: label })).toBeTruthy();

		await fireEvent.click(screen.getByRole('button', { name: '9:16' }));
		expect(screen.getByRole('button', { name: '9:16' }).getAttribute('aria-pressed')).toBe('true');
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(group.photos[0].edit?.ratio).toBe('9:16');
	});

	it('goes back to the stage’s shape from one of its own', async () => {
		const own = { id: 'a', src: '/a.webp', description: '', edit: { ratio: 'free' } };
		const { group } = show([own], 'a', { fit: 'fit', ratio: '4:3' });
		await fireEvent.click(screen.getByRole('button', { name: /Stage/ }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(group.photos[0].edit).toBeUndefined();
	});

	it('pops one out onto pages of its own, two to a page', async () => {
		const { group } = show();
		await openMore();
		await fireEvent.click(screen.getByRole('option', { name: /Pop out, 2 per page/ }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(group.photos.map((photo) => photo.ownLayout)).toEqual([2, undefined]);
	});

	it('crops to the whole picture again on Original', async () => {
		const { group } = show();
		await fireEvent.click(screen.getByRole('button', { name: '16:9' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Original' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		expect(group.photos[0].edit).toEqual({ ratio: 'original' });
	});

	it('stacks a PDF’s pages in the picture with All pages on, the page on screen alone on the strip, and a tap on one under brings it on top', async () => {
		show([{ id: 'a', src: '/a.webp', description: '' }, PDF], 'p');
		const under = () =>
			screen
				.queryAllByRole('button', { name: /^Bring page/ })
				.map((page) => page.getAttribute('aria-label'));
		expect(screen.getByRole('button', { name: 'PDF page 1 of 3' })).toBeTruthy();
		expect(screen.queryByRole('group', { name: /PDF/ })).toBeNull();
		expect(under()).toEqual(['Bring page 3 on top', 'Bring page 2 on top']);

		await fireEvent.click(screen.getByRole('button', { name: 'Bring page 3 on top' }));
		expect(screen.getByRole('button', { name: 'PDF page 3 of 3' })).toBeTruthy();
		expect(under()).toEqual(['Bring page 2 on top', 'Bring page 1 on top']);
	});

	it('lays a PDF’s pages side by side on the strip with All pages off, steps through them, and changes that page only', async () => {
		const { group } = show([PDF, { id: 'a', src: '/a.webp', description: '' }], 'p');
		await fireEvent.click(screen.getByRole('switch', { name: /All pages/ }));
		const strip = screen.getByRole('group', { name: 'PDF, 3 pages' });
		const onScreen = () =>
			within(strip)
				.getAllByRole('button')
				.find((page) => page.getAttribute('aria-current') === 'true')
				?.getAttribute('aria-label');
		expect(within(strip).getAllByRole('button')).toHaveLength(3);
		expect(onScreen()).toBe('PDF page 1');
		expect(screen.queryByRole('button', { name: /^Bring page/ })).toBeNull();

		await fireEvent.click(within(strip).getByRole('button', { name: 'PDF page 3' }));
		expect(onScreen()).toBe('PDF page 3');
		await fireEvent.click(within(strip).getByRole('button', { name: 'PDF page 1' }));
		await fireEvent.keyDown(window, { key: 'ArrowRight' });
		await waitFor(() => expect(onScreen()).toBe('PDF page 2'), { timeout: 3000 });
		await fireEvent.click(screen.getByRole('button', { name: 'Rotate' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

		const [saved] = group.photos;
		expect(saved.edit).toBeUndefined();
		expect(saved.pageEdits).toEqual({ '2': { turns: 1 } });
	});

	it('keeps Reset among the tools all the time, dimmed until something changes', async () => {
		show([{ id: 'a', src: '/a.webp', description: '' }], 'a');
		const reset = screen.getByRole('button', { name: 'Reset' }) as HTMLButtonElement;
		expect(reset.disabled).toBe(true);

		await fireEvent.click(screen.getByRole('button', { name: 'Rotate' }));
		expect((screen.getByRole('button', { name: 'Reset' }) as HTMLButtonElement).disabled).toBe(
			false
		);
	});

	it('keeps Open for a PDF in the ⋮, out of the tools', async () => {
		show([PDF], 'p');
		expect(screen.queryByRole('link', { name: /Open/ })).toBeNull();
		const more = await openMore();
		expect(within(more).getByRole('option', { name: /Open the PDF/ })).toBeTruthy();
	});
});

// The photo pop-up's More (#376): the library's menu, holding a red Delete. Delete still asks first, and only a yes
// takes the photo out of its group. Escape with the menu open shuts the menu and leaves the pop-up open.
// Its Details (#343): when and where the photo was taken, and every metadata field the original had, to copy out.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
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

type QuestionType = { title: string; note?: string; onyes: () => void };

function show() {
	const questions: QuestionType[] = [];
	const look = {
		asking: false,
		confirm: vi.fn((question: QuestionType) => questions.push(question))
	} as unknown as LookState;
	const group = {
		photos: [
			{ id: 'a', src: '/a.webp', description: '' },
			{ id: 'b', src: '/b.webp', description: '' }
		]
	} as unknown as GroupType;
	const onsave = vi.fn();
	const onclose = vi.fn();
	render(PhotoPopup, { props: { look, group, id: 'a', word: 'stage', onsave, onclose } });
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

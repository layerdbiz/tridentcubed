// The photo pop-up's More (#376): the library's menu, holding a red Delete. Delete still asks first, and only a yes
// takes the photo out of its group. Escape with the menu open shuts the menu and leaves the pop-up open.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { GroupType } from './look.data';
import type { LookState } from './look.state.svelte';
import PhotoPopup from './photo-popup.svelte';

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

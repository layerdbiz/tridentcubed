// The photo panel (photo-panel.svelte): a copied link to the photo editor opens the editor on the attachment it names,
// in the copy of the panel on screen only (a panel is drawn twice, for the phone and the desk), and a tile whose
// picture was edited wears a mark saying how (Justin, 2026-11-28).
import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { GroupType } from './look.data';
import type { LookState } from './look.state.svelte';
import PhotoPanel from './photo-panel.svelte';

vi.mock('#lib/files/files.state.svelte.js', () => ({
	fileDetailsOf: () => undefined,
	fieldListOf: () => undefined
}));

function show(editingId = '', photos?: unknown[]) {
	const look = { editingId, asking: false, confirm: vi.fn() } as unknown as LookState;
	const group = {
		layout: 4,
		photos: photos ?? [
			{ id: 'a', src: '/a.webp', description: '' },
			{ id: 'b', src: '/b.webp', description: '' }
		]
	} as unknown as GroupType;
	render(PhotoPanel, {
		props: {
			look,
			group,
			sortKey: 'photos-g',
			word: 'stage',
			accept: 'image/*',
			onfiles: vi.fn(),
			onsave: vi.fn()
		}
	});
	return { look, group };
}

afterEach(() => vi.restoreAllMocks());

describe('the photo panel', () => {
	it('opens the editor on the attachment a copied link names', async () => {
		// This copy of the panel is the one on screen.
		vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
		show('b');
		const editor = await screen.findByRole('dialog', { name: 'Edit photo' }, { timeout: 3000 });
		expect(editor.querySelector('[data-shown-at]')?.textContent?.trim()).toBe('2 of 2');
	});

	it('leaves the editor shut in the copy of the panel that is not on screen', async () => {
		show('b');
		await new Promise((done) => setTimeout(done, 600));
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('marks a tile whose picture was edited, saying how', () => {
		show('', [
			{
				id: 'a',
				src: '/a.webp',
				description: '',
				edit: { turns: 1, frame: { x: 0, y: 0, w: 0.5, h: 1 } }
			},
			{ id: 'b', src: '/b.webp', description: '' }
		]);
		const marks = [...document.querySelectorAll('[data-edited]')].map((mark) =>
			mark.getAttribute('aria-label')
		);
		expect(marks).toEqual(['Edited: cropped and turned']);
	});
});

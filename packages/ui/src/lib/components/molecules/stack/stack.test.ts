// The stack (#379): a few avatars overlapping, the first in front, and a count of the rest. It moved here from the
// app's face stack (look/faces.svelte) and its logo stacks (#365 item 7).
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Stack from './stack.svelte';

const PEOPLE = ['Ana', 'Ben', 'Dee', 'Eli', 'Fay'].map((name) => ({
	id: name,
	src: `/files/${name}.webp`,
	alt: name
}));

describe('Stack', () => {
	it('shows the first few and counts the rest', () => {
		render(Stack, { props: { items: PEOPLE, max: 3 } });

		expect(screen.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual([
			'Ana',
			'Ben',
			'Dee'
		]);
		expect(screen.getByText('+2')).toBeTruthy();
	});

	it('puts the first in front and tucks each of the others behind the one before', () => {
		render(Stack, { props: { items: PEOPLE.slice(0, 3), size: 20 } });

		const slots = screen
			.getAllByRole('img')
			.map((image) => image.closest('[data-slot]') as HTMLElement);
		expect(slots.map((slot) => slot.style.zIndex)).toEqual(['3', '2', '1']);
		expect(slots[0].style.marginLeft).toBe('0px');
		expect(slots[1].style.marginLeft).toBe('-6.4px');
		expect(screen.queryByText(/^\+/)).toBeNull();
	});

	it('gives each its own dot, ring and title', () => {
		render(Stack, {
			props: {
				items: [
					{
						id: 'Ana',
						src: '/files/Ana.webp',
						alt: 'Ana',
						presence: 'online',
						title: 'Ana (team lead)'
					},
					{ id: 'Ben', src: '', alt: 'Ben' }
				]
			}
		});

		expect(screen.getByTitle('online')).toBeTruthy();
		expect(screen.getByTitle('Ana (team lead)')).toBeTruthy();
		expect(screen.getByRole('img', { name: 'Ben' }).tagName).toBe('SPAN');
	});
});

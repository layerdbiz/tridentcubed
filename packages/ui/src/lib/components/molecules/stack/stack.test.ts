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
		const { container } = render(Stack, { props: { items: PEOPLE, max: 3 } });

		expect(screen.getAllByRole('img').map((image) => image.getAttribute('alt'))).toEqual([
			'Ana',
			'Ben',
			'Dee'
		]);
		// The count is drawn by the stack's own box.
		expect((container.firstElementChild as HTMLElement).dataset.more).toBe('+2');
	});

	it('puts the first in front and tucks each of the others behind the one before', () => {
		const { container } = render(Stack, { props: { items: PEOPLE.slice(0, 3), size: 20 } });

		const slots = screen
			.getAllByRole('img')
			.map((image) => image.closest('[data-slot]') as HTMLElement);
		expect(slots.map((slot) => slot.style.zIndex)).toEqual(['3', '2', '1']);
		expect(slots[0].style.marginLeft).toBe('0px');
		expect(slots[1].style.marginLeft).toBe('-6.4px');
		expect((container.firstElementChild as HTMLElement).dataset.more).toBeUndefined();
	});

	it('gives each its own dot, ring and title', () => {
		const { container } = render(Stack, {
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

		expect(container.querySelector('[data-presence="online"]')).not.toBeNull();
		expect(screen.getByTitle('Ana (team lead)')).toBeTruthy();
		expect(screen.getByRole('img', { name: 'Ben' }).tagName).toBe('SPAN');
	});

	// Built on the base component (Justin, 2026-11-26), its look is set from outside.
	it('wears the look it is given on its box', () => {
		const { container } = render(Stack, { props: { items: PEOPLE, lite: true, class: 'gap-1' } });

		const box = container.firstElementChild as HTMLElement;
		expect(box.className).toContain('stack');
		expect(box.className).toContain('theme-lite-base');
		expect(box.className).toContain('gap-1');
	});
});

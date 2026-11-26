// The chip (#381): a short word or two in a pill, a record's label, a project's status, a choice to switch on or off.
// It replaces the app's hand-built chips and pills, so these tests pin what they did: the words, a tap when it is a
// button, and a look that comes from outside.
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import Chip from './chip.svelte';

describe('Chip', () => {
	it('shows its words in a pill', () => {
		render(Chip, { props: { label: 'Draft Survey' } });

		const chip = screen.getByText('Draft Survey');
		expect(chip.tagName).toBe('SPAN');
		expect(chip.classList.contains('chip')).toBe(true);
	});

	it('shows what it is given in place of its words: an icon beside them', () => {
		render(Chip, {
			props: {
				children: createRawSnippet(() => ({
					render: () => '<span><span class="icon-[mdi--folder]"></span>Projects</span>'
				}))
			}
		});

		expect(screen.getByText('Projects').closest('.chip')).not.toBeNull();
	});

	it('is bare until it is given a look, and wears the colour and appearance it is given', () => {
		const { unmount } = render(Chip, { props: { label: 'Plain' } });
		expect(screen.getByText('Plain').className).not.toContain('theme-');
		unmount();

		render(Chip, { props: { label: 'New', accent: true, lite: true } });
		expect(screen.getByText('New').className).toContain('theme-lite-accent');
	});

	it('puts its class and its size on the pill', () => {
		render(Chip, { props: { label: 'Ready', class: 'shadow-sm', sm: true } });

		const chip = screen.getByText('Ready');
		expect(chip.className).toContain('shadow-sm');
		expect(chip.classList.contains('sm')).toBe(true);
	});

	it('is a button that says whether it is on, when it is one', async () => {
		const onclick = vi.fn();
		render(Chip, {
			props: { label: 'Cargo', tag: 'button', type: 'button', 'aria-pressed': true, onclick }
		});

		const chip = screen.getByRole('button', { name: 'Cargo', pressed: true });
		chip.click();
		expect(onclick).toHaveBeenCalledOnce();
	});
});

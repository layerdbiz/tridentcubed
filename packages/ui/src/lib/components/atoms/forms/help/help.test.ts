import { fireEvent, render, screen } from '@testing-library/svelte';
// jsdom keeps a popover hidden (it has no top layer), so the open help is found with hidden: true.
import { describe, expect, it } from 'vite-plus/test';
import Help from './help.svelte';

describe('Help', () => {
	it('is a ? named for its input', () => {
		render(Help, {
			props: { label: 'Job Number', text: 'Which of the jobs on that date this is.' }
		});

		const button = screen.getByRole('button', { name: 'What goes in Job Number?' });
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByText('Which of the jobs on that date this is.')).toBeNull();
	});

	it('opens its text on a tap, as a sheet without a mouse, and shuts on Escape', async () => {
		render(Help, {
			props: { label: 'Job Number', text: 'Which of the jobs on that date this is.' }
		});
		const button = screen.getByRole('button', { name: 'What goes in Job Number?' });

		await fireEvent.click(button);
		expect(button.getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByRole('dialog', { name: 'Job Number', hidden: true }).textContent).toContain(
			'Which of the jobs on that date this is.'
		);

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(button.getAttribute('aria-expanded')).toBe('false');
	});

	it('never takes the focus from the input being typed in', async () => {
		render(Help, { props: { label: 'Title', text: "The report's name." } });
		const button = screen.getByRole('button', { name: 'What goes in Title?' });

		// The browser's own focus move happens on mousedown; the ? cancels it.
		expect(await fireEvent.mouseDown(button)).toBe(false);
	});

	it('opens a pop-up by the ? for a mouse, its look set from outside through pop', async () => {
		const media = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			matches: true,
			media: query
		})) as typeof window.matchMedia;
		try {
			render(Help, {
				props: {
					label: 'Title',
					text: "The report's name.",
					pop: { color: 'primary', appearance: 'heavy' }
				}
			});
			await fireEvent.click(screen.getByRole('button', { name: 'What goes in Title?' }));

			const pop = screen.getByRole('tooltip', { hidden: true });
			expect(pop.textContent).toContain("The report's name.");
			expect(pop.className).toContain('theme-heavy-primary');
			expect(pop.className).not.toContain('bg-base-900');
		} finally {
			window.matchMedia = media;
		}
	});
});

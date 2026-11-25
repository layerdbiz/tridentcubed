import { fireEvent, render, screen } from '@testing-library/svelte';
// jsdom keeps a popover hidden (it has no top layer), so the open help is found with hidden: true.
import { describe, expect, it } from 'vite-plus/test';
import Generated from './generated.svelte';

describe('Generated', () => {
	it('shows a value the app made, marked as made by the app and named for a screen reader', () => {
		const { container } = render(Generated, {
			props: { label: 'Project Number', value: 'GUL-2026-10-27-J01' }
		});

		expect(screen.getByText('GUL-2026-10-27-J01')).toBeTruthy();
		expect(screen.getByTitle('Made by the app')).toBeTruthy();
		expect(container.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'Project Number: GUL-2026-10-27-J01'
		);
	});

	it('puts a ? after the value that opens its Help text', async () => {
		render(Generated, {
			props: {
				label: 'Project Number',
				value: 'GUL-2026-10-27-J01',
				help: 'Made from the customer’s code, the date and the job.'
			}
		});

		await fireEvent.click(screen.getByRole('button', { name: 'What goes in Project Number?' }));
		expect(
			screen.getByRole('dialog', { name: 'Project Number', hidden: true }).textContent
		).toContain('Made from the customer’s code, the date and the job.');
	});

	it('has no ? without Help text', () => {
		render(Generated, { props: { label: 'Project Number', value: 'GUL-2026-10-27-J01' } });

		expect(screen.queryByRole('button', { name: 'What goes in Project Number?' })).toBeNull();
	});
});

// The Selection bar (UI glossary, #402): while things are selected it takes the menu bar's place, with icons for what
// can be done to all of them at once and an X at its far right that ends the selection. These tests pin what it shows
// and what each press does; its look and where it sits are its owner's, set from outside.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import SelectionBar from './selection-bar.svelte';

function show(props: Record<string, unknown> = {}) {
	const describeAll = vi.fn();
	const remove = vi.fn();
	const onclose = vi.fn();
	const result = render(SelectionBar, {
		props: {
			count: 3,
			actions: [
				{
					label: 'One description for all',
					icon: 'icon-[mdi--text-box-edit-outline]',
					onclick: describeAll
				},
				{ label: 'Delete', icon: 'icon-[mdi--trash-can-outline]', onclick: remove }
			],
			onclose,
			...props
		}
	});
	return { ...result, describeAll, remove, onclose };
}

describe('SelectionBar', () => {
	it('is a bar named Selection that says how many are selected', () => {
		show();
		const bar = screen.getByRole('navigation', { name: 'Selection' });
		expect(bar.textContent).toContain('3 Selected');
	});

	it('takes another name and leaves the count out when it has none', () => {
		show({ label: 'Selected photos', count: undefined });
		const bar = screen.getByRole('navigation', { name: 'Selected photos' });
		expect(bar.textContent).not.toContain('Selected');
	});

	it('does each action when its icon is pressed, in the order given, with the X last', async () => {
		const { describeAll, remove } = show();
		const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
		expect(names).toEqual(['One description for all', 'Delete', 'End selection']);
		await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(remove).toHaveBeenCalledOnce();
		expect(describeAll).not.toHaveBeenCalled();
	});

	it('ends the selection from its X', async () => {
		const { onclose } = show();
		await fireEvent.click(screen.getByRole('button', { name: 'End selection' }));
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('wears the primary colour, heavy, unless it is given a look', () => {
		const { unmount } = show();
		expect(screen.getByRole('navigation').className).toContain('theme-heavy-primary');
		unmount();
		show({ accent: true, lite: true });
		const bar = screen.getByRole('navigation');
		expect(bar.className).toContain('theme-lite-accent');
		expect(bar.className).not.toContain('theme-heavy-primary');
	});

	it('wears any colour given as a shorthand, danger too', () => {
		show({ danger: true });
		const bar = screen.getByRole('navigation');
		expect(bar.className).toContain('theme-heavy-danger');
		expect(bar.className).not.toContain('theme-heavy-primary');
	});

	it('takes its owner’s class, so the owner sets where it sits', () => {
		show({ class: 'fixed bottom-6' });
		expect(screen.getByRole('navigation').className).toContain('fixed bottom-6');
	});

	it('passes Button props through to its icons and its X', () => {
		show({ actionButton: { 'data-act': '' }, closeButton: { title: 'Done' } });
		expect(screen.getByRole('button', { name: 'Delete' }).hasAttribute('data-act')).toBe(true);
		expect(screen.getByRole('button', { name: 'End selection' }).getAttribute('title')).toBe(
			'Done'
		);
	});
});

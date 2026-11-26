// The folding section (#389), grown from the app's panel groups: opened and shut from its header or from outside,
// what it holds drawn only while open, controls in its header that never fold it, a grip for dragging, and a foot row
// with the owner's actions and a Delete.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import Accordion from './accordion.svelte';

const head = createRawSnippet(() => ({ render: () => '<span>Overview</span>' }));
const inside = createRawSnippet(() => ({ render: () => '<p>Photos of the deck</p>' }));
const controls = createRawSnippet(() => ({
	render: () => '<button type="button">Leave out Overview</button>'
}));

function show(props: Record<string, unknown> = {}) {
	return render(Accordion, { props: { head, children: inside, ...props } });
}

// The header is the one button that says whether the section is open.
function headerOf() {
	return screen.getAllByRole('button').find((each) => each.hasAttribute('aria-expanded'))!;
}

describe('Accordion', () => {
	it('is a header that says whether it is open, drawing what it holds only while open', () => {
		show();

		expect(headerOf().getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByText('Photos of the deck')).toBeNull();
	});

	it('opens and shuts from its header, by a press, Enter and Space', async () => {
		show();

		await fireEvent.click(headerOf());
		expect(headerOf().getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByText('Photos of the deck')).toBeTruthy();

		await fireEvent.keyDown(headerOf(), { key: 'Enter' });
		expect(headerOf().getAttribute('aria-expanded')).toBe('false');

		await fireEvent.keyDown(headerOf(), { key: ' ' });
		expect(headerOf().getAttribute('aria-expanded')).toBe('true');
	});

	it('opens and shuts from outside', async () => {
		const { rerender } = show({ open: false });

		await rerender({ open: true });
		expect(headerOf().getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByText('Photos of the deck')).toBeTruthy();

		await rerender({ open: false });
		expect(headerOf().getAttribute('aria-expanded')).toBe('false');
	});

	it('leaves the opening to its owner when the owner hears each press', async () => {
		const ontoggle = vi.fn();
		show({ ontoggle });

		await fireEvent.click(headerOf());
		expect(ontoggle).toHaveBeenCalledWith(true);
		expect(headerOf().getAttribute('aria-expanded')).toBe('false');
	});

	it('never folds on a press of its header’s controls, which never start a drag', async () => {
		show({ controls });
		const control = screen.getByRole('button', { name: 'Leave out Overview' });

		await fireEvent.click(control);
		await fireEvent.keyDown(control, { key: 'Enter' });
		expect(headerOf().getAttribute('aria-expanded')).toBe('false');
		expect(control.closest('[data-no-drag]')).toBeTruthy();
	});

	it('carries a grip for a drag, and whatever marks its owner gives it', () => {
		const { container } = show({ grip: 'stops-1', 'data-section': 'stage-1' });

		expect(headerOf().dataset.grip).toBe('stops-1');
		expect(headerOf().title).toBe('Hold and drag to reorder');
		expect(container.querySelector('[data-section="stage-1"]')?.contains(headerOf())).toBe(true);
	});

	it('ends with its owner’s actions and a Delete', async () => {
		const ondelete = vi.fn();
		show({ open: true, ondelete, deleteLabel: 'Delete Stage' });

		await fireEvent.click(screen.getByRole('button', { name: 'Delete Stage' }));
		expect(ondelete).toHaveBeenCalledOnce();
	});

	it('sets no rule for the whole page, whose height animation it once switched on (#371)', () => {
		const source = readFileSync(join(import.meta.dirname, 'accordion.svelte'), 'utf8');
		const style = source.includes('<style') ? source.slice(source.indexOf('<style')) : '';

		expect(style).not.toMatch(/:root|\bhtml\b|\bbody\b|interpolate-size/);
	});
});

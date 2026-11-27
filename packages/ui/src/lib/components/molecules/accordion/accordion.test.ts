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
		expect(screen.queryByText('Photos of the deck')).toBeNull();

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

	it('tells its owner after each press whether it is now open', async () => {
		const ontoggle = vi.fn();
		show({ ontoggle });

		await fireEvent.click(headerOf());
		expect(ontoggle).toHaveBeenLastCalledWith(true);
		expect(headerOf().getAttribute('aria-expanded')).toBe('true');

		await fireEvent.click(headerOf());
		expect(ontoggle).toHaveBeenLastCalledWith(false);
	});

	it('never folds on a press of its header’s controls, which never start a drag', async () => {
		show({ controls });
		const control = screen.getByRole('button', { name: 'Leave out Overview' });

		await fireEvent.click(control);
		await fireEvent.keyDown(control, { key: 'Enter' });
		expect(headerOf().getAttribute('aria-expanded')).toBe('false');
		expect(control.closest('[data-no-drag]')).toBeTruthy();
	});

	it('opens one at a time with the sections of its group, telling each one it shuts', async () => {
		const shut = vi.fn();
		const one = createRawSnippet(() => ({ render: () => '<span>One</span>' }));
		const two = createRawSnippet(() => ({ render: () => '<span>Two</span>' }));
		const three = createRawSnippet(() => ({ render: () => '<span>Three</span>' }));
		render(Accordion, {
			props: { head: one, children: inside, group: 'releases', open: true, ontoggle: shut }
		});
		render(Accordion, { props: { head: two, children: inside, group: 'releases' } });
		render(Accordion, { props: { head: three, children: inside, group: 'other' } });
		const header = (name: string) =>
			screen.getByText(name).closest<HTMLElement>('[aria-expanded]')!;
		const opened = () =>
			['One', 'Two', 'Three'].filter((name) => header(name).ariaExpanded === 'true');

		await fireEvent.click(header('Three'));
		expect(opened()).toEqual(['One', 'Three']);

		await fireEvent.click(header('Two'));
		expect(opened()).toEqual(['Two', 'Three']);
		expect(shut).toHaveBeenLastCalledWith(false);

		await fireEvent.click(header('Two'));
		expect(opened()).toEqual(['Three']);
	});

	it('given `snap`, glides to the top of the box it scrolls in as a press opens it, and only then', async () => {
		// jsdom lays nothing out: the box scrolls by `scrollTo`, stood in for, and the section stands 300 px down it.
		const box = document.body.appendChild(document.createElement('div'));
		box.style.overflowY = 'auto';
		const scrolled = vi.fn();
		box.scrollTo = scrolled as typeof box.scrollTo;
		try {
			const { container, rerender } = render(Accordion, {
				target: box,
				props: { head, children: inside, snap: true }
			});
			const section = container.querySelector<HTMLElement>('.accordion')!;
			section.getBoundingClientRect = () => ({ top: 300 }) as DOMRect;

			await fireEvent.click(headerOf());
			await vi.waitFor(() =>
				expect(scrolled).toHaveBeenLastCalledWith({ top: 300, behavior: 'instant' })
			);
			// It moved there step by step, not at once.
			expect(scrolled.mock.calls.length).toBeGreaterThan(2);
			expect(scrolled.mock.calls[0][0].top).toBeLessThan(300);

			// Shut by a press, or opened from outside: it stays where it is.
			const glided = scrolled.mock.calls.length;
			await fireEvent.click(headerOf());
			await rerender({ open: true });
			await new Promise((done) => setTimeout(done, 60));
			expect(scrolled).toHaveBeenCalledTimes(glided);

			// Without `snap` a press opens it where it is.
			await rerender({ open: false, snap: false });
			await fireEvent.click(headerOf());
			await new Promise((done) => setTimeout(done, 60));
			expect(scrolled).toHaveBeenCalledTimes(glided);
		} finally {
			box.remove();
		}
	});

	it('carries a grip for a drag, and whatever marks its owner gives it', () => {
		const { container } = show({ grip: 'stops-1', 'data-section': 'stage-1' });

		expect(headerOf().dataset.grip).toBe('stops-1');
		expect(headerOf().title).toBe('Hold and drag to reorder');
		expect(container.querySelector('[data-section="stage-1"]')?.contains(headerOf())).toBe(true);
	});

	it('ends with its owner’s actions and a Delete', async () => {
		const ondelete = vi.fn();
		const actions = createRawSnippet(() => ({
			render: () => '<button type="button">Add Stop</button>'
		}));
		show({ open: true, actions, ondelete, deleteLabel: 'Delete Stage' });

		expect(screen.getByRole('button', { name: 'Add Stop' })).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Delete Stage' }));
		expect(ondelete).toHaveBeenCalledOnce();
	});

	it('wears the look it is given from outside, as the Button does', () => {
		const { container } = show({ lite: true, neutral: true, size: 'sm', class: 'rounded-box' });
		const box = container.querySelector('.accordion')!;

		expect(box.classList).toContain('theme-lite-neutral');
		expect(box.classList).toContain('sm');
		expect(box.classList).toContain('rounded-box');
		expect(box.contains(headerOf())).toBe(true);
	});

	it('is a bare section until a look is given: no theme and no colour of its own', () => {
		const { container } = show({ open: true, ondelete: () => {} });

		expect(container.querySelector('.accordion')!.className).not.toMatch(/theme-|bg-/);
		expect(container.innerHTML).not.toMatch(/slate|gray|zinc|bg-white/);
	});

	it('shows its label in the header when no head is given', () => {
		render(Accordion, { props: { label: 'Questions', children: inside } });

		expect(headerOf().textContent).toContain('Questions');
	});

	it('takes the chevron it is given, and turns it over while open', async () => {
		const { container } = show({ icon: 'icon-[mdi--plus] text-primary' });
		const chevron = () => container.querySelector('.accordion-chevron')!;

		expect(chevron().classList).toContain('icon-[mdi--plus]');
		expect(chevron().classList).toContain('text-primary');
		await fireEvent.click(headerOf());
		expect(chevron().classList).toContain('rotate-180');
	});

	it('deletes with the library Button, whose look is set through deleteButton', () => {
		show({ open: true, ondelete: () => {}, deleteButton: { outline: true } });
		const remove = screen.getByRole('button', { name: 'Delete' });

		expect(remove.classList).toContain('btn');
		expect(remove.classList).toContain('theme-outline-base');
	});

	it('sets no rule for the whole page, whose height animation it once switched on (#371)', () => {
		const source = readFileSync(join(import.meta.dirname, 'accordion.svelte'), 'utf8');
		const style = source.includes('<style') ? source.slice(source.indexOf('<style')) : '';

		expect(style).not.toMatch(/:root|\bhtml\b|\bbody\b|interpolate-size/);
	});
});

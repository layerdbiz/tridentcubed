// The list row (#383): a picture or icon, a line or two of words, and a mark at the end, the same in every list:
// Recents, Online, the Activity's sign-ins, a project's team, Change Status, Add. It replaces the app's six
// hand-built rows, so these tests pin what they did: the parts in their places, a tap when it is a button, and a
// look that comes from outside.
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import ListRow from './list-row.svelte';

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe('ListRow', () => {
	it('shows its picture, its words and its end mark, in that order', () => {
		const { container } = render(ListRow, {
			props: {
				label: 'Oziel Lara',
				note: 'Signed in 5 min ago',
				start: snippet('<img alt="Oziel Lara" src="/oziel.webp" />'),
				end: snippet('<span data-testid="end"></span>')
			}
		});

		const row = container.querySelector('.list-row');
		expect(row?.firstElementChild?.tagName).toBe('IMG');
		expect(row?.lastElementChild?.getAttribute('data-testid')).toBe('end');
		expect(screen.getByText('Oziel Lara')).not.toBeNull();
		expect(screen.getByText('Signed in 5 min ago')).not.toBeNull();
	});

	it('leaves out the second line, the picture and the end mark when it has none', () => {
		const { container } = render(ListRow, { props: { label: 'Draft' } });

		const row = container.querySelector('.list-row');
		expect(row?.children).toHaveLength(1);
		expect(row?.textContent).toBe('Draft');
	});

	it('takes a snippet for its first line: a name with the device beside it', () => {
		render(ListRow, {
			props: {
				label: snippet('<span>Ana Lopez <span aria-label="iPhone">i</span></span>'),
				note: 'Online 25 min'
			}
		});

		expect(screen.getByLabelText('iPhone')).not.toBeNull();
		expect(screen.getByText('Online 25 min')).not.toBeNull();
	});

	it('shows what it is given under its words: a third line', () => {
		render(ListRow, {
			props: {
				label: 'guest@example.com',
				note: 'Signed in',
				children: snippet('<span>Waiting for access</span>')
			}
		});

		expect(screen.getByText('Waiting for access')).not.toBeNull();
	});

	it('is a button that does what a tap on it says, when it is one', () => {
		const onclick = vi.fn();
		render(ListRow, {
			props: { label: 'Ready', tag: 'button', type: 'button', 'aria-pressed': true, onclick }
		});

		screen.getByRole('button', { name: 'Ready', pressed: true }).click();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('puts its class on the row and the looks of its lines on them', () => {
		const { container } = render(ListRow, {
			props: {
				label: 'Ana Lopez',
				note: 'Admin',
				class: 'gap-2 py-1.5',
				textClass: 'md:hidden',
				labelClass: 'font-medium',
				noteClass: 'text-xs text-shade'
			}
		});

		expect(container.querySelector('.list-row')?.className).toContain('gap-2 py-1.5');
		expect(screen.getByText('Ana Lopez').className).toContain('font-medium');
		expect(screen.getByText('Ana Lopez').parentElement?.className).toContain('md:hidden');
		expect(screen.getByText('Admin').className).toContain('text-xs text-shade');
	});

	it("gives its second line the theme's quieter grey unless it is given a look", () => {
		render(ListRow, { props: { label: 'Ana Lopez', note: 'Admin' } });

		expect(screen.getByText('Admin').className).toContain('text-base-500');
	});

	it('wears the colour and appearance it is given, as any base component', () => {
		const { container } = render(ListRow, { props: { label: 'Ready', primary: true, lite: true } });

		expect(container.querySelector('.list-row')?.className).toContain('theme-lite-primary');
	});

	it('puts its size on the row, so its type and the gaps in em grow with it', () => {
		const { container } = render(ListRow, {
			props: { label: 'Ana Lopez', note: 'Admin', sm: true }
		});

		expect(container.querySelector('.list-row')?.classList.contains('sm')).toBe(true);
		expect(screen.getByText('Admin').className).toContain('text-[0.75em]');
	});
});

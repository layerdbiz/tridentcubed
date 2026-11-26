// The badge (#381): a count in a small round mark, a column's number of cards, a record's number of projects. It
// replaces the app's hand-built count badges, so these tests pin what they did: the count, cut short above its most,
// and a look that comes from outside.
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Badge from './badge.svelte';

describe('Badge', () => {
	it('shows its count', () => {
		render(Badge, { props: { count: 7 } });

		const badge = screen.getByText('7');
		expect(badge.classList.contains('badge')).toBe(true);
	});

	it('shows its most and a plus above it, so it never grows past three characters', () => {
		const { unmount } = render(Badge, { props: { count: 140 } });
		expect(screen.getByText('99+')).not.toBeNull();
		unmount();

		render(Badge, { props: { count: 12, max: 9 } });
		expect(screen.getByText('9+')).not.toBeNull();
	});

	it('shows a count of nothing as 0', () => {
		render(Badge, { props: { count: 0 } });

		expect(screen.getByText('0')).not.toBeNull();
	});

	it("wears the theme's primary unless it is given a colour", () => {
		const { unmount } = render(Badge, { props: { count: 3 } });
		expect(screen.getByText('3').className).toContain('theme-heavy-primary');
		unmount();

		render(Badge, { props: { count: 4, neutral: true, lite: true } });
		const badge = screen.getByText('4');
		expect(badge.className).toContain('theme-lite-neutral');
		expect(badge.className).not.toContain('primary');
	});

	it('puts its class and its size on the badge, and anything else it is given', () => {
		render(Badge, {
			props: { count: 2, class: 'ring-2', sm: true, title: '2 projects, 1 open' }
		});

		const badge = screen.getByTitle('2 projects, 1 open');
		expect(badge.textContent).toBe('2');
		expect(badge.className).toContain('ring-2');
		expect(badge.classList.contains('sm')).toBe(true);
	});
});

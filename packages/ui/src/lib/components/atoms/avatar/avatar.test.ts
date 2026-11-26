// The avatar (#379): one round picture, a face or a logo, the same in every list row. It moved here from the app's
// own (Justin, 2026-11-26, #365 item 7), so these tests pin what it did there: the picture, the icon when there is
// none, and the presence dot, which a badge replaces.
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Avatar from './avatar.svelte';

describe('Avatar', () => {
	it('shows the picture it is given, named for whoever it is', () => {
		render(Avatar, { props: { src: '/files/ana.webp', alt: 'Ana Lopez' } });

		expect(screen.getByRole('img', { name: 'Ana Lopez' }).getAttribute('src')).toBe(
			'/files/ana.webp'
		);
	});

	it('shows an icon on grey when there is no picture', () => {
		const { container } = render(Avatar, {
			props: { src: '', alt: 'New person', fallback: 'icon-[mdi--folder]' }
		});

		const mark = screen.getByRole('img', { name: 'New person' });
		expect(mark.tagName).toBe('SPAN');
		expect(container.querySelector('.icon-\\[mdi--folder\\]')).not.toBeNull();
	});

	it('wears a presence dot in its colour at the top right', () => {
		render(Avatar, { props: { src: '/files/ana.webp', alt: 'Ana Lopez', presence: 'idle' } });

		const dot = screen.getByTitle('idle');
		expect(dot.className).toContain('bg-warning');
		expect(dot.className).toContain('top-0');
	});

	it('shows no dot unless it is given one', () => {
		const { container } = render(Avatar, { props: { src: '/files/ana.webp', alt: 'Ana Lopez' } });

		expect(container.querySelector('[title]')).toBeNull();
	});

	it('wears a badge in place of the dot', () => {
		const { container } = render(Avatar, {
			props: { src: '/files/ana.webp', alt: 'Ana Lopez', presence: 'online', badge: '/icon.png' }
		});

		expect(screen.queryByTitle('online')).toBeNull();
		expect(container.querySelector('img[src="/icon.png"]')).not.toBeNull();
	});

	it('is as big as it is asked to be', () => {
		const { container } = render(Avatar, {
			props: { src: '/files/ana.webp', alt: 'Ana', size: 22 }
		});

		expect((container.firstElementChild as HTMLElement).style.width).toBe('22px');
	});
});

// The avatar (#379): every little round picture, a face or a logo, the same in every list row. It moved here from
// the app's own (Justin, 2026-11-26, #365 item 7), so these tests pin what it did there: the picture, the initials
// when there is none (#355), the icon when there are no letters either, and the presence dot, which a badge replaces.
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

	it('draws the initials of a name with no picture, on the colours of its role', () => {
		render(Avatar, { props: { name: 'Oziel Lara', tone: 'manager' } });

		const picture = screen.getByRole('img', { name: 'Oziel Lara' }).getAttribute('src') ?? '';
		const svg = decodeURIComponent(picture.replace('data:image/svg+xml,', ''));
		expect(svg).toContain('>OL</text>');
		expect(svg).toContain('#2563eb');
	});

	it("draws the letters it is given in place of the name's: a company's code", () => {
		render(Avatar, {
			props: {
				name: 'CEVA Logistics',
				initials: 'CVA',
				tone: 'customer',
				alt: 'CEVA Logistics logo'
			}
		});

		const picture =
			screen.getByRole('img', { name: 'CEVA Logistics logo' }).getAttribute('src') ?? '';
		expect(decodeURIComponent(picture)).toContain('>CVA</text>');
	});

	it('keeps the photo over the initials', () => {
		render(Avatar, { props: { src: '/files/oziel.webp', name: 'Oziel Lara' } });

		expect(screen.getByRole('img', { name: 'Oziel Lara' }).getAttribute('src')).toBe(
			'/files/oziel.webp'
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

	it("paints the icon's circle in the colours it is given: a transport's mode", () => {
		render(Avatar, {
			props: { alt: 'Truck', fallback: 'icon-[mdi--truck]', tint: 'bg-sky-500 text-white' }
		});

		const mark = screen.getByRole('img', { name: 'Truck' });
		expect(mark.className).toContain('bg-sky-500 text-white');
		expect(mark.className).not.toContain('bg-slate-200');
	});

	// The dot and the badge are drawn by the avatar's own box, so the tests read what it is told to draw.
	it('wears the presence dot it is given, sized to the avatar', () => {
		const { container } = render(Avatar, {
			props: { src: '/files/ana.webp', alt: 'Ana Lopez', presence: 'idle', size: 40 }
		});

		const box = container.firstElementChild as HTMLElement;
		expect(box.dataset.presence).toBe('idle');
		expect(box.style.getPropertyValue('--dot')).toBe('11px');
	});

	it('shows no dot unless it is given one', () => {
		const { container } = render(Avatar, { props: { src: '/files/ana.webp', alt: 'Ana Lopez' } });

		expect((container.firstElementChild as HTMLElement).dataset.presence).toBeUndefined();
	});

	it('wears a badge in place of the dot', () => {
		const { container } = render(Avatar, {
			props: { src: '/files/ana.webp', alt: 'Ana Lopez', presence: 'online', badge: '/icon.png' }
		});

		const box = container.firstElementChild as HTMLElement;
		expect(box.dataset.presence).toBeUndefined();
		expect(box.dataset.badge).toBe('');
		expect(box.style.getPropertyValue('--badge')).toBe('url("/icon.png")');
	});

	it('is as big as it is asked to be', () => {
		const { container } = render(Avatar, {
			props: { src: '/files/ana.webp', alt: 'Ana', size: 22 }
		});

		expect((container.firstElementChild as HTMLElement).style.width).toBe('22px');
	});

	// Built on the base component (Justin, 2026-11-26), its look is set from outside, like the Button's.
	it('wears the look it is given on its box', () => {
		const { container } = render(Avatar, {
			props: { src: '/files/ana.webp', alt: 'Ana', lite: true, primary: true, class: 'shadow' }
		});

		const box = container.firstElementChild as HTMLElement;
		expect(box.className).toContain('theme-lite-primary');
		expect(box.className).toContain('shadow');
		expect(box.className).toContain('avatar');
	});

	it('is still one box and a picture, as light as before', () => {
		const { container } = render(Avatar, { props: { src: '/files/ana.webp', alt: 'Ana' } });

		expect(container.children).toHaveLength(1);
		expect(container.firstElementChild?.children).toHaveLength(1);
	});
});

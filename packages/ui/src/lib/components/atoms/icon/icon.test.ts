// The icon (Justin, 2026-11-26: every library piece on the base component, its look set from outside). It is drawn
// inside every Button, so these pin that it draws the same element as before and now takes a look like any piece.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Icon from './icon.svelte';

describe('Icon', () => {
	it("draws the icon it is named as an <i>, with the caller's class, hidden from readers", () => {
		const { container } = render(Icon, {
			props: { icon: 'icon-[mdi--check]', class: 'text-xl' }
		});

		const mark = container.querySelector('i');
		expect(mark?.className).toContain('icon-[mdi--check]');
		expect(mark?.className).toContain('text-xl');
		expect(mark?.getAttribute('aria-hidden')).toBe('true');
		expect(mark?.getAttribute('role')).toBe('img');
	});

	it('takes its look from outside, as every piece on the base component does', () => {
		const { container } = render(Icon, {
			props: { icon: 'icon-[mdi--check]', color: 'primary', size: 'sm' }
		});

		const mark = container.querySelector('i');
		expect(mark?.className).toContain('theme-heavy-primary');
		expect(mark?.classList.contains('sm')).toBe(true);
	});

	it('names a theme icon by its name, for the theme to draw', () => {
		const { container } = render(Icon, { props: { icon: 'check', theme: 'mdi' } });

		const mark = container.querySelector('i');
		expect(mark?.className).toContain('icon-check');
		expect(mark?.getAttribute('data-icon-theme')).toBe('mdi');
	});

	it('draws the spinner as an SVG, not as an HTML element of that name', () => {
		const { container } = render(Icon, { props: { name: 'spinner', class: 'size-4' } });

		const svg = container.querySelector('svg');
		expect(svg?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg?.querySelector('circle')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svg?.getAttribute('class')).toContain('size-4');
	});
});

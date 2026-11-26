// The header (Justin, 2026-11-26: every library piece on the base component, its look set from outside). The site's
// bar asks for glass on the box inside it, so these pin that the look lands on that box and the bar only places it.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Header from './header.svelte';

describe('Header', () => {
	it("puts the caller's look and class on the box inside the bar", () => {
		const { container } = render(Header, {
			props: { appearance: 'glass', invert: true, class: 'rounded-4xl p-2' }
		});

		const bar = container.querySelector('header');
		const box = bar?.firstElementChild;
		expect(box?.className).toContain('container');
		expect(box?.className).toContain('theme-glass-invert');
		expect(box?.className).toContain('rounded-4xl');
		expect(bar?.className).not.toContain('theme-glass');
	});

	it('fixes the bar to the top when asked', () => {
		const { container } = render(Header, { props: { fixed: true } });

		expect(container.querySelector('header')?.className).toContain('fixed');
	});
});

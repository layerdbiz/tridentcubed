// The logo (Justin, 2026-11-26: every library piece on the base component, its look set from outside). Its `class`
// sizes the mark, as the site and the overview use it, and the link around it takes the rest of the look.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Logo from './logo.svelte';

describe('Logo', () => {
	it('sizes the mark with its class and links home', () => {
		const { container } = render(Logo, { props: { class: 'size-11' } });

		const link = container.querySelector('a');
		expect(link?.getAttribute('href')).toBe('/');
		expect(link?.className).toContain('logo');
		expect(link?.className).not.toContain('size-11');
		expect(container.querySelector('svg')?.getAttribute('class')).toContain('size-11');
	});

	it("takes the theme's dark and light for its dark and light schemes", () => {
		const dark = render(Logo, { props: { dark: true } });
		expect(dark.container.querySelector('a')?.className).toContain('text-dark-dark');

		const light = render(Logo, { props: { light: true } });
		expect(light.container.querySelector('a')?.className).toContain('text-light-light');
	});

	it('takes a look from outside on the link', () => {
		const { container } = render(Logo, { props: { color: 'primary', appearance: 'ghost' } });

		expect(container.querySelector('a')?.className).toContain('theme-ghost-primary');
	});
});

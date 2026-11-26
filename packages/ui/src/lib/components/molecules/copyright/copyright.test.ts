// The copyright line (Justin, 2026-11-26: every library piece on the base component, its look set from outside). It
// is a library Text inside the base component, so these pin the line the site's footer shows and where its class goes.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Copyright from './copyright.svelte';

describe('Copyright', () => {
	it("writes the years and the company with its kind, on a paragraph with the caller's class", () => {
		const { container } = render(Copyright, {
			props: { year: '2020', name: 'Trident Cubed Solutions', type: 'llc', class: 'text-sm' }
		});

		const line = container.querySelector('p');
		expect(line?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			`© 2020 — ${new Date().getFullYear()} Trident Cubed Solutions, LLC`
		);
		expect(line?.className).toContain('copyright');
		expect(line?.className).toContain('prose');
		expect(line?.className).toContain('text-sm');
	});

	it('hands the Text its own props, such as no prose', () => {
		const { container } = render(Copyright, { props: { name: 'Acme', noprose: true } });

		expect(container.querySelector('p')?.className).not.toContain('prose');
	});
});

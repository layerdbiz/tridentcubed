// The grid (Justin, 2026-11-26: every library piece on the base component, its look set from outside). The play
// page's grid shows its cells while it is laid out (`debug`), so these pin that they are drawn in the theme's shade.
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Grid from './grid.svelte';

describe('Grid', () => {
	it("lays its cells out from `items`, with the caller's class on the grid", () => {
		const { container } = render(Grid, { props: { items: '2x2', class: 'h-40' } });

		const grid = container.firstElementChild as HTMLElement;
		expect(grid.className).toContain('h-40');
		expect(grid.getAttribute('style')).toContain('grid-template-columns');
	});

	it("names every cell in the theme's shade while debugging", () => {
		const { container } = render(Grid, { props: { items: '2x2', debug: true } });

		const cells = [...container.querySelectorAll('.bg-shade\\/10')];
		expect(cells.map((cell) => cell.textContent?.trim())).toEqual(['A1', 'B1', 'A2', 'B2']);
	});
});

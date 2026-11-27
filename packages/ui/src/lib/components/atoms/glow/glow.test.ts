// The glow (2026-11-27): a dark box lit by soft light in the theme's colours, the top of What's New for a new
// release. These tests pin that its light comes from the colours it is given and that what it holds shows on top.
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vite-plus/test';
import Glow from './glow.svelte';

const words = createRawSnippet(() => ({ render: () => '<p>New release</p>' }));

function glowOf(text: string) {
	return screen.getByText(text).closest('.glow') as HTMLElement;
}

describe('Glow', () => {
	it('holds what it is given above its light, on the theme’s dark', () => {
		render(Glow, { props: { children: words } });

		const glow = glowOf('New release');
		expect(glow.className).toContain('bg-shade');
		expect(glow.className).toContain('text-on-shade');
		expect(glow.querySelectorAll('.glow-lights[aria-hidden="true"] .glow-light')).toHaveLength(3);
	});

	it('cuts only its light to its shape, so what it holds may reach past its edge', () => {
		render(Glow, { props: { children: words } });

		const glow = glowOf('New release');
		expect(glow.className).not.toContain('overflow-hidden');
		expect(glow.querySelector('.glow-lights')?.className).toContain('overflow-hidden');
	});

	it('lights itself in the primary unless it is given a colour, and mixes in the blend', () => {
		const { unmount } = render(Glow, { props: { children: words } });
		expect(glowOf('New release').getAttribute('style')).toContain(
			'--glow-a: var(--color-primary-500)'
		);
		unmount();

		render(Glow, { props: { children: words, accent: true, blend: 'warning' } });
		const style = glowOf('New release').getAttribute('style') ?? '';
		expect(style).toContain('--glow-a: var(--color-accent-500)');
		expect(style).toContain('--glow-b: var(--color-warning-400)');
	});

	it('takes the class it is given, and stands still when told', () => {
		render(Glow, { props: { children: words, class: 'rounded-3xl', isMoving: false } });

		const glow = glowOf('New release');
		expect(glow.className).toContain('rounded-3xl');
		expect(glow.hasAttribute('data-moving')).toBe(false);
	});
});

// The progress bar (#380): the one bar that shows how much of something is done, a project's, a panel's, an upload's.
// It replaces the app's six hand-built bars and the Toast's own, so these tests pin what they did: the share it
// fills, what a screen reader hears, and that its colours come from outside.
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import ProgressBar from './progress-bar.svelte';

function fillOf(bar: HTMLElement): HTMLElement {
	const fill = bar.firstElementChild;
	if (!(fill instanceof HTMLElement)) throw new Error('The bar has no filled part');
	return fill;
}

describe('ProgressBar', () => {
	it('tells a screen reader what it measures and how far along it is', () => {
		render(ProgressBar, { props: { value: 40, label: 'Project progress' } });

		const bar = screen.getByRole('progressbar', { name: 'Project progress' });
		expect(bar.getAttribute('aria-valuenow')).toBe('40');
		expect(bar.getAttribute('aria-valuemin')).toBe('0');
		expect(bar.getAttribute('aria-valuemax')).toBe('100');
	});

	it('fills the share of its width that is done', () => {
		render(ProgressBar, { props: { value: 40, label: 'Done' } });

		expect(fillOf(screen.getByRole('progressbar')).style.width).toBe('40%');
	});

	it('measures against the most it can be, when that is not 100', () => {
		render(ProgressBar, { props: { value: 3, max: 4, label: 'Steps' } });

		const bar = screen.getByRole('progressbar');
		expect(fillOf(bar).style.width).toBe('75%');
		expect(bar.getAttribute('aria-valuemax')).toBe('4');
	});

	it('never fills less than nothing or more than all of it', () => {
		const { unmount } = render(ProgressBar, { props: { value: -5, label: 'Low' } });
		expect(fillOf(screen.getByRole('progressbar')).style.width).toBe('0%');
		unmount();

		render(ProgressBar, { props: { value: 140, label: 'High' } });
		const bar = screen.getByRole('progressbar');
		expect(fillOf(bar).style.width).toBe('100%');
		expect(bar.getAttribute('aria-valuenow')).toBe('100');
	});

	it('reads out the whole number it has reached, as the Toast prints it', () => {
		render(ProgressBar, { props: { value: 45.7, label: 'Uploading' } });

		const bar = screen.getByRole('progressbar');
		expect(bar.getAttribute('aria-valuenow')).toBe('45');
		expect(fillOf(bar).style.width).toBe('45.7%');
	});

	it("fills in the theme's primary unless it is given a colour", () => {
		render(ProgressBar, { props: { value: 50, label: 'Done' } });

		expect(fillOf(screen.getByRole('progressbar')).className).toContain('theme-heavy-primary');
	});

	it('fills in the colour and appearance it is given, as a shorthand too', () => {
		render(ProgressBar, { props: { value: 50, label: 'Done', accent: true, lite: true } });

		const fill = fillOf(screen.getByRole('progressbar'));
		expect(fill.className).toContain('theme-lite-accent');
		expect(fill.className).not.toContain('primary');
	});

	it("takes a class in place of its colour: a project's state colour", () => {
		render(ProgressBar, { props: { value: 50, label: 'Done', bar: 'bg-state-ready' } });

		const fill = fillOf(screen.getByRole('progressbar'));
		expect(fill.className).toContain('bg-state-ready');
		expect(fill.className).not.toContain('theme-');
	});

	it("lays its track in the theme's neutral, or in the class it is given in its place", () => {
		const { unmount } = render(ProgressBar, { props: { value: 50, label: 'Plain' } });
		expect(screen.getByRole('progressbar').className).toContain('bg-neutral-200');
		unmount();

		render(ProgressBar, { props: { value: 50, label: 'Over a photo', track: 'bg-shade/20' } });
		const bar = screen.getByRole('progressbar');
		expect(bar.className).toContain('bg-shade/20');
		expect(bar.className).not.toContain('bg-neutral-200');
	});

	it('puts its class and its size on the track, the box that shows', () => {
		render(ProgressBar, { props: { value: 50, label: 'Done', class: 'mt-3 w-16', sm: true } });

		const bar = screen.getByRole('progressbar');
		expect(bar.className).toContain('mt-3 w-16');
		expect(bar.classList.contains('sm')).toBe(true);
		expect(fillOf(bar).className).not.toContain('mt-3');
	});

	it('runs a band of light along the filled part while the work is under way', async () => {
		const { rerender } = render(ProgressBar, {
			props: { value: 30, label: 'Uploading', isMoving: true }
		});
		expect(fillOf(screen.getByRole('progressbar')).hasAttribute('data-moving')).toBe(true);

		await rerender({ value: 100, label: 'Uploading', isMoving: false });
		expect(fillOf(screen.getByRole('progressbar')).hasAttribute('data-moving')).toBe(false);
	});
});

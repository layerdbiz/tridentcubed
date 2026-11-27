// The scroller (2026-11-27): a box that scrolls and fades out at the edges it is told, only as far as there is more to
// see past each one. These tests pin which edges fade, by how much as it scrolls, and that its look is the place's.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vite-plus/test';
import Scroller from './scroller.svelte';

const list = createRawSnippet(() => ({
	render: () => '<ul><li>Pin anything to the menu.</li></ul>'
}));

function scrollerOf() {
	return screen.getByText('Pin anything to the menu.').closest('.scroller') as HTMLElement;
}

// The box's size and scroll as a browser would measure them: 300 tall, holding 1,000.
function measure(box: HTMLElement, { top = 0, left = 0, height = 1000, width = 300 } = {}) {
	Object.defineProperty(box, 'scrollHeight', { configurable: true, value: height });
	Object.defineProperty(box, 'clientHeight', { configurable: true, value: 300 });
	Object.defineProperty(box, 'scrollWidth', { configurable: true, value: width });
	Object.defineProperty(box, 'clientWidth', { configurable: true, value: 300 });
	box.scrollTop = top;
	box.scrollLeft = left;
}

function fades(box: HTMLElement) {
	return ['top', 'bottom', 'left', 'right'].map((edge) =>
		box.style.getPropertyValue(`--scroller-${edge}`)
	);
}

describe('Scroller', () => {
	it('scrolls down and fades nowhere unless told', () => {
		render(Scroller, { props: { children: list } });

		const box = scrollerOf();
		expect(box.className).toContain('overflow-y-auto');
		expect(box.className).not.toMatch(/scroller-[xy]/);
	});

	it('fades the top only once it has scrolled, and the bottom until the end', async () => {
		render(Scroller, { props: { children: list, fade: 'y' } });
		const box = scrollerOf();
		expect(box.className).toContain('scroller-y');

		measure(box, { top: 0 });
		await fireEvent.scroll(box);
		expect(fades(box)).toEqual(['0px', '56px', '0px', '0px']);

		measure(box, { top: 20 });
		await fireEvent.scroll(box);
		expect(fades(box)).toEqual(['20px', '56px', '0px', '0px']);

		// Near the end, the bottom fades only as far as there is left to see; at the end, not at all.
		measure(box, { top: 680 });
		await fireEvent.scroll(box);
		expect(fades(box)).toEqual(['56px', '20px', '0px', '0px']);
		measure(box, { top: 700 });
		await fireEvent.scroll(box);
		expect(fades(box)).toEqual(['56px', '0px', '0px', '0px']);
	});

	it('scrolls across and fades left and right when told, any depth', async () => {
		render(Scroller, { props: { children: list, axis: 'x', fade: 'x', depth: 24 } });
		const box = scrollerOf();
		expect(box.className).toContain('overflow-x-auto');
		expect(box.className).toContain('scroller-x');

		measure(box, { left: 100, width: 900 });
		await fireEvent.scroll(box);
		expect(fades(box)).toEqual(['0px', '0px', '24px', '24px']);
	});

	it('fades only the edges named, and both ways at once', async () => {
		render(Scroller, { props: { children: list, axis: 'both', fade: ['bottom', 'right'] } });
		const box = scrollerOf();
		expect(box.className).toContain('scroller-xy');

		measure(box, { top: 100, left: 100, width: 900 });
		await fireEvent.scroll(box);
		expect(fades(box)).toEqual(['0px', '56px', '0px', '56px']);
	});

	it('keeps its fades when a style handed to it changes', async () => {
		const { rerender } = render(Scroller, {
			props: { children: list, fade: 'y', style: 'padding-left: 20px' }
		});
		const box = scrollerOf();
		measure(box, { top: 20 });
		await fireEvent.scroll(box);

		await rerender({ style: 'padding-left: 40px' });
		expect(box.style.paddingLeft).toBe('40px');
		expect(fades(box)).toEqual(['20px', '56px', '0px', '0px']);
	});

	// A heading that sticks to the top (the Notifications' Today, Yesterday...) stands in a strip the fade leaves
	// whole: the fade starts under it (#403).
	it('starts a fade as far in from its edge as told, for a heading that sticks there', async () => {
		render(Scroller, { props: { children: list, fade: 'y', inset: { top: 32 } } });
		const box = scrollerOf();
		expect(box.style.getPropertyValue('--scroller-inset-top')).toBe('32px');
		expect(box.style.getPropertyValue('--scroller-inset-bottom')).toBe('0px');

		measure(box, { top: 20 });
		await fireEvent.scroll(box);
		expect(fades(box)).toEqual(['20px', '56px', '0px', '0px']);
	});

	it('takes the class it is given', () => {
		render(Scroller, { props: { children: list, class: 'max-h-80 px-5' } });

		expect(scrollerOf().className).toContain('max-h-80 px-5');
	});
});

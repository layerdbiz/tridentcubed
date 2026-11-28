// A box gliding to the top of the area it scrolls in (#412): the library Accordion's `snap` and the app's edit panels.
// jsdom lays nothing out, so the area scrolls by `scrollTo`, stood in for, and the box stands where it is told.
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { glide } from './glide';

function setUp(padding = '', margin = '') {
	const area = document.body.appendChild(document.createElement('div'));
	area.style.overflowY = 'auto';
	area.style.scrollPaddingTop = padding;
	const box = area.appendChild(document.createElement('div'));
	box.style.scrollMarginTop = margin;
	box.getBoundingClientRect = () => ({ top: 300 }) as DOMRect;
	const scrolled = vi.fn();
	area.scrollTo = scrolled as typeof area.scrollTo;
	return { area, box, scrolled };
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('glide', () => {
	it('moves the box to the top of the area it scrolls in step by step, eased', async () => {
		const { box, scrolled } = setUp();

		glide(box);

		await vi.waitFor(() =>
			expect(scrolled).toHaveBeenLastCalledWith({ top: 300, behavior: 'instant' })
		);
		expect(scrolled.mock.calls.length).toBeGreaterThan(2);
		expect(scrolled.mock.calls[0][0].top).toBeLessThan(300);
	});

	it("stops under the area's scroll padding, a sticky header's room, and the box's own scroll margin", async () => {
		const { box, scrolled } = setUp('40px', '8px');

		glide(box);

		await vi.waitFor(() =>
			expect(scrolled).toHaveBeenLastCalledWith({ top: 252, behavior: 'instant' })
		);
	});

	it('stops when a finger or a wheel takes the area', async () => {
		const { area, box, scrolled } = setUp();

		glide(box);
		area.dispatchEvent(new Event('touchstart'));
		await new Promise((done) => setTimeout(done, 400));

		expect(scrolled.mock.calls.length).toBeLessThan(2);
	});
});

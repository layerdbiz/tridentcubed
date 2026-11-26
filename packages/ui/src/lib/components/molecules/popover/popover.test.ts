// The Popover (#405): a box of anything that hangs from a library Button, such as the bell's Notifications. These
// tests pin what Justin's phone needed: it opens toward the side it is told, and it is never cut off by the edge of the
// screen; and what any box that hangs from a button does: a tap opens it, a second tap, Escape or a tap outside closes
// it, and it takes its look from outside.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import Popover from './popover.svelte';

const children = createRawSnippet(() => ({
	render: () => `<p>Cargo Condition Survey edited</p>`
}));

function show(props: Record<string, unknown> = {}) {
	return render(Popover, {
		props: {
			label: 'Notifications',
			button: { icon: 'icon-[mdi--bell-outline]' },
			children,
			...props
		}
	});
}

async function open(name = 'Notifications') {
	await fireEvent.click(screen.getByRole('button', { name }));
	return screen.getByRole('dialog', { name });
}

function boxOf() {
	return document.querySelector<HTMLElement>('[popover]');
}

// Where the button sits on the page, and how big the box is once it shows. jsdom lays nothing out, so every element
// answers with this one button's place, and the box with its width and the height of all it holds.
function place(
	button: { top: number; left: number; width: number; height: number },
	box = { width: 288, tall: 400 }
) {
	const rect = {
		...button,
		right: button.left + button.width,
		bottom: button.top + button.height,
		x: button.left,
		y: button.top
	};
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		...rect,
		toJSON: () => rect
	} as DOMRect);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(box.width);
	vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(box.tall);
}

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('opening and closing', () => {
	it('opens on a tap of its button and shows what it holds, named by its label', async () => {
		show();
		const button = screen.getByRole('button', { name: 'Notifications' });
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByRole('dialog')).toBeNull();

		const box = await open();

		expect(box.textContent).toContain('Cargo Condition Survey edited');
		expect(button.getAttribute('aria-expanded')).toBe('true');
		expect(button.getAttribute('aria-haspopup')).toBe('dialog');
	});

	it('closes on a second tap of its button', async () => {
		show();
		await open();
		await fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('closes on Escape', async () => {
		show();
		await open();
		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('closes on a tap anywhere outside it, and stays open for a tap inside', async () => {
		show();
		const box = await open();

		await fireEvent.pointerDown(box);
		expect(screen.getByRole('dialog')).not.toBeNull();

		await fireEvent.pointerDown(document.body);
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('opens and closes from the place that uses it, through isOpen', async () => {
		const result = show({ isOpen: true });
		expect(screen.getByRole('dialog', { name: 'Notifications' })).not.toBeNull();

		await result.rerender({ isOpen: false });
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});

describe('its button', () => {
	it('is the library Button, its look and any other prop set through button, its own tap kept', async () => {
		const onclick = vi.fn();
		show({ button: { ghost: true, md: true, icon: 'icon-[mdi--bell-outline]', onclick } });
		const button = screen.getByRole('button', { name: 'Notifications' });

		expect(button.classList).toContain('btn');
		expect(button.classList).toContain('theme-ghost');
		expect(button.querySelector('.btn-icon')).not.toBeNull();

		await open();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('names its button with the button’s own label when it has one, and the box with its label', async () => {
		show({ button: { icon: 'icon-[mdi--bell-outline]', 'aria-label': 'Bell' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Bell' }));

		expect(screen.getByRole('dialog', { name: 'Notifications' })).not.toBeNull();
	});
});

describe('where the box goes', () => {
	it('hangs under its button, its right edge on the button’s right edge by default', async () => {
		place({ top: 20, left: 900, width: 40, height: 40 });
		show();
		await open();

		const style = boxOf()?.getAttribute('style') ?? '';
		expect(style).toContain(`left: ${940 - 288}px`);
		expect(style).toContain('top: 68px');
	});

	it('lines up its left edge with the button’s when aligned left, so it opens toward the right', async () => {
		place({ top: 20, left: 200, width: 40, height: 40 });
		show({ align: 'left' });
		await open();

		expect(boxOf()?.getAttribute('style')).toContain('left: 200px');
	});

	it('moves back from the right edge of the screen, 8px clear, rather than run off it (the phone menu’s bell)', async () => {
		place({ top: 20, left: innerWidth - 100, width: 40, height: 40 });
		show({ align: 'left' });
		await open();

		expect(boxOf()?.getAttribute('style')).toContain(`left: ${innerWidth - 8 - 288}px`);
	});

	it('moves back from the left edge of the screen, 8px clear, rather than run off it', async () => {
		place({ top: 20, left: 200, width: 40, height: 40 });
		show();
		await open();

		expect(boxOf()?.getAttribute('style')).toContain('left: 8px');
	});

	it('is never wider than the screen, keeping 8px clear on each side', async () => {
		place({ top: 20, left: 200, width: 40, height: 40 }, { width: innerWidth - 16, tall: 400 });
		show({ align: 'left' });
		await open();

		const style = boxOf()?.getAttribute('style') ?? '';
		expect(style).toContain(`max-width: ${innerWidth - 16}px`);
		expect(style).toContain('left: 8px');
	});

	it('stands as far from its button as asked', async () => {
		place({ top: 20, left: 200, width: 40, height: 40 });
		show({ align: 'left', offset: 16 });
		await open();

		expect(boxOf()?.getAttribute('style')).toContain('top: 76px');
	});

	it('opens over its button when it does not fit under it and there is more room above', async () => {
		place({ top: innerHeight - 60, left: 200, width: 40, height: 40 });
		show({ align: 'left' });
		await open();

		const style = boxOf()?.getAttribute('style') ?? '';
		expect(style).toContain(`bottom: ${60 + 8}px`);
		expect(style).not.toContain('top:');
	});

	it('is never taller than the room on its side, keeping 8px clear: what it holds scrolls inside it', async () => {
		place({ top: 20, left: 200, width: 40, height: 40 }, { width: 288, tall: 2000 });
		show({ align: 'left' });
		await open();

		expect(boxOf()?.getAttribute('style')).toContain(`max-height: ${innerHeight - 68 - 8}px`);
		expect(boxOf()?.className).toContain('overflow-y-auto');
	});

	it('floats above the page in a popover, so no scrolling or rounded box around its button cuts it off', async () => {
		show();
		await open();

		const box = boxOf();
		expect(box?.getAttribute('popover')).toBe('manual');
		expect(box?.className).toContain('fixed');
	});
});

describe('its look', () => {
	it('takes its look from outside on the box that shows, the theme’s surface until it is given one', async () => {
		const plain = show();
		await open();
		expect(boxOf()?.className).toContain('bg-surface');
		plain.unmount();

		show({ color: 'primary', appearance: 'lite', class: 'w-80' });
		await open();
		const box = boxOf();
		expect(box?.className).toContain('theme-lite-primary');
		expect(box?.className).toContain('w-80');
		expect(box?.className).not.toContain('bg-surface');
		expect(box?.className).not.toMatch(/-(slate|gray|zinc)-|white/);
	});
});

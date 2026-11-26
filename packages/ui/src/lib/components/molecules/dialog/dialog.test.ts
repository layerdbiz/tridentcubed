// The Dialog (#375): the box the app opens over the page, a sheet from the bottom on a phone and a centred box from
// tablet width, on the browser's own <dialog>. It began as the app's sheet (install how-to, add, save, change status,
// confirm, the dashboard ? cards) and the help ?'s private copy. These tests pin what a person meets: it is a dialog
// named for what it holds, Escape, a tap outside and a pull down close it, the focus goes into it and back to what
// opened it, and the help ?'s kind leaves the focus in the input being typed in.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import Dialog from './dialog.svelte';

const body = createRawSnippet(() => ({
	render: () => `<div><p>Every status in order.</p><button type="button">Review</button></div>`
}));

function show(props: Record<string, unknown> = {}) {
	const onclose = vi.fn();
	const result = render(Dialog, {
		props: { label: 'Change Status', onclose, children: body, ...props }
	});
	return { ...result, onclose, dialog: screen.getByRole('dialog', { name: 'Change Status' }) };
}

// A pull on the sheet from where the finger lands. A slow one rests a moment before it moves, so it lets go at no
// speed; a quick one is a flick.
async function pull(sheet: Element, distance: number, isSlow = false) {
	const finger = { pointerId: 1, isPrimary: true, button: 0 };
	await fireEvent.pointerDown(sheet, { ...finger, clientY: 400 });
	if (isSlow) await new Promise((resolve) => setTimeout(resolve, 150));
	await fireEvent.pointerMove(sheet, { ...finger, clientY: 400 + distance });
	await fireEvent.pointerUp(sheet, { ...finger, clientY: 400 + distance });
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('Dialog', () => {
	it('is a dialog named for what it holds, open over the page', () => {
		const { dialog } = show();

		expect(dialog.tagName).toBe('DIALOG');
		expect((dialog as HTMLDialogElement).open).toBe(true);
		expect(dialog.textContent).toContain('Every status in order.');
	});

	it('closes on Escape and on a tap outside', async () => {
		const { dialog, onclose } = show();

		await fireEvent(dialog, new Event('cancel', { cancelable: true }));
		expect(onclose).toHaveBeenCalledTimes(1);

		await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		expect(onclose).toHaveBeenCalledTimes(2);
	});

	it('closes on a long pull down or a flick, and springs back from a short slow pull', async () => {
		const { dialog, onclose } = show();
		const sheet = dialog.querySelector('.dialog-sheet')!;

		await pull(sheet, 40, true);
		expect(onclose).not.toHaveBeenCalled();

		await pull(sheet, 160, true);
		expect(onclose).toHaveBeenCalledTimes(1);

		await pull(sheet, 60);
		expect(onclose).toHaveBeenCalledTimes(2);
	});

	it('takes the focus when it opens and gives it back to what opened it when it closes', () => {
		const opener = document.createElement('button');
		opener.textContent = 'Change Status';
		document.body.append(opener);
		opener.focus();

		const { dialog, unmount } = show();
		expect(dialog.contains(document.activeElement)).toBe(true);

		unmount();
		expect(document.activeElement).toBe(opener);
	});

	it('as a help sheet, never takes the focus from the input being typed in', () => {
		const input = document.createElement('input');
		document.body.append(input);
		input.focus();

		const { dialog, unmount } = show({ isModal: false });
		// A <dialog> takes the focus whenever it is shown, as a popover too, so this kind is not one.
		expect(dialog.tagName).not.toBe('DIALOG');
		expect(document.activeElement).toBe(input);
		expect(dialog.contains(document.activeElement)).toBe(false);

		unmount();
		expect(document.activeElement).toBe(input);
	});

	it('as a tall one, keeps its header and footer and scrolls what is between, which a pull there never closes', async () => {
		const header = createRawSnippet(() => ({ render: () => `<h2>What's New</h2>` }));
		const footer = createRawSnippet(() => ({
			render: () => `<button type="button">Got it</button>`
		}));
		const { dialog, onclose } = show({ variant: 'tall', header, footer });
		const middle = screen.getByText('Every status in order.');

		expect(screen.getByRole('heading', { name: "What's New" })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Got it' })).toBeTruthy();
		expect(middle.closest('.dialog-scroll')).toBeTruthy();
		expect(dialog.querySelector('.dialog-scroll h2')).toBeNull();

		await pull(middle, 160, true);
		expect(onclose).not.toHaveBeenCalled();

		await pull(screen.getByRole('heading', { name: "What's New" }), 160, true);
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	// Its look is set from outside (Justin, 2026-11-26), like the Button's.
	it('wears the look it is given on the sheet that shows, not on the layer over the page', () => {
		const { dialog } = show({ lite: true, neutral: true, class: 'gap-2' });
		const sheet = dialog.querySelector('.dialog-sheet')!;

		expect(sheet.className).toContain('theme-lite-neutral');
		expect(sheet.className).toContain('gap-2');
		expect(sheet.className).not.toContain('bg-surface');
		expect(dialog.className).not.toMatch(/theme-|gap-2/);
	});

	it("is the theme's surface until it is given a look, with no colour of its own", () => {
		const { dialog } = show();
		const sheet = dialog.querySelector('.dialog-sheet')!;

		expect(sheet.className).toContain('bg-surface');
		expect(sheet.className).not.toMatch(/\btheme-|-(slate|gray|zinc)-|bg-white/);
		expect(dialog.innerHTML).not.toMatch(/-(slate|gray|zinc)-|bg-white/);
	});
});

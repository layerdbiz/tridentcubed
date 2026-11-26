// The Switch (#378): the app's two hand-built on/off switches made one, a stage's in-the-report switch and a panel
// card's, whose track takes its panel's state colour.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import Switch from './switch.svelte';

function show(props: Record<string, unknown> = {}, target?: HTMLElement) {
	const onchange = vi.fn();
	render(Switch, { target, props: { label: 'Overview in the report', onchange, ...props } });
	return { onchange, button: screen.getByRole('switch', { name: 'Overview in the report' }) };
}

describe('Switch', () => {
	it('is a switch named by its label, and off until told on', () => {
		const { button } = show();

		expect(button.getAttribute('aria-checked')).toBe('false');
		// A native button: a tap, a click, Enter and Space all press it.
		expect(button.tagName).toBe('BUTTON');
		expect(button.getAttribute('type')).toBe('button');
	});

	it('starts on when it is on', () => {
		const { button } = show({ checked: true });

		expect(button.getAttribute('aria-checked')).toBe('true');
	});

	it('turns on with a press and off with the next, telling its owner each time', async () => {
		const { button, onchange } = show();

		await fireEvent.click(button);
		expect(button.getAttribute('aria-checked')).toBe('true');
		expect(onchange).toHaveBeenLastCalledWith(true);

		await fireEvent.click(button);
		expect(button.getAttribute('aria-checked')).toBe('false');
		expect(onchange).toHaveBeenLastCalledWith(false);
	});

	it('runs its owner’s own click as well, so the owner can keep the press from its row', async () => {
		const onclick = vi.fn((event: MouseEvent) => event.stopPropagation());
		const { button, onchange } = show({ onclick });

		await fireEvent.click(button);
		expect(onclick).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledWith(true);
	});

	it('stays as it is while disabled', async () => {
		const { button, onchange } = show({ checked: true, disabled: true });

		expect(button.hasAttribute('disabled')).toBe(true);
		await fireEvent.click(button);
		expect(button.getAttribute('aria-checked')).toBe('true');
		expect(onchange).not.toHaveBeenCalled();
	});

	it('stays as it is in a disabled fieldset, as a frozen project’s fields do', async () => {
		const fieldset = document.body.appendChild(document.createElement('fieldset'));
		fieldset.disabled = true;
		const { button, onchange } = show({}, fieldset);

		await fireEvent.click(button);
		expect(button.getAttribute('aria-checked')).toBe('false');
		expect(onchange).not.toHaveBeenCalled();
		fieldset.remove();
	});

	it('wears its track colour whether on or off, in place of the on and off colours', async () => {
		const { button } = show({ track: 'bg-success' });

		expect(button.classList).toContain('bg-success');
		await fireEvent.click(button);
		expect(button.classList).toContain('bg-success');
		expect(button.classList).not.toContain('bg-primary');
	});

	it("wears its colour from outside while on, primary unless told, and the theme's neutral while off", async () => {
		const { button } = show({ accent: true, lite: true });

		expect(button.classList).toContain('bg-neutral-500');
		expect(button.className).not.toMatch(/theme-/);
		await fireEvent.click(button);
		expect(button.classList).toContain('theme-lite-accent');
		expect(button.classList).not.toContain('bg-neutral-500');
	});

	it("is on in the theme's primary when no colour is given", () => {
		const { button } = show({ checked: true });

		expect(button.classList).toContain('theme-heavy-primary');
	});

	it('takes its size from the base ladder and any class from outside', () => {
		const { button } = show({ size: 'lg', class: 'ring-4 ring-white' });

		expect(button.classList).toContain('lg');
		expect(button.classList).toContain('ring-4');
	});

	it('keeps no fixed colour of its own but white for the thumb', () => {
		const { button } = show({ checked: true });

		expect(button.outerHTML).not.toMatch(/slate|gray|zinc/);
	});
});

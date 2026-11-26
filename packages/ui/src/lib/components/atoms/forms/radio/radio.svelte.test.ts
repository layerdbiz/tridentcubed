// Radio (#382): a pick-one group, such as how many photos share a report page, each choice drawn by its owner.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet, type Snippet } from 'svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { PickOptionType } from '@layerd/ui';
import Radio from './radio.svelte';

const LAYOUTS = [1, 2, 4, 6, 8];

// A generic component's props are read as unknown values here, so the snippet takes unknown values.
const option: Snippet<[PickOptionType<unknown>]> = createRawSnippet(
	(choice: () => PickOptionType<unknown>) => ({
		render: () => `<button type="button">${String(choice().value)}</button>`,
		setup(element: Element) {
			$effect(() => {
				const { props } = choice();
				const own = element as HTMLButtonElement;
				own.setAttribute('role', props.role);
				own.tabIndex = props.tabindex;
				own.setAttribute('aria-checked', String(props['aria-checked']));
				own.onclick = props.onclick;
				own.onkeydown = props.onkeydown;
			});
		}
	})
);

function show(props: Record<string, unknown> = {}, target?: HTMLElement) {
	const onpick = vi.fn();
	render(Radio, {
		target,
		props: { options: LAYOUTS, value: 4, label: 'Photos per Page', onpick, option, ...props }
	});
	return { onpick, choice: (name: string) => screen.getByRole('radio', { name }) };
}

function checked() {
	return screen
		.getAllByRole('radio')
		.map((choice) => choice.getAttribute('aria-checked') === 'true');
}

describe('Radio', () => {
	it('is a radio group named by its label, with the picked choice checked and the only one Tab reaches', () => {
		const { choice } = show();

		expect(screen.getByRole('radiogroup', { name: 'Photos per Page' })).toBeTruthy();
		expect(checked()).toEqual([false, false, true, false, false]);
		expect(choice('4').tabIndex).toBe(0);
		expect(choice('1').tabIndex).toBe(-1);
	});

	it('can be named by a label shown beside it', () => {
		document.body.insertAdjacentHTML('beforeend', '<span id="per-page">Pages per Page</span>');
		show({ label: undefined, 'aria-labelledby': 'per-page' });

		expect(screen.getByRole('radiogroup', { name: 'Pages per Page' })).toBeTruthy();
	});

	it('picks a choice with a tap or a click, telling its owner', async () => {
		const { choice, onpick } = show();

		await fireEvent.click(choice('8'));

		expect(onpick).toHaveBeenCalledWith(8);
		expect(checked()).toEqual([false, false, false, false, true]);
	});

	it('moves along with every arrow key, picking and focusing as it goes, round the ends', async () => {
		const { choice, onpick } = show();

		await fireEvent.keyDown(choice('4'), { key: 'ArrowDown' });
		expect(onpick).toHaveBeenLastCalledWith(6);
		expect(document.activeElement).toBe(choice('6'));

		await fireEvent.keyDown(choice('6'), { key: 'ArrowRight' });
		await fireEvent.keyDown(choice('8'), { key: 'ArrowRight' });
		expect(onpick).toHaveBeenLastCalledWith(1);
		expect(document.activeElement).toBe(choice('1'));

		await fireEvent.keyDown(choice('1'), { key: 'ArrowUp' });
		expect(onpick).toHaveBeenLastCalledWith(8);
		expect(checked()).toEqual([false, false, false, false, true]);
	});

	it('cannot be picked in a disabled fieldset, as a frozen project’s fields cannot', async () => {
		const fieldset = document.body.appendChild(document.createElement('fieldset'));
		fieldset.disabled = true;
		const { choice, onpick } = show({}, fieldset);

		expect(choice('8').matches(':disabled')).toBe(true);
		await fireEvent.click(choice('8'));
		expect(onpick).not.toHaveBeenCalled();
	});
});

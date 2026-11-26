// Tabs (#382): the app's rows of tabs made one, each tab drawn by its owner on an element wearing the props given.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet, type Snippet } from 'svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { PickOptionType } from '@layerd/ui';
import Tabs from './tabs.svelte';

const PHONES = ['iPhone', 'Android', 'Other'];

// Draws each tab as its owner would: on a button, or on a card (a div) that holds a button of its own.
// A generic component's props are read as unknown values here, so the snippet takes unknown values.
function optionOf(tag: 'button' | 'div' = 'button'): Snippet<[PickOptionType<unknown>]> {
	return createRawSnippet((option: () => PickOptionType<unknown>) => ({
		render: () =>
			tag === 'button'
				? `<button type="button">${String(option().value)}</button>`
				: `<div>${String(option().value)}<button type="button">?</button></div>`,
		setup(element: Element) {
			$effect(() => {
				const { props } = option();
				const own = element as HTMLElement;
				own.setAttribute('role', props.role);
				own.tabIndex = props.tabindex;
				own.setAttribute('aria-selected', String(props['aria-selected']));
				own.onclick = props.onclick;
				own.onkeydown = props.onkeydown;
			});
		}
	}));
}

function show(props: Record<string, unknown> = {}, tag: 'button' | 'div' = 'button') {
	const onpick = vi.fn();
	render(Tabs, {
		props: {
			options: PHONES,
			value: 'iPhone',
			label: 'Your phone',
			onpick,
			option: optionOf(tag),
			...props
		}
	});
	const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) });
	return { onpick, tab, list: screen.getByRole('tablist', { name: 'Your phone' }) };
}

function picked() {
	return screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-selected') === 'true');
}

describe('Tabs', () => {
	it('is a tablist named by its label, with the picked tab selected and the only one Tab reaches', () => {
		const { list, tab } = show();

		expect(list.children).toHaveLength(3);
		expect(picked()).toEqual([true, false, false]);
		expect(tab('iPhone').tabIndex).toBe(0);
		expect(tab('Android').tabIndex).toBe(-1);
		expect(tab('Other').tabIndex).toBe(-1);
	});

	it('lets Tab reach the first tab when none is picked', () => {
		const { tab } = show({ value: undefined });

		expect(picked()).toEqual([false, false, false]);
		expect(tab('iPhone').tabIndex).toBe(0);
	});

	it('picks a tab with a tap or a click, telling its owner', async () => {
		const { tab, onpick } = show();

		await fireEvent.click(tab('Android'));

		expect(onpick).toHaveBeenCalledWith('Android');
		expect(picked()).toEqual([false, true, false]);
		expect(tab('Android').tabIndex).toBe(0);
		expect(tab('iPhone').tabIndex).toBe(-1);
	});

	it('moves along with Right and Left, picking and focusing as it goes, round the ends', async () => {
		const { tab, onpick } = show();
		tab('iPhone').focus();

		await fireEvent.keyDown(tab('iPhone'), { key: 'ArrowRight' });
		expect(onpick).toHaveBeenLastCalledWith('Android');
		expect(document.activeElement).toBe(tab('Android'));

		await fireEvent.keyDown(tab('Android'), { key: 'ArrowLeft' });
		await fireEvent.keyDown(tab('iPhone'), { key: 'ArrowLeft' });
		expect(onpick).toHaveBeenLastCalledWith('Other');
		expect(document.activeElement).toBe(tab('Other'));
		expect(picked()).toEqual([false, false, true]);
	});

	it('goes to the first and the last with Home and End, and leaves Up and Down to the page', async () => {
		const { tab, onpick } = show();

		await fireEvent.keyDown(tab('iPhone'), { key: 'End' });
		expect(onpick).toHaveBeenLastCalledWith('Other');
		await fireEvent.keyDown(tab('Other'), { key: 'Home' });
		expect(onpick).toHaveBeenLastCalledWith('iPhone');

		onpick.mockClear();
		await fireEvent.keyDown(tab('iPhone'), { key: 'ArrowDown' });
		expect(onpick).not.toHaveBeenCalled();
	});

	it('picks a card that is not a button with Enter and Space', async () => {
		const { tab, onpick } = show({}, 'div');

		await fireEvent.keyDown(tab('Android'), { key: 'Enter' });
		expect(onpick).toHaveBeenLastCalledWith('Android');
		await fireEvent.keyDown(tab('Other'), { key: ' ' });
		expect(onpick).toHaveBeenLastCalledWith('Other');
	});

	it('leaves a button tab’s Enter to the button, whose own click picks it', async () => {
		const { tab, onpick } = show();

		await fireEvent.keyDown(tab('Android'), { key: 'Enter' });
		expect(onpick).not.toHaveBeenCalled();
	});

	it('leaves the taps and keys of a button inside a card to that button', async () => {
		const { tab, onpick } = show({}, 'div');
		const inner = tab('Android').querySelector('button')!;

		await fireEvent.click(inner);
		await fireEvent.keyDown(inner, { key: 'Enter' });
		await fireEvent.keyDown(inner, { key: 'ArrowRight' });
		expect(onpick).not.toHaveBeenCalled();
	});

	it('draws its children first in the row, behind the tabs', () => {
		const children = createRawSnippet(() => ({ render: () => '<span data-mark></span>' }));
		const { list } = show({ children });

		expect(list.firstElementChild?.hasAttribute('data-mark')).toBe(true);
		expect(screen.getAllByRole('tab')).toHaveLength(3);
	});

	it('moves past what else the row holds', async () => {
		const children = createRawSnippet(() => ({ render: () => '<span data-mark></span>' }));
		const { tab } = show({ children });

		await fireEvent.keyDown(tab('iPhone'), { key: 'ArrowRight' });
		expect(document.activeElement).toBe(tab('Android'));
	});
});

// The Tabs (#306, the first of #382): one row of tabs that picks which view a screen shows, first used by the
// Activity's Grouped and By Time views.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import Tabs from './tabs.svelte';

const TABS = [
	{ id: 'grouped', label: 'Grouped' },
	{ id: 'time', label: 'By Time' },
	{ id: 'people', label: 'By Person' }
];

function show(props: Record<string, unknown> = {}) {
	const onchange = vi.fn();
	render(Tabs, {
		props: { label: 'Activity view', tabs: TABS, value: 'grouped', onchange, ...props }
	});
	return {
		onchange,
		tabs: screen.getAllByRole('tab'),
		list: screen.getByRole('tablist', { name: 'Activity view' })
	};
}

function selectedOf(tabs: HTMLElement[]) {
	return tabs
		.filter((tab) => tab.getAttribute('aria-selected') === 'true')
		.map((tab) => tab.textContent?.trim());
}

describe('Tabs', () => {
	it('is a tab row named by its label, the picked tab selected and the only one Tab reaches', () => {
		const { tabs, list } = show();

		expect(list).toBeTruthy();
		expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Grouped', 'By Time', 'By Person']);
		expect(selectedOf(tabs)).toEqual(['Grouped']);
		expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
		// Native buttons: a tap, a click, Enter and Space all press them.
		expect(
			tabs.every((tab) => tab.tagName === 'BUTTON' && tab.getAttribute('type') === 'button')
		).toBe(true);
	});

	it('picks a tab with a press and tells its owner', async () => {
		const { tabs, onchange } = show();

		await fireEvent.click(tabs[1]);

		expect(selectedOf(tabs)).toEqual(['By Time']);
		expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
		expect(onchange).toHaveBeenCalledWith('time');
	});

	it('moves along the row with the arrow keys, Home and End, picking and focusing as it goes, round the ends', async () => {
		const { tabs, onchange } = show();

		await fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
		expect(selectedOf(tabs)).toEqual(['By Time']);
		expect(document.activeElement).toBe(tabs[1]);

		await fireEvent.keyDown(tabs[1], { key: 'End' });
		expect(selectedOf(tabs)).toEqual(['By Person']);

		await fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
		expect(selectedOf(tabs)).toEqual(['Grouped']);
		expect(document.activeElement).toBe(tabs[0]);

		await fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
		expect(selectedOf(tabs)).toEqual(['By Person']);

		await fireEvent.keyDown(tabs[2], { key: 'Home' });
		expect(selectedOf(tabs)).toEqual(['Grouped']);
		expect(onchange.mock.calls.map(([id]) => id)).toEqual([
			'time',
			'people',
			'grouped',
			'people',
			'grouped'
		]);
	});
});

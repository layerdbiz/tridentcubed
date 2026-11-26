// The dashboard's count cards (#376): each card's ? is the library's help ?, which on a phone opens its help in a
// sheet. The ? sits inside the card, which is itself a tab, so a tap on the ? opens the help and leaves the picked
// card as it was; a tap anywhere else on a card still picks it.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import type { DatasetType } from './look.data';
import type { LookState } from './look.state.svelte';
import StatCards from './stat-cards.svelte';

// jsdom scrolls nothing: the row's scroll to the picked card does nothing here.
beforeAll(() => {
	if (!('scrollTo' in Element.prototype))
		Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value: () => {} });
});

// The app's state as far as the cards read it: the picked card, and empty lists to count.
function show(dataset: DatasetType = 'projects') {
	const pick = vi.fn();
	const look = {
		dataset,
		pick,
		variant: () => 'A',
		projects: [],
		customers: [],
		members: [],
		transports: [],
		facilities: []
	} as unknown as LookState;
	render(StatCards, { props: { look } });
	return { pick };
}

function cardOf(name: string) {
	return screen.getAllByRole('tab').find((tab) => tab.textContent?.includes(name))!;
}

describe('the count cards', () => {
	it("opens a card's help from its ?, without picking that card", async () => {
		const { pick } = show('projects');
		const ask = within(cardOf('Customers')).getByRole('button');
		await fireEvent.click(ask);
		const sheet = screen.getByRole('dialog', { name: 'Customers' });
		expect(sheet.textContent).toContain('Companies Trident Cubed works for.');
		expect(pick).not.toHaveBeenCalled();
	});

	it('still picks a card tapped anywhere but its ?', async () => {
		const { pick } = show('projects');
		await fireEvent.click(cardOf('Customers'));
		expect(pick).toHaveBeenCalledWith('customers');
	});

	it('moves to the next card and picks it with the arrow keys (#382)', async () => {
		const { pick } = show('projects');
		await fireEvent.keyDown(cardOf('Projects'), { key: 'ArrowRight' });
		expect(pick).toHaveBeenCalledWith('customers');
		expect(document.activeElement).toBe(cardOf('Customers'));
	});

	it('picks a card with Enter or Space, but leaves the keys on its ? to the ?', async () => {
		const { pick } = show('projects');
		await fireEvent.keyDown(cardOf('Team'), { key: ' ' });
		expect(pick).toHaveBeenCalledWith('team');

		pick.mockClear();
		await fireEvent.keyDown(within(cardOf('Customers')).getByRole('button'), { key: 'Enter' });
		await fireEvent.keyDown(within(cardOf('Customers')).getByRole('button'), { key: 'ArrowRight' });
		expect(pick).not.toHaveBeenCalled();
	});
});

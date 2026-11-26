// The install how-to (#203): the User picks their phone on the library's Tabs (#382), iPhone first.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import HowTo from './how-to.svelte';

function tabOf(name: string) {
	return screen.getByRole('tab', { name });
}

describe('the install how-to', () => {
	it('opens on iPhone, picked, with its three steps', () => {
		render(HowTo, { props: { onclose: () => {} } });

		expect(tabOf('iPhone').getAttribute('aria-selected')).toBe('true');
		expect(tabOf('Android').getAttribute('aria-selected')).toBe('false');
		expect(screen.getByRole('tabpanel').textContent).toContain('Tap Share');
	});

	it('shows Android’s steps once Android is picked, by a tap or the arrow keys', async () => {
		render(HowTo, { props: { onclose: () => {} } });

		await fireEvent.click(tabOf('Android'));
		expect(tabOf('Android').getAttribute('aria-selected')).toBe('true');
		expect(screen.getByRole('tabpanel').textContent).toContain('Open the browser menu');

		await fireEvent.keyDown(tabOf('Android'), { key: 'ArrowRight' });
		expect(tabOf('iPhone').getAttribute('aria-selected')).toBe('true');
		expect(screen.getByRole('tabpanel').textContent).toContain('Tap Share');
	});
});

// A panel a tap on its header opens glides to the top of the list it scrolls in (#412), with the library's `glide`;
// a tap that shuts it leaves the list where it is. A project's panels and a Team member's are the same card.
import { createRawSnippet } from 'svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { glide } from '@layerd/ui';
import PanelCard from './panel-card.svelte';

vi.mock('@layerd/ui', async (original) => ({
	...(await original<typeof import('@layerd/ui')>()),
	glide: vi.fn()
}));

const BODY = createRawSnippet(() => ({ render: () => '<p>What it holds</p>' }));

function show(isOpen: boolean) {
	const ontoggle = vi.fn();
	render(PanelCard, {
		props: {
			name: 'Time Log',
			icon: 'icon-[mdi--clock-outline]',
			metrics: { done: 1, total: 4, percent: 25, status: 'In progress' },
			isOpen,
			ontoggle,
			onpercent: vi.fn(),
			children: BODY
		}
	});
	return {
		ontoggle,
		header: screen.getByRole('button', { expanded: isOpen }),
		card: screen.getByRole('group', { name: 'Time Log' })
	};
}

describe('a panel card', () => {
	beforeEach(() => vi.mocked(glide).mockClear());

	it('glides to the top of its list when a tap opens it', async () => {
		const { ontoggle, header, card } = show(false);
		await fireEvent.click(header);
		expect(ontoggle).toHaveBeenCalledOnce();
		expect(glide).toHaveBeenCalledExactlyOnceWith(card);
	});

	it('stays where it is when a tap shuts it', async () => {
		const { ontoggle, header } = show(true);
		await fireEvent.click(header);
		expect(ontoggle).toHaveBeenCalledOnce();
		expect(glide).not.toHaveBeenCalled();
	});
});

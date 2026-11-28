// A panel a tap opens glides to the top of the list it scrolls in (#412), with the library's `glide`; a tap that
// shuts it, or one that shuts a panel a dragged selection opened beside it (#402), leaves the list where it is.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { glide } from '@layerd/ui';
import { draftPanel } from './look.data';
import type { LookState } from './look.state.svelte';
import PanelItem from './panel-item.svelte';

vi.mock('@layerd/ui', async (original) => ({
	...(await original<typeof import('@layerd/ui')>()),
	glide: vi.fn()
}));

// The app's state as far as one panel card reads it: shut, open, or opened beside the open one.
function show(state: 'shut' | 'open' | 'beside' = 'shut') {
	const panel = draftPanel('Trident Cubed', 'Ana Ruiz');
	const look = {
		organization: { name: 'Trident Cubed', logo: '' },
		project: {
			id: 'p1',
			title: '',
			subtitle: '',
			type: '',
			client: '',
			stops: [],
			location: '',
			created: '2026-10-27T09:00',
			updated: '2026-10-27T09:00',
			status: 'Draft',
			team: [],
			progress: 0,
			day: '2026-10-27'
		},
		projectId: 'p1',
		panels: [panel],
		projects: [],
		members: [],
		customers: [],
		added: [],
		isFrozen: false,
		panelId: state === 'open' ? panel.id : 'other',
		selection: { alsoOpen: state === 'beside' ? panel.id : '' },
		variant: () => 'A',
		helpOf: () => '',
		saved: vi.fn(),
		say: vi.fn(),
		confirm: vi.fn(),
		showEmpty: vi.fn(),
		addFor: vi.fn(),
		editRecord: vi.fn()
	} as unknown as LookState;
	render(PanelItem, { props: { look, panel, index: 0 } });
	const header = screen.getAllByRole('button', { expanded: state !== 'shut' })[0]!;
	return { look, panel, header, card: screen.getByRole('group', { name: panel.name }) };
}

describe('a panel card', () => {
	beforeEach(() => vi.mocked(glide).mockClear());

	it('glides to the top of its list when a tap opens it', async () => {
		const { look, panel, header, card } = show();
		await fireEvent.click(header);
		expect(look.panelId).toBe(panel.id);
		expect(glide).toHaveBeenCalledExactlyOnceWith(card);
	});

	it('stays where it is when a tap shuts it', async () => {
		const { look, header } = show('open');
		await fireEvent.click(header);
		expect(look.panelId).toBe('');
		expect(glide).not.toHaveBeenCalled();
	});

	it('stays where it is when a tap shuts the one a dragged selection opened beside the open one', async () => {
		const { look, header } = show('beside');
		await fireEvent.click(header);
		expect(look.panelId).toBe('other');
		expect(glide).not.toHaveBeenCalled();
	});
});

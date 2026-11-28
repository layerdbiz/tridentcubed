// What's New in the open app the moment SvelteKit finds a new version (#401): it asks for the newest history and
// starts the new version's download once, not again each time an answer lands. It did, about 15 times a second, until
// the tab was closed. Opened, it names the version, titles each day by its date, and links each released day to its
// notes on GitHub (#400).
import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { HistoryType } from './history.utils';
import { HISTORY_PATH } from './releases.constants';
import { whatsNew } from './releases.state.svelte';
import { toReleaseUrl } from './releases.utils';
import WhatsNew from './whats-new.svelte';

const worker = vi.hoisted(() => ({ downloads: 0 }));

vi.mock('$app/state', () => ({ updated: { current: true, check: async () => true } }));
vi.mock('../update/update.utils', () => ({
	downloadWorker: async () => {
		worker.downloads += 1;
	},
	forgetWorker: async () => undefined,
	takeOver: async () => undefined
}));

const HISTORY: HistoryType = {
	head: 'b'.repeat(40),
	chain: ['a'.repeat(12), 'b'.repeat(12)],
	batches: []
};

const RELEASED: HistoryType = {
	head: 'c'.repeat(40),
	chain: ['a'.repeat(12), 'b'.repeat(12), 'c'.repeat(12)],
	version: 'v1.1.0',
	batches: [
		{
			day: '2026-11-26',
			from: '2026-11-26T15:00:00Z',
			to: '2026-11-26T16:00:00Z',
			release: { version: '1.1.0', url: toReleaseUrl('1.1.0') },
			changes: [
				{
					kind: 'feature',
					text: 'Pin anything',
					tickets: [346],
					at: '2026-11-26T15:00:00Z',
					landed: 2
				}
			]
		}
	]
};

async function settle() {
	for (let round = 0; round < 10; round += 1) await new Promise((done) => setTimeout(done));
}

afterEach(() => {
	vi.unstubAllGlobals();
	worker.downloads = 0;
});

describe("What's New when a new version is out", () => {
	it('asks for the newest history and the new version once, not again each time an answer lands', async () => {
		const asked = vi.fn(async (_path: string) => Response.json(HISTORY));
		vi.stubGlobal('fetch', asked);

		render(WhatsNew, { props: { save: { state: 'saved' } } });
		await settle();

		expect(asked.mock.calls.filter(([path]) => path === HISTORY_PATH)).toHaveLength(1);
		expect(worker.downloads).toBe(1);
	});
});

describe("What's New with releases", () => {
	it('opens a new release on its glow with the version, and links a released day to its notes', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(RELEASED))
		);

		// Last seen on the commit before the release's change.
		whatsNew.seen = 'b'.repeat(40);
		const { findByRole, findByText } = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();

		const link = await findByRole('link', { name: /v1\.1\.0 release notes/ });
		expect(link.getAttribute('href')).toBe(
			'https://github.com/layerdbiz/tridentcubed/releases/tag/v1.1.0'
		);
		// Something landed since the commit last seen: the head is the release's glow.
		const heading = await findByRole('heading', { name: 'v1.1.0' });
		expect(heading.closest('.glow')).not.toBeNull();
		expect(await findByText('New release')).toBeTruthy();
		// The glow ends on the library's wave.
		expect(heading.closest('.glow')?.querySelector('svg path')).not.toBeNull();
	});

	it('titles each day by its date in bold, with its version and what it holds beneath', async () => {
		whatsNew.close();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(RELEASED))
		);
		whatsNew.seen = 'c'.repeat(40);

		const { findByText } = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();

		const day = await findByText('2026-11-26');
		const beneath = day.nextElementSibling!;
		expect(day.className).toContain('font-bold');
		expect(beneath.textContent?.replace(/\s+/g, ' ').trim()).toBe('v1.1.0 1 feature');
		// Each count follows a dot of its kind's full colour: green for features.
		expect(beneath.querySelector('[aria-hidden="true"]')?.className).toContain('bg-success');
	});

	it('opens on the glow every time: once everything is seen it says Latest release, not New release', async () => {
		whatsNew.close();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(RELEASED))
		);
		whatsNew.seen = 'c'.repeat(40);

		const { findByRole, findByText, queryByText } = render(WhatsNew, {
			props: { save: { state: 'saved' } }
		});
		whatsNew.openAll();

		const heading = await findByRole('heading', { name: 'v1.1.0' });
		expect(heading.closest('.glow')).not.toBeNull();
		expect(await findByText('Latest release')).toBeTruthy();
		expect(await findByText('2026-11-26 · 1 feature')).toBeTruthy();
		expect(queryByText('New release')).toBeNull();
	});

	it('opens only the newest release, one at a time, its lines all alike, with nothing marked new line by line', async () => {
		whatsNew.close();
		const older = {
			day: '2026-11-25',
			from: '2026-11-25T15:00:00Z',
			to: '2026-11-25T15:00:00Z',
			release: { version: '1.0.0', url: toReleaseUrl('1.0.0') },
			changes: [
				{
					kind: 'fix',
					text: 'A pin shows once',
					tickets: [],
					at: '2026-11-25T15:00:00Z',
					landed: 1
				}
			]
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ ...RELEASED, batches: [...RELEASED.batches, older] }))
		);
		// Last seen before both: everything is new to this person.
		whatsNew.seen = 'a'.repeat(40);

		const { findByText, queryByText } = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();

		expect(await findByText('Pin anything')).toBeTruthy();
		expect(queryByText('A pin shows once')).toBeNull();
		expect(await findByText('New release')).toBeTruthy();
		expect(queryByText('New')).toBeNull();
		expect(queryByText(/^\d+ new$/)).toBeNull();

		await fireEvent.click((await findByText('2026-11-25')).closest('[aria-expanded]')!);
		expect(await findByText('A pin shows once')).toBeTruthy();
		await vi.waitFor(() => expect(queryByText('Pin anything')).toBeNull());
	});
});

describe("What's New telling a release in its highlights", () => {
	const TOLD: HistoryType = {
		...RELEASED,
		batches: [
			{
				...RELEASED.batches[0],
				changes: [
					{
						kind: 'feature',
						text: 'Pins',
						points: ['Pin anything to the menu.', 'Unpin it there too.'],
						tickets: [],
						at: '2026-11-26T15:00:00Z',
						landed: 2
					}
				]
			}
		]
	};

	it('shows each feature under a short bold title in the dark text, its highlights on light green bullets', async () => {
		whatsNew.close();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(TOLD))
		);
		whatsNew.seen = 'c'.repeat(40);

		const { findByText } = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();

		const title = await findByText('Pins');
		expect(title.className).toContain('font-bold');
		expect(title.className).toContain('text-slate-900');
		const point = await findByText('Pin anything to the menu.');
		expect(point.closest('li')?.querySelector('.bg-success-300')).not.toBeNull();
		expect(await findByText('Unpin it there too.')).toBeTruthy();
	});
});

describe("What's New on next.app, as release notes or every change", () => {
	const coming = {
		day: '2026-11-28',
		from: '2026-11-28T15:00:00Z',
		to: '2026-11-28T15:00:00Z',
		release: { version: '1.2.0', url: toReleaseUrl('1.2.0') },
		isUpcoming: true,
		changes: [
			{
				kind: 'feature' as const,
				text: 'Search',
				points: ['Search from the menu.'],
				tickets: [],
				at: '2026-11-28T15:00:00Z',
				landed: -1
			}
		]
	};
	const onDev = {
		day: '2026-11-26',
		from: '2026-11-26T20:00:00Z',
		to: '2026-11-26T20:00:00Z',
		release: { version: '1.1.0', url: toReleaseUrl('1.1.0'), date: '2026-11-26T20:00:00Z' },
		changes: [
			{
				kind: 'feature' as const,
				text: 'Pins',
				points: ['Pin anything to the menu.'],
				tickets: [],
				at: '2026-11-26T20:00:00Z',
				landed: -1
			}
		]
	};
	const NEXT: HistoryType = { ...RELEASED, version: 'v1.2.0-next.3', notes: [coming, onDev] };

	afterEach(() => localStorage.clear());

	it('opens on the release notes: Coming to dev, with no link to notes not yet made, then each release on dev', async () => {
		whatsNew.close();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(NEXT))
		);
		whatsNew.seen = 'c'.repeat(40);

		const { findByRole, findAllByText, findByText, queryByRole, queryByText } = render(WhatsNew, {
			props: { save: { state: 'saved' } }
		});
		whatsNew.openAll();

		expect((await findByRole('tab', { name: 'Release notes' })).getAttribute('aria-selected')).toBe(
			'true'
		);
		expect((await findAllByText('Coming to dev')).length).toBeGreaterThan(0);
		expect(await findByText('Search')).toBeTruthy();
		expect(queryByRole('link', { name: /v1\.2\.0 release notes/ })).toBeNull();
		expect(queryByText('Pin anything')).toBeNull();

		await fireEvent.click((await findByText('v1.1.0')).closest('[aria-expanded]')!);
		expect(await findByText('Pin anything to the menu.')).toBeTruthy();
		expect(await findByRole('link', { name: /v1\.1\.0 release notes/ })).toBeTruthy();
	});

	it('shows every change on a tap, and opens on it the next time', async () => {
		whatsNew.close();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(NEXT))
		);
		whatsNew.seen = 'c'.repeat(40);

		const first = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();
		await fireEvent.click(await first.findByRole('tab', { name: 'Every change' }));

		expect(await first.findByText('Pin anything')).toBeTruthy();
		expect(first.queryByText('Search')).toBeNull();
		first.unmount();

		whatsNew.close();
		const again = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();
		expect(
			(await again.findByRole('tab', { name: 'Every change' })).getAttribute('aria-selected')
		).toBe('true');
		expect(await again.findByText('Pin anything')).toBeTruthy();
	});

	it('opens on every change when a version is tapped in the bell', async () => {
		whatsNew.close();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(NEXT))
		);
		whatsNew.seen = 'c'.repeat(40);

		const { findByRole, findByText } = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAt(RELEASED.batches[0].from);

		expect((await findByRole('tab', { name: 'Every change' })).getAttribute('aria-selected')).toBe(
			'true'
		);
		expect(await findByText('Pin anything')).toBeTruthy();
	});

	it('shows no tabs on dev.app, whose list is its release notes', async () => {
		whatsNew.close();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(RELEASED))
		);
		whatsNew.seen = 'c'.repeat(40);

		const { findByText, queryByRole } = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();

		expect(await findByText('Pin anything')).toBeTruthy();
		expect(queryByRole('tablist')).toBeNull();
	});
});

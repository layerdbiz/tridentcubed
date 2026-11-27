// What's New in the open app the moment SvelteKit finds a new version (#401): it asks for the newest history and
// starts the new version's download once, not again each time an answer lands. It did, about 15 times a second, until
// the tab was closed. Opened, it names the version, titles each day by its date, and links each released day to its
// notes on GitHub (#400).
import { render } from '@testing-library/svelte';
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
		expect(day.className).toContain('font-bold');
		expect(day.nextElementSibling?.textContent?.trim()).toBe('v1.1.0 · 1 feature');
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

	it('opens every release, its lines all alike, with nothing marked new line by line', async () => {
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
		expect(await findByText('A pin shows once')).toBeTruthy();
		expect(await findByText('New release')).toBeTruthy();
		expect(queryByText('New')).toBeNull();
		expect(queryByText(/^\d+ new$/)).toBeNull();
	});
});

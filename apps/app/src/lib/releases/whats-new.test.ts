// What's New in the open app the moment SvelteKit finds a new version (#401): it asks for the newest history and
// starts the new version's download once, not again each time an answer lands. It did, about 15 times a second, until
// the tab was closed. Opened, it names the version and links each released batch to its notes on GitHub (#400).
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
	it('names the version above the list, and links a released batch to its notes on GitHub', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json(RELEASED))
		);

		const { findByRole, findByText } = render(WhatsNew, { props: { save: { state: 'saved' } } });
		whatsNew.openAll();

		const link = await findByRole('link', { name: /v1\.1\.0 release notes/ });
		expect(link.getAttribute('href')).toBe(
			'https://github.com/layerdbiz/tridentcubed/releases/tag/v1.1.0'
		);
		expect(await findByText(/^v1\.1\.0 · \S/)).toBeTruthy();
	});
});

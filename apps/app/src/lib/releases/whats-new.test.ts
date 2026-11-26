// What's New in the open app the moment SvelteKit finds a new version (#401): it asks for the newest history and
// starts the new version's download once, not again each time an answer lands. It did, about 15 times a second, until
// the tab was closed.
import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { HistoryType } from './history.utils';
import { HISTORY_PATH } from './releases.constants';
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

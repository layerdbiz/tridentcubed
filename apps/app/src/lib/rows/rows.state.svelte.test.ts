// The sync loop with plain data (#183): screens that are one list of rows, a save command and a lists query that are
// functions, and fake timers. What is checked is what goes to the server, when, and what the cloud says.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { BatchType, RowType, SavedRowType, SaveResultType } from './rows.schema';
import { SyncLoop } from './rows.state.svelte';

const KOGA = '00000000-0000-4000-8000-000000000001';
const PROJECT = '00000000-0000-4000-8000-000000000002';

function koga(city: string): RowType {
	return { table: 'customer', id: KOGA, values: { name: 'KOGA', city } };
}

function saved(row: RowType): SavedRowType {
	return {
		...row,
		createdAt: '2026-11-12T00:00:00Z',
		updatedAt: '2026-11-12T00:00:00Z',
		deletedAt: null
	};
}

function createLoop(answers: (() => Promise<SaveResultType>)[]) {
	let screen: RowType[] = [];
	let server: SavedRowType[] = [saved(koga('Houston'))];
	const sent: BatchType[] = [];
	const reads: RowType[] = [];
	const loop = new SyncLoop({
		read: () => structuredClone(screen),
		take: (rows) => (screen = rows.map(({ table, id, values }) => ({ table, id, values }))),
		takeReads: (rows) => reads.push(...rows),
		fetch: async () => server,
		send: async (batch) => {
			sent.push(structuredClone(batch));
			return (answers.shift() ?? (async () => ({ isSaved: true as const })))();
		}
	});
	loop.load(server);
	return {
		loop,
		sent,
		reads,
		type(city: string) {
			screen = [koga(city)];
			loop.notice();
		},
		setServer(city: string) {
			server = [saved(koga(city))];
		},
		get screen() {
			return screen;
		},
		// Part of the server's rows written into the screens, in place of what they held of it.
		takePart: (rows: SavedRowType[]) => {
			const ids = new Set(rows.map((row) => row.id));
			screen = [
				...screen.filter((row) => !ids.has(row.id)),
				...rows.map(({ table, id, values }) => ({ table, id, values }))
			];
		}
	};
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the sync loop', () => {
	it('sends one batch about a second after the last change, with only what changed', async () => {
		const app = createLoop([]);

		app.type('Hou');
		await vi.advanceTimersByTimeAsync(500);
		app.type('Miami');
		expect(app.loop.state).toBe('saving');
		await vi.advanceTimersByTimeAsync(999);
		expect(app.sent).toEqual([]);
		await vi.advanceTimersByTimeAsync(1);

		expect(app.sent).toEqual([
			{
				changes: [
					{
						changeId: expect.any(String),
						table: 'customer',
						id: KOGA,
						operation: 'put',
						values: { city: 'Miami' }
					}
				]
			}
		]);
		expect(app.loop.state).toBe('saved');
		expect(app.loop.isPending).toBe(false);
	});

	it('sends nothing and stays Saved when nothing changed', async () => {
		const app = createLoop([]);

		app.type('Houston');
		await vi.advanceTimersByTimeAsync(5000);

		expect(app.sent).toEqual([]);
		expect(app.loop.state).toBe('saved');
	});

	it('keeps a batch that could not reach the server and sends the same one again, with growing waits', async () => {
		const offline = async () => {
			throw new TypeError('Failed to fetch');
		};
		const app = createLoop([offline, offline]);

		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);
		expect(app.loop.state).toBe('failed');
		expect(app.loop.reason).toContain('cannot be reached');
		app.type('Miami Beach');
		await vi.advanceTimersByTimeAsync(1000);
		expect(app.sent).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(1999);
		expect(app.sent).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(10);

		expect(app.sent).toHaveLength(4);
		expect(new Set(app.sent.slice(0, 3).map((batch) => batch.changes[0].changeId)).size).toBe(1);
		expect(app.sent[3].changes[0].values).toEqual({ city: 'Miami Beach' });
		expect(app.loop.state).toBe('saved');
	});

	it('sends the waiting batch at once on Retry', async () => {
		const app = createLoop([
			async () => {
				throw new TypeError('Failed to fetch');
			}
		]);

		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);
		app.loop.retry();
		await vi.advanceTimersByTimeAsync(0);

		expect(app.sent).toHaveLength(2);
		expect(app.sent[1].changes[0].changeId).toBe(app.sent[0].changes[0].changeId);
		expect(app.loop.state).toBe('saved');
	});

	it('shows a refusal’s reason, and on Retry takes the server’s rows back', async () => {
		const app = createLoop([async () => ({ isSaved: false, reason: 'KOGA is already there.' })]);

		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);
		expect(app.loop.state).toBe('failed');
		expect(app.loop.reason).toBe('KOGA is already there.');
		expect(app.loop.isPending).toBe(true);
		app.loop.retry();
		await vi.advanceTimersByTimeAsync(0);

		expect(app.screen).toEqual([koga('Houston')]);
		expect(app.loop.state).toBe('saved');
	});

	it('takes in what others saved only while nothing waits to be sent', async () => {
		const app = createLoop([]);
		app.setServer('Rotterdam');

		app.type('Miami');
		await app.loop.refresh();
		expect(app.screen).toEqual([koga('Miami')]);
		await vi.advanceTimersByTimeAsync(1000);
		await app.loop.refresh();

		expect(app.screen).toEqual([koga('Rotterdam')]);
		expect(app.sent).toHaveLength(1);
	});

	it('takes in a project’s rows as it opens without sending them back, and still sends what waits', async () => {
		const app = createLoop([]);
		const project: RowType = { table: 'project', id: PROJECT, values: { title: 'Kimberly' } };

		app.type('Miami');
		app.loop.merge([saved(project)], (row) => row.id === PROJECT, app.takePart);
		await vi.advanceTimersByTimeAsync(1000);

		expect(app.screen).toEqual([koga('Miami'), project]);
		expect(app.sent).toHaveLength(1);
		expect(app.sent[0].changes.map(({ id, values }) => ({ id, values }))).toEqual([
			{ id: KOGA, values: { city: 'Miami' } }
		]);
		expect(app.loop.state).toBe('saved');
	});

	it('hands what only the server sets, from an applied batch, to the screens', async () => {
		const job: RowType = { table: 'project', id: PROJECT, values: { job: 2 } };
		const app = createLoop([async () => ({ isSaved: true, reads: [job] })]);

		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);

		expect(app.reads).toEqual([job]);
	});
});

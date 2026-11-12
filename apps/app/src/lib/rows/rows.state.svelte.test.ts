// The sync loop with plain data (#183): screens that are one list of rows, a save command and a lists query that are
// functions, and fake timers. What is checked is what goes to the server, when, and what the cloud says.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { BatchType, RowType, SavedRowType, SaveResultType } from './rows.schema';
import { SyncLoop } from './rows.state.svelte';

const KOGA = '00000000-0000-4000-8000-000000000001';
const PROJECT = '00000000-0000-4000-8000-000000000002';
const CONTACT = '00000000-0000-4000-8000-000000000003';

function contact(name: string): RowType {
	return { table: 'contact', id: CONTACT, values: { customerId: KOGA, name } };
}

const REFUSED = 'KOGA is already there.';

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
		edit(rows: RowType[]) {
			screen = structuredClone(rows);
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

	it('shows a refusal’s reason, and when Retry is refused too takes the server’s rows back', async () => {
		const refuse = async () => ({ isSaved: false as const, reason: REFUSED });
		const app = createLoop([refuse, refuse]);

		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);
		expect(app.loop.state).toBe('failed');
		expect(app.loop.reason).toBe(REFUSED);
		expect(app.loop.isPending).toBe(true);
		app.loop.retry();
		await vi.advanceTimersByTimeAsync(0);

		expect(app.sent).toHaveLength(2);
		expect(app.screen).toEqual([koga('Houston')]);
		expect(app.loop.state).toBe('saved');
	});

	it('holds back only the refused change: the rest of the batch and later edits still save', async () => {
		const app = createLoop([
			async () => ({
				isSaved: false,
				reason: REFUSED,
				refused: [app.sent[0].changes.find((each) => each.id === KOGA)?.changeId ?? '']
			})
		]);

		app.edit([koga('Miami'), contact('Ana')]);
		await vi.advanceTimersByTimeAsync(1000);
		await vi.advanceTimersByTimeAsync(1);

		expect(app.sent).toHaveLength(2);
		expect(app.sent[1].changes.map(({ id, values }) => ({ id, values }))).toEqual([
			{ id: CONTACT, values: { customerId: KOGA, name: 'Ana' } }
		]);
		expect(app.loop.state).toBe('failed');
		expect(app.loop.reason).toBe(REFUSED);

		app.edit([koga('Miami'), contact('Ana Ruiz')]);
		await vi.advanceTimersByTimeAsync(1000);

		expect(app.sent).toHaveLength(3);
		expect(app.sent[2].changes.map(({ id, values }) => ({ id, values }))).toEqual([
			{ id: CONTACT, values: { name: 'Ana Ruiz' } }
		]);
		expect(app.loop.state).toBe('failed');
		expect(app.screen).toEqual([koga('Miami'), contact('Ana Ruiz')]);
	});

	it('on Retry sends the held change again with what is still unsaved, and keeps it when it saves', async () => {
		const app = createLoop([
			async () => ({ isSaved: false, reason: REFUSED, refused: [app.sent[0].changes[0].changeId] })
		]);
		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);
		expect(app.loop.state).toBe('failed');

		app.edit([koga('Miami'), contact('Ana')]);
		app.loop.retry();
		await vi.advanceTimersByTimeAsync(0);

		expect(app.sent).toHaveLength(2);
		expect(app.sent[1].changes.map(({ id }) => id)).toEqual([KOGA, CONTACT]);
		expect(app.screen).toEqual([koga('Miami'), contact('Ana')]);
		expect(app.loop.state).toBe('saved');
	});

	it('sends a held change once the User changes it again, and is Saved when it saves', async () => {
		const app = createLoop([
			async () => ({ isSaved: false, reason: REFUSED, refused: [app.sent[0].changes[0].changeId] })
		]);
		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);

		app.type('Tampa');
		await vi.advanceTimersByTimeAsync(1000);

		expect(app.sent.map((batch) => batch.changes[0].values)).toEqual([
			{ city: 'Miami' },
			{ city: 'Tampa' }
		]);
		expect(app.loop.state).toBe('saved');
		expect(app.loop.isPending).toBe(false);
	});

	it('is Saved again when the User undoes the held change', async () => {
		const app = createLoop([
			async () => ({ isSaved: false, reason: REFUSED, refused: [app.sent[0].changes[0].changeId] })
		]);
		app.type('Miami');
		await vi.advanceTimersByTimeAsync(1000);

		app.type('Houston');
		await vi.advanceTimersByTimeAsync(1000);

		expect(app.sent).toHaveLength(1);
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

	it('takes in what others saved every minute while the tab is shown (the online dots), and stops', async () => {
		const app = createLoop([]);
		let isVisible = true;
		const stop = app.loop.keepFresh({ every: 60_000, isVisible: () => isVisible });

		app.setServer('Rotterdam');
		await vi.advanceTimersByTimeAsync(59_000);
		expect(app.screen).toEqual([koga('Houston')]);
		await vi.advanceTimersByTimeAsync(1000);
		expect(app.screen).toEqual([koga('Rotterdam')]);

		isVisible = false;
		app.setServer('Tampa');
		await vi.advanceTimersByTimeAsync(60_000);
		expect(app.screen).toEqual([koga('Rotterdam')]);

		isVisible = true;
		stop();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(app.screen).toEqual([koga('Rotterdam')]);
	});
});

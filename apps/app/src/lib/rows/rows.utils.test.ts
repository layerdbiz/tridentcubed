// The sync loop's difference (spec #179 Testing Decisions, #183): the rows the server last confirmed, the rows the
// screens hold now, and the row changes that carry one to the other. Plain data: no database, no screens.
import { describe, expect, it } from 'vite-plus/test';
import type { RowType } from './rows.schema';
import { toApplied, toChanges, toMerged, toStableId } from './rows.utils';

const KOGA = '00000000-0000-4000-8000-000000000001';
const AXA = '00000000-0000-4000-8000-000000000002';
const ANA = '00000000-0000-4000-8000-000000000003';

function customer(id: string, name: string, city = ''): RowType {
	return { table: 'customer', id, values: { name, city } };
}

function contact(id: string, customerId: string, position: number, name: string): RowType {
	return { table: 'contact', id, values: { customerId, position, name } };
}

let count = 0;
function nextId() {
	count += 1;
	return `change-${count}`;
}

describe('toChanges', () => {
	it('sends nothing when nothing changed', () => {
		const rows = [customer(KOGA, 'KOGA'), contact(ANA, KOGA, 0, 'Ana')];

		expect(toChanges(rows, structuredClone(rows), nextId)).toEqual([]);
	});

	it('sends a new row whole, and a changed row with only its changed columns', () => {
		const before = [customer(KOGA, 'KOGA', 'Houston, TX')];
		const after = [customer(KOGA, 'KOGA', 'Miami, FL'), customer(AXA, 'AXA XL')];

		const changes = toChanges(before, after, nextId);

		expect(changes).toEqual([
			{
				changeId: expect.any(String),
				table: 'customer',
				id: KOGA,
				operation: 'put',
				values: { city: 'Miami, FL' }
			},
			{
				changeId: expect.any(String),
				table: 'customer',
				id: AXA,
				operation: 'put',
				values: { name: 'AXA XL', city: '' }
			}
		]);
		expect(new Set(changes.map((change) => change.changeId)).size).toBe(2);
	});

	it('deletes a row that is gone, and saves parents before their children', () => {
		const before = [customer(KOGA, 'KOGA'), contact(ANA, KOGA, 0, 'Ana')];
		const after = [contact(ANA, AXA, 0, 'Ana'), customer(AXA, 'AXA XL')];

		const changes = toChanges(before, after, nextId).map(({ table, id, operation }) => ({
			table,
			id,
			operation
		}));

		expect(changes).toEqual([
			{ table: 'customer', id: AXA, operation: 'put' },
			{ table: 'contact', id: ANA, operation: 'put' },
			{ table: 'customer', id: KOGA, operation: 'delete' }
		]);
	});

	it('notices a reorder by the positions that moved', () => {
		const before = [contact(ANA, KOGA, 0, 'Ana'), contact(AXA, KOGA, 1, 'Bo')];
		const after = [contact(AXA, KOGA, 0, 'Bo'), contact(ANA, KOGA, 1, 'Ana')];

		expect(toChanges(before, after, nextId).map(({ id, values }) => ({ id, values }))).toEqual([
			{ id: AXA, values: { position: 0 } },
			{ id: ANA, values: { position: 1 } }
		]);
	});
});

describe('toMerged', () => {
	const isKoga = (row: RowType) => row.id === ANA || row.id === KOGA;

	it('confirms a part taken in later as the screens now hold it, and keeps every other row as confirmed', () => {
		const confirmed = [customer(AXA, 'AXA XL', 'Houston, TX')];
		// The screens: AXA XL's city typed but not sent, and KOGA with its contact just taken in.
		const next = [
			customer(AXA, 'AXA XL', 'Miami, FL'),
			customer(KOGA, 'KOGA'),
			contact(ANA, KOGA, 0, 'Ana')
		];

		const merged = toMerged(confirmed, next, isKoga);

		expect(toChanges(merged, next, nextId).map(({ id, values }) => ({ id, values }))).toEqual([
			{ id: AXA, values: { city: 'Miami, FL' } }
		]);
	});

	it('forgets a confirmed row of the part that the server no longer has', () => {
		const confirmed = [customer(KOGA, 'KOGA'), contact(ANA, KOGA, 0, 'Ana')];

		expect(toMerged(confirmed, [customer(KOGA, 'KOGA')], isKoga)).toEqual([customer(KOGA, 'KOGA')]);
	});
});

describe('toApplied', () => {
	it('moves the confirmed rows forward by a batch, so the next difference is empty', () => {
		const before = [customer(KOGA, 'KOGA', 'Houston, TX'), contact(ANA, KOGA, 0, 'Ana')];
		const after = [customer(KOGA, 'KOGA', 'Miami, FL'), customer(AXA, 'AXA XL')];

		const confirmed = toApplied(before, toChanges(before, after, nextId));

		expect(toChanges(confirmed, after, nextId)).toEqual([]);
	});
});

describe('toStableId', () => {
	it('gives the same words the same UUID on every device, and other words or organizations another', () => {
		const paris = toStableId(KOGA, 'place', 'paris, france');

		expect(paris).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(toStableId(KOGA, 'place', 'paris, france')).toBe(paris);
		expect(toStableId(AXA, 'place', 'paris, france')).not.toBe(paris);
		expect(toStableId(KOGA, 'place', 'paris, texas')).not.toBe(paris);
	});
});

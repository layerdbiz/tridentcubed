// The sync loop's difference (spec #179 Testing Decisions, #183): the rows the server last confirmed, the rows the
// screens hold now, and the row changes that carry one to the other. Plain data: no database, no screens.
import { describe, expect, it } from 'vite-plus/test';
import type { RowType } from './rows.schema';
import { toApplied, toChanges } from './rows.utils';

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

describe('toApplied', () => {
	it('moves the confirmed rows forward by a batch, so the next difference is empty', () => {
		const before = [customer(KOGA, 'KOGA', 'Houston, TX'), contact(ANA, KOGA, 0, 'Ana')];
		const after = [customer(KOGA, 'KOGA', 'Miami, FL'), customer(AXA, 'AXA XL')];

		const confirmed = toApplied(before, toChanges(before, after, nextId));

		expect(toChanges(confirmed, after, nextId)).toEqual([]);
	});
});

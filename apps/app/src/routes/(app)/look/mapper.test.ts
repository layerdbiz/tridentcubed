// The save round trip (spec #179 Testing Decisions; #183): the screens' state through the mapper, the save command's
// work as an acting User, the in-process Postgres with the real schema and policies, the lists query and the mapper
// again, back to state. What is checked is what another device or another member would see.
import { eq, sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import * as schema from '#lib/server/db/schema.js';
import { readRows, saveBatch } from '#lib/server/rows.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { draftOf, newContact, type ClientType } from './look.data';
import { LookState } from './look.state.svelte';
import { takeRows, toRows } from './mapper';
import { customerOf } from './records.data';

type TestType = Awaited<ReturnType<typeof createTestSignIn>>;

let test: TestType;
let team: ActorType;

beforeEach(async () => {
	test = await createTestSignIn();
	team = (await test.signIn('tom@tridentcubed.com')).actor;
});

// A device: its state as the server's lists left it, and the rows it last had confirmed.
async function open(actor: ActorType) {
	const look = new LookState();
	takeRows(look, await readRows(test.claims, actor));
	return { look, confirmed: toRows(look) };
}

// The sync loop's one step: send the difference since the last confirmed rows.
async function save(device: { look: LookState; confirmed: RowType[] }, actor: ActorType) {
	const changes = toChanges(device.confirmed, toRows(device.look));
	const result = await saveBatch(test.claims, actor, { changes });
	if (result.isSaved) device.confirmed = toRows(device.look);
	return { result, changes };
}

function addCustomer(look: LookState, name: string, contacts: string[] = []) {
	const draft = draftOf('customers') as ClientType;
	draft.name = name;
	draft.city = 'Rotterdam';
	draft.contacts = contacts.map((contact) => ({ ...newContact(), name: contact, title: 'Agent' }));
	expect(look.add('customers', draft)).toBe(true);
}

// What a screen shows of a customer, without the times only the server knows.
function shown(look: LookState, name: string) {
	const { created: _created, updated: _updated, ...rest } = customerOf(look, name);
	return rest;
}

describe('customers and contacts', () => {
	it('loads the real starting customers from the seed', async () => {
		const { look } = await open(team);

		expect(look.customers).toEqual([
			'US Ocean',
			'KOGA',
			'dship Carriers',
			'Oslo Caribbean Carrier',
			'UTC Overseas',
			'CEVA Logistics',
			'DIX Shipping',
			'Zurich North America',
			'AXA XL',
			'Liberty Specialty Markets'
		]);
		expect(shown(look, 'DIX Shipping')).toMatchObject({
			kind: 'Stevedore, Terminal',
			city: 'Brownsville, TX',
			icon: '/start/clients/dix-industries.ico',
			logo: '/start/clients/trimmed/dix-industries.png'
		});
	});

	it('saves a new customer with its contacts, and another member sees the same, contacts in order', async () => {
		const mine = await open(team);
		addCustomer(mine.look, 'Maersk', ['Ana', 'Bo', 'Cy']);

		const { result } = await save(mine, team);
		const other = (await test.signIn('mia@tridentcubed.com')).actor;
		const theirs = await open(other);

		expect(result).toEqual({ isSaved: true });
		expect(theirs.look.customers.at(-1)).toBe('Maersk');
		expect(shown(theirs.look, 'Maersk')).toMatchObject({ name: 'Maersk', city: 'Rotterdam' });
		expect(shown(theirs.look, 'Maersk').contacts?.map((contact) => contact.name)).toEqual([
			'Ana',
			'Bo',
			'Cy'
		]);
		// The second member signed in after the first device opened, so only the team differs (their own Team record).
		const customers = (rows: RowType[]) => rows.filter((row) => row.table !== 'team');
		expect(customers(toRows(theirs.look))).toEqual(customers(toRows(mine.look)));
	});

	it('saves an edit, a reorder and a removed contact, sending only what changed', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk', ['Ana', 'Bo', 'Cy']);
		await save(device, team);

		const contacts = customerOf(device.look, 'Maersk').contacts ?? [];
		device.look.patch('customers', 'Maersk', {
			phone: '+1 555 0100',
			contacts: [contacts[2], contacts[0]]
		});
		const { changes } = await save(device, team);
		const again = await open(team);

		expect(changes.map(({ table, operation, values }) => ({ table, operation, values }))).toEqual([
			{ table: 'customer', operation: 'put', values: { phone: '+1 555 0100' } },
			{ table: 'contact', operation: 'put', values: { position: 0 } },
			{ table: 'contact', operation: 'put', values: { position: 1 } },
			{ table: 'contact', operation: 'delete', values: undefined }
		]);
		expect(shown(again.look, 'Maersk').phone).toBe('+1 555 0100');
		expect(shown(again.look, 'Maersk').contacts?.map((contact) => contact.name)).toEqual([
			'Cy',
			'Ana'
		]);
	});

	it('keeps a renamed customer as the same row, with its contacts', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk', ['Ana']);
		await save(device, team);
		const id = customerOf(device.look, 'Maersk').id;

		device.look.rename('customers', 'Maersk', 'Maersk Line');
		await save(device, team);
		const again = await open(team);

		expect(again.look.customers).toContain('Maersk Line');
		expect(again.look.customers).not.toContain('Maersk');
		expect(shown(again.look, 'Maersk Line')).toMatchObject({ id, contacts: [{ name: 'Ana' }] });
	});

	it('moves a deleted customer to the Trash: gone from the lists, still a row, its name free again', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk');
		await save(device, team);
		const id = customerOf(device.look, 'Maersk').id!;

		device.look.removeRecord('customers', 'Maersk');
		await save(device, team);
		const again = await open(team);
		const [row] = await test.db.select().from(schema.customer).where(eq(schema.customer.id, id));
		addCustomer(again.look, 'Maersk');
		const { result } = await save(again, team);

		expect(again.look.trashed.customers.map((customer) => customer.id)).toEqual([id]);
		expect(row.deletedAt).toBeInstanceOf(Date);
		expect(result).toEqual({ isSaved: true });
	});

	it('sets created and updated times on the server, and takes none from the device', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk');
		await save(device, team);
		const id = customerOf(device.look, 'Maersk').id!;
		const [made] = await test.db.select().from(schema.customer).where(eq(schema.customer.id, id));

		device.look.patch('customers', 'Maersk', { city: 'Copenhagen' });
		await save(device, team);
		const [changed] = await test.db
			.select()
			.from(schema.customer)
			.where(eq(schema.customer.id, id));
		const stamped = await saveBatch(test.claims, team, {
			changes: [
				{
					changeId: crypto.randomUUID(),
					table: 'customer',
					id,
					operation: 'put',
					values: { createdAt: '2000-01-01T00:00:00Z' }
				}
			]
		});

		expect(changed.createdAt).toEqual(made.createdAt);
		expect(changed.updatedAt.getTime()).toBeGreaterThan(made.updatedAt.getTime());
		expect(stamped).toMatchObject({ isSaved: false, reason: expect.stringContaining('createdAt') });
	});
});

describe('names', () => {
	it('refuses a second customer with the same name whatever its capitals, names that change, and saves nothing of that batch', async () => {
		const device = await open(team);
		const other = await open(team);
		addCustomer(device.look, 'Maersk');
		await save(device, team);
		addCustomer(other.look, 'Acme');
		addCustomer(other.look, 'MAERSK');

		const { result, changes } = await save(other, team);
		const again = await open(team);

		const maersk = changes.find((change) => change.values?.name === 'MAERSK');
		expect(result).toEqual({
			isSaved: false,
			reason: 'MAERSK is already there.',
			refused: [maersk?.changeId]
		});
		expect(again.look.customers).not.toContain('Acme');
		expect(again.look.customers.filter((name) => name.toLowerCase() === 'maersk')).toEqual([
			'Maersk'
		]);
	});

	it('says it is already there on screen, before anything is sent', async () => {
		const { look } = await open(team);
		const draft = draftOf('customers') as ClientType;
		draft.name = 'koga';

		expect(look.add('customers', draft)).toBe(false);
		expect(look.toast).toBe('koga is already there');
	});

	it('is refused by the database too, without the app’s own check', async () => {
		const refusal = await test.claims
			.run(team, (tx) =>
				tx.insert(schema.customer).values({
					id: crypto.randomUUID(),
					organizationId: team.organizationId!,
					name: 'Koga'
				})
			)
			.then(
				() => 'nothing was refused',
				(error: Error) => String(error.cause ?? error)
			);

		expect(refusal).toContain('customer_name_idx');
	});
});

describe('the change record and repeated changes', () => {
	it('records who, when, which row, what was done, before and after', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk');
		await save(device, team);
		const id = customerOf(device.look, 'Maersk').id!;
		device.look.patch('customers', 'Maersk', { city: 'Copenhagen' });
		await save(device, team);
		device.look.removeRecord('customers', 'Maersk');
		await save(device, team);

		const records = await test.claims.run(team, (tx) =>
			tx
				.select()
				.from(schema.change)
				.where(eq(schema.change.rowId, id))
				.orderBy(sql`${schema.change.at}, ${schema.change.operation} desc`)
		);

		expect(
			records.map((record) => ({
				userId: record.userId,
				tableName: record.tableName,
				operation: record.operation,
				before: (record.before as { city?: string } | null)?.city ?? null,
				after: (record.after as { city?: string; deletedAt?: string | null }).city,
				isTrashed: Boolean((record.after as { deletedAt?: string | null }).deletedAt)
			}))
		).toEqual([
			{
				userId: team.userId,
				tableName: 'customer',
				operation: 'put',
				before: null,
				after: 'Rotterdam',
				isTrashed: false
			},
			{
				userId: team.userId,
				tableName: 'customer',
				operation: 'put',
				before: 'Rotterdam',
				after: 'Copenhagen',
				isTrashed: false
			},
			{
				userId: team.userId,
				tableName: 'customer',
				operation: 'delete',
				before: 'Copenhagen',
				after: 'Copenhagen',
				isTrashed: true
			}
		]);
		expect(records.every((record) => record.at instanceof Date)).toBe(true);
	});

	it('counts a batch sent twice once, even after a later change', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk');
		const first = await save(device, team);
		device.look.patch('customers', 'Maersk', { city: 'Copenhagen' });
		const second = await save(device, team);

		const repeated = await saveBatch(test.claims, team, { changes: first.changes });
		const again = await open(team);
		const records = await test.claims.run(team, (tx) => tx.select().from(schema.change));

		expect(repeated).toEqual({ isSaved: true });
		expect(again.look.customers.filter((name) => name === 'Maersk')).toHaveLength(1);
		expect(shown(again.look, 'Maersk').city).toBe('Copenhagen');
		expect(records).toHaveLength(first.changes.length + second.changes.length);
	});

	it('changes nothing for a batch with one invalid change, and says why', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk');
		const changes = toChanges(device.confirmed, toRows(device.look));
		changes.push({
			changeId: crypto.randomUUID(),
			table: 'customer',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { name: '   ' }
		});

		const result = await saveBatch(test.claims, team, { changes });
		const again = await open(team);

		expect(result).toMatchObject({
			isSaved: false,
			reason: expect.stringContaining('A name is needed.')
		});
		expect(again.look.customers).not.toContain('Maersk');
	});
});

describe('who may', () => {
	it('lets Team, Manager and Admin save customers', async () => {
		await test.db.insert(schema.accessGrant).values([
			{ email: 'mia@tridentcubed.com', organizationId: team.organizationId!, role: 'manager' },
			{ email: 'ada@tridentcubed.com', organizationId: team.organizationId!, role: 'admin' }
		]);
		const manager = (await test.signIn('mia@tridentcubed.com')).actor;
		const admin = (await test.signIn('ada@tridentcubed.com')).actor;

		for (const [actor, name] of [
			[team, 'By Team'],
			[manager, 'By Manager'],
			[admin, 'By Admin']
		] as const) {
			const device = await open(actor);
			addCustomer(device.look, name);
			expect((await save(device, actor)).result).toEqual({ isSaved: true });
		}
		expect((await open(team)).look.customers.slice(-3)).toEqual([
			'By Team',
			'By Manager',
			'By Admin'
		]);
	});

	it('gives a Guest nothing and saves nothing of theirs', async () => {
		const guest = (await test.signIn('visitor@elsewhere.example')).actor;
		const device = await open(team);
		addCustomer(device.look, 'Maersk');

		const result = await saveBatch(test.claims, guest, {
			changes: toChanges(device.confirmed, toRows(device.look))
		});

		expect(await readRows(test.claims, guest)).toEqual([]);
		expect(result).toMatchObject({ isSaved: false, reason: expect.stringContaining('waiting') });
		expect((await open(team)).look.customers).not.toContain('Maersk');
	});

	it('keeps another organization’s customers, contacts and changes from it by Row Level Security alone', async () => {
		const device = await open(team);
		addCustomer(device.look, 'Maersk', ['Ana']);
		await save(device, team);
		const elsewhere = { userId: team.userId, organizationId: crypto.randomUUID() };
		await test.db
			.insert(schema.organization)
			.values({ id: elsewhere.organizationId, name: 'Elsewhere', slug: 'elsewhere' });

		const seen = await test.claims.run(elsewhere, async (tx) => ({
			customers: await tx.select().from(schema.customer),
			contacts: await tx.select().from(schema.contact),
			changes: await tx.select().from(schema.change)
		}));
		const guestSeen = await test.claims.run(
			{ userId: team.userId, organizationId: null },
			async (tx) => (await tx.select().from(schema.customer)).length
		);
		const overwrite = await test.claims
			.run(elsewhere, (tx) =>
				tx
					.update(schema.customer)
					.set({ name: 'Taken' })
					.where(eq(schema.customer.id, customerOf(device.look, 'Maersk').id!))
					.returning()
			)
			.then((rows) => rows.length);

		expect(seen).toEqual({ customers: [], contacts: [], changes: [] });
		expect(guestSeen).toBe(0);
		expect(overwrite).toBe(0);
	});
});

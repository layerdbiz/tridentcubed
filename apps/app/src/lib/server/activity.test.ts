// The Activity (#306), through the real sign-in and the one save command on the in-process database: what an Admin
// reads, newest first, and when each person last signed in. Every email and name here is made up.
import { describe, expect, it } from 'vite-plus/test';
import type { ActivityEventType } from '#lib/activity/activity.types.js';
import type { RowChangeType } from '#lib/rows/rows.schema.js';
import { readActivity } from './activity';
import type { ActorType } from './db/claims';
import { TRIDENT_CUBED } from './db/seed';
import * as schema from './db/schema';
import { saveBatch } from './rows';
import { createTestSignIn } from './testing';

type TestType = Awaited<ReturnType<typeof createTestSignIn>>;

const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const EDGE =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';

async function grantAdmin(test: TestType, email: string) {
	await test.db
		.insert(schema.accessGrant)
		.values({ email, organizationId: TRIDENT_CUBED.id, role: 'admin' });
}

async function save(
	test: TestType,
	actor: ActorType,
	...changes: Omit<RowChangeType, 'changeId'>[]
) {
	const result = await saveBatch(test.claims, actor, {
		changes: changes.map((change) => ({ changeId: crypto.randomUUID(), ...change }))
	});
	if (!result.isSaved) throw new Error(result.reason);
}

// Any line's words side by side, whatever its kind: a sign-in has no row, so its row's words are left out.
type LineType = Partial<Record<'thing' | 'name' | 'project' | 'device', string>> &
	Partial<Record<'parts' | 'columns', string[]>> &
	Pick<ActivityEventType, 'id' | 'at' | 'kind' | 'who'>;

function toLine(event: ActivityEventType): LineType {
	return event;
}

async function readAs(test: TestType, actor: ActorType) {
	const result = await readActivity(test.claims, actor);
	if (!result.isAllowed) throw new Error(result.reason);
	return result;
}

describe('the Activity', () => {
	it('merges sign-ins, projects added and every change, newest first, each saying who', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const project = crypto.randomUUID();
		await save(test, ana, {
			table: 'project',
			id: project,
			operation: 'put',
			values: { title: 'Hull survey' }
		});
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const customer = crypto.randomUUID();
		await save(test, tom, {
			table: 'customer',
			id: customer,
			operation: 'put',
			values: { name: 'Harbor Lines' }
		});
		await save(test, tom, {
			table: 'project',
			id: project,
			operation: 'put',
			values: { subtitle: 'Port of Houston', customerId: customer }
		});
		await save(test, ana, { table: 'customer', id: customer, operation: 'delete' });

		const { events } = await readAs(test, ana);

		expect(
			events
				.map(toLine)
				.map(({ kind, who, thing, name, columns }) => ({ kind, who, thing, name, columns }))
		).toEqual([
			{ kind: 'trash', who: 'Ana Reyes', thing: 'customer', name: 'Harbor Lines', columns: [] },
			{
				kind: 'change',
				who: 'Tom Diaz',
				thing: 'project',
				name: 'Hull survey',
				columns: ['Customer', 'Subtitle']
			},
			{ kind: 'add', who: 'Tom Diaz', thing: 'customer', name: 'Harbor Lines', columns: [] },
			{ kind: 'signIn', who: 'Tom Diaz', thing: undefined, name: undefined, columns: undefined },
			{ kind: 'add', who: 'Ana Reyes', thing: 'project', name: 'Hull survey', columns: [] },
			{ kind: 'signIn', who: 'Ana Reyes', thing: undefined, name: undefined, columns: undefined }
		]);
		const times = events.map((event) => Date.parse(event.at));
		expect(times).toEqual([...times].sort((a, b) => b - a));
	});

	it('gives when each person last signed in and on what, latest first: the newest sign-in', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		await test.signIn('ana.reyes@tridentcubed.com', new Headers({ 'user-agent': IPHONE }));
		await test.signIn('tom.diaz@tridentcubed.com', new Headers({ 'user-agent': IPHONE }));
		const ana = (
			await test.signIn('ana.reyes@tridentcubed.com', new Headers({ 'user-agent': EDGE }))
		).actor;

		const { people, events } = await readAs(test, ana);

		expect(
			people.map(({ who, isFirst, device, deviceKind }) => ({ who, isFirst, device, deviceKind }))
		).toEqual([
			{ who: 'Ana Reyes', isFirst: false, device: 'Windows · Edge', deviceKind: 'computer' },
			{ who: 'Tom Diaz', isFirst: false, device: 'iPhone · Safari', deviceKind: 'phone' }
		]);
		const [last, first] = events.filter((event) => event.who === 'Ana Reyes');
		expect(people[0].at).toBe(last.at);
		expect(first).toMatchObject({ kind: 'signIn', device: 'iPhone · Safari', deviceKind: 'phone' });
	});

	it('keeps a sign-in through Log Out, in the list and as the last sign-in', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const first = await test.signIn(
			'tom.diaz@tridentcubed.com',
			new Headers({ 'user-agent': IPHONE })
		);
		await test.auth.api.signOut({ headers: new Headers({ cookie: first.cookie }) });
		const again = await test.signIn(
			'tom.diaz@tridentcubed.com',
			new Headers({ 'user-agent': EDGE })
		);
		await test.auth.api.signOut({ headers: new Headers({ cookie: again.cookie }) });
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;

		const { people, events } = await readAs(test, ana);

		const toms = events.filter((event) => event.who === 'Tom Diaz').map(toLine);
		expect(toms.map(({ kind, device }) => ({ kind, device }))).toEqual([
			{ kind: 'signIn', device: 'Windows · Edge' },
			{ kind: 'signIn', device: 'iPhone · Safari' }
		]);
		expect(people.find((person) => person.who === 'Tom Diaz')).toEqual({
			userId: again.user.id,
			who: 'Tom Diaz',
			at: toms[0].at,
			isFirst: false,
			device: 'Windows · Edge',
			deviceKind: 'computer'
		});
	});

	it('lets only an Admin’s queries read sign-ins, with the permission check skipped, and nobody a session', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		await test.db.insert(schema.accessGrant).values({
			email: 'lee.park@tridentcubed.com',
			organizationId: TRIDENT_CUBED.id,
			role: 'manager'
		});
		const team = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const manager = (await test.signIn('lee.park@tridentcubed.com')).actor;
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;

		function readSignIns(actor: ActorType) {
			return test.claims.run(actor, (tx) =>
				tx.select({ userId: schema.signIn.userId }).from(schema.signIn)
			);
		}
		function readSessions(actor: ActorType) {
			return test.claims.run(actor, (tx) =>
				tx.select({ token: schema.session.token }).from(schema.session)
			);
		}

		expect(await readSignIns(team)).toEqual([]);
		expect(await readSignIns(manager)).toEqual([]);
		expect(await readSignIns({ ...ana, role: null })).toEqual([]);
		expect((await readSignIns(ana)).map((row) => row.userId).sort()).toEqual(
			[team.userId, manager.userId, ana.userId].sort()
		);
		// A session's token signs its User in, so no app query reads one: not an Admin's, not their own.
		for (const actor of [team, manager, ana]) expect(await readSessions(actor)).toEqual([]);
	});

	it('names the project a change inside one belongs to, and labels what changed as the screens do', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const project = crypto.randomUUID();
		const panel = crypto.randomUUID();
		await save(
			test,
			ana,
			{ table: 'project', id: project, operation: 'put', values: { title: '' } },
			{
				table: 'panel',
				id: panel,
				operation: 'put',
				values: { projectId: project, kind: 'photos', key: 'operations', name: 'Operations' }
			}
		);
		await save(test, ana, {
			table: 'panel',
			id: panel,
			operation: 'put',
			values: { link: 'https://files.example/job', isEnabled: false }
		});

		const { events } = await readAs(test, ana);

		expect(events[0]).toMatchObject({
			kind: 'change',
			thing: 'panel',
			name: 'Operations',
			project: 'Untitled project',
			columns: ['On or Off', 'URL']
		});
	});

	it('counts what a new project starts with on the project’s own line, the project first', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const project = crypto.randomUUID();
		const panel = (name: string, key: string): Omit<RowChangeType, 'changeId'> => ({
			table: 'panel',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { projectId: project, kind: 'photos', key, name }
		});
		await save(test, ana, panel('Operations', 'operations'), panel('Damages', 'damages'), {
			table: 'project',
			id: project,
			operation: 'put',
			values: { title: 'Hull survey' }
		});
		const later = panel('Discharge', 'discharge');
		await save(test, ana, later);

		const { events } = await readAs(test, ana);

		expect(
			events.map(toLine).map(({ kind, thing, name, parts }) => ({ kind, thing, name, parts }))
		).toEqual([
			{ kind: 'add', thing: 'panel', name: 'Discharge', parts: undefined },
			{ kind: 'add', thing: 'project', name: 'Hull survey', parts: ['2 panels'] },
			{ kind: 'signIn', thing: undefined, name: undefined, parts: undefined }
		]);
	});

	it('names a project by its title now, though it was untitled when added', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const project = crypto.randomUUID();
		await save(test, ana, { table: 'project', id: project, operation: 'put', values: {} });
		await save(test, ana, {
			table: 'project',
			id: project,
			operation: 'put',
			values: { title: 'Hull survey' }
		});

		const { events } = await readAs(test, ana);

		expect(events.map(toLine).map(({ kind, name }) => ({ kind, name }))).toEqual([
			{ kind: 'change', name: 'Hull survey' },
			{ kind: 'add', name: 'Hull survey' },
			{ kind: 'signIn', name: undefined }
		]);
	});

	it('is an Admin’s only: a Manager, a Team member and a Guest are told why', async () => {
		const test = await createTestSignIn();
		await test.db.insert(schema.accessGrant).values({
			email: 'lee.park@tridentcubed.com',
			organizationId: TRIDENT_CUBED.id,
			role: 'manager'
		});
		const manager = (await test.signIn('lee.park@tridentcubed.com')).actor;
		const team = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const guest = (await test.signIn('sam@elsewhere.example')).actor;

		for (const actor of [manager, team])
			expect(await readActivity(test.claims, actor)).toEqual({
				isAllowed: false,
				reason: 'Only an Admin can see the Activity.'
			});
		expect(await readActivity(test.claims, guest)).toEqual({
			isAllowed: false,
			reason: 'You are waiting for access. An Admin of the organization can let you in.'
		});
	});

	it('reads older entries before the oldest shown, page by page: none twice, none lost, a save never split', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const project = crypto.randomUUID();
		await save(
			test,
			ana,
			{ table: 'project', id: project, operation: 'put', values: { title: 'Hull survey' } },
			...['operations', 'damages', 'discharge'].map((key): Omit<RowChangeType, 'changeId'> => ({
				table: 'panel',
				id: crypto.randomUUID(),
				operation: 'put',
				values: { projectId: project, kind: 'photos', key, name: key }
			}))
		);
		for (const name of ['North Yard', 'South Yard', 'East Yard']) {
			await save(test, ana, {
				table: 'customer',
				id: crypto.randomUUID(),
				operation: 'put',
				values: { name }
			});
			await test.signIn('tom.diaz@tridentcubed.com');
		}
		const whole = await readAs(test, ana);

		const pages = [];
		let before: string | undefined;
		do {
			const page = await readActivity(test.claims, ana, { limit: 2, before });
			if (!page.isAllowed) throw new Error(page.reason);
			pages.push(page.events);
			before = page.olderBefore;
		} while (before && pages.length < 20);

		expect(whole.olderBefore).toBeUndefined();
		expect(whole.events).toHaveLength(8);
		expect(pages.length).toBeGreaterThan(2);
		expect(pages.flat().map((event) => event.id)).toEqual(whole.events.map((event) => event.id));
		expect(
			pages
				.flat()
				.map(toLine)
				.find((event) => event.thing === 'project')?.parts
		).toEqual(['3 panels']);
	});

	it('shows nothing of another organization', async () => {
		const test = await createTestSignIn();
		const theirs = '22222222-2222-4222-8222-222222222222';
		await test.db
			.insert(schema.organization)
			.values({ id: theirs, name: 'Theirs', slug: 'theirs' });
		await test.db
			.insert(schema.organizationDetails)
			.values({ id: theirs, organizationId: theirs, emailDomain: 'theirs.example' });
		await test.db
			.insert(schema.accessGrant)
			.values({ email: 'kim@theirs.example', organizationId: theirs, role: 'admin' });
		const kim = (await test.signIn('kim@theirs.example')).actor;
		await save(test, kim, {
			table: 'customer',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { name: 'Their Customer' }
		});
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;

		const { events, people } = await readAs(test, ana);

		expect(events.map((event) => event.who)).toEqual(['Ana Reyes']);
		expect(people.map((person) => person.who)).toEqual(['Ana Reyes']);
		const signIns = await test.claims.run(ana, (tx) =>
			tx.select({ userId: schema.signIn.userId }).from(schema.signIn)
		);
		expect(signIns).toEqual([{ userId: ana.userId }]);
	});
});

// The Activity (#306), through the real sign-in and the one save command on the in-process database: what an Admin
// reads, newest first, and when each person last signed in. Every email and name here is made up.
import { and, desc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vite-plus/test';
import type { ActivityEventType } from '#lib/activity/activity.types.js';
import type { RowChangeType } from '#lib/rows/rows.schema.js';
import { readActivity, readNotifications, recordProjectActivity } from './activity';
import { CODE_MINUTES } from './auth';
import type { ActorType } from './db/claims';
import { TRIDENT_CUBED } from './db/seed';
import * as schema from './db/schema';
import { saveBatch } from './rows';
import { sendCode } from './signin';
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
			{ kind: 'signOut', device: 'Windows · Edge' },
			{ kind: 'signIn', device: 'Windows · Edge' },
			{ kind: 'signOut', device: 'iPhone · Safari' },
			{ kind: 'signIn', device: 'iPhone · Safari' }
		]);
		expect(people.find((person) => person.who === 'Tom Diaz')).toEqual({
			userId: again.user.id,
			who: 'Tom Diaz',
			at: toms[1].at,
			isFirst: false,
			device: 'Windows · Edge',
			deviceKind: 'computer'
		});
	});

	it('records a sign-in the database is given by any copy of the app, even one that does not record it itself', async () => {
		// dev.app and next.app share one database, and dev.app's code had no sign-in record: a new User's first sign-in there
		// showed no device in the Last Sign-In list (Justin, 2026-11-26). The database records each new session.
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const tom = await test.signIn('tom.diaz@tridentcubed.com');
		const at = new Date(Date.now() + 60_000);
		await test.db.insert(schema.session).values({
			token: 'another-copy-of-the-app',
			userId: tom.user.id,
			expiresAt: new Date(Date.now() + 86_400_000),
			createdAt: at,
			updatedAt: at,
			userAgent: IPHONE,
			activeOrganizationId: TRIDENT_CUBED.id
		});
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;

		const { people, events } = await readAs(test, ana);

		expect(
			events
				.filter((event) => event.who === 'Tom Diaz')
				.map(toLine)
				.map(({ kind, device }) => ({ kind, device }))
		).toEqual([
			{ kind: 'signIn', device: 'iPhone · Safari' },
			{ kind: 'signIn', device: undefined }
		]);
		expect(people.find((person) => person.who === 'Tom Diaz')).toMatchObject({
			at: at.toISOString(),
			isFirst: false,
			device: 'iPhone · Safari'
		});
	});

	it('shows an Admin a Guest’s sign-ins, someone waiting for access, marked as waiting', async () => {
		// Justin, 2026-11-26: a Guest signed in and landed on Waiting for access, and the Activity did not show it. A
		// Guest belongs to no organization yet, and an Admin is who lets them in.
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const guest = await test.signIn(
			'sam.lee@elsewhere.example',
			new Headers({ 'user-agent': IPHONE })
		);
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;

		const { events, people } = await readAs(test, ana);

		expect(events.filter((event) => event.userId === guest.user.id)).toEqual([
			expect.objectContaining({
				kind: 'signIn',
				who: 'Sam Lee',
				isGuest: true,
				device: 'iPhone · Safari'
			})
		]);
		expect(people.find((person) => person.userId === guest.user.id)).toMatchObject({
			who: 'Sam Lee',
			isGuest: true,
			email: 'sam.lee@elsewhere.example',
			isFirst: false,
			device: 'iPhone · Safari'
		});
		expect(people.find((person) => person.who === 'Tom Diaz')).not.toHaveProperty('isGuest');
		// Only an Admin reads them: a Team member reads no Guest, neither their sign-in nor their account.
		const read = await test.claims.run(tom, async (tx) => ({
			signIns: await tx.select({ userId: schema.signIn.userId }).from(schema.signIn),
			users: await tx.select({ id: schema.user.id }).from(schema.user)
		}));
		expect(read.signIns).toEqual([]);
		expect(read.users.map((row) => row.id)).not.toContain(guest.user.id);
	});

	it('records each sign-out made before its session ran out, on its device, and not a session that ran out', async () => {
		// Justin, 2026-11-26: "every possible thing that happens". Log Out, from any copy of the app.
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const tom = await test.signIn(
			'tom.diaz@tridentcubed.com',
			new Headers({ 'user-agent': IPHONE })
		);
		await test.auth.api.signOut({ headers: new Headers({ cookie: tom.cookie }) });
		const past = new Date(Date.now() - 60_000);
		await test.db.insert(schema.session).values({
			token: 'ran-out',
			userId: tom.user.id,
			expiresAt: past,
			createdAt: past,
			updatedAt: past,
			activeOrganizationId: TRIDENT_CUBED.id
		});
		await test.db.delete(schema.session).where(eq(schema.session.token, 'ran-out'));
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;

		const { events } = await readAs(test, ana);

		expect(
			events
				.filter((event) => event.who === 'Tom Diaz')
				.map(toLine)
				.map(({ kind, device }) => ({ kind, device }))
		).toEqual([
			{ kind: 'signOut', device: 'iPhone · Safari' },
			{ kind: 'signIn', device: 'iPhone · Safari' },
			{ kind: 'signIn', device: undefined }
		]);
	});

	it('shows a sign-in code asked for and never used once it has run out, and not one that signed someone in', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		await test.signIn('tom.diaz@tridentcubed.com');
		await sendCode(test.auth, 'tom.diaz@tridentcubed.com', { ip: '203.0.113.71' });
		await sendCode(test.auth, 'kim@elsewhere.example', { ip: '203.0.113.72' });
		await sendCode(test.auth, 'lee@elsewhere.example', { ip: '203.0.113.73' });
		// Tom's second code and the stranger Kim's ran out long ago; Lee's could still be used.
		async function askedAgo(email: string, minutes: number) {
			const [newest] = await test.db
				.select({ id: schema.activityEvent.id })
				.from(schema.activityEvent)
				.where(and(eq(schema.activityEvent.kind, 'code'), eq(schema.activityEvent.email, email)))
				.orderBy(desc(schema.activityEvent.createdAt))
				.limit(1);
			await test.db
				.update(schema.activityEvent)
				.set({ createdAt: new Date(Date.now() - minutes * 60_000) })
				.where(eq(schema.activityEvent.id, newest.id));
		}
		await askedAgo('tom.diaz@tridentcubed.com', 2 * CODE_MINUTES);
		await askedAgo('kim@elsewhere.example', 3 * CODE_MINUTES);
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;

		const { events } = await readAs(test, ana);

		expect(
			events
				.filter((event) => event.kind === 'code')
				.map((event) => ({ who: event.who, email: 'email' in event ? event.email : undefined }))
		).toEqual([
			{ who: 'Tom Diaz', email: 'tom.diaz@tridentcubed.com' },
			{ who: 'kim@elsewhere.example', email: 'kim@elsewhere.example' }
		]);
	});

	it('records a project opened, once while someone keeps coming back to it, and every PDF downloaded', async () => {
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

		expect(
			await recordProjectActivity(test.claims, tom, { kind: 'open', projectId: project })
		).toBe(true);
		expect(
			await recordProjectActivity(test.claims, tom, { kind: 'open', projectId: project })
		).toBe(false);
		await recordProjectActivity(test.claims, tom, { kind: 'download', projectId: project });
		await recordProjectActivity(test.claims, tom, { kind: 'download', projectId: project });
		// A project that is not there, or not theirs, records nothing.
		expect(
			await recordProjectActivity(test.claims, tom, {
				kind: 'open',
				projectId: crypto.randomUUID()
			})
		).toBe(false);

		const { events } = await readAs(test, ana);

		expect(
			events
				.filter((event) => event.kind === 'open' || event.kind === 'download')
				.map((event) => ({
					kind: event.kind,
					who: event.who,
					project: 'project' in event ? event.project : undefined,
					projectId: 'projectId' in event ? event.projectId : undefined
				}))
		).toEqual([
			{ kind: 'download', who: 'Tom Diaz', project: 'Hull survey', projectId: project },
			{ kind: 'download', who: 'Tom Diaz', project: 'Hull survey', projectId: project },
			{ kind: 'open', who: 'Tom Diaz', project: 'Hull survey', projectId: project }
		]);
	});

	it('lets an Admin read what else happened, and anyone else write and read back only their own openings and downloads', async () => {
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
		await recordProjectActivity(test.claims, ana, { kind: 'open', projectId: project });
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		await recordProjectActivity(test.claims, tom, { kind: 'download', projectId: project });

		function readKinds(actor: ActorType) {
			return test.claims.run(actor, (tx) =>
				tx
					.select({ userId: schema.activityEvent.userId, kind: schema.activityEvent.kind })
					.from(schema.activityEvent)
					.where(eq(schema.activityEvent.projectId, project))
			);
		}
		function write(actor: ActorType, values: Partial<typeof schema.activityEvent.$inferInsert>) {
			return test.claims.run(actor, (tx) =>
				tx.insert(schema.activityEvent).values({
					kind: 'open',
					userId: actor.userId,
					organizationId: actor.organizationId,
					projectId: project,
					...values
				})
			);
		}

		expect(await readKinds(tom)).toEqual([{ userId: tom.userId, kind: 'download' }]);
		expect((await readKinds(ana)).map((row) => row.kind).sort()).toEqual(['download', 'open']);
		// Not a sign-in code or a sign-out, which only the database writes, and never as someone else.
		await expect(write(tom, { kind: 'code' })).rejects.toThrow();
		await expect(write(tom, { kind: 'signOut' })).rejects.toThrow();
		await expect(write(tom, { userId: ana.userId })).rejects.toThrow();
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

	it('gives each change its row and the project it is in, so a tap on a name opens them', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const project = crypto.randomUUID();
		const panel = crypto.randomUUID();
		const customer = crypto.randomUUID();
		await save(test, ana, {
			table: 'project',
			id: project,
			operation: 'put',
			values: { title: 'Hull survey' }
		});
		await save(test, ana, {
			table: 'panel',
			id: panel,
			operation: 'put',
			values: { projectId: project, kind: 'photos', key: 'operations', name: 'Operations' }
		});
		await save(test, ana, {
			table: 'customer',
			id: customer,
			operation: 'put',
			values: { name: 'Harbor Lines' }
		});

		const { events } = await readAs(test, ana);

		expect(
			events.flatMap((event) =>
				'rowId' in event ? [{ rowId: event.rowId, projectId: event.projectId }] : []
			)
		).toEqual([
			{ rowId: customer, projectId: undefined },
			{ rowId: panel, projectId: project },
			{ rowId: project, projectId: project }
		]);
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

	it('is not a Guest’s: they are told why', async () => {
		const test = await createTestSignIn();
		const guest = (await test.signIn('sam@elsewhere.example')).actor;

		expect(await readActivity(test.claims, guest)).toEqual({
			isAllowed: false,
			reason: 'You are waiting for access. An Admin of the organization can let you in.'
		});
	});

	// Justin, 2026-11-28: "the activity log should only show activity that they are privy to".
	it('shows anyone but an Admin only what they are privy to: their projects, what was done to them, their own doing', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		await test.db.insert(schema.accessGrant).values({
			email: 'lee.park@tridentcubed.com',
			organizationId: TRIDENT_CUBED.id,
			role: 'manager'
		});
		const lee = (await test.signIn('lee.park@tridentcubed.com')).actor;
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const [tomTeam] = await test.db
			.select({ id: schema.team.id })
			.from(schema.team)
			.where(eq(schema.team.userId, tom.userId));
		const ours = crypto.randomUUID();
		const theirs = crypto.randomUUID();
		await save(
			test,
			ana,
			{ table: 'project', id: ours, operation: 'put', values: { title: 'Hull survey' } },
			{
				table: 'project_team',
				id: crypto.randomUUID(),
				operation: 'put',
				values: { projectId: ours, teamId: tomTeam.id, position: 0 }
			}
		);
		await save(test, ana, {
			table: 'project',
			id: theirs,
			operation: 'put',
			values: { title: 'Crane lift' }
		});
		await save(test, ana, {
			table: 'customer',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { name: 'Harbor Lines' }
		});
		await save(test, tom, {
			table: 'project',
			id: ours,
			operation: 'put',
			values: { subtitle: 'His own' }
		});
		await save(test, tom, {
			table: 'facility',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { name: 'North Yard', kind: 'Port' }
		});
		await save(test, ana, {
			table: 'team',
			id: tomTeam.id,
			operation: 'put',
			values: { title: 'Surveyor' }
		});
		await recordProjectActivity(test.claims, tom, { kind: 'open', projectId: ours });
		await recordProjectActivity(test.claims, ana, { kind: 'open', projectId: ours });

		for (const actor of [tom, lee]) {
			const result = await readAs(test, actor);
			expect(result.people).toEqual([]);
			expect(result.events.some((event) => event.kind === 'signIn')).toBe(false);
		}
		const { events } = await readAs(test, tom);
		expect(
			events.map(toLine).map(({ kind, who, thing, name }) => ({ kind, who, thing, name }))
		).toEqual([
			{ kind: 'open', who: 'Tom Diaz', thing: undefined, name: undefined },
			{ kind: 'change', who: 'Ana Reyes', thing: 'Team', name: 'Tom Diaz' },
			{ kind: 'add', who: 'Tom Diaz', thing: 'Facility', name: 'North Yard' },
			{ kind: 'change', who: 'Tom Diaz', thing: 'project', name: 'Hull survey' },
			// Putting Tom on it came in the same save, so it is counted on the project's own line.
			{ kind: 'add', who: 'Ana Reyes', thing: 'project', name: 'Hull survey' }
		]);
	});

	// Justin, 2026-11-28: View Activity on every ⋮ menu, for "that entire project or whatever it is".
	it('reads one project’s own Activity: everything inside it and its openings, nothing else', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const hull = crypto.randomUUID();
		const crane = crypto.randomUUID();
		await save(
			test,
			ana,
			{ table: 'project', id: hull, operation: 'put', values: { title: 'Hull survey' } },
			{ table: 'project', id: crane, operation: 'put', values: { title: 'Crane lift' } }
		);
		await save(test, tom, {
			table: 'panel',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { projectId: hull, kind: 'photos', key: 'damages', name: 'Damages' }
		});
		await save(test, tom, {
			table: 'project',
			id: crane,
			operation: 'put',
			values: { subtitle: 'Elsewhere' }
		});
		await recordProjectActivity(test.claims, ana, { kind: 'open', projectId: hull });
		await recordProjectActivity(test.claims, tom, { kind: 'download', projectId: hull });
		await recordProjectActivity(test.claims, tom, { kind: 'open', projectId: crane });

		const about = { table: 'project', rowId: hull } as const;
		function linesOf(result: Awaited<ReturnType<typeof readActivity>>) {
			if (!result.isAllowed) throw new Error(result.reason);
			expect(result.people).toEqual([]);
			return result.events.map(toLine).map(({ kind, who, thing }) => ({ kind, who, thing }));
		}
		expect(linesOf(await readActivity(test.claims, ana, { about }))).toEqual([
			{ kind: 'download', who: 'Tom Diaz', thing: undefined },
			{ kind: 'open', who: 'Ana Reyes', thing: undefined },
			{ kind: 'add', who: 'Tom Diaz', thing: 'panel' },
			{ kind: 'add', who: 'Ana Reyes', thing: 'project' }
		]);
		// Anyone else sees the same project's changes, and of its openings only their own.
		expect(linesOf(await readActivity(test.claims, tom, { about }))).toEqual([
			{ kind: 'download', who: 'Tom Diaz', thing: undefined },
			{ kind: 'add', who: 'Tom Diaz', thing: 'panel' },
			{ kind: 'add', who: 'Ana Reyes', thing: 'project' }
		]);
	});

	it('reads one record’s own Activity: a customer with its contacts, a Team member with their places on projects', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const [tomTeam] = await test.db
			.select({ id: schema.team.id })
			.from(schema.team)
			.where(eq(schema.team.userId, tom.userId));
		const harbor = crypto.randomUUID();
		const project = crypto.randomUUID();
		await save(test, ana, {
			table: 'customer',
			id: harbor,
			operation: 'put',
			values: { name: 'Harbor Lines' }
		});
		await save(test, ana, {
			table: 'customer',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { name: 'Bay Freight' }
		});
		await save(test, tom, {
			table: 'contact',
			id: crypto.randomUUID(),
			operation: 'put',
			values: { customerId: harbor, name: 'Kim Lee' }
		});
		await save(
			test,
			ana,
			{ table: 'project', id: project, operation: 'put', values: { title: 'Hull survey' } },
			{
				table: 'project_team',
				id: crypto.randomUUID(),
				operation: 'put',
				values: { projectId: project, teamId: tomTeam.id, position: 0 }
			}
		);

		async function linesOf(about: { table: 'customer' | 'team'; rowId: string }) {
			const result = await readActivity(test.claims, tom, { about });
			if (!result.isAllowed) throw new Error(result.reason);
			return result.events.map(toLine).map(({ kind, thing, name }) => ({ kind, thing, name }));
		}
		expect(await linesOf({ table: 'customer', rowId: harbor })).toEqual([
			{ kind: 'add', thing: 'contact', name: 'Kim Lee' },
			{ kind: 'add', thing: 'customer', name: 'Harbor Lines' }
		]);
		expect(await linesOf({ table: 'team', rowId: tomTeam.id })).toEqual([
			{ kind: 'add', thing: 'Team Assigned', name: undefined }
		]);
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

describe('the bell’s Notifications (#403)', () => {
	async function teamIdOf(test: TestType, actor: ActorType) {
		const [record] = await test.db
			.select({ id: schema.team.id })
			.from(schema.team)
			.where(eq(schema.team.userId, actor.userId));
		return record.id;
	}

	async function notesOf(test: TestType, actor: ActorType) {
		const result = await readNotifications(test.claims, actor);
		if (!result.isAllowed) throw new Error(result.reason);
		return result.events.map((event) => ({
			kind: event.kind,
			who: event.who,
			table: event.table,
			...(event.isAboutYou ? { isAboutYou: true } : {}),
			...(event.columns.length ? { columns: event.columns } : {})
		}));
	}

	it('tells someone only what others did in their projects and to them, newest first', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const tomTeam = await teamIdOf(test, tom);
		const ours = crypto.randomUUID();
		const theirs = crypto.randomUUID();
		await save(
			test,
			ana,
			{ table: 'project', id: ours, operation: 'put', values: { title: 'Hull survey' } },
			{
				table: 'project_team',
				id: crypto.randomUUID(),
				operation: 'put',
				values: { projectId: ours, teamId: tomTeam, position: 0 }
			}
		);
		await save(test, ana, {
			table: 'project',
			id: theirs,
			operation: 'put',
			values: { title: 'Crane lift' }
		});
		await save(test, ana, {
			table: 'project',
			id: theirs,
			operation: 'put',
			values: { subtitle: 'Not on it' }
		});
		await save(test, tom, {
			table: 'project',
			id: ours,
			operation: 'put',
			values: { subtitle: 'His own' }
		});
		await save(test, ana, {
			table: 'project',
			id: ours,
			operation: 'put',
			values: { location: 'Houston' }
		});
		await save(test, ana, {
			table: 'team',
			id: tomTeam,
			operation: 'put',
			values: { title: 'Surveyor' }
		});

		expect(await notesOf(test, tom)).toEqual([
			{ kind: 'change', who: 'Ana Reyes', table: 'team', isAboutYou: true, columns: ['Title'] },
			{ kind: 'change', who: 'Ana Reyes', table: 'project', columns: ['Location'] },
			{ kind: 'add', who: 'Ana Reyes', table: 'project' },
			{ kind: 'add', who: 'Ana Reyes', table: 'project_team', isAboutYou: true }
		]);
		// Ana sees none of her own doing, and Tom's change in a project she started.
		expect(await notesOf(test, ana)).toEqual([
			{ kind: 'change', who: 'Tom Diaz', table: 'project', columns: ['Subtitle'] }
		]);
	});

	it('tells someone taken off a project, and nothing of it after', async () => {
		const test = await createTestSignIn();
		await grantAdmin(test, 'ana.reyes@tridentcubed.com');
		const ana = (await test.signIn('ana.reyes@tridentcubed.com')).actor;
		const tom = (await test.signIn('tom.diaz@tridentcubed.com')).actor;
		const tomTeam = await teamIdOf(test, tom);
		const id = crypto.randomUUID();
		const seat = crypto.randomUUID();
		await save(test, ana, {
			table: 'project',
			id,
			operation: 'put',
			values: { title: 'Hull survey' }
		});
		await save(test, ana, {
			table: 'project_team',
			id: seat,
			operation: 'put',
			values: { projectId: id, teamId: tomTeam, position: 0 }
		});
		await save(test, ana, {
			table: 'project_team',
			id: seat,
			operation: 'put',
			values: { position: 1 }
		});
		await save(test, ana, { table: 'project_team', id: seat, operation: 'delete' });
		await save(test, ana, {
			table: 'project',
			id,
			operation: 'put',
			values: { location: 'Houston' }
		});

		expect(await notesOf(test, tom)).toEqual([
			{ kind: 'trash', who: 'Ana Reyes', table: 'project_team', isAboutYou: true },
			{ kind: 'add', who: 'Ana Reyes', table: 'project_team', isAboutYou: true }
		]);
	});
});

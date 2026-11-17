// The save round trip for Team records (spec #179 Testing Decisions; #185): the screens' state through the mapper,
// the save command's work as an acting User, the in-process Postgres with the real schema and policies, the lists
// query and the mapper again. Who may change a role, and what a role change does to the membership, are checked
// here through the same seam. Every email of a made-up person here is made up.
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges } from '#lib/rows/rows.utils.js';
import { stampSeen } from '#lib/server/access.js';
import type { ActorType } from '#lib/server/db/claims.js';
import * as schema from '#lib/server/db/schema.js';
import { TRIDENT_CUBED } from '#lib/server/db/seed.js';
import { readRows, saveBatch } from '#lib/server/rows.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { draftOf } from './look.data';
import { LookState } from './look.state.svelte';
import { takeRows, toRows } from './mapper';
import type { TeamMemberType } from './team.data';

type TestType = Awaited<ReturnType<typeof createTestSignIn>>;

let test: TestType;

beforeEach(async () => {
	test = await createTestSignIn();
});

async function grant(email: string, role: 'admin' | 'manager', extra = {}) {
	await test.db
		.insert(schema.accessGrant)
		.values({ email, organizationId: TRIDENT_CUBED.id, role, ...extra });
}

// A device of the signed-in `actor`: its state as the server's lists left it, and the rows it last had confirmed.
async function open(actor: ActorType) {
	const look = new LookState();
	look.userId = actor.userId;
	takeRows(look, await readRows(test.claims, actor));
	return { look, confirmed: toRows(look) };
}

// The sync loop's one step: send the difference since the last confirmed rows.
async function save(device: { look: LookState; confirmed: RowType[] }, actor: ActorType) {
	const changes = toChanges(device.confirmed, toRows(device.look));
	const result = await saveBatch(test.claims, actor, { changes });
	if (result.isSaved) device.confirmed = toRows(device.look);
	return result;
}

function memberOf(look: LookState, name: string) {
	return look.members.find((member) => member.name === name);
}

function addMember(look: LookState, name: string, extra: Partial<TeamMemberType> = {}) {
	const draft = { ...(draftOf('team') as TeamMemberType), name, title: 'Surveyor', ...extra };
	expect(look.add('team', draft)).toBe(true);
}

describe('Team records', () => {
	it('loads the real team from the seed, partners first, their photos the app’s own files', async () => {
		const { actor } = await test.signIn('tom@tridentcubed.com');
		const { look } = await open(actor);

		expect(look.members.slice(0, 2).map((member) => member.name)).toEqual([
			'Capt. Cezary Poninski',
			'Duncan Cooke'
		]);
		expect(memberOf(look, 'Duncan Cooke')).toMatchObject({
			title: 'Partner / Head of Engineering',
			label: 'Partner, Engineering',
			role: 'admin',
			rank: 1,
			location: 'Fort Myers, FL',
			photo: '/start/team/duncan-cooke-profile.webp'
		});
		expect(memberOf(look, 'Oziel Lara')?.photo).toBe('');
	});

	it('saves an added, edited, renamed and deleted Team record, and another member sees each', async () => {
		const tom = (await test.signIn('tom@tridentcubed.com')).actor;
		const mia = (await test.signIn('mia@tridentcubed.com')).actor;
		const mine = await open(tom);

		addMember(mine.look, 'Rosa Vega', { email: 'r.vega@tridentcubed.com', label: 'Surveyor' });
		expect(await save(mine, tom)).toEqual({ isSaved: true });
		const added = await open(mia);
		expect(memberOf(added.look, 'Rosa Vega')).toMatchObject({
			title: 'Surveyor',
			email: 'r.vega@tridentcubed.com',
			role: 'team'
		});
		expect(toRows(added.look)).toEqual(toRows(mine.look));

		const id = memberOf(mine.look, 'Rosa Vega')?.id;
		mine.look.patch('team', 'Rosa Vega', { phone: '+1 555 0100' });
		mine.look.rename('team', 'Rosa Vega', 'Rosa M. Vega');
		expect(await save(mine, tom)).toEqual({ isSaved: true });
		const renamed = await open(mia);
		expect(memberOf(renamed.look, 'Rosa M. Vega')).toMatchObject({ id, phone: '+1 555 0100' });
		expect(memberOf(renamed.look, 'Rosa Vega')).toBeUndefined();

		mine.look.removeRecord('team', 'Rosa M. Vega');
		expect(await save(mine, tom)).toEqual({ isSaved: true });
		const deleted = await open(mia);
		expect(memberOf(deleted.look, 'Rosa M. Vega')).toBeUndefined();
		expect(deleted.look.trashed.team.map((member) => member.name)).toContain('Rosa M. Vega');
		addMember(deleted.look, 'Rosa M. Vega');
		expect(await save(deleted, mia)).toEqual({ isSaved: true });
	});

	it('refuses a second Team record with a name already there, whatever its capitals', async () => {
		const tom = (await test.signIn('tom@tridentcubed.com')).actor;
		const device = await open(tom);
		device.look.members.push({
			...(draftOf('team') as TeamMemberType),
			id: crypto.randomUUID(),
			name: 'duncan cooke'
		});

		expect(await save(device, tom)).toMatchObject({
			isSaved: false,
			reason: 'duncan cooke is already there.'
		});
	});

	it('knows the signed-in person: their own Team record, with its role', async () => {
		await grant('mia@tridentcubed.com', 'manager');
		const { actor } = await test.signIn('mia@tridentcubed.com');
		const { look } = await open(actor);

		expect(look.me).toMatchObject({ name: 'Mia', email: 'mia@tridentcubed.com', role: 'manager' });
	});

	it('stamps the signed-in person as seen when they use the app, at most once a minute', async () => {
		const { actor } = await test.signIn('tom@tridentcubed.com');
		const other = (await test.signIn('mia@tridentcubed.com')).actor;

		await stampSeen(test.claims, actor);
		const first = memberOf((await open(other)).look, 'Tom')?.seen;
		await stampSeen(test.claims, actor, Date.now() + 1000);
		const second = memberOf((await open(other)).look, 'Tom')?.seen;

		expect(first).toBeTruthy();
		expect(second).toBe(first);
		expect(memberOf((await open(other)).look, 'Duncan Cooke')?.seen).toBeFalsy();
	});
});

describe('Team roles', () => {
	it('refuses a role change from a Team user, and nothing is saved', async () => {
		const tom = (await test.signIn('tom@tridentcubed.com')).actor;
		const device = await open(tom);
		device.look.patch('team', 'Oziel Lara', { role: 'admin', title: 'Boss' });

		expect(await save(device, tom)).toMatchObject({
			isSaved: false,
			reason: 'Only an Admin can change a Team role.'
		});
		expect(memberOf((await open(tom)).look, 'Oziel Lara')).toMatchObject({
			role: 'manager',
			title: 'Operations Manager'
		});
	});

	it('refuses a Team user moving the email of an Admin’s record nobody has signed in as yet', async () => {
		const tom = (await test.signIn('tom@tridentcubed.com')).actor;
		const device = await open(tom);
		device.look.patch('team', 'Duncan Cooke', { email: 'tom.friend@tridentcubed.com' });

		expect(await save(device, tom)).toMatchObject({ isSaved: false });
	});

	it('moves the membership with the role when an Admin changes a signed-in person’s role', async () => {
		await grant('ada@tridentcubed.com', 'admin');
		const ada = (await test.signIn('ada@tridentcubed.com')).actor;
		const tom = await test.signIn('tom@tridentcubed.com');
		const device = await open(ada);

		device.look.patch('team', 'Tom', { role: 'manager' });

		expect(await save(device, ada)).toEqual({ isSaved: true });
		expect((await test.readActor(tom.cookie)).role).toBe('manager');
		expect(memberOf((await open(tom.actor)).look, 'Tom')?.role).toBe('manager');
	});

	it('lets the only Admin demote an Admin record nobody has signed in as', async () => {
		await grant('ada@tridentcubed.com', 'admin');
		const ada = (await test.signIn('ada@tridentcubed.com')).actor;
		const device = await open(ada);

		device.look.patch('team', 'Duncan Cooke', { role: 'manager' });

		expect(await save(device, ada)).toEqual({ isSaved: true });
	});

	it('never demotes the last Admin or the Super admin', async () => {
		await grant('ada@tridentcubed.com', 'admin');
		const ada = (await test.signIn('ada@tridentcubed.com')).actor;
		const last = await open(ada);
		last.look.patch('team', 'Ada', { role: 'team' });
		expect(await save(last, ada)).toMatchObject({
			isSaved: false,
			reason: 'The organization must keep at least one Admin.'
		});

		await grant('owner@personal.example', 'admin', {
			isSuperAdmin: true,
			teamEmail: 'J.ONeill@TridentCubed.com'
		});
		const owner = (await test.signIn('owner@personal.example')).actor;
		const device = await open(ada);
		expect(device.look.members.filter((member) => member.name === 'Justin ONeill')).toHaveLength(1);
		device.look.patch('team', 'Justin ONeill', { role: 'manager' });
		expect(await save(device, ada)).toMatchObject({
			isSaved: false,
			reason: 'The Super admin is always an Admin.'
		});
		expect((await open(owner)).look.me?.name).toBe('Justin ONeill');
	});
});

// The save round trip for the menu's pins (#346): pinned and unpinned on the screens, through the mapper, the save
// command's work as an acting User, the in-process Postgres with the real schema and policies, and back. Each person
// has their own pins, newest on top.
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import { readRows, saveBatch } from '#lib/server/rows.js';
import { readActivity } from '#lib/server/activity.js';
import * as schema from '#lib/server/db/schema.js';
import { TRIDENT_CUBED } from '#lib/server/db/seed.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { draftPanel } from './look.data';
import { LookState } from './look.state.svelte';
import { takeRows, toRows } from './mapper';
import { isPinnable, isPinned, pinnedOf, togglePin } from './pins';

type TestType = Awaited<ReturnType<typeof createTestSignIn>>;

let test: TestType;
let tom: ActorType;

beforeEach(async () => {
	test = await createTestSignIn();
	tom = (await test.signIn('tom@tridentcubed.com')).actor;
});

async function open(actor: ActorType) {
	const look = new LookState();
	look.userId = actor.userId;
	takeRows(look, await readRows(test.claims, actor));
	return { look, confirmed: toRows(look) };
}

async function save(device: { look: LookState; confirmed: RowType[] }, actor: ActorType) {
	const changes = toChanges(device.confirmed, toRows(device.look));
	const result = await saveBatch(test.claims, actor, { changes });
	if (result.isSaved) device.confirmed = toRows(device.look);
	return { result, changes };
}

function names(look: LookState) {
	return pinnedOf(look).map((item) => `${item.page}: ${item.name}`);
}

function pinRows(look: LookState) {
	return toRows(look).filter((row) => row.table === 'pin');
}

function minutesAgo(minutes: number) {
	return new Date(Date.now() - minutes * 60_000);
}

describe('the menu’s pins', () => {
	it('starts with nothing pinned', async () => {
		const { look } = await open(tom);

		expect(look.pins).toEqual([]);
		expect(pinnedOf(look)).toEqual([]);
	});

	it('pins a project and records from any page, newest on top, and loads them back the same', async () => {
		const mine = await open(tom);
		const transport = mine.look.transports[0].name;
		const member = mine.look.members[0].name;
		const draft = draftPanel(mine.look.organization.name, '');
		draft.fields.find((field) => field.label === 'Title')!.value = 'Kimberly discharge';
		mine.look.create(draft);
		const projectId = mine.look.projectId;

		togglePin(mine.look, 'transport', transport, minutesAgo(3));
		togglePin(mine.look, 'projects', projectId, minutesAgo(2));
		togglePin(mine.look, 'team', member, minutesAgo(1));

		expect(names(mine.look)).toEqual([
			`team: ${member}`,
			'projects: Kimberly discharge',
			`transport: ${transport}`
		]);
		expect(isPinned(mine.look, 'projects', projectId)).toBe(true);
		expect(isPinned(mine.look, 'transport', transport)).toBe(true);

		const { result } = await save(mine, tom);
		// A new project's J count comes back with it.
		expect(result).toMatchObject({ isSaved: true });

		const again = await open(tom);
		expect(names(again.look)).toEqual(names(mine.look));
		expect(pinnedOf(again.look)[1]).toMatchObject({ page: 'projects', id: projectId });
		expect(pinRows(again.look)).toEqual(pinRows(mine.look));
		expect(toChanges(again.confirmed, toRows(again.look))).toEqual([]);
	});

	it('unpins from the same menu, and an unpinned one stays gone after a reload', async () => {
		const mine = await open(tom);
		const transport = mine.look.transports[0].name;
		togglePin(mine.look, 'transport', transport);
		await save(mine, tom);

		togglePin(mine.look, 'transport', transport);
		expect(isPinned(mine.look, 'transport', transport)).toBe(false);
		const { result, changes } = await save(mine, tom);

		expect(result).toEqual({ isSaved: true });
		expect(changes).toMatchObject([{ table: 'pin', operation: 'delete' }]);
		expect((await open(tom)).look.pins).toEqual([]);
	});

	it('keeps each person’s pins their own', async () => {
		const mine = await open(tom);
		togglePin(mine.look, 'transport', mine.look.transports[0].name);
		await save(mine, tom);

		const mia = (await test.signIn('mia@tridentcubed.com')).actor;
		const theirs = await open(mia);

		expect(theirs.look.pins).toEqual([]);
		const [row] = await test.db.select().from(schema.pin);
		expect(row.userId).toBe(tom.userId);
	});

	it('keeps a pin through a rename, and leaves out one whose record went to the Trash', async () => {
		const mine = await open(tom);
		const [first, second] = mine.look.transports.map((transport) => transport.name);
		togglePin(mine.look, 'transport', first);
		togglePin(mine.look, 'transport', second);
		await save(mine, tom);

		mine.look.rename('transport', first, 'Renamed Vessel');
		mine.look.removeRecord('transport', second);
		await save(mine, tom);

		const again = await open(tom);
		expect(names(again.look)).toEqual(['transport: Renamed Vessel']);
		expect(again.look.pins).toHaveLength(2);
	});

	it('cannot pin what has not been saved yet', async () => {
		const { look } = await open(tom);

		expect(isPinnable(look, 'customers', 'Nobody by this name')).toBe(false);
		togglePin(look, 'customers', 'Nobody by this name');
		expect(look.pins).toEqual([]);
	});

	it('leaves pins out of an Admin’s Activity', async () => {
		const mine = await open(tom);
		togglePin(mine.look, 'transport', mine.look.transports[0].name);
		await save(mine, tom);

		await test.db
			.insert(schema.accessGrant)
			.values({ email: 'ada@tridentcubed.com', organizationId: TRIDENT_CUBED.id, role: 'admin' });
		const admin = (await test.signIn('ada@tridentcubed.com')).actor;
		const activity = await readActivity(test.claims, admin);

		expect(JSON.stringify(activity)).not.toContain('"pin"');
	});
});

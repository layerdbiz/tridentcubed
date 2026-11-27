// The save round trip for what each person has seen (#403): a Notifications line tapped, and the Activity Log's last
// opening, through the mapper, the save command's work as an acting User, the in-process Postgres with the real schema
// and policies, and back. Each person has their own, on every device. Every email here is made up.
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toChanges } from '#lib/rows/rows.utils.js';
import type { ActorType } from '#lib/server/db/claims.js';
import { readRows, saveBatch } from '#lib/server/rows.js';
import { readActivity } from '#lib/server/activity.js';
import * as schema from '#lib/server/db/schema.js';
import { TRIDENT_CUBED } from '#lib/server/db/seed.js';
import { createTestSignIn } from '#lib/server/testing.js';
import { LookState } from './look.state.svelte';
import { takeRows, toRows } from './mapper';
import { LOG_LINE, NEW_DAYS, logSeenAt, markLogSeen, markSeen, unseenOf } from './seen';

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

function ago(days: number, now = Date.now()) {
	return new Date(now - days * 86_400_000);
}

const LINES = [
	{ id: 'a', at: ago(0.1).toISOString() },
	{ id: 'b', at: ago(2).toISOString() },
	{ id: 'c', at: ago(NEW_DAYS + 1).toISOString() }
];

describe('what each person has seen', () => {
	it('keeps a tapped line seen on every device, and counts only the newer ones never tapped', async () => {
		const phone = await open(tom);
		expect([...unseenOf(phone.look, LINES)]).toEqual(['a', 'b']);

		markSeen(phone.look, ['b']);
		const { result } = await save(phone, tom);
		expect(result).toMatchObject({ isSaved: true });

		const desktop = await open(tom);
		expect([...unseenOf(desktop.look, LINES)]).toEqual(['a']);
		expect(toChanges(desktop.confirmed, toRows(desktop.look))).toEqual([]);

		// Seen again, it adds nothing.
		markSeen(desktop.look, ['b']);
		expect(toChanges(desktop.confirmed, toRows(desktop.look))).toEqual([]);
	});

	it('lets marks older than the days a line stays new go', async () => {
		const mine = await open(tom);
		markSeen(mine.look, ['old'], ago(NEW_DAYS + 2));
		markLogSeen(mine.look, ago(NEW_DAYS + 2));
		await save(mine, tom);

		markSeen(mine.look, ['new']);
		const { changes } = await save(mine, tom);

		expect(changes.map((change) => change.operation).toSorted()).toEqual(['delete', 'put']);
		const again = await open(tom);
		expect(again.look.seen.map((each) => each.line).toSorted()).toEqual([LOG_LINE, 'new']);
	});

	it('moves the Activity Log’s one mark on each time it opens', async () => {
		const mine = await open(tom);
		expect(logSeenAt(mine.look)).toBeUndefined();

		const first = ago(1);
		markLogSeen(mine.look, first);
		await save(mine, tom);
		const later = new Date();
		markLogSeen(mine.look, later);
		const { changes } = await save(mine, tom);

		expect(changes).toMatchObject([{ table: 'seen', operation: 'put' }]);
		const again = await open(tom);
		expect(logSeenAt(again.look)).toBe(later.toISOString());
		expect(again.look.seen).toHaveLength(1);
	});

	it('keeps each person’s marks their own, and out of the Activity', async () => {
		const mine = await open(tom);
		markSeen(mine.look, ['a']);
		await save(mine, tom);

		const mia = (await test.signIn('mia@tridentcubed.com')).actor;
		expect((await open(mia)).look.seen).toEqual([]);
		const [row] = await test.db.select().from(schema.seen);
		expect(row.userId).toBe(tom.userId);

		await test.db
			.insert(schema.accessGrant)
			.values({ email: 'ana@tridentcubed.com', organizationId: TRIDENT_CUBED.id, role: 'admin' });
		const ana = (await test.signIn('ana@tridentcubed.com')).actor;
		const activity = await readActivity(test.claims, ana);
		expect(activity.isAllowed && activity.events.some((event) => 'table' in event)).toBe(false);
	});
});

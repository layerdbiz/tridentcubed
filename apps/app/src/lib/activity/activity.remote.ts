// The Activity's data layer (#306): one query, read whole each time the Activity opens, and again for each Show Older
// with the time to read before. It is a public endpoint, so it checks the request's User itself: signed out or a Guest
// gets nothing, and anyone but an Admin reads only what they are privy to (the one permission check, inside
// `readActivity`). The live updates research (#282) decides how it later stays up to date; that source plugs in behind
// `readActivity`, and this query becomes its live form. The one command records a project opened and a report's PDF
// downloaded, for anyone signed in to an organization: what they did shows in an Admin's Activity, and their own.
import { command, query } from '$app/server';
import * as v from 'valibot';
import { readActivity, readNotifications, recordProjectActivity } from '#lib/server/activity.js';
import { requireStaff } from '#lib/server/server.js';

/**
 * Which page: the newest, or the one before the oldest shown (an ISO time); of the whole Activity, or `about` one
 * project or record (a ⋮ menu's View Activity).
 */
const PAGE = v.optional(
	v.object({
		before: v.optional(v.pipe(v.string(), v.isoTimestamp())),
		about: v.optional(
			v.object({
				table: v.picklist(['project', 'customer', 'team', 'transport', 'facility']),
				rowId: v.pipe(v.string(), v.uuid())
			})
		)
	})
);

/**
 * The Activity, newest first: an Admin's the whole organization's, with when each person last signed in; anyone else's
 * only what they are privy to; `about` one project's or record's own.
 */
export const fetchActivity = query(PAGE, async (page) => {
	const { actor, claims } = await requireStaff();
	return readActivity(claims, actor, { before: page?.before, about: page?.about });
});

/** What the app records itself: a project opened, or a report's PDF downloaded. */
const PROJECT_ACTIVITY = v.object({
	kind: v.picklist(['open', 'download']),
	projectId: v.pipe(v.string(), v.uuid())
});

/** Records that the User opened `projectId`, or downloaded its PDF; an opening again soon after counts once. */
export const recordActivity = command(PROJECT_ACTIVITY, async (done) => {
	const { actor, claims } = await requireStaff();
	return recordProjectActivity(claims, actor, done);
});

/** The bell's Notifications (#403): the newest changes about the User asking, for anyone on the staff. */
export const fetchNotifications = query(async () => {
	const { actor, claims } = await requireStaff();
	return readNotifications(claims, actor);
});

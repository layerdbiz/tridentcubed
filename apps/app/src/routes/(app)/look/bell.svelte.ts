// The bell's Notifications (#403; Justin, 2026-11-27, picked on the prototype): only what is about the person signed
// in, the changes others made in their projects and what was done to them (`fetchNotifications`), and What's New's
// days. The bell counts the lines not seen yet (seen.ts), and a line stops counting only when it is tapped. It reads
// them as the app opens, each time the bell opens, and every few minutes while the app is open.
import { fetchNotifications } from '#lib/activity/activity.remote.js';
import type { ChangeEventType } from '#lib/activity/activity.types.js';
import type { WhatsNewState } from '#lib/releases/releases.state.svelte.js';
import { toTag } from '#lib/releases/releases.utils.js';
import type { ReleaseLineType } from './activity-list.svelte';
import type { LookState } from './look.state.svelte';
import { markSeen, unseenOf } from './seen';

/** How often the bell reads again while the app is open. */
export const NOTIFICATIONS_EVERY_MS = 3 * 60_000;

/** How many of What's New's days the bell shows, with every version each of them released. */
const RELEASE_DAYS = 3;

/**
 * What's New's newest sections as the bell's lines: new while a thing in them was not seen in What's New. Every push
 * to next is a release (#400), so one day can hold several: each is named by its version as What's New tags it
 * ("v1.0.0-next.6"), or by its day while nothing has released it, and keyed by its last moment, never by its day.
 */
export function toReleaseLines(whatsNew: WhatsNewState): ReleaseLineType[] {
	const history = whatsNew.history;
	if (!history) return [];
	const days = [...new Set(history.batches.map((batch) => batch.day))].slice(0, RELEASE_DAYS);
	return history.batches
		.filter((batch) => days.includes(batch.day))
		.map((batch) => {
			const words = batch.changes.map((change) => change.text);
			return {
				id: `release-${batch.release?.version ?? batch.day}-${batch.to}`,
				at: batch.to,
				from: batch.from,
				title: batch.release ? toTag(batch.release.version) : batch.day,
				words:
					words.length > 2
						? `${words.slice(0, 2).join(' · ')} and ${words.length - 2} more`
						: words.join(' · '),
				isNew:
					whatsNew.seenAt >= 0 && batch.changes.some((change) => change.landed > whatsNew.seenAt)
			};
		});
}

export class NotificationsState {
	#look: () => LookState;
	#whatsNew: WhatsNewState;

	/** The newest changes about the person, newest first. */
	events = $state.raw<ChangeEventType[]>([]);
	/** The last read failed. */
	hasFailed = $state(false);
	/** It was read at least once. */
	isRead = $state(false);
	/** Grouped, as the Activity Log can be: one by one until switched, and kept while the app is open. */
	isGrouped = $state(false);

	constructor(look: () => LookState, whatsNew: WhatsNewState) {
		this.#look = look;
		this.#whatsNew = whatsNew;
	}

	/** What's New's days, as lines. */
	get releases() {
		return toReleaseLines(this.#whatsNew);
	}

	/** The ids of the lines not seen yet. */
	get unread() {
		return unseenOf(this.#look(), this.events);
	}

	/** The number on the bell. */
	get count() {
		return this.unread.size + this.releases.filter((release) => release.isNew).length;
	}

	/** Reads them again; what was read stays when it fails. */
	async read() {
		try {
			const query = fetchNotifications();
			if (this.isRead) await query.refresh();
			const found = await query;
			this.events = found.isAllowed ? found.events : [];
			this.hasFailed = false;
		} catch {
			this.hasFailed = true;
		} finally {
			this.isRead = true;
		}
	}

	/** A line tapped: it is seen, on every device. */
	see(id: string) {
		markSeen(this.#look(), [id]);
	}
}

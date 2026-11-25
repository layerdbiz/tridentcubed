// The Activity (#306; the glossary's Activity): the organization's running list of what happens in the app, newest
// first, and when each person last signed in. The server reads it (`readActivity`, `#lib/server/activity.ts`) from
// what the database already keeps: the sign-in sessions and the change record (the History). Only an Admin sees it.
import type { DeviceKindType } from '#lib/presence/presence.utils.js';
import type { TableNameType } from '#lib/rows/rows.schema.js';

/** A sign-in, a row added (a project among them), a row changed, or a row moved to the Trash. */
export type ActivityKindType = 'signIn' | 'add' | 'change' | 'trash';

export type ActivityEventType = {
	/** The session's id for a sign-in, the change id for the rest. */
	id: string;
	/** When it happened, as an ISO time. */
	at: string;
	kind: ActivityKindType;
	/** Who did it: their Team record's name, else their User's name, else "Someone" for a User no longer there. */
	who: string;
	userId: string | null;
	/** What kind of row it was, as the app says it in a sentence: "project", "customer", "photo". Not for a sign-in. */
	thing?: string;
	table?: TableNameType;
	/** The row's own name or title, when it has one. */
	name?: string;
	/** The title of the project a row inside one belongs to. */
	project?: string;
	/** What a new project started with, added in the same save and given no line of their own: "7 panels". */
	parts?: string[];
	/** What a change changed, as the app labels it: "Title", "Status". */
	columns?: string[];
	/** The device a sign-in came from, as the Online list says it: "iPhone · Safari". */
	device?: string;
	deviceKind?: DeviceKindType;
};

/** When one person last signed in, and on what. */
export type LastSignInType = {
	userId: string;
	who: string;
	at: string;
	/**
	 * True when no sign-in session of theirs is left (Log Out ends one), so `at` is their first sign-in, the one the
	 * database always keeps.
	 */
	isFirst: boolean;
	device?: string;
	deviceKind?: DeviceKindType;
};

export type ActivityType = {
	events: ActivityEventType[];
	people: LastSignInType[];
	/** True when older sign-ins or changes were left out: only the newest are read. */
	isCut: boolean;
};

/** What the Activity's read answers: the Activity, or why this User may not see it. */
export type ActivityResultType =
	| ({ isAllowed: true } & ActivityType)
	| { isAllowed: false; reason: string };

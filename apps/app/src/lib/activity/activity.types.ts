// The Activity (#306; the glossary's Activity): the organization's running list of what happens in the app, newest
// first, and when each person last signed in. The server reads it (`readActivity`, `#lib/server/activity.ts`) from
// what the database already keeps: the record of every sign-in and the change record (the History). Only an Admin
// sees it.
import type { DeviceKindType } from '#lib/presence/presence.utils.js';
import type { TableNameType } from '#lib/rows/rows.schema.js';

/** A sign-in, a row added (a project among them), a row changed, or a row moved to the Trash. */
export type ActivityKindType = 'signIn' | 'add' | 'change' | 'trash';

/** What every line of the Activity says: when, and who. */
type ActivityLineType = {
	/** The sign-in's id for a sign-in, the change id for the rest. */
	id: string;
	/** When it happened, as an ISO time. */
	at: string;
	/** Who did it: their Team record's name, else their User's name, else "Someone" for a User no longer there. */
	who: string;
	userId: string | null;
};

/** A sign-in, and the device it came from. */
export type SignInEventType = ActivityLineType & {
	kind: 'signIn';
	/** True for a Guest's: someone who belongs to no organization yet, waiting for access. */
	isGuest?: boolean;
	/** The device a sign-in came from, as the Online list says it: "iPhone · Safari". */
	device?: string;
	deviceKind?: DeviceKindType;
};

/** A row added, changed or moved to the Trash. */
export type ChangeEventType = ActivityLineType & {
	kind: Exclude<ActivityKindType, 'signIn'>;
	/** What kind of row it was, as the app says it in a sentence: "project", "customer", "photo". */
	thing: string;
	table: TableNameType;
	/** The row's id: a tap on a panel's name opens its project's Edit at it. */
	rowId: string;
	/** The id of the project it is, or is inside, which a tap on the project's name opens. */
	projectId?: string;
	/** The row's own name or title, when it has one. */
	name?: string;
	/** The title of the project a row inside one belongs to. */
	project?: string;
	/** What a new project started with, added in the same save and given no line of their own: "7 panels". */
	parts?: string[];
	/** What a change changed, as the app labels it: "Title", "Status". Empty for an add or a move to the Trash. */
	columns: string[];
};

/** One line of the Activity: a sign-in, or a change to a row. */
export type ActivityEventType = SignInEventType | ChangeEventType;

/** When one person last signed in, and on what. */
export type LastSignInType = {
	userId: string;
	who: string;
	at: string;
	/**
	 * True when no sign-in of theirs is recorded (theirs all came before the record began), so `at` is their first
	 * sign-in, when their account was made.
	 */
	isFirst: boolean;
	/** True for a Guest: someone who belongs to no organization yet, waiting for access. */
	isGuest?: boolean;
	/** A Guest's email, which an Admin lets them in with. */
	email?: string;
	device?: string;
	deviceKind?: DeviceKindType;
};

export type ActivityType = {
	events: ActivityEventType[];
	people: LastSignInType[];
	/**
	 * When older sign-ins or changes are left out, the ISO time to read them before (Show Older): a page holds only
	 * the newest.
	 */
	olderBefore?: string;
};

/** What the Activity's read answers: the Activity, or why this User may not see it. */
export type ActivityResultType =
	| ({ isAllowed: true } & ActivityType)
	| { isAllowed: false; reason: string };

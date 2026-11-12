// The row registry (glossary "How the app saves"; ADR 0005 and its 2026-11-12 amendment; #183): every table that
// saves through the one save command, declared once. The save command validates and applies changes from it, the
// queries load from it and the sync loop orders its changes by it, so a new table is one entry here plus its Drizzle
// table (`#lib/server/rows.ts` TABLES), its mapper code and its round-trip test. No new endpoint.
//
// An entry says:
// - `columns`: the columns a device may set, by their Drizzle (camelCase) names, each with its Valibot check. The id,
//   the organization and the created, updated and deleted times are never among them: the server sets those.
// - `parent`: the row it belongs to (a contact's customer), so a child is never saved before its parent.
// - `scope`: `organization` rows load with the lists when the app starts; `project` rows load when their project
//   opens (#186).
// - `isNamed`: the screens name its rows by `name`, so a name is unique on its page among rows outside the Trash,
//   and the rows in the Trash still load, so a project that used one still shows its name.
// - `reads`: columns only the server sets that still load with the row (a Team record's User and last seen), so the
//   screens can show them. A device never sends them.
//
// The order of `TABLES` is the order a batch's puts are applied in: a parent comes before its children.
// The rules of who may change what are not here: they live in the one permission check (`#lib/server/permission.ts`).
import * as v from 'valibot';

const TEXT = v.pipe(v.string(), v.maxLength(20_000));
// A picture's address. Until uploads go to storage (#187) a picked picture is kept inline as a data URL, so this is
// large; #187 makes it the app's file address and tightens it.
const PICTURE = v.pipe(v.string(), v.maxLength(4_000_000));
const NAME = v.pipe(
	v.string(),
	v.check((name) => name.trim().length > 0, 'A name is needed.'),
	v.maxLength(200)
);
const ID = v.pipe(v.string(), v.uuid());
const POSITION = v.pipe(v.number(), v.integer(), v.minValue(0));
const ROLE = v.picklist(['admin', 'manager', 'team']);

export type TableSpecType = {
	columns: Record<string, v.GenericSchema>;
	parent?: { table: string; column: string };
	scope: 'organization' | 'project';
	isNamed?: boolean;
	reads?: readonly string[];
};

export const TABLES = {
	customer: {
		scope: 'organization',
		isNamed: true,
		columns: {
			name: NAME,
			code: TEXT,
			types: TEXT,
			icon: PICTURE,
			logo: PICTURE,
			picture: PICTURE,
			city: TEXT,
			address: TEXT,
			email: TEXT,
			phone: TEXT,
			website: TEXT
		}
	},
	contact: {
		scope: 'organization',
		parent: { table: 'customer', column: 'customerId' },
		columns: {
			customerId: ID,
			position: POSITION,
			name: TEXT,
			title: TEXT,
			email: TEXT,
			phone: TEXT,
			photo: PICTURE
		}
	},
	// Team records (#185). Their role is a membership's once its User has signed in: only an Admin changes it
	// (`#lib/server/permission.ts`), and the save command moves the membership with it.
	team: {
		scope: 'organization',
		isNamed: true,
		reads: ['userId', 'lastSeen'],
		columns: {
			name: NAME,
			title: TEXT,
			labels: TEXT,
			role: ROLE,
			phone: TEXT,
			email: TEXT,
			location: TEXT,
			photo: PICTURE,
			link: TEXT,
			rank: POSITION
		}
	}
} as const satisfies Record<string, TableSpecType>;

export type TableNameType = keyof typeof TABLES;

export const TABLE_NAMES = Object.keys(TABLES) as TableNameType[];

export const OPERATIONS = ['put', 'delete'] as const;

export type OperationType = (typeof OPERATIONS)[number];

export type RowValuesType = Record<string, unknown>;

/** One row as the mapper writes it and the sync loop compares it: its table, its id and its columns. */
export type RowType = { table: TableNameType; id: string; values: RowValuesType };

/** One row as the server keeps it: with the times the server set. A row in the Trash has `deletedAt`. */
export type SavedRowType = RowType & {
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

/** One put or delete of a row, with a change id made on the device, so a change sent twice counts once. */
export type RowChangeType = {
	changeId: string;
	table: TableNameType;
	id: string;
	operation: OperationType;
	/** For a put: the columns that changed, and only those. */
	values?: RowValuesType;
};

export type BatchType = { changes: RowChangeType[] };

/** What the save command answers: applied, or refused with a reason the app shows. */
export type SaveResultType = { isSaved: true } | { isSaved: false; reason: string };

/** The batch as it arrives at the save command. Each change's columns are checked after, against its table. */
export const BATCH = v.object({
	changes: v.pipe(
		v.array(
			v.object({
				changeId: ID,
				table: v.picklist(TABLE_NAMES),
				id: ID,
				operation: v.picklist(OPERATIONS),
				values: v.optional(v.record(v.string(), v.unknown()))
			})
		),
		v.maxLength(1_000)
	)
});

const VALUES = Object.fromEntries(
	TABLE_NAMES.map((table) => [
		table,
		v.strictObject(
			Object.fromEntries(
				Object.entries(TABLES[table].columns as Record<string, v.GenericSchema>).map(
					([column, schema]) => [column, v.optional(schema)]
				)
			)
		)
	])
) as unknown as Record<TableNameType, v.GenericSchema>;

/** Checks a put's columns against its table: a reason when they do not fit, else nothing. */
export function checkValues(table: TableNameType, values: RowValuesType): string | undefined {
	const result = v.safeParse(VALUES[table], values);
	if (result.success) return undefined;
	const [issue] = result.issues;
	const column = issue.path?.map((item) => String(item.key)).join('.');
	return column ? `${table} ${column}: ${issue.message}` : issue.message;
}

/** The columns of a table a device may set. */
export function columnsOf(table: TableNameType) {
	return Object.keys(TABLES[table].columns);
}

/** The columns of a table that load with its rows: those a device may set, then those only the server sets. */
export function readsOf(table: TableNameType) {
	const spec: TableSpecType = TABLES[table];
	return [...columnsOf(table), ...(spec.reads ?? [])];
}

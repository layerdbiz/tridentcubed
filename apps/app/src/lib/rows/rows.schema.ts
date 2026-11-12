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
// A picture's address: the app's address of a file in storage (`/files/<id>`, #187), a starting file (`/start/...`)
// or nothing. A column declared with it holds a file, so a device may ask for an upload address for it
// (`holdsFile`). Pictures not yet wired to the upload helper still arrive inline as data URLs, so it stays large until
// every picture uploads (open item after #184, #185 and #187).
export const PICTURE = v.pipe(v.string(), v.maxLength(4_000_000));
const NAME = v.pipe(
	v.string(),
	v.check((name) => name.trim().length > 0, 'A name is needed.'),
	v.maxLength(200)
);
const ID = v.pipe(v.string(), v.uuid());
const POSITION = v.pipe(v.number(), v.integer(), v.minValue(0));
const ROLE = v.picklist(['admin', 'manager', 'team']);
const OPTIONAL_ID = v.nullable(ID);
const STATUS = v.picklist([
	'Draft',
	'In Progress',
	'Review',
	'Ready',
	'Sent',
	'Revision',
	'Complete',
	'Archived'
]);

/** Every transport mode there is; its type (Sea, Air, Rail, Road) is read from it (look.data.ts TRANSPORT_TYPES). */
export const TRANSPORT_MODES = [
	'Vessel',
	'Barge',
	'Plane',
	'Train',
	'Railcar',
	'Truck',
	'Trailer'
] as const;

export const FACILITY_KINDS = ['Port', 'Airport', 'Rail yard', 'Depot'] as const;

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
	// #184: Transport Modes, Facilities, saved places and the organization's own details.
	transport: {
		scope: 'organization',
		isNamed: true,
		columns: {
			name: NAME,
			mode: v.picklist(TRANSPORT_MODES),
			picture: PICTURE,
			source: v.picklist(['manual', 'api']),
			particulars: v.pipe(
				v.record(v.pipe(v.string(), v.maxLength(200)), v.pipe(v.string(), v.maxLength(2_000))),
				v.check((map) => Object.keys(map).length <= 50, 'Too many particulars.')
			)
		}
	},
	facility: {
		scope: 'organization',
		isNamed: true,
		columns: {
			name: NAME,
			kind: v.picklist(FACILITY_KINDS),
			city: TEXT,
			address: TEXT,
			picture: PICTURE,
			contactName: TEXT,
			phone: TEXT,
			email: TEXT
		}
	},
	place: {
		scope: 'organization',
		isNamed: true,
		columns: {
			name: NAME,
			latitude: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
			longitude: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
			detail: TEXT
		}
	},
	// The organization itself (Better Auth's table): only its name saves from the app. Only an Admin changes it,
	// its details or its disclaimer points (the one permission check).
	organization: {
		scope: 'organization',
		columns: { name: NAME }
	},
	organization_details: {
		scope: 'organization',
		columns: {
			logo: PICTURE,
			address: TEXT,
			phone: TEXT,
			email: TEXT,
			groupEmail: TEXT,
			website: TEXT,
			disclaimerOpening: TEXT,
			disclaimerNote: TEXT,
			closing: TEXT,
			signoff: TEXT
		}
	},
	disclaimer_point: {
		scope: 'organization',
		parent: { table: 'organization_details', column: 'detailsId' },
		columns: {
			detailsId: ID,
			position: POSITION,
			title: TEXT,
			text: TEXT
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
	},
	// Projects (#186). The list loads at start, so the project and its Team Assigned are `organization` rows; what
	// is inside it (its personnel and panels, and the panels' contents after #188 and #189) loads when it opens.
	// Every row inside a project carries `projectId`, which `fetchProject` and the freeze read. Who made it, its J
	// count and the status it had before Sent are the server's to set.
	project: {
		scope: 'organization',
		reads: ['createdBy', 'job', 'statusBeforeSent'],
		columns: {
			title: TEXT,
			subtitle: TEXT,
			projectType: TEXT,
			customerId: OPTIONAL_ID,
			contactId: OPTIONAL_ID,
			teamLeadId: OPTIONAL_ID,
			location: TEXT,
			status: STATUS,
			progress: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)),
			day: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'A day is YYYY-MM-DD.'))
		}
	},
	project_team: {
		scope: 'organization',
		parent: { table: 'project', column: 'projectId' },
		columns: { projectId: ID, teamId: ID, position: POSITION }
	},
	personnel_company: {
		scope: 'project',
		parent: { table: 'project', column: 'projectId' },
		columns: { projectId: ID, position: POSITION, company: TEXT }
	},
	personnel_person: {
		scope: 'project',
		parent: { table: 'personnel_company', column: 'companyId' },
		columns: { projectId: ID, companyId: ID, position: POSITION, name: TEXT, title: TEXT }
	},
	panel: {
		scope: 'project',
		parent: { table: 'project', column: 'projectId' },
		columns: {
			projectId: ID,
			kind: v.picklist(['project', 'transport', 'items', 'timelog', 'photos']),
			key: TEXT,
			name: TEXT,
			icon: TEXT,
			control: v.picklist(['locked', 'switch', 'remove']),
			isEnabled: v.boolean(),
			position: POSITION
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

/**
 * What the save command answers: applied, or refused with a reason the app shows. An applied batch also gives back
 * the columns only the server sets (`reads`) of the rows it put, such as a new project's J count, so the screens show
 * them without loading the lists again.
 */
export type SaveResultType =
	| { isSaved: true; reads?: RowType[] }
	| { isSaved: false; reason: string };

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

/** Whether a column of a table that saves keeps a file's address (it is declared with `PICTURE`). */
export function holdsFile(table: string, column: string) {
	const spec = (TABLES as Record<string, TableSpecType>)[table];
	return Boolean(spec && Object.hasOwn(spec.columns, column) && spec.columns[column] === PICTURE);
}

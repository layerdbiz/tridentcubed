// Files (glossary "File"; ADR 0004; spec #179 "Files"; #187): what the device sends when it asks for an upload
// address, and what it gets back. A file is for one column of one row (a customer's logo, a contact's photo): the
// server checks that column holds files and that the User may change that row, then hands back the app's own
// address of the file (`/files/<id>`), which is all a row ever keeps, and where to send the bytes.
import * as v from 'valibot';
import type { TableNameType } from '#lib/rows/rows.schema.js';

/** The app's address of a file: what rows keep and screens show. It checks the session, then hands a signed link. */
export const FILE_PREFIX = '/files/';

/** The biggest file storage takes. A shrunk photo is far smaller (ADR 0004). */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** The kinds of file storage keeps, with the ending its path takes. */
export const FILE_TYPES: Record<string, string> = {
	'image/webp': 'webp',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	// #188: the item list itself, attached to the Items panel as it came.
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
	'application/vnd.ms-excel': 'xls',
	'text/csv': 'csv',
	'application/pdf': 'pdf'
};

/** The kinds of file that are not pictures: kept as they came, and only where a column takes them. */
export const DOCUMENT_TYPES = Object.keys(FILE_TYPES).filter((type) => !type.startsWith('image/'));

/**
 * The one private Storage bucket, as it must be made in Supabase (#194): the source of truth for its name, the kinds
 * of file it takes and its size limit. The store (`#lib/server/store.ts`) and the upload check read it, so the bucket
 * refuses nothing the app lets through, and takes nothing the app would refuse.
 */
export const STORAGE_BUCKET = {
	name: 'files',
	isPublic: false,
	fileSizeLimit: MAX_FILE_BYTES,
	allowedMimeTypes: Object.keys(FILE_TYPES)
} as const;

/** The columns that take a document as well as a picture: an item attachment (#188). */
const DOCUMENT_COLUMNS = ['item_attachment/file'];

/** Whether a file of this type may be kept for this table and column. */
export function isTypeAllowed(type: string, table: string, column: string) {
	if (!Object.hasOwn(FILE_TYPES, type)) return false;
	return !DOCUMENT_TYPES.includes(type) || DOCUMENT_COLUMNS.includes(`${table}/${column}`);
}

/** A document's type from its name, for a browser that hands it over with none (a CSV on some systems). */
export function toDocumentType(name: string) {
	const ending = name.split('.').pop()?.toLowerCase() ?? '';
	return DOCUMENT_TYPES.find((type) => FILE_TYPES[type] === ending) ?? '';
}

/** Where the time and place came from: the photo's own metadata, the device at that moment, or nowhere. */
export const TAKEN_FROM = ['file', 'device', ''] as const;

export type TakenFromType = (typeof TAKEN_FROM)[number];

export type TakenType = {
	from: TakenFromType;
	/** When it was taken, as an ISO time. */
	at?: string;
	latitude?: number;
	longitude?: number;
};

/**
 * What a file is for: the table, the column and (for a row already made) the row. A row inside a project not saved
 * yet (a photo, #189) names its project, so a Sent project refuses the upload before the bytes are sent.
 */
export type FileTargetType = {
	table: TableNameType;
	column: string;
	id?: string;
	projectId?: string;
};

const UUID = v.pipe(v.string(), v.uuid());

export const UPLOAD_REQUEST = v.object({
	for: v.object({
		table: v.pipe(v.string(), v.maxLength(64)),
		column: v.pipe(v.string(), v.maxLength(64)),
		id: v.optional(UUID),
		projectId: v.optional(UUID)
	}),
	name: v.pipe(v.string(), v.maxLength(300)),
	type: v.pipe(v.string(), v.maxLength(100)),
	size: v.pipe(v.number(), v.integer(), v.minValue(0)),
	width: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	height: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
	taken: v.object({
		from: v.picklist(TAKEN_FROM),
		at: v.optional(v.pipe(v.string(), v.isoTimestamp())),
		latitude: v.optional(v.pipe(v.number(), v.minValue(-90), v.maxValue(90))),
		longitude: v.optional(v.pipe(v.number(), v.minValue(-180), v.maxValue(180)))
	})
});

export type UploadRequestType = v.InferOutput<typeof UPLOAD_REQUEST>;

/** Where the device sends the bytes: one PUT of the file itself, with these headers. */
export type UploadTargetType = { method: 'PUT'; url: string; headers: Record<string, string> };

export type UploadAnswerType =
	| { isAllowed: true; id: string; address: string; upload: UploadTargetType }
	| { isAllowed: false; reason: string };

/** The app's address of the file with this id. */
export function toFileAddress(id: string) {
	return `${FILE_PREFIX}${id}`;
}

/** Whether a picture's value is a file in storage (not a starting file, a data URL or nothing). */
export function isFileAddress(value: string) {
	return value.startsWith(FILE_PREFIX);
}

/**
 * How a report's picture loads (#190, review fixes): a file in storage is fetched with CORS, so the preview may draw
 * it on a canvas to shrink it before the PDF export even when its signed link is on Supabase Storage's own address
 * (which allows any origin). Anything else loads as usual.
 */
export function toCrossOrigin(address: string) {
	return isFileAddress(address) ? ('anonymous' as const) : undefined;
}

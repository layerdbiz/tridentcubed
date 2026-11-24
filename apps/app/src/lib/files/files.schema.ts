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

/** The kinds of file the app knows by type, with the ending its path takes. */
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

/** The kinds of file that are not pictures and that the app knows by name: kept as they came. */
export const DOCUMENT_TYPES = Object.keys(FILE_TYPES).filter((type) => !type.startsWith('image/'));

/** What a file is kept as when neither the browser nor its name says what it is (#233). */
export const ANY_TYPE = 'application/octet-stream';

/**
 * The one private Storage bucket, as it must be made in Supabase (#194): the source of truth for its name and its
 * size limit. It takes any kind of file (#233: Attach File takes whatever the item list came as), so `null`, which
 * is how Storage says "any". Which column takes which kind is the upload check's to say (`isTypeAllowed`): every
 * address a device sends bytes to was handed out by that check.
 */
export const STORAGE_BUCKET = {
	name: 'files',
	isPublic: false,
	fileSizeLimit: MAX_FILE_BYTES,
	allowedMimeTypes: null
} as const;

/** The columns that take any file, not only a picture: an item attachment (#188, #233). */
const DOCUMENT_COLUMNS = ['item_attachment/file'];

// A type as browsers write one: letters, digits and a few marks either side of one slash (its length is the upload
// request's to cap). It goes into a header of the upload, so nothing else is let through.
const TYPE = /^[\w.+-]+\/[\w.+-]+$/;

/** Whether a file of this type may be kept for this table and column. */
export function isTypeAllowed(type: string, table: string, column: string) {
	if (DOCUMENT_COLUMNS.includes(`${table}/${column}`)) return TYPE.test(type);
	return Object.hasOwn(FILE_TYPES, type) && !DOCUMENT_TYPES.includes(type);
}

/** A document's type from its name, for a browser that hands it over with none (a CSV on some systems). */
export function toDocumentType(name: string) {
	const ending = name.split('.').pop()?.toLowerCase() ?? '';
	return DOCUMENT_TYPES.find((type) => FILE_TYPES[type] === ending) ?? ANY_TYPE;
}

/** The ending a file's path takes in storage: its type's, else its own name's when that is a plain one, else `bin`. */
export function toEnding(type: string, name: string) {
	if (Object.hasOwn(FILE_TYPES, type)) return FILE_TYPES[type];
	const ending = name.includes('.') ? (name.split('.').pop()?.toLowerCase() ?? '') : '';
	return /^[a-z0-9]{1,12}$/.test(ending) ? ending : 'bin';
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

/**
 * The original's full field list, kept on a photo's File row (Justin, 2026-11-24, on #281): what ExifReader reads
 * of it, group by group, so a field the stored copy has no slot for is never lost (`toFieldList`).
 */
export type FieldListType = Record<string, unknown>;

/** The longest field list kept, written out as JSON. A phone photo's is a few KB to a few hundred. */
export const MAX_FIELD_LIST_CHARACTERS = 1024 * 1024;

/** The longest single text a field list keeps; anything longer is a picture or a blob, noted by its length. */
const MAX_TEXT_CHARACTERS = 64 * 1024;

/** A list of bytes at least this long is kept as base64, a third longer than the bytes rather than four times. */
const MIN_BASE64_BYTES = 1024;

// A character a Postgres JSON value cannot hold: the zero character, or half of a surrogate pair.
const UNSTORABLE = /\0|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

function toCodes(text: string) {
	return Array.from({ length: text.length }, (_, at) => text.charCodeAt(at));
}

function isByteList(value: unknown[]) {
	return value.every(
		(item) => Number.isInteger(item) && (item as number) >= 0 && (item as number) <= 255
	);
}

function toBase64(bytes: ArrayLike<number>) {
	return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

/**
 * A value as a Postgres JSON column keeps it, every field of it: a text with a character Postgres refuses as its
 * character codes (`{ codes }`), a very long text by its length (`{ characters }`), a long list of bytes as base64
 * (`{ base64 }`), raw bytes (a picture inside the metadata) by their size (`{ bytes }`), and nothing that is not
 * plain data. Run on the device for the field list, and on the server again before it is written.
 */
export function toStorableJson(value: unknown): unknown {
	if (typeof value === 'string') {
		if (value.length > MAX_TEXT_CHARACTERS) return { characters: value.length };
		return UNSTORABLE.test(value) ? { codes: toCodes(value) } : value;
	}
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'boolean' || value === null) return value;
	if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return { bytes: value.byteLength };
	if (Array.isArray(value)) {
		if (value.length >= MIN_BASE64_BYTES && isByteList(value)) return { base64: toBase64(value) };
		return value.map((item) => toStorableJson(item) ?? null);
	}
	if (typeof value !== 'object') return undefined;
	const object = value as Record<string, unknown>;
	const isPicture = object.image instanceof ArrayBuffer || ArrayBuffer.isView(object.image);
	const kept: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(object)) {
		// A picture's base64 is its bytes again.
		if (isPicture && key === 'base64') continue;
		const storable = toStorableJson(item);
		if (storable === undefined) continue;
		kept[UNSTORABLE.test(key) ? `codes:${toCodes(key).join(',')}` : key] = storable;
	}
	return kept;
}

/** Whether a field list is no longer than the limit once written out as it is kept. */
export function isFieldListKept(list: FieldListType) {
	return (JSON.stringify(toStorableJson(list)) ?? '').length <= MAX_FIELD_LIST_CHARACTERS;
}

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
	}),
	metadata: v.optional(
		v.pipe(
			v.record(v.string(), v.unknown()),
			v.check(isFieldListKept, 'The photo’s field list is too long to keep.')
		)
	)
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

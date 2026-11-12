// Files (glossary "File"; ADR 0004; spec #179 "Files"; #187): what the device sends when it asks for an upload
// address, and what it gets back. A file is for one column of one row (a customer's logo, a contact's photo): the
// server checks that column holds files and that the User may change that row, then hands back the app's own
// address of the file (`/files/<id>`), which is all a row ever keeps, and where to send the bytes.
import * as v from 'valibot';

/** The app's address of a file: what rows keep and screens show. It checks the session, then hands a signed link. */
export const FILE_PREFIX = '/files/';

/** The biggest file storage takes. A shrunk photo is far smaller (ADR 0004). */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** The kinds of file storage keeps, with the ending its path takes. Item attachments (#188) add theirs here. */
export const FILE_TYPES: Record<string, string> = {
	'image/webp': 'webp',
	'image/jpeg': 'jpg',
	'image/png': 'png'
};

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
export type FileTargetType = { table: string; column: string; id?: string; projectId?: string };

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

// Files, the server half (glossary "File"; ADR 0004; spec #179 "Files"; #187). `createUpload` is what asking for an
// upload address does: the column must hold files, the one permission check must let the User change that row, and
// then a file row is written (through the claims helper, so it is the User's organization's) and the store makes a
// short-lived address the device sends the bytes to, straight to storage. `findFileLink` is what the app's address of
// a file does: a member of the file's organization gets a short-lived signed link; anyone else gets nothing.
// `readFieldList` reads the original's full field list a photo keeps (#292), which nothing else reads.
// `readFileDetails` reads what the photo pop-up's Details and a tile's type say of a file (#343, #349).
import { eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import {
	type CarriedType,
	type FieldListType,
	type FileDetailsType,
	type FileFactsType,
	isTypeAllowed,
	MAX_FILE_BYTES,
	type TakenType,
	toEnding,
	toFileAddress,
	toOriginalFacts,
	toStorableJson,
	type UploadAnswerType,
	type UploadRequestType
} from '#lib/files/files.schema.js';
import { holdsFile } from '#lib/rows/rows.schema.js';
import type { ActorType, ClaimsType } from './db/claims';
import { file as files } from './db/schema';
import { checkPut } from './rows';
import { LINK_SECONDS, type FileStoreType } from './store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REASONS = {
	guest: 'You are waiting for access. An Admin of the organization can let you in.',
	notAFile: (table: string, column: string) => `${table} ${column} does not hold a file.`,
	type: (type: string) => `A ${type || 'typeless'} file cannot be kept here.`,
	size: `That file is bigger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`
};

/** A file row as the app reads it. */
export type FileType = {
	id: string;
	for: { table: string; column: string; id?: string };
	path: string;
	name: string;
	type: string;
	size: number;
	width?: number;
	height?: number;
	taken: TakenType;
	/** Where the untouched file a device sent still lies, when the server's copy could not carry every field (#294). */
	originalPath?: string;
	/** #343: the file the User picked, as it arrived; nothing for a file kept before it was recorded. */
	original?: FileFactsType;
	/** #343: whether every metadata field of the original came across. */
	carried: CarriedType;
	uploadedBy?: string;
	createdAt: string;
};

// Every column but the field list, which can run to a few hundred KB and is read on its own.
const { metadata: _fieldList, ...FILE_COLUMNS } = getTableColumns(files);

type FileRowType = Omit<typeof files.$inferSelect, 'metadata'>;

function toTaken(row: FileRowType): TakenType {
	const taken: TakenType = { from: row.takenFrom as TakenType['from'] };
	if (row.takenAt) taken.at = row.takenAt.toISOString();
	if (row.latitude !== null) taken.latitude = row.latitude;
	if (row.longitude !== null) taken.longitude = row.longitude;
	return taken;
}

// The original's facts as the row holds them, what is unknown left out; nothing when its type was never recorded.
function toOriginal(row: FileRowType): FileFactsType | undefined {
	if (!row.originalType) return undefined;
	return {
		type: row.originalType,
		...(row.originalSize !== null ? { size: row.originalSize } : {}),
		...(row.originalWidth !== null ? { width: row.originalWidth } : {}),
		...(row.originalHeight !== null ? { height: row.originalHeight } : {})
	};
}

function toFile(row: FileRowType): FileType {
	return {
		id: row.id,
		for: { table: row.forTable, column: row.forColumn, id: row.forId ?? undefined },
		path: row.path,
		name: row.name,
		type: row.type,
		size: row.size,
		width: row.width ?? undefined,
		height: row.height ?? undefined,
		taken: toTaken(row),
		originalPath: row.originalPath ?? undefined,
		original: toOriginal(row),
		carried: (row.metadataCarried || '') as CarriedType,
		uploadedBy: row.uploadedBy ?? undefined,
		createdAt: row.createdAt.toISOString()
	};
}

/** Asking for an upload address: allowed with the file's address and where to send it, or refused with a reason. */
export async function createUpload(
	claims: ClaimsType,
	actor: ActorType,
	store: FileStoreType,
	request: UploadRequestType
): Promise<UploadAnswerType> {
	if (!actor.organizationId) return { isAllowed: false, reason: REASONS.guest };
	const { table, column, id: rowId, projectId } = request.for;
	if (!holdsFile(table, column)) {
		return { isAllowed: false, reason: REASONS.notAFile(table, column) };
	}
	if (!isTypeAllowed(request.type, table, column))
		return { isAllowed: false, reason: REASONS.type(request.type) };
	const ending = toEnding(request.type, request.name);
	if (request.size > MAX_FILE_BYTES) return { isAllowed: false, reason: REASONS.size };

	const id = crypto.randomUUID();
	const address = toFileAddress(id);
	const path = `${actor.organizationId}/${id}.${ending}`;
	const organizationId = actor.organizationId;
	const verdict = await claims.run(actor, async (tx) => {
		const allowed = await checkPut(tx, actor, table, rowId, {
			[column]: address,
			...(projectId ? { projectId } : {})
		});
		if (!allowed.isAllowed) return allowed;
		const { taken } = request;
		// #343: the original is the file sent, unless the device says it sent a copy of another.
		const original = request.original ?? request;
		await tx.insert(files).values({
			id,
			organizationId,
			forTable: table,
			forColumn: column,
			forId: rowId ?? null,
			path,
			name: request.name,
			type: request.type,
			size: request.size,
			width: request.width ?? null,
			height: request.height ?? null,
			takenAt: taken.at ? new Date(taken.at) : null,
			latitude: taken.latitude ?? null,
			longitude: taken.longitude ?? null,
			takenFrom: taken.from,
			// Written again as Postgres keeps it, whatever the device sent, so a field list never fails an upload.
			metadata: request.metadata ? (toStorableJson(request.metadata) as FieldListType) : null,
			originalType: original.type,
			originalSize: original.size,
			originalWidth: original.width ?? null,
			originalHeight: original.height ?? null,
			metadataCarried: request.carried ?? '',
			uploadedBy: actor.userId
		});
		return allowed;
	});
	if (!verdict.isAllowed) return verdict;
	return { isAllowed: true, id, address, upload: await store.toUpload(path, request.type) };
}

/** The file row with this id, when the actor's organization has it. */
export async function readFile(claims: ClaimsType, actor: ActorType, id: string) {
	if (!actor.organizationId || !UUID.test(id)) return undefined;
	const [row] = await claims.run(actor, (tx) =>
		tx.select(FILE_COLUMNS).from(files).where(eq(files.id, id))
	);
	return row ? toFile(row) : undefined;
}

/** The full field list of the file the User picked, kept with this file, when the actor's organization has it. */
export async function readFieldList(
	claims: ClaimsType,
	actor: ActorType,
	id: string
): Promise<FieldListType | undefined> {
	if (!actor.organizationId || !UUID.test(id)) return undefined;
	const [row] = await claims.run(actor, (tx) =>
		tx.select({ metadata: files.metadata }).from(files).where(eq(files.id, id))
	);
	return row?.metadata ?? undefined;
}

/**
 * What the photo pop-up's Details and a tile's type say of each of these files (#343, #349), by id: the original the
 * User picked beside the file kept, and whether its metadata came across. Only the actor's organization's files are
 * found; any other id, or one that is not an id, is left out.
 */
export async function readFileDetails(claims: ClaimsType, actor: ActorType, ids: string[]) {
	const found = new Map<string, FileDetailsType>();
	const wanted = [...new Set(ids.filter((id) => UUID.test(id)))];
	if (!actor.organizationId || !wanted.length) return found;
	const rows = await claims.run(actor, (tx) =>
		tx
			.select({ ...FILE_COLUMNS, hasFieldList: sql<boolean>`${files.metadata} is not null` })
			.from(files)
			.where(inArray(files.id, wanted))
	);
	for (const { hasFieldList, ...row } of rows) {
		const file = toFile(row);
		found.set(file.id, {
			name: file.name,
			original: toOriginalFacts(file),
			saved: { type: file.type, size: file.size, width: file.width, height: file.height },
			carried: file.carried,
			hasFieldList,
			isOriginalKept: Boolean(file.originalPath)
		});
	}
	return found;
}

/** A short-lived link that opens the file, for a member of its organization; nothing for anyone else. */
export async function findFileLink(
	claims: ClaimsType,
	actor: ActorType,
	store: FileStoreType,
	id: string,
	seconds = LINK_SECONDS
) {
	const found = await readFile(claims, actor, id);
	return found ? store.toLink(found.path, seconds) : undefined;
}

// Files, the server half (glossary "File"; ADR 0004; spec #179 "Files"; #187). `createUpload` is what asking for an
// upload address does: the column must hold files, the one permission check must let the User change that row, and
// then a file row is written (through the claims helper, so it is the User's organization's) and the store makes a
// short-lived address the device sends the bytes to, straight to storage. `findFileLink` is what the app's address of
// a file does: a member of the file's organization gets a short-lived signed link; anyone else gets nothing.
import { eq } from 'drizzle-orm';
import {
	FILE_TYPES,
	MAX_FILE_BYTES,
	type TakenType,
	toFileAddress,
	type UploadAnswerType,
	type UploadRequestType
} from '#lib/files/files.schema.js';
import { holdsFile, type TableNameType } from '#lib/rows/rows.schema.js';
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
	uploadedBy?: string;
	createdAt: string;
};

type FileRowType = typeof files.$inferSelect;

function toTaken(row: FileRowType): TakenType {
	const taken: TakenType = { from: row.takenFrom as TakenType['from'] };
	if (row.takenAt) taken.at = row.takenAt.toISOString();
	if (row.latitude !== null) taken.latitude = row.latitude;
	if (row.longitude !== null) taken.longitude = row.longitude;
	return taken;
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
	const ending = Object.hasOwn(FILE_TYPES, request.type) ? FILE_TYPES[request.type] : undefined;
	if (!ending) return { isAllowed: false, reason: REASONS.type(request.type) };
	if (request.size > MAX_FILE_BYTES) return { isAllowed: false, reason: REASONS.size };

	const id = crypto.randomUUID();
	const address = toFileAddress(id);
	const path = `${actor.organizationId}/${id}.${ending}`;
	const organizationId = actor.organizationId;
	const verdict = await claims.run(actor, async (tx) => {
		const allowed = await checkPut(tx, actor, table as TableNameType, rowId, {
			[column]: address,
			...(projectId ? { projectId } : {})
		});
		if (!allowed.isAllowed) return allowed;
		const { taken } = request;
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
	const [row] = await claims.run(actor, (tx) => tx.select().from(files).where(eq(files.id, id)));
	return row ? toFile(row) : undefined;
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

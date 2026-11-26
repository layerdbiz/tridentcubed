// Asking for an upload address (spec #179 "Files": a named command, since it is not a row; #187), and reading what an
// attachment's file was and became (#343, #349). Public endpoints, so each checks the request's User itself; the work
// is `#lib/server/files.ts`, through the claims helper.
import { command, query } from '$app/server';
import * as v from 'valibot';
import { createUpload, readFieldList, readFileDetails } from '#lib/server/files.js';
import { requireSignedIn } from '#lib/server/server.js';
import { UPLOAD_REQUEST } from './files.schema';

/** An upload address for one file for one picture of a row, and the app's address of that file; or a reason. */
export const askUpload = command(UPLOAD_REQUEST, async (request) => {
	const { actor, claims, store } = await requireSignedIn();
	if (!store) {
		return {
			isAllowed: false as const,
			reason: 'Files cannot be kept yet: storage is not set up.'
		};
	}
	return createUpload(claims, actor, store, request);
});

/**
 * A file's details by its id (#343, #349): the original the User picked beside the file the app keeps, and whether
 * its metadata came across; nothing for a file that is not the User's organization's. Every tile of a group asks at
 * once, so the asks go together as one request.
 */
export const fetchFileDetails = query.batch(v.pipe(v.string(), v.uuid()), async (ids) => {
	const { actor, claims } = await requireSignedIn();
	const found = await readFileDetails(claims, actor, ids);
	return (id) => found.get(id) ?? null;
});

/**
 * Every metadata field of the original a photo came from (#292), for the photo pop-up's Details (#343): read only
 * when they open, since it can run to a few hundred KB; nothing for a file that is not the User's organization's.
 */
export const fetchFieldList = query(v.pipe(v.string(), v.uuid()), async (id) => {
	const { actor, claims } = await requireSignedIn();
	return (await readFieldList(claims, actor, id)) ?? null;
});

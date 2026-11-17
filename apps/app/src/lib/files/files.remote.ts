// Asking for an upload address (spec #179 "Files": a named command, since it is not a row; #187). A public endpoint,
// so it checks the request's User itself; the work is `#lib/server/files.ts`, through the claims helper.
import { command } from '$app/server';
import { createUpload } from '#lib/server/files.js';
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

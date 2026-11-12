// Asking for an upload address (spec #179 "Files": a named command, since it is not a row; #187). A public endpoint,
// so it checks the request's User itself; the work is `#lib/server/files.ts`, through the claims helper.
import { command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { createUpload } from '#lib/server/files.js';
import { getServer } from '#lib/server/server.js';
import { UPLOAD_REQUEST } from './files.schema';

/** An upload address for one file for one picture of a row, and the app's address of that file; or a reason. */
export const askUpload = command(UPLOAD_REQUEST, async (request) => {
	const { locals } = getRequestEvent();
	if (!locals.user || !locals.actor) error(401, 'Sign in first.');
	const { claims, store } = await getServer();
	if (!claims) error(503, 'The app is not connected yet.');
	if (!store) {
		return {
			isAllowed: false as const,
			reason: 'Files cannot be kept yet: storage is not set up.'
		};
	}
	return createUpload(claims, locals.actor, store, request);
});

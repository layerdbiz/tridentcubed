// The app's address of a file (spec #179 "Files"; #187): what rows keep and screens show, `/files/<id>`. It checks
// the session (the guard refuses a signed-out visitor and a Guest before this runs) and that the file is the
// member's organization's, then sends the browser on to a short-lived signed link. A guessed or foreign address
// gets nothing.
import { error } from '@sveltejs/kit';
import { findFileLink } from '#lib/server/files.js';
import { getServer } from '#lib/server/server.js';
import { LINK_SECONDS } from '#lib/server/store.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.actor?.organizationId) error(401, 'Sign in first.');
	const { claims, store } = await getServer();
	if (!claims || !store) error(404, 'No such file.');
	const link = await findFileLink(claims, locals.actor, store, params.id);
	if (!link) error(404, 'No such file.');
	// The browser keeps the redirect for half the link's life, so a screen showing a picture twice asks once.
	return new Response(null, {
		status: 302,
		headers: { location: link, 'cache-control': `private, max-age=${LINK_SECONDS / 2}` }
	});
};

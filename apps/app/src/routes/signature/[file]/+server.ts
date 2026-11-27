// A signature's picture (#354), to anyone: a reader's mail app loads it signed out, for as long as the email is read.
// Each is a PNG the server made once into the file store (#lib/server/signature.ts), named by what it was made from,
// so this only hands it on: no database, no session, and nothing else in the store answers here. Its name never
// changes, so browsers and Vercel keep it for a year.
import { error } from '@sveltejs/kit';
import { getServer } from '#lib/server/server.js';
import { SIGNATURE_FOLDER, SIGNATURE_PICTURE_FILE } from '#lib/signature/signature.constants.js';
import type { RequestHandler } from './$types';

const KEPT = 'public, max-age=31536000, s-maxage=31536000, immutable';

export const GET: RequestHandler = async ({ params }) => {
	if (!SIGNATURE_PICTURE_FILE.test(params.file)) error(404, 'No such picture.');
	const { store } = await getServer();
	const bytes = await store?.read(`${SIGNATURE_FOLDER}/${params.file}`).catch(() => undefined);
	if (!bytes) error(404, 'No such picture.');
	return new Response(bytes, {
		headers: {
			'content-type': 'image/png',
			'cache-control': KEPT,
			'access-control-allow-origin': '*'
		}
	});
};

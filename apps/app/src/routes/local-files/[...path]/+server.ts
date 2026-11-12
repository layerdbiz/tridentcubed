// The local folder store's own addresses (#187): with no Supabase settings, outside production, a device sends a
// file's bytes here and a browser opens it from here, each through a short-lived link the server signed, as it
// would with Supabase Storage. The signature is the whole check (the guard leaves these open). Anywhere files go to
// Supabase, or nowhere, these addresses do not exist.
import { error } from '@sveltejs/kit';
import { getServer } from '#lib/server/server.js';
import type { LocalStoreType } from '#lib/server/store.js';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };

async function toLocalStore(): Promise<LocalStoreType> {
	const { store } = await getServer();
	if (store?.kind !== 'local') error(404, 'Not found.');
	return store as LocalStoreType;
}

export const GET: RequestHandler = async ({ url }) => {
	const store = await toLocalStore();
	const bytes = await store.send(`${url.pathname}${url.search}`);
	if (!bytes) error(404, 'No such file.');
	const ending = url.pathname.split('.').pop() ?? '';
	return new Response(bytes, {
		headers: {
			'content-type': TYPES[ending] ?? 'application/octet-stream',
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};

export const PUT: RequestHandler = async ({ url, request }) => {
	const store = await toLocalStore();
	const isTaken = await store.receive(
		`${url.pathname}${url.search}`,
		new Uint8Array(await request.arrayBuffer())
	);
	if (!isTaken) error(403, 'That upload address is not good.');
	return new Response(null, { status: 200 });
};

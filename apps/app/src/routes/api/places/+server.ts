// Place suggestions for the location field ((app)/look/place-field.svelte). The rules live in the place lookup
// (`#lib/server/places.ts`, #184): signed-in members only, one call per new text, the day's cap, nothing without
// `GEOAPIFY_API_KEY`. The sign-in guard refuses a signed-out visitor or a Guest before this runs; the lookup checks
// again itself.
import { json } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { createPlaceLookup } from '#lib/server/places.js';

import type { RequestHandler } from './$types';

const lookUp = createPlaceLookup({
	readKey: () => env.GEOAPIFY_API_KEY ?? '',
	fetch: (...args) => globalThis.fetch(...args)
});

export const GET: RequestHandler = async ({ url, locals }) => {
	const { status, places, from } = await lookUp(locals.actor, url.searchParams.get('text') ?? '');
	if (status !== 200) return json({ places, message: 'Sign in first.' }, { status });
	return json({ places, from });
};

// Every request (#181): Better Auth's own routes (/api/auth/*) are answered by Better Auth; every other request
// finds its session into `event.locals` (renewing it once a day of use), then passes the sign-in guard.
import { building } from '$app/env';
import { json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { toGuard } from '#lib/server/guard.js';
import { getServer } from '#lib/server/server.js';

const handleSession: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	const { auth } = await getServer();
	if (!auth) return resolve(event);

	const found = await auth.api.getSession({ headers: event.request.headers });
	if (found) {
		event.locals.user = found.user;
		event.locals.session = found.session;
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

const handleGuard: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	const guard = toGuard(event.url, Boolean(event.locals.user));
	if (guard?.kind === 'refuse') return json({ message: 'Sign in first.' }, { status: 401 });
	if (guard?.kind === 'login') {
		return new Response(null, { status: 303, headers: { location: guard.location } });
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleSession, handleGuard);

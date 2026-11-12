// Every request (#181, #182): Better Auth's own routes (/api/auth/*) are answered by Better Auth; every other request
// finds its session into `event.locals` (renewing it once a day of use) and who its User is (`locals.actor`: their
// organization, role and Super admin flag, or a Guest with none), then passes the sign-in guard. A member's use of
// the app stamps their Team record as seen (#185), at most once a minute.
import { building } from '$app/env';
import { json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { findActor, stampSeen } from '#lib/server/access.js';
import { type AccessType, isClosed, toGuard } from '#lib/server/guard.js';
import { getServer } from '#lib/server/server.js';

const handleSession: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	if (isClosed(event.url)) return json({ message: 'Not found.' }, { status: 404 });
	const { auth, claims } = await getServer();
	if (!auth || !claims) return resolve(event);

	const found = await auth.api.getSession({ headers: event.request.headers });
	if (found) {
		event.locals.user = found.user;
		event.locals.session = found.session;
		event.locals.actor = await findActor(claims, found.user, found.session.activeOrganizationId);
		await stampSeen(claims, event.locals.actor).catch(() => undefined);
	}
	return svelteKitHandler({ event, resolve, auth, building });
};

function toAccess(locals: App.Locals): AccessType {
	if (!locals.user) return 'signed-out';
	return locals.actor?.organizationId ? 'member' : 'guest';
}

const handleGuard: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);
	const guard = toGuard(event.url, toAccess(event.locals));
	if (guard?.kind === 'refuse') return json({ message: guard.message }, { status: guard.status });
	if (guard?.kind === 'redirect') {
		return new Response(null, { status: 303, headers: { location: guard.location } });
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleSession, handleGuard);

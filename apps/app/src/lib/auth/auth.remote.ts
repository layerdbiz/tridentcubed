// Signing out (#181), for the account menu's Log out and, from #182, the Waiting for access page. A command may
// write cookies, so Better Auth's cleared session cookie reaches the browser through its SvelteKit cookie plugin.
// Who is signed in (#185), for the screens: the sidebar and account menu show their Team record, and a new project's
// Team Lead is them.
import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { getServer } from '#lib/server/server.js';

export const signOut = command(async () => {
	const event = getRequestEvent();
	const { auth } = await getServer();
	if (!auth || !event.locals.session) return;
	await auth.api.signOut({ headers: event.request.headers });
});

/** The signed-in User as the screens need them: their id (their Team record has it), role and Super admin flag. */
export const fetchSelf = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user || !locals.actor) error(401, 'Sign in first.');
	const { userId, role, isSuperAdmin } = locals.actor;
	return { userId, role, isSuperAdmin };
});

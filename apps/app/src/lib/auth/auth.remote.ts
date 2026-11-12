// Signing out (#181), for the account menu's Log out and, from #182, the Waiting for access page. A command may
// write cookies, so Better Auth's cleared session cookie reaches the browser through its SvelteKit cookie plugin.
import { command, getRequestEvent } from '$app/server';
import { getServer } from '#lib/server/server.js';

export const signOut = command(async () => {
	const event = getRequestEvent();
	const { auth } = await getServer();
	if (!auth || !event.locals.session) return;
	await auth.api.signOut({ headers: event.request.headers });
});

// Waiting for access (#182): the signed-in User's email, for the page a Guest is kept on. It shows only what the
// User already knows; signed out, there is nothing to show.
import { getRequestEvent, query } from '$app/server';

export const fetchWaiting = query(async () => {
	const { user } = getRequestEvent().locals;
	return { email: user?.email ?? '' };
});

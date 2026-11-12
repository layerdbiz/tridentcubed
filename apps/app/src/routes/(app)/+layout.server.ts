// The app is drawn on the device, so moving between its pages never asks the server for a page. This load makes
// every arrival ask it once (#182): the server hook's guard then sends a signed-out visitor to the login page and a
// Guest to Waiting for access, even after a client-side redirect such as signing in. It only redirects.
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.actor?.organizationId) redirect(303, '/waiting');
};

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Redirect /company to /company/emails (which then redirects to first person)
	redirect(302, '/company/emails');
};

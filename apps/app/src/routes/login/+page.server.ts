// Someone already signed in goes straight on to where they were going.
import { redirect } from '@sveltejs/kit';
import { toNext } from '#lib/server/guard.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, toNext(url.searchParams.get('next')));
};

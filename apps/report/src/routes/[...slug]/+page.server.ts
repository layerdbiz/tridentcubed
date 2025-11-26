import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get slides from parent layout
	const { slides } = await parent();
	return { slides };
};

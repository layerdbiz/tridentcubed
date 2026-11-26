import { error } from '@sveltejs/kit';
import { findEntry, library } from '#lib';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => library.map((entry) => ({ path: entry.slug }));

export const load: PageLoad = ({ params }) => {
	const entry = findEntry('library', params.path);
	if (!entry) error(404, 'No library page here');
	return { entry };
};

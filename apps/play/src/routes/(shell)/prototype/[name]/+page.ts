import { error } from '@sveltejs/kit';
import { findEntry, prototypes } from '#lib';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => prototypes.map((entry) => ({ name: entry.slug }));

export const load: PageLoad = ({ params }) => {
	const entry = findEntry('prototype', params.name);
	if (!entry) error(404, 'No prototype here');
	return { entry };
};

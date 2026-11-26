import { error } from '@sveltejs/kit';
import { components, findEntry } from '#lib';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => components.map((entry) => ({ name: entry.slug }));

export const load: PageLoad = ({ params }) => {
	const entry = findEntry('component', params.name);
	if (!entry) error(404, 'No component here');
	return { entry };
};

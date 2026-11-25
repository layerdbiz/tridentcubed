import { error } from '@sveltejs/kit';
import { findPrototype, prototypes, topics } from '../../prototypes';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () =>
	prototypes.map(({ topic, option }) => ({ topic, option }));

export const load: PageLoad = ({ params }) => {
	const prototype = findPrototype(params.topic, params.option);
	if (!prototype) error(404, 'No prototype here');

	const topic = topics.find((each) => each.topic === prototype.topic);
	return { prototype, options: topic?.options ?? [prototype], topicLabel: topic?.label ?? '' };
};

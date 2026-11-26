// The first play links were /<topic>/<option> (/kit/starter). They open the same option in the shell now.
import { redirect } from '@sveltejs/kit';
import { prototypes } from '#lib';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () =>
	prototypes.flatMap((entry) =>
		entry.options.map((option) => ({ topic: entry.slug, option: option.slug }))
	);

export const load: PageLoad = ({ params }) => {
	redirect(307, `/prototype/${params.topic}#v=${params.option}`);
};

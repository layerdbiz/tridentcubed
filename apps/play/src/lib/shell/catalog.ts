// What play.tridentcubed.com shows (#342). Three kinds, each found from the files alone, so adding one is adding a
// file: a PROTOTYPE is a big app section with several options, `src/prototypes/<topic>/<option>.html`; a COMPONENT
// is one piece with its variants, `src/components/<name>/<variant>.html`; the LIBRARY is the play app's own Svelte
// pages from before the shell (`src/routes/(play)` and `(mq)`). Each opens in the same shell, in frames.

export type KindType = 'prototype' | 'component' | 'library';

/** One HTML file: a prototype's option or a component's variant. */
export type OptionType = { slug: string; label: string; url: string };

export type EntryType = {
	kind: KindType;
	slug: string;
	label: string;
	/** The shell page that shows it. */
	href: string;
	options: OptionType[];
};

const FOLDER: Record<'prototype' | 'component', RegExp> = {
	prototype: /^\/src\/prototypes\/([^/]+)\/([^/]+)\.html$/,
	component: /^\/src\/components\/([^/]+)\/([^/]+)\.html$/
};

const LIBRARY_PAGE = /^\/src\/routes\/\((play|mq)\)\/(.+)\/\+page\.svelte$/;

/** Words kept in capitals when a slug is read out. */
const SHORT_NAMES = new Set(['mq', 'ssr', 'crud', 'ui', 'pdf', 'ai']);

/** The files a folder glob found (path to served address), as one entry per topic folder. */
export function toEntries(
	found: Record<string, string>,
	kind: 'prototype' | 'component'
): EntryType[] {
	const byTopic = new Map<string, EntryType>();

	for (const [path, url] of Object.entries(found)) {
		const match = FOLDER[kind].exec(path);
		if (!match) continue;

		const [, slug, option] = match;
		const entry = byTopic.get(slug) ?? {
			kind,
			slug,
			label: toLabel(slug),
			href: `/${kind}/${slug}`,
			options: []
		};
		entry.options.push({ slug: option, label: toLabel(option), url });
		byTopic.set(slug, entry);
	}

	const entries = [...byTopic.values()].toSorted((a, b) => a.slug.localeCompare(b.slug));
	for (const entry of entries) entry.options.sort(byMainFirst);
	return entries;
}

/** The play app's own pages, from the route files, each with one option: the page itself. */
export function toLibrary(routeFiles: string[]): EntryType[] {
	const entries: EntryType[] = [];

	for (const file of routeFiles) {
		const match = LIBRARY_PAGE.exec(file);
		if (!match || match[2].includes('[')) continue;

		const [, group, slug] = match;
		const words = slug.split('/').map(toLabel);
		const label = group === 'mq' ? `MQ ${words.join(' ')}` : words.join(': ');
		entries.push({
			kind: 'library',
			slug,
			label,
			href: `/library/${slug}`,
			options: [{ slug: 'main', label: 'Main', url: `/${slug}` }]
		});
	}

	return entries.toSorted((a, b) => a.slug.localeCompare(b.slug));
}

/** `side-menu` reads Side Menu, `crud-vanilla` reads CRUD Vanilla. */
export function toLabel(slug: string): string {
	return slug
		.split('-')
		.map((word) =>
			SHORT_NAMES.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
		)
		.join(' ');
}

function byMainFirst(a: OptionType, b: OptionType): number {
	if (a.slug === 'main') return -1;
	if (b.slug === 'main') return 1;
	return a.slug.localeCompare(b.slug);
}

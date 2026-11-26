// What play.tridentcubed.com shows (#342). Three kinds, each found from the files alone, so adding one is adding a
// file and the menu follows the folders: a PROTOTYPE is a big app section with several options,
// `src/prototypes/<topic>/<option>.html`; a COMPONENT is one piece with its variants,
// `src/components/<name>/<variant>.html`; the LIBRARY is the play app's own Svelte pages from before the shell
// (`src/routes/(play)` and `(mq)`). Topics may sit in folders of their own (`src/prototypes/report/cover/main.html`),
// and a file on its own (`src/prototypes/menus.html`) is a topic with one option. Each opens in the same shell.

export type KindType = 'prototype' | 'component' | 'library';

/** One HTML file: a prototype's option or a component's variant. */
export type OptionType = { slug: string; label: string; url: string };

export type EntryType = {
	kind: KindType;
	/** Its folders from the section's root, joined by slashes: `kit`, `report/cover`. */
	slug: string;
	label: string;
	/** Where the menu lists it: its folders, outermost first. */
	path: string[];
	/** The shell page that shows it. */
	href: string;
	options: OptionType[];
};

// Folder and file names are lowercase words joined by hyphens (the repo's naming rule), which is also what lets an
// address carry them; any other name is not listed.
const FOLDER: Record<'prototype' | 'component', RegExp> = {
	prototype: /^\/src\/prototypes\/((?:[a-z0-9-]+\/)*)([a-z0-9-]+)\.html$/,
	component: /^\/src\/components\/((?:[a-z0-9-]+\/)*)([a-z0-9-]+)\.html$/
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

		// A file in a folder is one of that folder's options; a file on its own is a topic with one option, Main.
		const [, folders, file] = match;
		const slug = folders ? folders.slice(0, -1) : file;
		const option = folders ? file : 'main';
		const parts = slug.split('/');
		const entry = byTopic.get(slug) ?? {
			kind,
			slug,
			label: parts.map(toLabel).join(': '),
			path: parts,
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
			path: group === 'mq' ? ['mq', ...slug.split('/')] : slug.split('/'),
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

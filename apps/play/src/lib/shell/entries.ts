// Everything the shell lists, found from the files at build time (#342). Vite copies each HTML file into the build
// untouched and hands back its address; the library pages are read from the route files' names alone.
import { toEntries, toLibrary, type EntryType, type KindType } from './catalog';

const prototypeFiles = import.meta.glob('/src/prototypes/*/*.html', {
	query: '?url',
	import: 'default',
	eager: true
}) as Record<string, string>;

const componentFiles = import.meta.glob('/src/components/*/*.html', {
	query: '?url',
	import: 'default',
	eager: true
}) as Record<string, string>;

const libraryPages = import.meta.glob([
	'/src/routes/(play)/**/+page.svelte',
	'/src/routes/(mq)/**/+page.svelte'
]);

export const prototypes = toEntries(prototypeFiles, 'prototype');
export const components = toEntries(componentFiles, 'component');
export const library = toLibrary(Object.keys(libraryPages));

export const SECTIONS: { kind: KindType; label: string; about: string; entries: EntryType[] }[] = [
	{
		kind: 'prototype',
		label: 'Prototypes',
		about: 'Big app sections, with options to compare.',
		entries: prototypes
	},
	{
		kind: 'component',
		label: 'Components',
		about: 'Single pieces, with their variants.',
		entries: components
	},
	{
		kind: 'library',
		label: 'Library',
		about: 'The play app’s own pages, as they were.',
		entries: library
	}
];

export function findEntry(kind: KindType, slug: string): EntryType | undefined {
	return SECTIONS.find((section) => section.kind === kind)?.entries.find(
		(entry) => entry.slug === slug
	);
}

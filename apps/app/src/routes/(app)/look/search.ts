// The menu's search (#345; Justin, 2026-11-25: "you can search for anything and it'll pop up"). Round 2 (Justin,
// 2026-11-26, with a picture): one group per page, a page with nothing found left out, every match shown. A row is the
// thing's avatar, its name, a line under it and one thing on the right: a project's status, or how many projects a
// record is on. A place shows only as its city and state, never its street (#320).
//
// Names come first in a group: a name that starts with what was typed, then a name with a word that does, then a name
// with it anywhere, then what else a thing is known by (a project's subtitle, customer, type and location, a record's
// labels, kind and place). Every typed word must be found; capitals and accents never matter.
import { cityStateOf } from './location';
import { DATASETS, PAGES, routeOf, type DatasetType, type ProjectType } from './look.data';
import type { LookState } from './look.state.svelte';
import { recordsOf, type RecordType } from './records.data';

/** One row of the search pop-up: what it opens, what it shows, and the project or record its avatar is drawn from. */
export type SearchRowType = {
	page: DatasetType;
	name: string;
	// A project's id; a record is known by its name.
	id?: string;
	// Under the name: a project's customer and route, a record's labels and city.
	line: string;
	// On the right: a project's status, or "3 projects".
	side: string;
	project?: ProjectType;
	record?: RecordType;
	// Found again by what else it is known by, never shown.
	also: string[];
	updated: string;
};

export type SearchGroupType = { title: string; rows: SearchRowType[] };

// Lower case with no accents, so "sao" finds "São Paulo".
function toPlain(text: string) {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function joined(parts: string[]) {
	return [...new Set(parts.map((part) => part.trim()).filter(Boolean))].join(' · ');
}

function projectLine(look: LookState, project: ProjectType) {
	const { from, to } = routeOf(project, look.facilities);
	return joined([project.client, to ? `${from} → ${to}` : from]);
}

function countOf(record: RecordType) {
	return record.count ? `${record.count} project${record.count === 1 ? '' : 's'}` : '';
}

// Everything there is to find, in the pages' order.
function rowsOf(look: LookState): SearchRowType[] {
	const projects = look.projects.map((project) => ({
		page: 'projects' as const,
		name: project.title.trim() || 'Untitled project',
		id: project.id,
		line: projectLine(look, project),
		side: project.status,
		project,
		also: [project.subtitle, project.client, project.type, project.location],
		updated: project.updated
	}));
	const records = PAGES.filter((page) => page !== 'projects').flatMap((page) =>
		recordsOf(look, page).map((record) => ({
			page,
			name: record.key,
			line: joined([...record.labels, record.sub, cityStateOf(record.location)]),
			side: countOf(record),
			record,
			also: [...record.labels, record.sub, record.location],
			updated: record.updated
		}))
	);
	return [...projects, ...records];
}

// How well a row's name and what else it is known by hold every word: 0 the name starts with the first, 1 a word of
// the name does, 2 the name holds them all, 3 they are found only in what else; nothing when a word is not found.
function rankOf(row: SearchRowType, words: string[]) {
	const name = toPlain(row.name);
	const all = toPlain([row.name, ...row.also].join(' '));
	if (!words.every((word) => all.includes(word))) return undefined;
	if (!words.every((word) => name.includes(word))) return 3;
	if (name.startsWith(words[0])) return 0;
	if (name.split(/[^\p{L}\p{N}]+/u).some((part) => part.startsWith(words[0]))) return 1;
	return 2;
}

function byPage(rows: SearchRowType[]): SearchGroupType[] {
	return PAGES.map((page) => ({
		title: DATASETS[page].label,
		rows: rows.filter((row) => row.page === page)
	})).filter((group) => group.rows.length);
}

// Before anything is typed: how many of the things changed last show, in Recents and for each page.
const LATEST = 10;

function latestOf(rows: SearchRowType[]) {
	return rows.toSorted((a, b) => b.updated.localeCompare(a.updated)).slice(0, LATEST);
}

/**
 * What the pop-up lists: before anything is typed, Recents (the ten things changed last) and each page's ten changed
 * last; then what `query` finds, a group per page, best first in each.
 */
export function searchOf(look: LookState, query: string): SearchGroupType[] {
	const words = toPlain(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) {
		const rows = rowsOf(look);
		const recents = latestOf(rows);
		const pages = byPage(
			PAGES.flatMap((page) => latestOf(rows.filter((row) => row.page === page)))
		);
		return recents.length ? [{ title: 'Recents', rows: recents }, ...pages] : pages;
	}
	const found = rowsOf(look)
		.map((row) => ({ row, rank: rankOf(row, words) }))
		.filter((one): one is { row: SearchRowType; rank: number } => one.rank !== undefined)
		.toSorted((a, b) => a.rank - b.rank || a.row.name.localeCompare(b.row.name))
		.map(({ row }) => row);
	return byPage(found);
}

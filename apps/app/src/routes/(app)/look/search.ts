// The menu's search (#345; Justin, 2026-11-25: "you can search for anything and it'll pop up"): what typing in the
// search pop-up finds among the projects, customers, team, transport and facilities. Names come first: a name that
// starts with what was typed, then a name with a word that does, then a name with it anywhere, then what else a thing
// is known by (a project's subtitle, customer and number, a record's labels, kind and place). Every typed word must
// be found; capitals and accents never matter.
import { DATASETS, PAGES, type DatasetType, type RecentType } from './look.data';
import type { LookState } from './look.state.svelte';
import { recordsOf } from './records.data';

// `detail` is the one thing the result's second line says beside its kind: a project's customer, a transport's
// mode, a record's place.
type CandidateType = {
	page: DatasetType;
	name: string;
	id?: string;
	detail: string;
	also: string[];
};

// Lower case with no accents, so "sao" finds "São Paulo".
function toPlain(text: string) {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Everything there is to find, each with its name and what else it is known by.
function candidatesOf(look: LookState): CandidateType[] {
	const projects = look.projects.map((project) => ({
		page: 'projects' as const,
		name: project.title.trim() || 'Untitled project',
		id: project.id,
		detail: project.client || project.subtitle,
		also: [project.subtitle, project.client, project.type, project.location]
	}));
	const records = PAGES.filter((page) => page !== 'projects').flatMap((page) =>
		recordsOf(look, page).map((record) => ({
			page,
			name: record.key,
			detail: record.sub || record.location || record.labels[0] || '',
			also: [...record.labels, record.sub, record.location]
		}))
	);
	return [...projects, ...records];
}

// How well `name` and `also` hold every word: 0 the name starts with the first, 1 a word of the name does, 2 the
// name holds them all, 3 they are found only in what else it is known by; nothing when a word is not found.
function rankOf(candidate: CandidateType, words: string[]) {
	const name = toPlain(candidate.name);
	const all = toPlain([candidate.name, ...candidate.also].join(' '));
	if (!words.every((word) => all.includes(word))) return undefined;
	if (!words.every((word) => name.includes(word))) return 3;
	if (name.startsWith(words[0])) return 0;
	if (name.split(/[^\p{L}\p{N}]+/u).some((part) => part.startsWith(words[0]))) return 1;
	return 2;
}

/** What `query` finds, best first. */
export function searchOf(look: LookState, query: string): RecentType[] {
	const words = toPlain(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];
	return candidatesOf(look)
		.map((candidate) => ({ candidate, rank: rankOf(candidate, words) }))
		.filter(
			(found): found is { candidate: CandidateType; rank: number } => found.rank !== undefined
		)
		.toSorted(
			(a, b) =>
				a.rank - b.rank ||
				PAGES.indexOf(a.candidate.page) - PAGES.indexOf(b.candidate.page) ||
				a.candidate.name.localeCompare(b.candidate.name)
		)
		.map(({ candidate }) => ({
			page: candidate.page,
			name: candidate.name,
			note: [DATASETS[candidate.page].one, candidate.detail].filter(Boolean).join(' · '),
			...(candidate.id ? { id: candidate.id } : {})
		}));
}

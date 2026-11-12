// PROTOTYPE (#161) run 20: the parts of the app that can be shown more than one way, for Matt Pocock's /prototype
// skill (UI branch, on this existing route). Justin, 2026-11-11: one list, in sections, where each part picks its
// own letter, so the sidebar can be B while the cards stay A. A is always how the part looks today. A part with
// only A has no other look yet; add a letter here and render it where the part reads `look.variant(id)`.
// The picks ride in the link as ?v=cover:B,sidebar:C, so a mix opens the same on a phone and a PC, and this
// browser remembers the last mix. When a letter wins, the others are deleted and the part goes back to A alone.
// Run 22 (Justin, 2026-11-11): every change he asks for is a new letter, and that newest letter is what shows
// until he picks another, so he can flip back to how it was. `pick` names another default (the Cover stays on A).
export type PartType = {
	id: string;
	label: string;
	variants: string[];
	note?: string;
	pick?: string;
};
export type PartGroupType = { id: string; label: string; parts: PartType[] };

function part(id: string, label: string, variants = ['A'], note = '', pick?: string): PartType {
	return { id, label, variants, note, pick };
}

export const PART_GROUPS: PartGroupType[] = [
	{
		id: 'global',
		label: 'Global',
		parts: [
			part(
				'sidebar',
				'Sidebar',
				['A', 'B'],
				'Desktop. A: floating panel. B: fixed from top to bottom.'
			),
			part(
				'bar',
				'Bottom Bar',
				['A', 'B', 'C', 'D'],
				'A: floating pill. B: edge to edge with names. C: wide floating bar, icons only, + above it, page name before the tabs. D: C with an arrow after the page name.'
			),
			part('add', 'Add Sheet', ['A', 'B'], 'A: Create for a project. B: Add for everything.'),
			part('more', '⋮ Menu')
		]
	},
	{
		id: 'top',
		label: 'Dashboard Top',
		parts: [
			part('top', 'Top Half', ['A', 'B'], 'Desktop. B: the chart fades to white at its bottom.'),
			part(
				'chart-choice',
				'Chart Choice',
				['A', 'B'],
				'A: each page has its own chart. B: the chart you pick stays for every page.'
			),
			part(
				'stats',
				'Stat Cards',
				['A', 'B'],
				'Desktop. A: scroll sideways. B: wrap, never cut off.'
			),
			part('map', 'Map', ['A', 'B'], 'B: things in the same place come apart when you zoom in.'),
			part('area', 'Area Chart'),
			part('bars', 'Bar Chart'),
			part('pie', 'Pie Chart', ['A', 'B'], 'Desktop. B: the list beside it is two columns.')
		]
	},
	{
		id: 'bottom',
		label: 'Dashboard Bottom',
		parts: [
			part(
				'half',
				'Bottom Half',
				['A', 'B'],
				'B: more room at the sides, heading higher; on a desktop, flat with no drag.'
			),
			part('list', 'List'),
			part('cards', 'Cards'),
			part('board', 'Board')
		]
	},
	{
		id: 'project',
		label: 'Project',
		parts: [
			part(
				'project-header',
				'Header',
				['A', 'B', 'C', 'D'],
				'Phone. A: changes between Page and Edit. Same on every tab: B full bar with progress, C floating buttons, D slim bar.'
			),
			part('project-page', 'Page'),
			part('panels', 'Panel List'),
			part('panel-project', 'Project Panel'),
			part('panel-transport', 'Transport Mode'),
			part('panel-items', 'Items'),
			part('panel-timelog', 'Time Log'),
			part('panel-photos', 'Photos')
		]
	},
	{
		id: 'report',
		label: 'Report',
		parts: [
			part(
				'cover',
				'Cover',
				['A', 'B'],
				'A: one list with icons. B: two columns with logos and faces.',
				'A'
			),
			part('report', 'Project Report'),
			part('report-transport', 'Transport Mode'),
			part('report-timelog', 'Time Log'),
			part('report-photos', 'Photos'),
			part('disclaimer', 'Disclaimer'),
			part('zoom', 'Zoom Bar')
		]
	},
	{
		id: 'record',
		label: 'Record',
		parts: [part('record-page', 'Page'), part('record-form', 'Edit Form')]
	},
	{ id: 'settings', label: 'Settings', parts: [part('settings', 'Organization')] }
];

const PARTS = PART_GROUPS.flatMap((group) => group.parts);

// The letter a part shows when nothing was picked: the newest one, unless the part names another.
export function defaultOf(id: string) {
	const found = PARTS.find((item) => item.id === id);
	return found?.pick ?? found?.variants.at(-1) ?? 'A';
}

// "cover:B,sidebar:C" as picks, keeping only letters a part really has.
export function parsePicks(text: string | null) {
	const picks: Record<string, string> = {};
	for (const pair of (text ?? '').split(',')) {
		const [id, letter] = pair.split(':');
		const found = PARTS.find((item) => item.id === id);
		if (found && letter && letter !== defaultOf(id) && found.variants.includes(letter))
			picks[id] = letter;
	}
	return picks;
}

export function formatPicks(picks: Record<string, string>) {
	return Object.entries(picks)
		.filter(([id, letter]) => letter !== defaultOf(id))
		.map(([id, letter]) => `${id}:${letter}`)
		.join(',');
}

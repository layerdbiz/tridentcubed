// PROTOTYPE (#161) run 20: the parts of the app that can be shown more than one way, for Matt Pocock's /prototype
// skill (UI branch, on this existing route). Justin, 2026-11-11: one list, in sections, where each part picks its
// own letter, so the sidebar can be B while the cards stay A. A is always how the part looks today. A part with
// only A has no other look yet; add a letter here and render it where the part reads `look.variant(id)`.
// The picks ride in the link as ?v=cover:B,sidebar:C, so a mix opens the same on a phone and a PC, and this
// browser remembers the last mix. When a letter wins, the others are deleted and the part goes back to A alone.
export type PartType = { id: string; label: string; variants: string[]; note?: string };
export type PartGroupType = { id: string; label: string; parts: PartType[] };

function part(id: string, label: string, variants = ['A'], note = ''): PartType {
	return { id, label, variants, note };
}

export const PART_GROUPS: PartGroupType[] = [
	{
		id: 'global',
		label: 'Global',
		parts: [
			part('sidebar', 'Sidebar'),
			part('bar', 'Bottom Bar'),
			part('add', 'Add Sheet'),
			part('more', '⋮ Menu')
		]
	},
	{
		id: 'top',
		label: 'Dashboard Top',
		parts: [
			part('stats', 'Stat Cards'),
			part('map', 'Map'),
			part('area', 'Area Chart'),
			part('bars', 'Bar Chart'),
			part('pie', 'Pie Chart')
		]
	},
	{
		id: 'bottom',
		label: 'Dashboard Bottom',
		parts: [part('list', 'List'), part('cards', 'Cards'), part('board', 'Board')]
	},
	{
		id: 'project',
		label: 'Project',
		parts: [
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
				'A: one list with icons. B: two columns with logos and faces.'
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

// "cover:B,sidebar:C" as picks, keeping only letters a part really has.
export function parsePicks(text: string | null) {
	const picks: Record<string, string> = {};
	for (const pair of (text ?? '').split(',')) {
		const [id, letter] = pair.split(':');
		const found = PARTS.find((item) => item.id === id);
		if (found && letter && letter !== 'A' && found.variants.includes(letter)) picks[id] = letter;
	}
	return picks;
}

export function formatPicks(picks: Record<string, string>) {
	return Object.entries(picks)
		.filter(([, letter]) => letter !== 'A')
		.map(([id, letter]) => `${id}:${letter}`)
		.join(',');
}

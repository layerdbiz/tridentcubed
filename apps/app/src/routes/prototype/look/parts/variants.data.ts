// PROTOTYPE (#161) run 20: the parts of the app that can be shown more than one way, for Matt Pocock's /prototype
// skill (UI branch, on this existing route). Justin, 2026-11-11: one list, in sections, where each part picks its
// own letter, so the sidebar can be B while the cards stay A. A is always how the part looks today. A part with
// only A has no other look yet; add a letter here and render it where the part reads `look.variant(id)`.
// The picks ride in the link as ?v=cover:B,sidebar:C, so a mix opens the same on a phone and a PC, and this
// browser remembers the last mix. When a letter wins, the others are deleted and the part goes back to A alone.
// Run 22 (Justin, 2026-11-11): every change he asks for is a new letter, and that newest letter is what shows
// until he picks another, so he can flip back to how it was. `pick` names another default (the Cover stays on A).
// Run 24 (Justin, 2026-11-11: "it's not easy to navigate"): sections named for where you are in the app, with
// sub-sections. Dashboard holds Top and Bottom. Pages is anything opened from the dashboard, a project or one of
// the other four, and holds its three tabs: Page, Edit and Preview.
export type PartType = {
	id: string;
	label: string;
	variants: string[];
	note?: string;
	pick?: string;
};
export type PartSectionType = { id: string; label: string; note?: string; parts: PartType[] };
export type PartGroupType = PartSectionType & { sections?: PartSectionType[] };

function part(id: string, label: string, variants = ['A'], note = '', pick?: string): PartType {
	return { id, label, variants, note, pick };
}

export const PART_GROUPS: PartGroupType[] = [
	{
		id: 'global',
		label: 'Global',
		note: 'On every screen',
		parts: [
			part(
				'bar',
				'Bottom Bar',
				['A', 'B', 'C', 'D', 'E'],
				'A: small floating pill. B: edge to edge with names. C: wide floating bar, icons only, + above it; inside a page its name and the tabs slide in. D: C with a chevron after the name. E: D with a straight arrow and larger icons, and on a desktop project too.'
			),
			part(
				'sidebar',
				'Sidebar',
				['A', 'B'],
				'Desktop. A: floating panel. B: fixed from top to bottom.'
			),
			part('add', 'Add Sheet', ['A', 'B'], 'A: Create for a project. B: Add for everything.'),
			part('more', '⋮ Menu')
		]
	},
	{
		id: 'dashboard',
		label: 'Dashboard',
		note: 'The home screen with the five lists',
		parts: [],
		sections: [
			{
				id: 'top',
				label: 'Top',
				note: 'The chart or map, and the stat cards',
				parts: [
					part(
						'dash-header',
						'Header',
						['A', 'B'],
						'The menu and the bell. A: plain icons, the number at the left. B: black round buttons, the number in the centre between them.'
					),
					part(
						'top',
						'Top Half',
						['A', 'B'],
						'Desktop. B: the chart fades to white at its bottom.'
					),
					part(
						'chart-choice',
						'Chart Choice',
						['A', 'B'],
						'A: each list has its own chart. B: the chart you pick stays for every list.'
					),
					part(
						'stats',
						'Stat Cards',
						['A', 'B'],
						'Desktop. A: scroll sideways. B: wrap, never cut off.'
					),
					part(
						'map',
						'Map',
						['A', 'B'],
						'B: things in the same place come apart when you zoom in.'
					),
					part('area', 'Area Chart'),
					part('bars', 'Bar Chart'),
					part('pie', 'Pie Chart', ['A', 'B'], 'Desktop. B: the list beside it is two columns.')
				]
			},
			{
				id: 'bottom',
				label: 'Bottom',
				note: 'The sheet with the list',
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
			}
		]
	},
	{
		id: 'pages',
		label: 'Pages',
		note: 'What opens when you tap a Project, Customer, Team, Transport Mode or Facility',
		parts: [
			part(
				'header',
				'Header',
				['A', 'B', 'C'],
				'The top of every tab. A: round glass buttons on Page, Photo and Map at the right. B: one header for every page; on Page only a bare back arrow and ⋮, Photo and Map in the centre. C: B with a chevron for back.'
			)
		],
		sections: [
			{
				id: 'page',
				label: 'Page',
				note: 'The first tab: the picture or map, and the details',
				parts: [
					part(
						'page-picture',
						'Picture',
						['A', 'B'],
						'A: with no photo the map shows; over the map the name sits in a white card. B: a dark placeholder until there is a photo; the name reads the same over photo and map, on a dark fade.'
					),
					part('page-map', 'Map', ['A', 'B'], 'A: light. B: dark.'),
					part('project-page', 'Project'),
					part('record-page', 'Customer, Team, Transport Mode, Facility')
				]
			},
			{
				id: 'edit',
				label: 'Edit',
				note: 'The second tab: where things are filled in',
				parts: [
					part(
						'panels',
						'Panel List',
						['A', 'B'],
						'B: a panel with nothing done yet has a grey icon and a grey To Do.'
					),
					part('panel-project', 'Project Panel'),
					part('panel-transport', 'Transport Mode Panel'),
					part('panel-items', 'Items Panel'),
					part('panel-timelog', 'Time Log Panel'),
					part('panel-photos', 'Photos Panel'),
					part('record-form', 'Customer, Team, Transport Mode, Facility Form')
				]
			},
			{
				id: 'preview',
				label: 'Preview',
				note: 'The third tab, projects only: the report',
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
			}
		]
	},
	{
		id: 'settings',
		label: 'Settings',
		note: 'Opened from the profile picture',
		parts: [part('settings', 'Organization')]
	}
];

// Every part a section holds, its sub-sections' parts included.
export function partsOf(group: PartGroupType) {
	return [...group.parts, ...(group.sections ?? []).flatMap((section) => section.parts)];
}

const PARTS = PART_GROUPS.flatMap(partsOf);

export function partOf(id: string) {
	return PARTS.find((item) => item.id === id);
}

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

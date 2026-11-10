// PROTOTYPE (#161) run 12: what the dashboard's pages list, built one way for all five (Justin's run 12 notes 6, 7,
// 10 and 11, from the Trident team's meeting). Projects are projects; customers, team members, transports and
// facilities are records. Every page sorts by one set of labels, in a fixed order: a project's state, a customer's
// types, a team member's labels, a transport's type and a facility's kind. Those labels are the board's columns, the
// filter's options and the pie's slices, in the same colours, and every one shows even when nothing has it yet. A
// record with no label sits under Other. Every count (the cards, the chart, the list) comes from `countOf`, so the
// numbers agree everywhere (note 13).
import {
	clientOf,
	facilitiesOf,
	personOf,
	FACILITY_ICONS,
	MODE_ICONS,
	PAGE_ICONS,
	transportsOf,
	type ClientType,
	type DatasetType,
	type ProjectType,
	type StatusType
} from './look.data';
import type { LookState } from './look.state.svelte';
import { labelsOf as labelsOfMember, type TeamMemberType } from './team.data';

export type PageType = Exclude<DatasetType, 'projects'>;

// Full class strings so Tailwind finds them; `text` colours gradient stops through currentColor.
export type ToneType = { stroke: string; fill: string; text: string; bg: string };

const TONES: Record<string, ToneType> = {
	slate: {
		stroke: 'stroke-slate-400',
		fill: 'fill-slate-400',
		text: 'text-slate-400',
		bg: 'bg-slate-400'
	},
	muted: {
		stroke: 'stroke-slate-300',
		fill: 'fill-slate-300',
		text: 'text-slate-300',
		bg: 'bg-slate-300'
	},
	primary: {
		stroke: 'stroke-primary',
		fill: 'fill-primary',
		text: 'text-primary',
		bg: 'bg-primary'
	},
	warning: {
		stroke: 'stroke-warning',
		fill: 'fill-warning',
		text: 'text-warning',
		bg: 'bg-warning'
	},
	violet: {
		stroke: 'stroke-violet-500',
		fill: 'fill-violet-500',
		text: 'text-violet-500',
		bg: 'bg-violet-500'
	},
	danger: { stroke: 'stroke-danger', fill: 'fill-danger', text: 'text-danger', bg: 'bg-danger' },
	success: {
		stroke: 'stroke-success',
		fill: 'fill-success',
		text: 'text-success',
		bg: 'bg-success'
	},
	sky: { stroke: 'stroke-sky-500', fill: 'fill-sky-500', text: 'text-sky-500', bg: 'bg-sky-500' },
	teal: {
		stroke: 'stroke-teal-500',
		fill: 'fill-teal-500',
		text: 'text-teal-500',
		bg: 'bg-teal-500'
	},
	indigo: {
		stroke: 'stroke-indigo-500',
		fill: 'fill-indigo-500',
		text: 'text-indigo-500',
		bg: 'bg-indigo-500'
	},
	amber: {
		stroke: 'stroke-amber-500',
		fill: 'fill-amber-500',
		text: 'text-amber-500',
		bg: 'bg-amber-500'
	},
	green: {
		stroke: 'stroke-green-600',
		fill: 'fill-green-600',
		text: 'text-green-600',
		bg: 'bg-green-600'
	},
	rose: {
		stroke: 'stroke-rose-500',
		fill: 'fill-rose-500',
		text: 'text-rose-500',
		bg: 'bg-rose-500'
	},
	pink: {
		stroke: 'stroke-pink-500',
		fill: 'fill-pink-500',
		text: 'text-pink-500',
		bg: 'bg-pink-500'
	},
	cyan: {
		stroke: 'stroke-cyan-600',
		fill: 'fill-cyan-600',
		text: 'text-cyan-600',
		bg: 'bg-cyan-600'
	},
	lime: {
		stroke: 'stroke-lime-600',
		fill: 'fill-lime-600',
		text: 'text-lime-600',
		bg: 'bg-lime-600'
	},
	orange: {
		stroke: 'stroke-orange-500',
		fill: 'fill-orange-500',
		text: 'text-orange-500',
		bg: 'bg-orange-500'
	}
};

// The states in the order a project moves through them (note 11).
export const STATES: StatusType[] = [
	'Draft',
	'In Progress',
	'Review',
	'Ready',
	'Sent',
	'Revision',
	'Complete',
	'Archived'
];

export const OTHER = 'Other';

// Each page's labels in order. The team's start with the partners and follow the order Justin gave (note 7); the
// rest of the sheet's labels come after.
const LABELS: Record<DatasetType, string[]> = {
	projects: STATES,
	customers: ['Ocean carrier', 'Freight forwarder', 'Stevedore', 'Terminal', 'Insurer'],
	team: [
		'Partner',
		'Finance',
		'Engineering',
		'Business',
		'Projects',
		'Manager',
		'Marine Surveyor',
		'Field Specialist',
		'Port Captain',
		'Developer',
		'Operations',
		'Field Engineer',
		'Project Engineer',
		'Surveyor',
		'Junior Surveyor',
		'Planner'
	],
	transport: ['Sea', 'Air', 'Rail', 'Road'],
	facilities: ['Port', 'Airport', 'Rail yard', 'Depot']
};

const STATE_TONES: Record<StatusType, string> = {
	Draft: 'slate',
	'In Progress': 'primary',
	Review: 'warning',
	Ready: 'teal',
	Sent: 'violet',
	Revision: 'danger',
	Complete: 'success',
	Archived: 'muted'
};
const KIND_TONES: Record<string, string> = {
	Sea: 'primary',
	Air: 'sky',
	Rail: 'amber',
	Road: 'teal',
	Port: 'primary',
	Airport: 'sky',
	'Rail yard': 'amber',
	Depot: 'teal'
};
const PALETTE = [
	'primary',
	'sky',
	'violet',
	'amber',
	'teal',
	'rose',
	'indigo',
	'green',
	'orange',
	'cyan',
	'pink',
	'lime',
	'warning',
	'success',
	'danger',
	'slate'
];

// The customer types a customer's page offers, and the team labels a team member's page offers.
export const CUSTOMER_TYPES = LABELS.customers;
export const TEAM_LABELS = LABELS.team;

export type RecordType = {
	page: PageType;
	key: string;
	labels: string[];
	// A second word beside the labels: a transport's transport mode.
	sub: string;
	location: string;
	// Its projects, and how many of them are still open (the count badge on its icon, note 9).
	count: number;
	open: number;
	// The customers whose projects it is on, or for a customer the team on its projects.
	logos: string[];
	people: string[];
	icon: string;
	projects: ProjectType[];
	member?: TeamMemberType;
	// Its first label's colour, which its small icons take in a list, a card or the board (run 13).
	tone: ToneType;
	// Its own uploaded picture (run 15), shown behind its Page before any stock picture.
	photo?: string;
};

export function isOpen(project: ProjectType) {
	return !['Complete', 'Archived'].includes(project.status);
}

// A customer as this browser knows it: edited or added here, else from the customer pack.
export function customerOf(look: LookState, name: string): ClientType {
	return look.added.find((customer) => customer.name === name) ?? clientOf(name);
}

// "Stevedore, Terminal" is two types.
export function typesOf(kind: string) {
	return kind
		.split(/,\s*|\s+and\s+/i)
		.map((word) => word.trim())
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1));
}

function cityOf(look: LookState, facility: string) {
	return look.facilities.find((item) => item.name === facility)?.city ?? '';
}

// Where a transport was last: the city of the newest project's last stop on it.
function lastSeenOf(look: LookState, name: string) {
	for (const project of look.projects) {
		const stop = project.stops.findLast((item) => item.transport === name);
		if (stop?.facility) return cityOf(look, stop.facility);
	}
	return '';
}

function counts(theirs: ProjectType[]) {
	return {
		count: theirs.length,
		open: theirs.filter(isOpen).length,
		projects: theirs,
		logos: [...new Set(theirs.map((project) => project.client))]
	};
}

function baseRecordsOf(look: LookState, page: PageType): Omit<RecordType, 'tone'>[] {
	if (page === 'customers')
		return look.customers.map((name) => {
			const info = customerOf(look, name);
			const theirs = look.projects.filter((project) => project.client === name);
			return {
				page,
				key: name,
				labels: typesOf(info.kind),
				sub: '',
				location: info.city,
				icon: '',
				photo: info.photo,
				...counts(theirs),
				logos: [],
				people: [...new Set(theirs.flatMap((project) => project.team))]
			};
		});
	if (page === 'team')
		return look.members.map((member) => ({
			page,
			key: member.name,
			labels: labelsOfMember(member),
			sub: '',
			location: member.location,
			icon: '',
			...counts(look.projects.filter((project) => project.team.includes(member.name))),
			people: [],
			member
		}));
	if (page === 'transport')
		return look.transports.map((transport) => ({
			page,
			key: transport.name,
			labels: [transport.type],
			sub: transport.mode,
			location: lastSeenOf(look, transport.name),
			icon: MODE_ICONS[transport.mode] ?? PAGE_ICONS.transport,
			photo: transport.photo,
			...counts(look.projects.filter((project) => transportsOf(project).includes(transport.name))),
			people: []
		}));
	return look.facilities.map((facility) => ({
		page,
		key: facility.name,
		labels: [facility.kind],
		sub: '',
		location: facility.city,
		icon: FACILITY_ICONS[facility.kind],
		photo: facility.photo,
		...counts(look.projects.filter((project) => facilitiesOf(project).includes(facility.name))),
		people: []
	}));
}

export function recordsOf(look: LookState, page: PageType): RecordType[] {
	const columns = columnsOf(look, page);
	return baseRecordsOf(look, page).map((record) => ({
		...record,
		tone: (columns.find((column) => column.label === (record.labels[0] ?? OTHER)) ?? columns[0])
			.tone
	}));
}

export function recordOf(look: LookState, page: PageType, key: string) {
	return recordsOf(look, page).find((record) => record.key === key);
}

// A page's labels in order: the fixed ones, then any typed in here, then Other when something has none.
export function labelsFor(look: LookState, page: DatasetType): string[] {
	if (page === 'projects') return STATES;
	const records = baseRecordsOf(look, page);
	const extra = [...new Set(records.flatMap((record) => record.labels))]
		.filter((label) => !LABELS[page].includes(label))
		.sort();
	return [
		...LABELS[page],
		...extra,
		...(records.some((record) => !record.labels.length) ? [OTHER] : [])
	];
}

export type ColumnType = { label: string; tone: ToneType };

// One colour per label, the same on the board, the filter and the pie.
export function columnsOf(look: LookState, page: DatasetType): ColumnType[] {
	return labelsFor(look, page).map((label, index) => ({
		label,
		tone: TONES[
			page === 'projects'
				? STATE_TONES[label as StatusType]
				: label === OTHER
					? 'muted'
					: (KIND_TONES[label] ?? PALETTE[index % PALETTE.length])
		]
	}));
}

export function hasLabel(record: RecordType, label: string) {
	return label === OTHER ? !record.labels.length : record.labels.includes(label);
}

export function shownProjects(look: LookState, filter: string) {
	return filter === 'All'
		? look.projects
		: look.projects.filter((project) => project.status === filter);
}

export function shownRecords(look: LookState, page: PageType, filter: string) {
	const records = recordsOf(look, page);
	return filter === 'All' ? records : records.filter((record) => hasLabel(record, filter));
}

// How many a page has, or how many carry one label: the card, the chart and the list all use this.
export function countOf(look: LookState, page: DatasetType, filter = 'All') {
	return page === 'projects'
		? shownProjects(look, filter).length
		: shownRecords(look, page, filter).length;
}

// A count badge never needs more than two characters.
export function badgeOf(count: number) {
	return count > 9 ? '9+' : String(count);
}

// The picture at the top of a record's Page (run 13): the Website's own service photos, picked by what the record
// is. A team member's own photo, blurred behind them. Trains, rail cars and rail yards have none yet, so their Page
// opens on the map.
const PHOTOS: Record<string, string> = {
	Vessel: 'port-captain-services.png',
	Barge: 'heavy-lift-support.png',
	Plane: 'cargo-surveys.webp',
	Truck: 'road-transport.webp',
	Trailer: 'project-cargo.webp',
	Port: 'terminal-surveys.webp',
	Airport: 'cargo-surveys.webp',
	Depot: 'warehouse-surveys.webp',
	'Ocean carrier': 'engineering-planning.png',
	'Freight forwarder': 'compliance-solutions.png',
	Stevedore: 'project-cargo.webp',
	Terminal: 'terminal-surveys.webp',
	Insurer: 'marine-warranty.png'
};

export function photosOf(record: RecordType) {
	if (record.member) return [personOf(record.key).photo];
	const keys = record.page === 'transport' ? [record.sub] : record.labels;
	const stock = [...new Set(keys.map((key) => PHOTOS[key]).filter(Boolean))].map(
		(file) => `/services/${file}`
	);
	return record.photo ? [record.photo, ...stock] : stock;
}

// The photos a project's report prints: its switched-on photo panels, in order, at most ten.
export function projectPhotosOf(look: LookState, project: ProjectType) {
	return (look.workspaces[project.id] ?? [])
		.filter((panel) => panel.kind === 'photos' && panel.isEnabled)
		.flatMap((panel) => panel.groups.flatMap((group) => group.photos))
		.slice(0, 10);
}

// PROTOTYPE (#161): made-up data only. The repo is public, so no real clients, people or reports.
// Names and faces (randomuser.me) are the same stand-ins the app prototype uses; photos are the Website's own.

export type StatusType =
	| 'Draft'
	| 'In Progress'
	| 'Review'
	| 'Sent'
	| 'Revision'
	| 'Complete'
	| 'Archived';

export type PersonType = { name: string; photo: string };

export type ProjectType = {
	id: string;
	number: string;
	title: string;
	subtitle: string;
	type: string;
	client: string;
	carrier: string;
	facility: string;
	dates: string;
	status: StatusType;
	team: string[];
	updated: string;
	progress: number;
};

export type FieldType = {
	id: string;
	label: string;
	type: 'text' | 'email' | 'tel' | 'url' | 'select' | 'textarea' | 'image' | 'file';
	value: string;
	options?: string[];
	isReadonly?: boolean;
};

export type EntryType = { id: string; time: string; activity: string };
export type DayType = { id: string; date: string; entries: EntryType[] };
export type PhotoType = { id: string; src: string; caption: string };
export type GroupType = {
	id: string;
	title: string;
	description: string;
	layout: number;
	photos: PhotoType[];
};

export type PanelKindType = 'fields' | 'team' | 'timelog' | 'photos';
export type PanelControlType = 'locked' | 'switch' | 'remove';

export type PanelType = {
	id: string;
	name: string;
	icon: string;
	kind: PanelKindType;
	control: PanelControlType;
	isEnabled: boolean;
	isDraggable: boolean;
	fields: FieldType[];
	owner: string;
	assigned: string[];
	days: DayType[];
	groups: GroupType[];
};

export type PanelStatusType = 'To do' | 'In progress' | 'Complete' | 'Off';

// Full class strings so Tailwind's scanner finds every icon and colour.
export const STATUS: Record<StatusType, { icon: string; tone: string; dot: string; pill: string }> =
	{
		Draft: {
			icon: 'icon-[mdi--file-outline]',
			tone: 'text-slate-400',
			dot: 'bg-slate-300',
			pill: 'bg-slate-100 text-slate-600'
		},
		'In Progress': {
			icon: 'icon-[mdi--progress-pencil]',
			tone: 'text-primary',
			dot: 'bg-primary',
			pill: 'bg-primary/10 text-primary-700'
		},
		Review: {
			icon: 'icon-[mdi--eye-check-outline]',
			tone: 'text-warning',
			dot: 'bg-warning',
			pill: 'bg-warning/15 text-amber-700'
		},
		Sent: {
			icon: 'icon-[mdi--send-check-outline]',
			tone: 'text-violet-500',
			dot: 'bg-violet-500',
			pill: 'bg-violet-500/10 text-violet-700'
		},
		Revision: {
			icon: 'icon-[mdi--undo-variant]',
			tone: 'text-danger',
			dot: 'bg-danger',
			pill: 'bg-danger/10 text-rose-700'
		},
		Complete: {
			icon: 'icon-[mdi--check-decagram-outline]',
			tone: 'text-success',
			dot: 'bg-success',
			pill: 'bg-success/15 text-emerald-700'
		},
		Archived: {
			icon: 'icon-[mdi--archive-outline]',
			tone: 'text-slate-400',
			dot: 'bg-slate-400',
			pill: 'bg-slate-200 text-slate-500'
		}
	};

export const BOARD_COLUMNS: StatusType[] = [
	'Draft',
	'In Progress',
	'Review',
	'Sent',
	'Revision',
	'Complete'
];

export const PEOPLE: PersonType[] = [
	{ name: 'Riley Ford', photo: 'https://randomuser.me/api/portraits/women/52.jpg' },
	{ name: 'Mila Carter', photo: 'https://randomuser.me/api/portraits/women/21.jpg' },
	{ name: 'Noah Ellis', photo: 'https://randomuser.me/api/portraits/men/41.jpg' },
	{ name: 'Devon Mills', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
	{ name: 'Avery Chen', photo: 'https://randomuser.me/api/portraits/women/63.jpg' },
	{ name: 'Jordan Blake', photo: 'https://randomuser.me/api/portraits/men/36.jpg' },
	{ name: 'Sofia Reyes', photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
	{ name: 'Kai Bennett', photo: 'https://randomuser.me/api/portraits/men/53.jpg' }
];

export function personOf(name: string): PersonType {
	return PEOPLE.find((person) => person.name === name) ?? { name, photo: '' };
}

export const PROJECTS: ProjectType[] = [
	{
		id: 'p1',
		number: 'TC-24031',
		title: 'Terminal Intake Review',
		subtitle: 'Receiving inspection underway',
		type: 'Warehousing',
		client: 'Northwind Logistics',
		carrier: 'MV Coral Dawn',
		facility: 'East Harbor Berth',
		dates: 'Tue, 12 May 2026',
		status: 'In Progress',
		team: ['Riley Ford', 'Mila Carter', 'Noah Ellis'],
		updated: '12 min ago',
		progress: 64
	},
	{
		id: 'p2',
		number: 'TC-24030',
		title: 'Harbor Readiness Survey',
		subtitle: 'Pre-arrival condition check',
		type: 'Vessel Condition',
		client: 'Meridian Marine',
		carrier: 'MV Silver Tern',
		facility: 'Eastgate Terminal 4',
		dates: 'Mon, 11 May 2026',
		status: 'Review',
		team: ['Devon Mills', 'Avery Chen', 'Noah Ellis'],
		updated: '1 h ago',
		progress: 88
	},
	{
		id: 'p3',
		number: 'TC-24029',
		title: 'Outbound Cargo Condition Report',
		subtitle: 'Bagged rice loading',
		type: 'Cargo',
		client: 'Harborline Shipping',
		carrier: 'MV Lantern Bay',
		facility: 'Port of Halverton',
		dates: 'Fri, 8 May 2026',
		status: 'Sent',
		team: ['Jordan Blake', 'Kai Bennett', 'Sofia Reyes'],
		updated: 'Yesterday',
		progress: 96
	},
	{
		id: 'p4',
		number: 'TC-24028',
		title: 'Open Starter Project',
		subtitle: 'Warehouse stock count',
		type: 'Warehousing',
		client: 'Atlas Freight',
		carrier: 'Truck fleet 12',
		facility: 'Northside Depot',
		dates: 'Thu, 7 May 2026',
		status: 'Draft',
		team: ['Kai Bennett', 'Mila Carter'],
		updated: 'Yesterday',
		progress: 18
	},
	{
		id: 'p5',
		number: 'TC-24027',
		title: 'Arrival Draft Survey',
		subtitle: 'Draft and displacement',
		type: 'Draft Survey',
		client: 'Northwind Logistics',
		carrier: 'MV Coral Dawn',
		facility: 'Port of Halverton',
		dates: 'Tue, 5 May 2026',
		status: 'Revision',
		team: ['Sofia Reyes', 'Riley Ford'],
		updated: '2 days ago',
		progress: 92
	},
	{
		id: 'p6',
		number: 'TC-24026',
		title: 'Transformer Lift',
		subtitle: 'Heavy lift supervision',
		type: 'Cargo',
		client: 'Portside Renewables',
		carrier: 'MV Harbor Finch',
		facility: 'Southpoint Terminal',
		dates: 'Mon, 4 May 2026',
		status: 'In Progress',
		team: ['Avery Chen', 'Jordan Blake'],
		updated: '3 days ago',
		progress: 35
	},
	{
		id: 'p7',
		number: 'TC-24025',
		title: 'Post-Discharge Review',
		subtitle: 'Blade discharge, all clear',
		type: 'Cargo',
		client: 'Portside Renewables',
		carrier: 'MV Harbor Finch',
		facility: 'Renewables Terminal West',
		dates: 'Wed, 29 Apr 2026',
		status: 'Complete',
		team: ['Mila Carter', 'Devon Mills', 'Noah Ellis'],
		updated: 'Last week',
		progress: 100
	},
	{
		id: 'p8',
		number: 'TC-24024',
		title: 'Final Cargo Survey Record',
		subtitle: 'Closed survey archive',
		type: 'Cargo',
		client: 'Summit Heavy Lift',
		carrier: 'Rail car 88',
		facility: 'Heavy Lift Archive Yard',
		dates: 'Mon, 13 Apr 2026',
		status: 'Archived',
		team: ['Noah Ellis', 'Mila Carter', 'Avery Chen', 'Kai Bennett'],
		updated: 'Last month',
		progress: 100
	}
];

export const CLIENTS = [
	'Northwind Logistics',
	'Meridian Marine',
	'Harborline Shipping',
	'Atlas Freight',
	'Portside Renewables',
	'Summit Heavy Lift'
];

export const LAYOUTS = [2, 4, 6, 8];

// Stand-in survey photos: the Website's own service pictures, served from @layerd/ui's static folder.
const SAMPLE_PHOTOS = [
	'cargo-surveys.webp',
	'heavy-lift-support.png',
	'vessel-condition-surveys.webp',
	'project-cargo.webp',
	'warehouse-surveys.webp',
	'stowage-planning.webp',
	'terminal-surveys.webp',
	'draft-surveys.webp',
	'bunker-surveys.webp',
	'lifting-arrangement.webp',
	'road-transport.webp',
	'rail-engineering.webp',
	'port-captain-supercargo.webp',
	'vessel-hold-cleaning.webp',
	'dunnage-removal.webp',
	'marine-surveys.png'
];

export function photoOf(seed: string) {
	let hash = 0;
	for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
	return `/services/${SAMPLE_PHOTOS[hash % SAMPLE_PHOTOS.length]}`;
}

let nextId = 0;
export function createId(prefix: string) {
	nextId += 1;
	return `${prefix}-${nextId}`;
}

function field(
	label: string,
	value: string,
	type: FieldType['type'] = 'text',
	extra: Partial<FieldType> = {}
): FieldType {
	return { id: createId('field'), label, type, value, ...extra };
}

function group(title: string, description: string, seeds: string[]): GroupType {
	return {
		id: createId('group'),
		title,
		description,
		layout: 4,
		photos: seeds.map((seed, index) => ({
			id: createId('photo'),
			src: photoOf(seed),
			caption: `${title}, photo ${index + 1}`
		}))
	};
}

// The twelve panels of the app prototype (definitions/panels.ts), filled in as far as `progress` says,
// so each project opens at its own percent.
export function createPanels(project: ProjectType): PanelType[] {
	const base = {
		isEnabled: true,
		isDraggable: false,
		fields: [],
		owner: '',
		assigned: [],
		days: [],
		groups: []
	};
	const panels: PanelType[] = [
		{
			...base,
			id: 'organization',
			name: 'Organization',
			icon: 'icon-[mdi--domain]',
			kind: 'fields',
			control: 'locked',
			fields: [
				field('Name', 'Trident Cubed'),
				field('Website', 'tridentcubed.com', 'url'),
				field('Address line 1', '800 Town and Country'),
				field('Address line 2', 'Ste 500'),
				field('City', 'Houston'),
				field('State', 'TX'),
				field('Zip', '77024'),
				field('Phone', '+1 409 543 2725', 'tel'),
				field('Email', 'operations@tridentcubed.com', 'email'),
				field('Logo', '/logo-color.svg', 'image')
			].map((item) => ({ ...item, isReadonly: true }))
		},
		{
			...base,
			id: 'client',
			name: 'Client',
			icon: 'icon-[mdi--handshake-outline]',
			kind: 'fields',
			control: 'locked',
			fields: [
				field('Company', project.client, 'select', { options: CLIENTS }),
				field('Short name', project.client.split(' ')[0]),
				field('Contact', 'Operations desk'),
				field('Phone', '+1 555 010 4477', 'tel'),
				field('Email', 'ops@example.com', 'email'),
				field('Website', 'example.com', 'url'),
				field('Address line 1', '12 Quay Road'),
				field('Address line 2', 'Unit 4'),
				field('City', 'Halverton'),
				field('State', 'TX'),
				field('Zip', '77001'),
				field('Logo', photoOf('client-logo'), 'image')
			]
		},
		{
			...base,
			id: 'team',
			name: 'Team',
			icon: 'icon-[mdi--account-group-outline]',
			kind: 'team',
			control: 'locked',
			owner: project.team[0] ?? '',
			assigned: project.team.slice(1)
		},
		{
			...base,
			id: 'project',
			name: 'Project',
			icon: 'icon-[mdi--clipboard-text-outline]',
			kind: 'fields',
			control: 'locked',
			fields: [
				field('Type', project.type, 'select', {
					options: ['Cargo', 'Vessel Condition', 'Warehousing', 'Draft Survey', 'Bunker']
				}),
				field('Title', project.title),
				field('Subtitle', project.subtitle)
			]
		},
		{
			...base,
			id: 'items',
			name: 'Items',
			icon: 'icon-[mdi--package-variant-closed]',
			kind: 'fields',
			control: 'locked',
			fields: [
				field('Title', 'Containerized machinery'),
				field('Description', 'Six crated units, shrink-wrapped on skids.', 'textarea'),
				field('Name', 'Unit group B')
			]
		},
		{
			...base,
			id: 'facility',
			name: 'Facility',
			icon: 'icon-[mdi--anchor]',
			kind: 'fields',
			control: 'locked',
			fields: [field('Name', project.facility), field('City', 'Halverton'), field('State', 'TX')]
		},
		{
			...base,
			id: 'carrier',
			name: 'Carrier',
			icon: 'icon-[mdi--ferry]',
			kind: 'fields',
			control: 'locked',
			fields: [
				field('Type', 'Vessel', 'select', { options: ['Vessel', 'Airplane', 'Rail', 'Road'] }),
				field('Name', project.carrier),
				field('Photo', photoOf('carrier'), 'image'),
				field('Documents', 'stowage-plan.pdf', 'file')
			]
		},
		{
			...base,
			id: 'timelog',
			name: 'Time Log',
			icon: 'icon-[mdi--clock-outline]',
			kind: 'timelog',
			control: 'locked',
			days: [
				{
					id: createId('day'),
					date: '2026-05-12',
					entries: [
						{ id: createId('entry'), time: '07:30', activity: 'Arrived on site, safety briefing' },
						{ id: createId('entry'), time: '08:15', activity: 'Hatch 2 opened, discharge started' },
						{ id: createId('entry'), time: '11:40', activity: 'Units 1 to 3 landed and checked' }
					]
				}
			]
		},
		{
			...base,
			id: 'inspection',
			name: 'Inspection',
			icon: 'icon-[mdi--camera-outline]',
			kind: 'photos',
			control: 'remove',
			isDraggable: true,
			groups: [
				group('Warehouse intake', 'Receiving area and intake flow.', ['a1', 'a2', 'a3', 'a4', 'a5'])
			]
		},
		{
			...base,
			id: 'damages',
			name: 'Damages',
			icon: 'icon-[mdi--alert-outline]',
			kind: 'photos',
			control: 'switch',
			isDraggable: true,
			isEnabled: false
		},
		{
			...base,
			id: 'discharge',
			name: 'Discharge',
			icon: 'icon-[mdi--crane]',
			kind: 'photos',
			control: 'switch',
			isDraggable: true,
			groups: [group('Hatch 2 discharge', 'Lift sequence from hatch 2.', ['b1', 'b2', 'b3', 'b4'])]
		},
		{
			...base,
			id: 'custom',
			name: 'Custom',
			icon: 'icon-[mdi--puzzle-outline]',
			kind: 'photos',
			control: 'switch',
			isDraggable: true,
			isEnabled: false
		}
	];

	// Blank the later inputs so the panel percents land near the project's progress.
	const blanks = Math.round(((100 - project.progress) / 100) * 22);
	const order = ['items', 'client', 'carrier', 'facility', 'project'];
	let left = blanks;
	for (let round = 0; left > 0 && round < 12; round += 1) {
		for (const id of order) {
			const panel = panels.find((item) => item.id === id)!;
			const filled = panel.fields.filter((item) => item.value);
			if (left > 0 && filled.length > 0) {
				filled[filled.length - 1].value = '';
				left -= 1;
			}
		}
	}
	if (project.progress < 60) {
		panels.find((item) => item.id === 'timelog')!.days[0].entries.splice(1);
		panels.find((item) => item.id === 'inspection')!.groups[0].photos = [];
		panels.find((item) => item.id === 'discharge')!.isEnabled = false;
	}
	if (project.progress < 25) {
		panels.find((item) => item.id === 'team')!.assigned = [];
		panels.find((item) => item.id === 'timelog')!.days = [];
	}
	return panels;
}

export function newPanel(count: number): PanelType {
	return {
		id: createId('panel'),
		name: count > 1 ? `Photos ${count}` : 'Photos',
		icon: 'icon-[mdi--image-multiple-outline]',
		kind: 'photos',
		control: 'remove',
		isEnabled: true,
		isDraggable: true,
		fields: [],
		owner: '',
		assigned: [],
		days: [],
		groups: []
	};
}

export const NAV = [
	{
		id: 'dashboard',
		label: 'Dashboard',
		icon: 'icon-[mdi--view-dashboard-outline]',
		active: 'icon-[mdi--view-dashboard]'
	},
	{
		id: 'projects',
		label: 'Projects',
		icon: 'icon-[mdi--folder-outline]',
		active: 'icon-[mdi--folder]'
	},
	{
		id: 'lists',
		label: 'Lists',
		icon: 'icon-[mdi--format-list-bulleted-square]',
		active: 'icon-[mdi--format-list-bulleted-square]',
		children: ['Clients', 'Carriers', 'Facilities']
	},
	{
		id: 'admin',
		label: 'Admin',
		icon: 'icon-[mdi--shield-account-outline]',
		active: 'icon-[mdi--shield-account]',
		children: ['Users', 'Organization', 'Trash']
	}
];

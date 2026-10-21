// PROTOTYPE (#161): made-up projects for Trident's real clients. Only each client's name, square icon, kind and
// office city are real (Justin's client pack, 2026-10-21; he chose to show names and icons here); contact details stay
// made up. The people are the real Trident Cubed team (team.data.ts), by Justin's choice. Run 5 builds two looks from one set
// of panels: A keeps the app prototype's panels, B folds organization, client, team, facility and carrier into one
// Project panel of drop-downs (createPanels).
import { photoOfMember, ROLE_LABELS, TEAM } from './team.data';

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
	location: string;
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
	// B's Project panel: the drop-down also offers "Add new", a quick dialog that adds to `options`.
	isAddable?: boolean;
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

export type PanelKindType = 'fields' | 'team' | 'project' | 'timelog' | 'photos';
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
export const STATUS: Record<
	StatusType,
	{ icon: string; tone: string; dot: string; bar: string; pill: string }
> = {
	Draft: {
		icon: 'icon-[mdi--file-outline]',
		tone: 'text-slate-400',
		dot: 'bg-slate-300',
		bar: 'bg-slate-400',
		pill: 'bg-slate-100 text-slate-600'
	},
	'In Progress': {
		icon: 'icon-[mdi--progress-pencil]',
		tone: 'text-primary',
		dot: 'bg-primary',
		bar: 'bg-primary',
		pill: 'bg-primary/10 text-primary-700'
	},
	Review: {
		icon: 'icon-[mdi--eye-check-outline]',
		tone: 'text-warning',
		dot: 'bg-warning',
		bar: 'bg-warning',
		pill: 'bg-warning/15 text-amber-700'
	},
	Sent: {
		icon: 'icon-[mdi--send-check-outline]',
		tone: 'text-violet-500',
		dot: 'bg-violet-500',
		bar: 'bg-violet-500',
		pill: 'bg-violet-500/10 text-violet-700'
	},
	Revision: {
		icon: 'icon-[mdi--undo-variant]',
		tone: 'text-danger',
		dot: 'bg-danger',
		bar: 'bg-danger',
		pill: 'bg-danger/10 text-rose-700'
	},
	Complete: {
		icon: 'icon-[mdi--check-decagram-outline]',
		tone: 'text-success',
		dot: 'bg-success',
		bar: 'bg-success',
		pill: 'bg-success/15 text-emerald-700'
	},
	Archived: {
		icon: 'icon-[mdi--archive-outline]',
		tone: 'text-slate-400',
		dot: 'bg-slate-400',
		bar: 'bg-slate-300',
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

export const PEOPLE: PersonType[] = TEAM.map((member) => ({
	name: member.name,
	photo: photoOfMember(member)
}));

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
		client: 'CEVA Logistics',
		carrier: 'MV Coral Dawn',
		facility: 'East Harbor Berth',
		location: 'Houston, TX',
		dates: 'Tue, 12 May 2026',
		status: 'In Progress',
		team: ['Collin Tippit', 'Alfredo Llanes', 'Aaron Davis'],
		updated: '12 min ago',
		progress: 64
	},
	{
		id: 'p2',
		number: 'TC-24030',
		title: 'Harbor Readiness Survey',
		subtitle: 'Pre-arrival condition check',
		type: 'Vessel Condition',
		client: 'KOGA',
		carrier: 'MV Silver Tern',
		facility: 'Eastgate Terminal 4',
		location: 'Lake Charles, LA',
		dates: 'Mon, 11 May 2026',
		status: 'Review',
		team: ['Capt. Jim DeStefano', 'Tynequa Shaw', 'Aaron Davis'],
		updated: '1 h ago',
		progress: 88
	},
	{
		id: 'p3',
		number: 'TC-24029',
		title: 'Outbound Cargo Condition Report',
		subtitle: 'Bagged rice loading',
		type: 'Cargo',
		client: 'Oslo Caribbean Carrier',
		carrier: 'MV Lantern Bay',
		facility: 'Bulk Dock 8',
		location: 'Corpus Christi, TX',
		dates: 'Fri, 8 May 2026',
		status: 'Sent',
		team: ['Gustavo Ruiz', 'Ian Derda', 'Natzul Reyes Flores'],
		updated: 'Yesterday',
		progress: 96
	},
	{
		id: 'p4',
		number: 'TC-24028',
		title: 'Open Starter Project',
		subtitle: 'Warehouse stock count',
		type: 'Warehousing',
		client: 'UTC Overseas',
		carrier: 'Truck fleet 12',
		facility: 'Northside Depot',
		location: 'Pasadena, TX',
		dates: 'Thu, 7 May 2026',
		status: 'Draft',
		team: ['Ian Derda', 'Alfredo Llanes'],
		updated: 'Yesterday',
		progress: 18
	},
	{
		id: 'p5',
		number: 'TC-24027',
		title: 'Arrival Draft Survey',
		subtitle: 'Draft and displacement',
		type: 'Draft Survey',
		client: 'US Ocean',
		carrier: 'MV Coral Dawn',
		facility: 'Turning Basin Wharf 3',
		location: 'Houston, TX',
		dates: 'Tue, 5 May 2026',
		status: 'Revision',
		team: ['Natzul Reyes Flores', 'Collin Tippit'],
		updated: '2 days ago',
		progress: 92
	},
	{
		id: 'p6',
		number: 'TC-24026',
		title: 'Transformer Lift',
		subtitle: 'Heavy lift supervision',
		type: 'Cargo',
		client: 'dship Carriers',
		carrier: 'MV Harbor Finch',
		facility: 'Southpoint Terminal',
		location: 'Beaumont, TX',
		dates: 'Mon, 4 May 2026',
		status: 'In Progress',
		team: ['Tynequa Shaw', 'Gustavo Ruiz'],
		updated: '3 days ago',
		progress: 35
	},
	{
		id: 'p7',
		number: 'TC-24025',
		title: 'Post-Discharge Review',
		subtitle: 'Blade discharge, all clear',
		type: 'Cargo',
		client: 'DIX Shipping',
		carrier: 'MV Harbor Finch',
		facility: 'Renewables Terminal West',
		location: 'Port Arthur, TX',
		dates: 'Wed, 29 Apr 2026',
		status: 'Complete',
		team: ['Alfredo Llanes', 'Capt. Jim DeStefano', 'Aaron Davis'],
		updated: 'Last week',
		progress: 100
	},
	{
		id: 'p8',
		number: 'TC-24024',
		title: 'Final Cargo Survey Record',
		subtitle: 'Closed survey archive',
		type: 'Cargo',
		client: 'Zurich North America',
		carrier: 'Rail car 88',
		facility: 'Heavy Lift Archive Yard',
		location: 'Mobile, AL',
		dates: 'Mon, 13 Apr 2026',
		status: 'Archived',
		team: ['Aaron Davis', 'Alfredo Llanes', 'Tynequa Shaw', 'Ian Derda'],
		updated: 'Last month',
		progress: 100
	}
];

export type ClientType = {
	name: string;
	kind: string;
	icon: string;
	city: string;
};

const ICONS = import.meta.glob<string>('./clients/*.{png,jpg,ico}', {
	eager: true,
	query: '?url',
	import: 'default'
});

function iconOf(id: string) {
	return Object.entries(ICONS).find(([path]) => path.includes(`/${id}.`))?.[1] ?? '';
}

// [name, icon file, kind, office city]
const CLIENT_ROWS = [
	['US Ocean', 'us-ocean', 'Ocean carrier', 'Houston, TX'],
	['KOGA', 'koga', 'Ocean carrier', 'Houston, TX'],
	['dship Carriers', 'dship-carriers', 'Ocean carrier', 'Houston, TX'],
	['Oslo Caribbean Carrier', 'oslo-caribbean-carrier', 'Ocean carrier', 'Houston, TX'],
	['UTC Overseas', 'utc-overseas', 'Freight forwarder', 'Houston, TX'],
	['CEVA Logistics', 'ceva-logistics', 'Freight forwarder', 'Houston, TX'],
	['DIX Shipping', 'dix-industries', 'Stevedore and terminal', 'Brownsville, TX'],
	['Zurich North America', 'zurich-north-america', 'Insurer', 'Schaumburg, IL'],
	['AXA XL', 'axa-xl', 'Insurer', 'Stamford, CT'],
	['Liberty Specialty Markets', 'liberty-specialty-markets', 'Insurer', 'London, UK']
] as const;

export const CLIENT_INFO: Record<string, ClientType> = Object.fromEntries(
	CLIENT_ROWS.map(([name, id, kind, city]) => [name, { name, kind, icon: iconOf(id), city }])
);

export const CLIENTS: string[] = CLIENT_ROWS.map(([name]) => name);

export function clientOf(name: string): ClientType {
	return CLIENT_INFO[name] ?? { name, kind: '', icon: '', city: '' };
}

export const ROLES: Record<string, string> = Object.fromEntries(
	TEAM.map((member) => [member.name, ROLE_LABELS[member.role]])
);

// What the count tiles count, and what the chart and list then show.
export type DatasetType = 'projects' | 'clients' | 'team' | 'ports';

export const DATASETS: Record<
	DatasetType,
	{ label: string; icon: string; active: string; headline: string; filters: string[] }
> = {
	projects: {
		label: 'Projects',
		icon: 'icon-[mdi--briefcase-variant-outline]',
		active: 'icon-[mdi--briefcase-variant]',
		headline: 'Open projects',
		filters: ['All', 'In Progress', 'Review', 'Sent', 'Complete']
	},
	clients: {
		label: 'Clients',
		icon: 'icon-[mdi--domain]',
		active: 'icon-[mdi--domain]',
		headline: 'Active clients',
		filters: ['All', 'Active', 'Quiet']
	},
	team: {
		label: 'Team',
		icon: 'icon-[mdi--account-group-outline]',
		active: 'icon-[mdi--account-group]',
		headline: 'Team on projects',
		filters: ['All', 'Admins', 'Managers', 'Members']
	},
	ports: {
		label: 'Ports',
		icon: 'icon-[mdi--anchor]',
		active: 'icon-[mdi--anchor]',
		headline: 'Busy ports',
		filters: ['All', 'Busy', 'Quiet']
	}
};

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

export type VariantType = 'A' | 'B';

// Trident Cubed itself: the organization every report is written for (B's Organization drop-down, the cover page).
export const ORGANIZATION = {
	name: 'Trident Cubed',
	address: '800 Town and Country, Ste 500, Houston, TX 77024',
	phone: '+1 409 543 2725',
	email: 'operations@tridentcubed.com',
	website: 'tridentcubed.com'
};

export const CLOSING =
	'Thank you for trusting Trident Cubed with your cargo. Call or email me with any question about this report.';

// A's panels are the app prototype's twelve (definitions/panels.ts) plus a Disclaimer panel. B folds organization,
// client, team, facility and carrier into one Project panel of drop-downs, each with "Add new". Both are filled in as
// far as `progress` says, so each project opens at its own percent.
export function createPanels(project: ProjectType, variant: VariantType = 'A'): PanelType[] {
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
				field('City', clientOf(project.client).city.split(', ')[0]),
				field('State', clientOf(project.client).city.split(', ')[1] ?? ''),
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
			fields: [
				field('Name', project.facility),
				field('City', project.location.split(', ')[0]),
				field('State', project.location.split(', ')[1] ?? '')
			]
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
		},
		{
			...base,
			id: 'disclaimer',
			name: 'Disclaimer',
			icon: 'icon-[mdi--file-sign]',
			kind: 'fields',
			control: 'locked',
			fields: [
				field('Signed by', project.team[0] ?? '', 'select', { options: TEAM.map((m) => m.name) }),
				field('Closing', CLOSING, 'textarea')
			]
		}
	];
	if (variant === 'B') {
		const folded = [
			'organization',
			'client',
			'team',
			'project',
			'facility',
			'carrier',
			'disclaimer'
		];
		panels.splice(
			0,
			panels.length,
			projectPanel(project, base),
			...panels.filter((panel) => !folded.includes(panel.id))
		);
	}

	// Blank the later inputs so the panel percents land near the project's progress.
	const blanks = Math.round(((100 - project.progress) / 100) * 22);
	const order = ['items', 'client', 'carrier', 'facility', 'project'];
	let left = blanks;
	for (let round = 0; left > 0 && round < 12; round += 1) {
		for (const id of order) {
			const panel = panels.find((item) => item.id === id);
			if (!panel) continue;
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
		panels.find((item) => item.id === 'team' || item.id === 'project')!.assigned = [];
		panels.find((item) => item.id === 'timelog')!.days = [];
	}
	return panels;
}

// B's one Project panel: the project's own fields with organization, client, team, facility and carrier as drop-downs.
function projectPanel(
	project: ProjectType,
	base: Omit<PanelType, 'id' | 'name' | 'icon' | 'kind' | 'control'>
) {
	const facilities = [...new Set(PROJECTS.map((item) => item.facility))];
	const carriers = [...new Set(PROJECTS.map((item) => item.carrier))];
	return {
		...base,
		id: 'project',
		name: 'Project',
		icon: 'icon-[mdi--clipboard-text-outline]',
		kind: 'project',
		control: 'locked',
		owner: project.team[0] ?? '',
		assigned: project.team.slice(1),
		fields: [
			field('Title', project.title),
			field('Organization', ORGANIZATION.name, 'select', {
				options: [ORGANIZATION.name],
				isAddable: true
			}),
			field('Client', project.client, 'select', { options: [...CLIENTS], isAddable: true }),
			field('Facility', project.facility, 'select', { options: facilities, isAddable: true }),
			field('Carrier', project.carrier, 'select', { options: carriers, isAddable: true }),
			field('Type', project.type, 'select', {
				options: ['Cargo', 'Vessel Condition', 'Warehousing', 'Draft Survey', 'Bunker']
			}),
			field('Location', project.location),
			field('Subtitle', project.subtitle)
		]
	} satisfies PanelType;
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
	{ id: 'home', label: 'Home', icon: 'icon-[mdi--home]' },
	{ id: 'projects', label: 'Projects', icon: 'icon-[mdi--folder]' },
	{ id: 'clients', label: 'Clients', icon: 'icon-[mdi--account]' },
	{ id: 'team', label: 'Team', icon: 'icon-[mdi--account-group]' },
	{
		id: 'admin',
		label: 'Admin',
		icon: 'icon-[mdi--shield-account]',
		children: ['Users', 'Organization', 'Trash']
	}
];

// Recent activity for the sidebar (E): what happened, so the icon can say what kind of thing it was.
export const RECENT: {
	kind: 'project' | 'client' | 'person';
	name: string;
	note: string;
	id?: string;
}[] = [
	{ kind: 'project', name: 'Terminal Intake Review', note: 'Edited · 12 min ago', id: 'p1' },
	{ kind: 'client', name: 'KOGA', note: 'New client · 1 h ago' },
	{ kind: 'project', name: 'Harbor Readiness Survey', note: 'Sent to review · 1 h ago', id: 'p2' },
	{ kind: 'person', name: 'Natzul Reyes Flores', note: 'Joined the team · Yesterday' },
	{ kind: 'project', name: 'Outbound Cargo Condition Report', note: 'Sent · Yesterday', id: 'p3' },
	{ kind: 'client', name: 'dship Carriers', note: 'New contact · 3 days ago' }
];

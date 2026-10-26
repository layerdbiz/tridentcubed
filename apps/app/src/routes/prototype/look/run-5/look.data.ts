// PROTOTYPE (#161): made-up projects for Trident's real customers (called clients until 2026-10-26 19:22; the code
// keeps `client` for the field). Only each customer's name, square icon, kind and
// office city are real (Justin's client pack, 2026-10-21; he chose to show names and icons here); contact details stay
// made up. The people are the real Trident Cubed team (team.data.ts), by Justin's choice. One look since 2026-10-25 (B;
// A is gone): organization, client and team live in the Project panel, and the trip in the Transport panel after it
// (Justin, 2026-10-25): one stop per place, in trip order, each with its point (Start, Stop, End; run 8 note 18), its
// Transport type (Sea, Air, Rail, Road), Transport mode (Vessel, Barge …), the transport itself from the organization's
// Transport list, and the facility. Transports and facilities are typed in by hand; a tracking service adds to the same
// list later (`source`).
import { initialsOf, photoOfMember, ROLE_LABELS, TEAM } from './team.data';

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
	// The trip's stops in order: what happened there, on which transport, at which facility.
	stops: { point: PointType; transport: string; facility: string }[];
	location: string;
	dates: string;
	status: StatusType;
	// The state a project was in before it was marked Sent, so Unsend can put it back (2026-10-26 19:22).
	before?: StatusType;
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
// Each photo has its own description, written from the photo's ⋮ or a tap, shown over it in the preview.
export type PhotoType = { id: string; src: string; description: string };
// One row of the Items panel: how many and what (Justin's run 9 note 24), the way the sample reports list cargo
// ("2x transformers and 27x accessory crates"). A manifest's extra columns may come later.
export type ItemType = { id: string; quantity: string; description: string };
export type GroupType = {
	id: string;
	title: string;
	description: string;
	layout: number;
	photos: PhotoType[];
};

// One stop of the Transport panel, added like a photo group: a place on the trip and what moved the items there.
export type StopType = {
	id: string;
	point: PointType | '';
	type: TransportTypeType | '';
	mode: string;
	name: string;
	facility: string;
};

export type PanelKindType = 'project' | 'transport' | 'items' | 'timelog' | 'photos';
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
	stops: StopType[];
	items: ItemType[];
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
	return PEOPLE.find((person) => person.name === name) ?? { name, photo: initialsOf(name) };
}

// A project's stops, written short: [point, transport, facility].
function trip(...stops: [PointType, string, string][]): ProjectType['stops'] {
	return stops.map(([point, transport, facility]) => ({ point, transport, facility }));
}

// The transports and facilities a project's trip uses, once each.
export function transportsOf(project: ProjectType) {
	return [...new Set(project.stops.map((stop) => stop.transport).filter(Boolean))];
}

export function facilitiesOf(project: ProjectType) {
	return [...new Set(project.stops.map((stop) => stop.facility).filter(Boolean))];
}

// Where a project's trip starts and ends (its Start and End stops, 2026-10-26 19:22): each facility's city, or the
// facility's own name when both ends are in the same city. With fewer than two stops it is the project's location.
export function routeOf(project: ProjectType, facilities: { name: string; city: string }[]) {
	const start = project.stops.find((stop) => stop.point === 'Start') ?? project.stops[0];
	const end = project.stops.findLast((stop) => stop.point === 'End') ?? project.stops.at(-1);
	if (!start?.facility || !end?.facility || start === end)
		return { from: project.location, to: '' };
	const cityOf = (name: string) => facilities.find((item) => item.name === name)?.city || name;
	const [from, to] = [cityOf(start.facility), cityOf(end.facility)];
	return from === to ? { from: start.facility, to: end.facility } : { from, to };
}

export const PROJECTS: ProjectType[] = [
	{
		id: 'p1',
		number: 'TC-24031',
		title: 'Terminal Intake Review',
		subtitle: 'Receiving inspection underway',
		type: 'Warehousing',
		client: 'CEVA Logistics',
		stops: trip(
			['Start', 'MV Coral Dawn', 'East Harbor Berth'],
			['End', 'Truck 12', 'Northside Depot']
		),
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
		stops: trip(['End', 'MV Silver Tern', 'Eastgate Terminal 4']),
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
		stops: trip(
			['Start', 'Rail car 88', 'Bayside Rail Yard'],
			['End', 'MV Lantern Bay', 'Bulk Dock 8']
		),
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
		stops: trip(['Start', 'Truck 12', 'Northside Depot']),
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
		stops: trip(['End', 'MV Coral Dawn', 'Turning Basin Wharf 3']),
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
		stops: trip(
			['Start', 'MV Harbor Finch', 'Southpoint Terminal'],
			['End', 'Lowboy trailer 3', 'Southpoint Terminal']
		),
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
		stops: trip(
			['Start', 'MV Harbor Finch', 'Eastgate Terminal 4'],
			['Stop', 'Gulf Barge 7', 'Renewables Terminal West'],
			['End', 'Lowboy trailer 3', 'Northside Depot']
		),
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
		stops: trip(['End', 'Train 3302', 'Bayside Rail Yard']),
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
	// The same artwork trimmed to its edges, for the report footer (Justin's run 9 note 6).
	logo: string;
	city: string;
	// The short code a document ID starts with. Made up for the prototype; the client's own come with V1.
	code: string;
};

const ICONS = import.meta.glob<string>('./clients/*.{png,jpg,ico}', {
	eager: true,
	query: '?url',
	import: 'default'
});

const LOGOS = import.meta.glob<string>('./clients/trimmed/*.png', {
	eager: true,
	query: '?url',
	import: 'default'
});

function iconOf(id: string, files = ICONS) {
	return Object.entries(files).find(([path]) => path.includes(`/${id}.`))?.[1] ?? '';
}

// [name, icon file, kind, office city, document code]
const CLIENT_ROWS = [
	['US Ocean', 'us-ocean', 'Ocean carrier', 'Houston, TX', 'USO'],
	['KOGA', 'koga', 'Ocean carrier', 'Houston, TX', 'KOG'],
	['dship Carriers', 'dship-carriers', 'Ocean carrier', 'Houston, TX', 'DSC'],
	['Oslo Caribbean Carrier', 'oslo-caribbean-carrier', 'Ocean carrier', 'Houston, TX', 'OCC'],
	['UTC Overseas', 'utc-overseas', 'Freight forwarder', 'Houston, TX', 'UTC'],
	['CEVA Logistics', 'ceva-logistics', 'Freight forwarder', 'Houston, TX', 'CVA'],
	['DIX Shipping', 'dix-industries', 'Stevedore and terminal', 'Brownsville, TX', 'DIX'],
	['Zurich North America', 'zurich-north-america', 'Insurer', 'Schaumburg, IL', 'ZNA'],
	['AXA XL', 'axa-xl', 'Insurer', 'Stamford, CT', 'AXA'],
	['Liberty Specialty Markets', 'liberty-specialty-markets', 'Insurer', 'London, UK', 'LSM']
] as const;

export const CLIENT_INFO: Record<string, ClientType> = Object.fromEntries(
	CLIENT_ROWS.map(([name, id, kind, city, code]) => [
		name,
		{ name, kind, icon: iconOf(id), logo: iconOf(id, LOGOS), city, code }
	])
);

export const CLIENTS: string[] = CLIENT_ROWS.map(([name]) => name);

// A customer added in the prototype: no icon or logo yet, so it shows its initial on a colour of its own. It joins
// the list a new project's Customer drop-down offers.
export function registerCustomer(name: string, city: string): ClientType {
	if (!CLIENTS.includes(name)) CLIENTS.push(name);
	CLIENT_INFO[name] = { ...clientOf(name), city };
	return CLIENT_INFO[name];
}

export function clientOf(name: string): ClientType {
	const code =
		name
			.replace(/[^a-z]/gi, '')
			.slice(0, 3)
			.toUpperCase() || 'TC';
	return CLIENT_INFO[name] ?? { name, kind: '', icon: '', logo: '', city: '', code };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Tue, 12 May 2026" as 2026-05-12; "Today" (a new project) as today.
function isoOf(dates: string) {
	const match = dates.match(/(\d{1,2}) (\w{3}) (\d{4})/);
	if (!match) return new Date().toISOString().slice(0, 10);
	const month = String(MONTHS.indexOf(match[2]) + 1).padStart(2, '0');
	return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
}

// The document ID the client picked (format 3, 2026-10-25): client code, date, J = which of that client's jobs that
// day, FR = final report, R = revision. SGL-2026-02-03-J01-FR01-R01.
export function documentIdOf(
	project: ProjectType,
	projects: ProjectType[],
	client = project.client
) {
	const date = isoOf(project.dates);
	const sameDay = projects.filter(
		(other) => other.client === project.client && isoOf(other.dates) === date
	);
	const job = String(Math.max(1, sameDay.indexOf(project) + 1)).padStart(2, '0');
	return `${clientOf(client).code}-${date}-J${job}-FR01-R01`;
}

export const ROLES: Record<string, string> = Object.fromEntries(
	TEAM.map((member) => [member.name, ROLE_LABELS[member.role]])
);

export type TransportTypeType = 'Sea' | 'Air' | 'Rail' | 'Road';
// Where a stop sits on the trip: Start, a Stop on the way, or End. Words everyone reads the same way (Justin's run 8
// note 18), each with its own colour: Start blue, Stop amber, End green.
export type PointType = 'Start' | 'Stop' | 'End';
export type FacilityKindType = 'Port' | 'Airport' | 'Rail yard' | 'Depot';

// Each transport type, its transport modes and the kind of facility it uses. `icon-barge` is drawn in look.svelte: no icon set
// has a barge.
export const TRANSPORT_TYPES: Record<
	TransportTypeType,
	{ icon: string; modes: string[]; facility: FacilityKindType }
> = {
	Sea: { icon: 'icon-[mdi--waves]', modes: ['Vessel', 'Barge'], facility: 'Port' },
	Air: { icon: 'icon-[mdi--airplane-takeoff]', modes: ['Plane'], facility: 'Airport' },
	Rail: { icon: 'icon-[mdi--train-variant]', modes: ['Train', 'Railcar'], facility: 'Rail yard' },
	Road: { icon: 'icon-[mdi--road-variant]', modes: ['Truck', 'Trailer'], facility: 'Depot' }
};

export const MODE_ICONS: Record<string, string> = {
	Vessel: 'icon-[mdi--ferry]',
	Barge: 'icon-barge',
	Plane: 'icon-[mdi--airplane]',
	Train: 'icon-[mdi--train]',
	Railcar: 'icon-[mdi--train-car-box]',
	Truck: 'icon-[mdi--truck]',
	Trailer: 'icon-[mdi--truck-trailer]'
};

export const POINTS: Record<
	PointType,
	{ icon: string; hint: string; text: string; chip: string; dot: string; solid: string }
> = {
	Start: {
		icon: 'icon-[mdi--ray-start-arrow]',
		hint: 'where the trip starts',
		text: 'text-primary',
		chip: 'bg-primary/10 text-primary',
		dot: 'bg-primary',
		solid: 'bg-primary text-white'
	},
	Stop: {
		icon: 'icon-[mdi--ray-vertex]',
		hint: 'on the way',
		text: 'text-amber-600',
		chip: 'bg-warning/15 text-amber-700',
		dot: 'bg-warning',
		solid: 'bg-warning text-white'
	},
	End: {
		icon: 'icon-[mdi--ray-end]',
		hint: 'where the trip ends',
		text: 'text-success',
		chip: 'bg-success/15 text-emerald-700',
		dot: 'bg-success',
		solid: 'bg-success text-white'
	}
};

export const FACILITY_ICONS: Record<FacilityKindType, string> = {
	Port: 'icon-[mdi--anchor]',
	Airport: 'icon-[mdi--airport]',
	'Rail yard': 'icon-[mdi--train-car-container]',
	Depot: 'icon-[mdi--warehouse]'
};

// The organization's Transport list. Every one is typed in by hand in V1; `source` is where a tracking service's
// ships and planes merge in later.
export type TransportType = {
	name: string;
	type: TransportTypeType;
	mode: string;
	source: 'manual' | 'api';
};

export const TRANSPORTS: TransportType[] = (
	[
		['MV Coral Dawn', 'Sea', 'Vessel'],
		['MV Silver Tern', 'Sea', 'Vessel'],
		['MV Lantern Bay', 'Sea', 'Vessel'],
		['MV Harbor Finch', 'Sea', 'Vessel'],
		['Gulf Barge 7', 'Sea', 'Barge'],
		['Air Freighter 210', 'Air', 'Plane'],
		['Train 3302', 'Rail', 'Train'],
		['Rail car 88', 'Rail', 'Railcar'],
		['Truck 12', 'Road', 'Truck'],
		['Lowboy trailer 3', 'Road', 'Trailer']
	] as const
).map(([name, type, mode]) => ({ name, type, mode, source: 'manual' }));

// What a transport's own page lists, by transport mode (the Ships Particulars page of the sample reports). Empty in
// V1; a tracking service fills them in later.
export const PARTICULARS: Record<string, string[]> = {
	Vessel: ['IMO number', 'Flag', 'Year built', 'Gross tonnage', 'Length overall'],
	Barge: ['Registration', 'Flag', 'Deck size', 'Deadweight'],
	Plane: ['Registration', 'Flight number', 'Aircraft type', 'Airline'],
	Train: ['Train number', 'Railroad', 'Cars'],
	Railcar: ['Car number', 'Railroad', 'Car type'],
	Truck: ['Plate number', 'Haulier', 'Axles'],
	Trailer: ['Plate number', 'Haulier', 'Trailer type', 'Deck length']
};

export type FacilityType = { name: string; kind: FacilityKindType; city: string };

export const FACILITIES: FacilityType[] = (
	[
		['East Harbor Berth', 'Port', 'Houston, TX'],
		['Turning Basin Wharf 3', 'Port', 'Houston, TX'],
		['Eastgate Terminal 4', 'Port', 'Lake Charles, LA'],
		['Bulk Dock 8', 'Port', 'Corpus Christi, TX'],
		['Southpoint Terminal', 'Port', 'Beaumont, TX'],
		['Renewables Terminal West', 'Port', 'Port Arthur, TX'],
		['North Air Cargo Center', 'Airport', 'Houston, TX'],
		['Bayside Rail Yard', 'Rail yard', 'Mobile, AL'],
		['Northside Depot', 'Depot', 'Pasadena, TX']
	] as const
).map(([name, kind, city]) => ({ name, kind, city }));

// What the count tiles count, and what the chart and list then show.
export type DatasetType = 'projects' | 'customers' | 'team' | 'transport' | 'facilities';

// The dashboard's pages in order: the floating bar, the count cards and a sideways swipe all go through them.
export const PAGES: DatasetType[] = ['projects', 'customers', 'team', 'transport', 'facilities'];

// One icon per page, the same everywhere (Justin, 2026-10-26 19:22): a folder for projects, a smile for customers,
// the building (once the clients' icon) for facilities, and a box on the move for transport by sea, air, rail or road.
export const PAGE_ICONS: Record<DatasetType, { icon: string; active: string }> = {
	projects: { icon: 'icon-[mdi--folder-outline]', active: 'icon-[mdi--folder]' },
	customers: { icon: 'icon-[mdi--emoticon-outline]', active: 'icon-[mdi--emoticon]' },
	team: { icon: 'icon-[mdi--account-group-outline]', active: 'icon-[mdi--account-group]' },
	transport: { icon: 'icon-[mdi--cube-send]', active: 'icon-[mdi--cube-send]' },
	facilities: { icon: 'icon-[mdi--domain]', active: 'icon-[mdi--domain]' }
};

export const DATASETS: Record<
	DatasetType,
	{ label: string; one: string; icon: string; active: string; filters: string[] }
> = {
	projects: {
		label: 'Projects',
		one: 'Project',
		...PAGE_ICONS.projects,
		filters: ['All', 'In Progress', 'Review', 'Sent', 'Complete']
	},
	customers: {
		label: 'Customers',
		one: 'Customer',
		...PAGE_ICONS.customers,
		filters: ['All', 'Active', 'Quiet']
	},
	team: {
		label: 'Team',
		one: 'Name',
		...PAGE_ICONS.team,
		filters: ['All', 'Admins', 'Managers', 'Members']
	},
	transport: {
		label: 'Transport',
		one: 'Transport',
		...PAGE_ICONS.transport,
		filters: ['All', 'Sea', 'Air', 'Rail', 'Road']
	},
	facilities: {
		label: 'Facilities',
		one: 'Facility',
		...PAGE_ICONS.facilities,
		filters: ['All', 'Port', 'Airport', 'Rail yard', 'Depot']
	}
};

export const LAYOUTS = [1, 2, 4, 6, 8];

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
// The page load's own mark, so an id made now never repeats one kept from an earlier visit (LookState keeps the
// projects in the browser).
const LOAD = Math.random().toString(36).slice(2, 7);
export function createId(prefix: string) {
	nextId += 1;
	return `${prefix}-${LOAD}${nextId}`;
}

export function itemOf(quantity = '', description = ''): ItemType {
	return { id: createId('item'), quantity, description };
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
			description: `${title}, photo ${index + 1}`
		}))
	};
}

// Trident Cubed itself: the organization every report is written for (the Organization drop-down, the letterhead).
export const ORGANIZATION = {
	name: 'Trident Cubed',
	address: '800 Town and Country, Ste 500, Houston, TX 77024',
	phone: '+1 409 543 2725',
	email: 'operations@tridentcubed.com',
	website: 'tridentcubed.com'
};

export const CLOSING =
	'Thank you for trusting Trident Cubed with your cargo. Call or email me with any question about this report.';

export const PROJECT_TYPES = ['Cargo', 'Vessel Condition', 'Warehousing', 'Draft Survey', 'Bunker'];

export function stopOf(
	{ point, transport: name, facility }: ProjectType['stops'][number] = {
		point: 'Start',
		transport: '',
		facility: ''
	},
	transports: TransportType[] = TRANSPORTS
): StopType {
	const transport = transports.find((item) => item.name === name);
	return {
		id: createId('stop'),
		point: name || facility ? point : '',
		type: transport?.type ?? '',
		mode: transport?.mode ?? '',
		name,
		facility
	};
}

// The project's own panel first, then the app prototype's Items, Time Log and photo panels. Filled in as far as
// `progress` says, so each project opens at its own percent.
export function createPanels(project: ProjectType): PanelType[] {
	const base = {
		isEnabled: true,
		isDraggable: false,
		fields: [],
		owner: '',
		assigned: [],
		days: [],
		groups: [],
		stops: [],
		items: []
	};
	const panels: PanelType[] = [
		projectPanel(project, base),
		{
			...base,
			id: 'transport',
			name: 'Transport',
			icon: 'icon-[mdi--ferry]',
			kind: 'transport',
			control: 'locked',
			stops: project.stops.map((stop) => stopOf(stop))
		},
		{
			...base,
			id: 'items',
			name: 'Items',
			icon: 'icon-[mdi--package-variant-closed]',
			kind: 'items',
			control: 'locked',
			items: [
				itemOf('2', 'Power transformers on steel cradles'),
				itemOf('27', 'Accessory crates'),
				itemOf('6', 'Crated machinery units, shrink-wrapped on skids')
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

	// Blank the later inputs, the less done the more, so each project opens at its own percent (LookState then lists
	// that percent). Title, organization and customer always stay; items empty from the last row up; the stops go last,
	// from the last one back.
	const [details, trip, cargo] = panels;
	const kept = ['Title', 'Organization', 'Customer'];
	let left = Math.round(((100 - project.progress) / 100) * 12);
	for (let round = 0; left > 0 && round < 12; round += 1) {
		const row = cargo.items.findLast((item) => item.description);
		if (row) {
			row.quantity = row.description = '';
			left -= 1;
		}
		const filled = details.fields.filter((item) => item.value && !kept.includes(item.label));
		if (left > 0 && filled.length > 0) {
			filled[filled.length - 1].value = '';
			left -= 1;
		}
	}
	for (const stop of trip.stops.toReversed())
		for (const part of ['facility', 'name', 'mode', 'type'] as const)
			if (left > 0) {
				stop[part] = '';
				left -= 1;
			}
	if (project.progress < 60) {
		panels.find((item) => item.id === 'timelog')!.days[0].entries.splice(1);
		panels.find((item) => item.id === 'inspection')!.groups[0].photos = [];
		panels.find((item) => item.id === 'discharge')!.isEnabled = false;
	}
	if (project.progress < 25) {
		details.assigned = [];
		panels.find((item) => item.id === 'timelog')!.days = [];
	}
	return panels;
}

// The Project panel: the project's own fields, with organization and client picked from lists, each with "Add new",
// and its team. The trip has its own Transport panel, right after it.
function projectPanel(
	project: ProjectType,
	base: Omit<PanelType, 'id' | 'name' | 'icon' | 'kind' | 'control'>
) {
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
			field('Customer', project.client, 'select', { options: [...CLIENTS], isAddable: true }),
			field('Project type', project.type, 'select', { options: PROJECT_TYPES }),
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
		groups: [],
		stops: [],
		items: []
	};
}

// The side menu: the five pages (no Home since 2026-10-26 19:22), then Admin.
export const NAV = [
	...PAGES.map((id) => ({ id, label: DATASETS[id].label, icon: PAGE_ICONS[id].active })),
	{
		id: 'admin',
		label: 'Admin',
		icon: 'icon-[mdi--shield-account]',
		children: ['Users', 'Organization', 'Trash']
	}
];

// Recent activity for the sidebar (E): what happened, so the icon can say what kind of thing it was.
export const RECENT: {
	kind: 'project' | 'customer' | 'person';
	name: string;
	note: string;
	id?: string;
}[] = [
	{ kind: 'project', name: 'Terminal Intake Review', note: 'Edited · 12 min ago', id: 'p1' },
	{ kind: 'customer', name: 'KOGA', note: 'New customer · 1 h ago' },
	{ kind: 'project', name: 'Harbor Readiness Survey', note: 'Sent to review · 1 h ago', id: 'p2' },
	{ kind: 'person', name: 'Natzul Reyes Flores', note: 'Joined the team · Yesterday' },
	{ kind: 'project', name: 'Outbound Cargo Condition Report', note: 'Sent · Yesterday', id: 'p3' },
	{ kind: 'customer', name: 'dship Carriers', note: 'New contact · 3 days ago' }
];

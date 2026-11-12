// What the app knows before anything is saved: the shapes of a project and its panels and records, the real
// starting data (the organization Trident Cubed here, its team in team.data.ts; its customers come from the database
// since #183), and the helpers every screen reads. Carried over from the look prototype (#161); since V1 (#180) no
// sample projects, transports or facilities ship (Justin's rule of 2026-11-10: every value on screen is real).
import { seen, touch } from './registry.svelte';
// Run 16 (Justin, 2026-11-10: "no dummy data left ... the next step is connecting a real database"): nothing shown
// is made up by code any more. A project and every record carry when they were made and last changed (`created`,
// `updated`), which the charts, Recent and "Updated" read; a project's number comes from its customer's code and its
// day; a customer has several contacts; the online dot comes from when someone was last in the app.
import {
	initialsOf,
	photoOfMember,
	TEAM,
	type PresenceType,
	type TeamMemberType
} from './team.data';

export type StatusType =
	| 'Draft'
	| 'In Progress'
	| 'Review'
	| 'Ready'
	| 'Sent'
	| 'Revision'
	| 'Complete'
	| 'Archived';

export type PersonType = { name: string; photo: string; seen?: string };

export type ProjectType = {
	id: string;
	title: string;
	subtitle: string;
	type: string;
	client: string;
	// The trip's stops in order: what happened there, on which transport, at which facility.
	stops: { point: PointType; transport: string; facility: string }[];
	location: string;
	// When it was made and last changed, as ISO date-times (run 16). Its number and the day it shows come from
	// `created`; "Updated 5 min ago" from `updated`.
	created: string;
	updated: string;
	status: StatusType;
	// The state a project was in before it was marked Sent, so Unsend can put it back (2026-10-26 19:22).
	before?: StatusType;
	team: string[];
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
// Someone on the job who is not on the team (run 19, Justin 2026-11-10): typed into the Project panel's Team
// section and printed under the team on the report.
// Run 21: they are added by company, a company and then the people from it, each a name and a title. No photo:
// nobody has one to hand on a job.
export type PersonnelType = {
	id: string;
	company: string;
	people: { id: string; name: string; title: string }[];
};
// Something attached to the Items panel in place of typed rows, or beside them: a photo of the item list, or the
// spreadsheet itself. A photo prints on the report; a file prints its name.
export type AttachmentType = { id: string; name: string; src: string; kind: 'photo' | 'file' };
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
	// A stop added beyond the trip's own Start, Stop and End: it has its own section in the panel (run 19).
	isExtra?: boolean;
	// The leg it belongs to (legs.ts, run 26): one transport mode and the facilities it calls at.
	leg?: string;
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
	// The Project panel: which of the customer's contacts the report is for (its id); none picks the first.
	contact?: string;
	// The Project panel: people on the job who are not on the team.
	personnel?: PersonnelType[];
	// The Items panel: photos of the item list, or the spreadsheet itself.
	attachments?: AttachmentType[];
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
	Ready: {
		icon: 'icon-[mdi--check-circle-outline]',
		tone: 'text-teal-500',
		dot: 'bg-teal-500',
		bar: 'bg-teal-500',
		pill: 'bg-teal-500/10 text-teal-700'
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

export const PEOPLE: PersonType[] = TEAM.map((member) => ({
	name: member.name,
	photo: photoOfMember(member)
}));

export function personOf(name: string): PersonType {
	seen();
	return PEOPLE.find((person) => person.name === name) ?? { name, photo: initialsOf(name) };
}

// The dot on a face: green within five minutes of being in the app, amber within the hour, grey after. Only the
// signed-in person is ever "in the app" until there are real sign-ins, so everyone else is grey (run 16).
export function presenceOf(name: string): PresenceType {
	const last = personOf(name).seen;
	if (!last) return 'offline';
	const minutes = (Date.now() - new Date(last).getTime()) / 60000;
	return minutes < 5 ? 'online' : minutes < 60 ? 'idle' : 'offline';
}

// A team member renamed or added in the prototype keeps their photo under the new name; a photo uploaded on their
// page (run 15) takes over from the one they came with.
export function registerPerson(member: TeamMemberType) {
	const photo = member.photo || photoOfMember(member);
	const person = PEOPLE.find((item) => item.name === member.name);
	if (person) Object.assign(person, { photo, seen: member.seen });
	else PEOPLE.push({ name: member.name, photo, seen: member.seen });
	touch();
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

export type ClientType = {
	// Its row's id, made on the device (#183). The screens name a customer by its name; the mapper uses this.
	id?: string;
	name: string;
	kind: string;
	icon: string;
	// The same artwork trimmed to its edges, for the report footer (Justin's run 9 note 6).
	logo: string;
	city: string;
	// The short code a document ID starts with. The starting customers' are placeholders until their own arrive.
	code: string;
	// Run 15, all typed in or uploaded on the customer's Edit tab. An uploaded logo fills `icon` and `logo`.
	address?: string;
	email?: string;
	phone?: string;
	website?: string;
	// The picture behind its Page.
	photo?: string;
	// The people there (run 16: several). A project picks the one its report is for; the report page prints their
	// name, title and email.
	contacts?: ContactType[];
	created?: string;
	updated?: string;
};

export type ContactType = {
	id: string;
	name: string;
	title: string;
	email: string;
	phone: string;
	photo: string;
};

// The customers this organization has, by name (#183): empty until the server's rows arrive, then filled by the mapper
// (mapper.ts `takeRows`) and by every customer added or renamed here. A logo or a project number reads a customer by
// its name from here without knowing the page's state. The starting customers are the seed's (`db/seed.ts`).
export const CLIENT_INFO: Record<string, ClientType> = {};

export const CLIENTS: string[] = [];

// A customer added or edited here joins the list a new project's Customer drop-down offers. An added one has no icon
// or logo yet, so it shows its initial on a colour of its own.
export function registerCustomer(customer: ClientType): ClientType {
	if (!CLIENTS.includes(customer.name)) CLIENTS.push(customer.name);
	CLIENT_INFO[customer.name] = customer;
	touch();
	return customer;
}

// A customer renamed or moved to the Trash leaves the drop-down's list; its old name still reads it.
export function forgetCustomer(name: string) {
	const index = CLIENTS.indexOf(name);
	if (index >= 0) CLIENTS.splice(index, 1);
}

// The server's customers replace what was known: `live` are the lists', `trashed` are only read by name, so a project
// that used one still shows it.
export function resetCustomers(live: ClientType[], trashed: ClientType[]) {
	CLIENTS.length = 0;
	for (const name of Object.keys(CLIENT_INFO)) delete CLIENT_INFO[name];
	for (const customer of trashed) CLIENT_INFO[customer.name] = customer;
	for (const customer of live) registerCustomer(customer);
}

export function clientOf(name: string): ClientType {
	seen();
	const code =
		name
			.replace(/[^a-z]/gi, '')
			.slice(0, 3)
			.toUpperCase() || 'TC';
	return CLIENT_INFO[name] ?? { name, kind: '', icon: '', logo: '', city: '', code };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Now, as the stamp a record keeps: "2026-11-10T16:20".
export function nowIso() {
	const now = new Date();
	return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// "2026-05-12T08:00" or "2026-05-12" as "Tue, 12 May 2026".
export function dayOf(iso: string) {
	if (!iso) return '';
	const date = new Date(`${iso.slice(0, 10)}T00:00`);
	return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// How long ago a stamp was: "Just now", "12 min ago", "3 h ago", "Yesterday", "5 d ago", "2 mo ago", "1 y ago".
export function agoOf(iso: string) {
	if (!iso) return '';
	const minutes = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${Math.floor(minutes)} min ago`;
	const hours = minutes / 60;
	if (hours < 24) return `${Math.floor(hours)} h ago`;
	const days = hours / 24;
	if (days < 2) return 'Yesterday';
	if (days < 30) return `${Math.floor(days)} d ago`;
	if (days < 365) return `${Math.floor(days / 30)} mo ago`;
	return `${Math.floor(days / 365)} y ago`;
}

// The project number (the glossary's): the customer's short code, the day the project was made, and J with which
// of that customer's jobs that day it is. CVA-2026-05-12-J01. Nothing is stored: it follows the customer's code.
export function numberOf(project: ProjectType, projects: ProjectType[], client = project.client) {
	const date = project.created.slice(0, 10);
	const sameDay = projects.filter(
		(other) => other.client === project.client && other.created.slice(0, 10) === date
	);
	const job = String(Math.max(1, sameDay.indexOf(project) + 1)).padStart(2, '0');
	return `${clientOf(client).code}-${date}-J${job}`;
}

// The document ID the client picked (format 3, 2026-10-25): the project number, FR = final report, R = revision.
// SGL-2026-02-03-J01-FR01-R01.
export function documentIdOf(
	project: ProjectType,
	projects: ProjectType[],
	client = project.client
) {
	// A revision adds -R01 after this; a first issue has none (Justin, 2026-11-12).
	return `${numberOf(project, projects, client)}-FR01`;
}

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

// Every transport mode there is. Run 29 (Justin, 2026-11-12): the mode is what is picked, everywhere; its type is
// read from it, since "a vessel means sea, a plane means air".
export const MODES = Object.values(TRANSPORT_TYPES).flatMap((item) => item.modes);

export function typeOfMode(mode: string) {
	return (Object.keys(TRANSPORT_TYPES) as TransportTypeType[]).find((type) =>
		TRANSPORT_TYPES[type].modes.includes(mode)
	);
}

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
	// Its particulars (PARTICULARS), typed in on its own page (run 12); the report's stop page prints them (run 15).
	details?: Record<string, string>;
	// Its own picture, uploaded on its page (run 15); without one its transport mode's stock picture shows.
	photo?: string;
	created?: string;
	updated?: string;
};

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

export type FacilityType = {
	name: string;
	kind: FacilityKindType;
	city: string;
	// Run 15: its street address (printed on the report's stop page), a picture, and who to call there.
	address?: string;
	photo?: string;
	contact?: string;
	phone?: string;
	email?: string;
	created?: string;
	updated?: string;
};

// What the count tiles count, and what the chart and list then show.
export type DatasetType = 'projects' | 'customers' | 'team' | 'transport' | 'facilities';

// The dashboard's pages in order: the floating bar, the count cards and a sideways swipe all go through them.
export const PAGES: DatasetType[] = ['projects', 'customers', 'team', 'transport', 'facilities'];

// One icon per page, the same everywhere (Justin, 2026-10-26 19:22): a folder for projects, a smile for customers,
// the building (once the clients' icon) for facilities, and a box on the move for transport by sea, air, rail or road.
// Each page's icon, filled wherever it shows: no outline versions (run 13, 2026-11-07).
export const PAGE_ICONS: Record<DatasetType, string> = {
	projects: 'icon-[mdi--folder]',
	customers: 'icon-[mdi--emoticon]',
	team: 'icon-[mdi--account-group]',
	transport: 'icon-[mdi--cube-send]',
	facilities: 'icon-[mdi--domain]'
};

// Each page's name, and what one of its records is called. Run 16 (Justin, 2026-11-10): one of the Team is a "Team",
// one of Transport Mode a "Transport Mode", always with both words capitalised. Transport is "Transport Mode" since run 12 (the Trident team's word, 2026-11-07; capital M from
// run 13; Justin may want one word later). What a page sorts by (its labels) is in records.data.ts.
export const DATASETS: Record<DatasetType, { label: string; one: string; icon: string }> = {
	projects: { label: 'Projects', one: 'Project', icon: PAGE_ICONS.projects },
	customers: { label: 'Customers', one: 'Customer', icon: PAGE_ICONS.customers },
	team: { label: 'Team', one: 'Team', icon: PAGE_ICONS.team },
	transport: { label: 'Transport Mode', one: 'Transport Mode', icon: PAGE_ICONS.transport },
	facilities: { label: 'Facilities', one: 'Facility', icon: PAGE_ICONS.facilities }
};

// The bottom of anything that scrolls fades out rather than stopping at a hard edge (run 12 note 15).
export const FADE = '[mask-image:linear-gradient(to_bottom,black_calc(100%-56px),transparent)]';

export const LAYOUTS = [1, 2, 4, 6, 8];

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

// Trident Cubed itself: the organization every report is written for (the Organization drop-down, the letterhead).
// Run 15: kept once and edited by an admin in Settings (settings-page.svelte), as the glossary's Organization says:
// its details print in every page's header, and its disclaimer and sign-off wording on the report's last page.
export type OrganizationType = {
	name: string;
	logo: string;
	address: string;
	phone: string;
	email: string;
	// The shared inbox printed last in the owner's sign-off.
	groupEmail: string;
	website: string;
	disclaimer: {
		opening: string;
		points: { id: string; title: string; text: string }[];
		note: string;
	};
	// The line before the sign-off, and the sign-off itself.
	closing: string;
	signoff: string;
};

export const ORGANIZATION: OrganizationType = {
	name: 'Trident Cubed',
	logo: '/logo-color.svg',
	address: '800 Town and Country, Ste 500, Houston, TX 77024',
	phone: '+1 409 543 2725',
	email: 'operations@tridentcubed.com',
	groupEmail: 'ProjectGroup@TridentCubed.com',
	website: 'tridentcubed.com',
	disclaimer: {
		opening:
			'This Cargo Survey Report is prepared based on the observations, conditions, and information available to the undersigned at the time of the inspection. The findings and conclusions herein are made to the best of our knowledge and belief, but are subject to the following limitations:',
		points: [
			[
				'Scope Limitation',
				'The survey was conducted without dismantling or intrusive testing unless explicitly stated otherwise. Our observations are limited to visible and accessible parts of the cargo.'
			],
			[
				'No Warranty',
				"This report does not constitute a warranty or guarantee of the cargo's condition, quality, or fitness for any particular purpose. It is not a guarantee against latent defects or conditions not apparent at the time of inspection."
			],
			[
				'Use Limitation',
				'This report is provided solely for the use of the party to whom it is addressed. No liability is assumed by the Company or the undersigned for any use or reliance by third parties.'
			],
			[
				'Liability Limitation',
				'The liability of the Company and the undersigned, if any, arising from this report shall be limited to the fee charged for this service. We shall not be liable for any indirect, consequential, or special damages, including but not limited to loss of profit or business interruption.'
			],
			[
				'Accuracy of Information',
				'The accuracy of this report depends on the information provided by the customer and others involved. We do not guarantee the accuracy of such third-party information.'
			],
			[
				'Right to Amend',
				'We reserve the right to amend or supplement this report should additional pertinent information become available.'
			],
			[
				'Legal Context',
				'This report is not intended to be used for legal proceedings without the express written consent of the Company.'
			],
			[
				'No Endorsement',
				'This survey does not endorse or approve the cargo for any specific use or handling beyond what is stated in the report.'
			]
		].map(([title, text], index) => ({ id: `point-${index + 1}`, title, text })),
		note: 'Please note that this report reflects the situation as observed on a date of Inspection and may not reflect subsequent changes or conditions.'
	},
	closing:
		'Thank you for trusting Trident Cubed with your cargo. Call or email me with any question about this report.',
	signoff: 'Best Regards,'
};

// Who is signed in until sign-in exists (#181, #185 make it the real User): an admin. Their Team page is their profile.
export const ME = 'Capt. Cezary Poninski';

export const PROJECT_TYPES = ['Cargo', 'Vessel Condition', 'Warehousing', 'Draft Survey', 'Bunker'];

export function stopOf(
	{ point, transport: name, facility }: ProjectType['stops'][number] = {
		point: 'Start',
		transport: '',
		facility: ''
	},
	transports: TransportType[] = []
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

// A project's panels: its own Project panel first, then Transport Mode, Items, Time Log and the photo panels, all
// empty (the prototype filled them with a sample report; V1 starts every project blank).
export function createPanels(project: ProjectType): PanelType[] {
	const base = BASE;
	return [
		projectPanel(project, base),
		{
			...base,
			id: 'transport',
			name: 'Transport Mode',
			icon: 'icon-[mdi--ferry]',
			kind: 'transport',
			control: 'locked',
			stops: project.stops.length ? project.stops.map((stop) => stopOf(stop)) : [stopOf()]
		},
		{
			...base,
			id: 'items',
			name: 'Items',
			icon: 'icon-[mdi--package-variant-closed]',
			kind: 'items',
			control: 'locked',
			items: [itemOf()]
		},
		{
			...base,
			id: 'timelog',
			name: 'Time Log',
			icon: 'icon-[mdi--clock-outline]',
			kind: 'timelog',
			control: 'locked'
		},
		{
			...base,
			id: 'inspection',
			name: 'Inspection',
			icon: 'icon-[mdi--camera-outline]',
			kind: 'photos',
			control: 'switch',
			isDraggable: true
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
			isDraggable: true
		}
	];
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
		// Run 16 order (Justin, 2026-11-10): Title, Subtitle, Project Type, then who it is for. Run 19: no Location
		// here; where a project is comes from the facility of its first stop (Transport Mode panel). The
		// Organization and Customer lists are read live from the organization and the Customers page
		// (panel-body.svelte), so `options` here is only what they held when the project was made.
		fields: [
			field('Title', project.title),
			field('Subtitle', project.subtitle),
			field('Project Type', project.type, 'select', { options: PROJECT_TYPES }),
			field('Organization', ORGANIZATION.name, 'select', { options: [ORGANIZATION.name] }),
			field('Customer', project.client, 'select', { options: [...CLIENTS], isAddable: true })
		]
	} satisfies PanelType;
}

const BASE = {
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

// A new project before it is made: the same Project panel a project has, empty, with the signed-in person as its
// owner. The + sheet fills this in and `LookState.create` makes the project from it (run 16).
export function draftPanel(organization: string, owner: string): PanelType {
	const panel = projectPanel(
		{ title: '', subtitle: '', type: '', client: '', location: '', team: [owner] } as ProjectType,
		BASE
	);
	for (const item of panel.fields)
		if (item.label === 'Organization')
			Object.assign(item, { value: organization, options: [organization] });
	return panel;
}

// An empty record for a page, with every field its form asks for.
export function draftOf(page: Exclude<DatasetType, 'projects'>) {
	if (page === 'customers')
		return {
			name: '',
			kind: '',
			icon: '',
			logo: '',
			city: '',
			code: '',
			contacts: []
		} satisfies ClientType as ClientType;
	if (page === 'team')
		return {
			rank: 9,
			name: '',
			title: '',
			label: '',
			role: 'team',
			phone: '',
			email: '',
			location: '',
			href: '',
			profileURL: '',
			slug: ''
		} satisfies TeamMemberType as TeamMemberType;
	if (page === 'transport')
		return {
			name: '',
			type: 'Sea',
			mode: 'Vessel',
			source: 'manual'
		} satisfies TransportType as TransportType;
	return { name: '', kind: 'Port', city: '' } satisfies FacilityType as FacilityType;
}

export function newPerson() {
	return { id: createId('person'), name: '', title: '' };
}

// A company's people on the job, starting with one empty line to type into.
export function newPersonnel(): PersonnelType {
	return { id: createId('company'), company: '', people: [newPerson()] };
}

export function newContact(): ContactType {
	return { id: crypto.randomUUID(), name: '', title: '', email: '', phone: '', photo: '' };
}

export function newPanel(count: number): PanelType {
	return {
		id: createId('panel'),
		// Run 19: there is no fixed Custom panel any more; Add panel makes one, and it can be removed.
		name: count > 1 ? `Custom ${count}` : 'Custom',
		icon: 'icon-[mdi--puzzle-outline]',
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
	...PAGES.map((id) => ({ id, label: DATASETS[id].label, icon: PAGE_ICONS[id] })),
	{
		id: 'admin',
		label: 'Admin',
		icon: 'icon-[mdi--shield-account]',
		children: ['Users', 'Organization', 'Trash']
	}
];

// Recent activity, the same in the bell and the menu (run 12 note 14): anything new or changed, of any page. Since
// run 16 it is read from the projects' and records' own `updated` stamps (records.data.ts `recentOf`).
export type RecentType = { page: DatasetType; name: string; note: string; id?: string };

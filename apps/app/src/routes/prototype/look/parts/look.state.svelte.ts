// PROTOTYPE (#161): in-memory state for the look. A project opens with every panel closed (Justin's run 8 note 4).
// Every input counts toward its panel, and the panels toward the project, so the percents move as you type. The
// Transport and Facility lists live here, so one added from a project shows on its dashboard page. Every delete asks
// first (`confirm`, Justin 2026-10-25). Run 9: everything is kept in this browser, so a reload keeps your edits.
// Run 11 (2026-10-26 19:22): a project marked Sent remembers its state before, so Unsend puts it back; a Sent or
// Complete project is frozen (`isFrozen`); the floating bar's + adds a project, customer, team member, transport or
// facility (`adding`), and the dashboard's pages slide in from the side they sit on (`slide`). Run 12 (2026-11-07): a
// customer, team member, transport or facility opens its own screen (`record`, tabs Page and Edit), where it is edited
// or deleted; a rename follows it into every project that uses it. Run 15 (2026-11-10): the organization's own details
// and report wording live here too (`organization`), edited on the Settings screen.
import { DEFAULT_CHART, type ChartKindType, type RangeType } from './chart.data';
import {
	clientOf as clientOfName,
	CLIENTS,
	createId,
	createPanels,
	FACILITIES,
	itemOf,
	newPanel,
	ORGANIZATION,
	PAGES,
	PROJECTS,
	registerCustomer,
	registerPerson,
	stopOf,
	TRANSPORTS,
	type ClientType,
	type DatasetType,
	type FacilityType,
	type OrganizationType,
	type PanelStatusType,
	type PanelType,
	type ProjectType,
	type StatusType,
	type TransportType
} from './look.data';
import type { PageType } from './records.data';
import { TEAM, type TeamMemberType } from './team.data';

export type ScreenType = 'dashboard' | 'workspace' | 'record' | 'settings';
export type ViewType = 'table' | 'cards' | 'board';
// A project has Edit (its panels, once called Panels) and Preview; a record has Page (how it reads) and Edit.
export type TabType = 'page' | 'edit' | 'preview';
// A project's tabs in order; a record has Page and Edit.
export const PROJECT_TABS: TabType[] = ['page', 'edit', 'preview'];

export type MetricsType = { done: number; total: number; percent: number; status: PanelStatusType };

// The "Are you sure?" dialog: what is about to go, and what to do on yes.
export type ConfirmType = { title: string; note?: string; onyes: () => void };

export function metricsOf(panel: PanelType): MetricsType {
	let done = 0;
	let total = 0;
	if (panel.kind === 'items') {
		// Each row counts once, when it has both its quantity and its description; no rows is one to do.
		total = Math.max(1, panel.items.length);
		done = panel.items.filter((item) => item.quantity.trim() && item.description.trim()).length;
	} else if (panel.kind === 'project') {
		total = panel.fields.length + 2;
		done =
			panel.fields.filter((field) => field.value.trim()).length +
			Number(Boolean(panel.owner)) +
			Number(panel.assigned.length > 0);
	} else if (panel.kind === 'transport') {
		// Each stop counts its five picks; a panel with no stop counts as one to do.
		const PARTS = ['point', 'type', 'mode', 'name', 'facility'] as const;
		total = Math.max(1, panel.stops.length * PARTS.length);
		done = panel.stops.reduce(
			(sum, stop) => sum + PARTS.filter((part) => Boolean(stop[part])).length,
			0
		);
	} else if (panel.kind === 'timelog') {
		total = Math.max(
			1,
			panel.days.reduce((sum, day) => sum + 1 + day.entries.length, 0)
		);
		done = panel.days.reduce(
			(sum, day) =>
				sum +
				Number(Boolean(day.date)) +
				day.entries.filter((entry) => entry.time && entry.activity.trim()).length,
			0
		);
	} else {
		// A photo group counts its title and having photos. Its layout always has a value, so it never counts: a new
		// untitled group with no photos is To do (Justin's run 8 note 8).
		total = Math.max(1, panel.groups.length * 2);
		done = panel.groups.reduce(
			(sum, group) => sum + Number(Boolean(group.title.trim())) + Number(group.photos.length > 0),
			0
		);
	}
	const percent = total ? Math.round((done / total) * 100) : 0;
	const status: PanelStatusType = !panel.isEnabled
		? 'Off'
		: percent >= 100
			? 'Complete'
			: percent === 0
				? 'To do'
				: 'In progress';
	return { done, total, percent, status };
}

// A project's percent: every input of its switched-on panels counts the same.
export function percentOf(panels: PanelType[]) {
	const enabled = panels.filter((panel) => panel.isEnabled).map(metricsOf);
	const done = enabled.reduce((sum, item) => sum + item.done, 0);
	const total = enabled.reduce((sum, item) => sum + item.total, 0);
	return total ? Math.round((done / total) * 100) : 0;
}

// Run 9 (Justin's note 14, edits that "sometimes don't stay"): a phone browser reloads a tab it kept in the background,
// and a reload put the sample data back. The projects, their panels and the Transport and Facility lists are now kept
// in this browser. A run that changes their shape takes a new key, so older data never breaks the page.
const KEEP = 'trident-look-161-run-12';
type KeptType = {
	projects: ProjectType[];
	workspaces: Record<string, PanelType[]>;
	transports: TransportType[];
	facilities: FacilityType[];
	customers: string[];
	added: ClientType[];
	members: TeamMemberType[];
	// Since run 15; a browser that kept run 12 to 14 has none yet and starts from Trident Cubed's own.
	organization?: OrganizationType;
};

// Sent and Complete projects can be looked at, not edited (2026-10-26 19:22).
export const FROZEN: StatusType[] = ['Sent', 'Complete'];

function readKept(): KeptType | undefined {
	try {
		const text = localStorage.getItem(KEEP);
		return text ? JSON.parse(text) : undefined;
	} catch {
		return undefined;
	}
}

export function toneOf(status: PanelStatusType) {
	if (status === 'Complete')
		return { bar: 'bg-success', text: 'text-success', ring: 'stroke-success' };
	if (status === 'Off')
		return { bar: 'bg-slate-300', text: 'text-slate-400', ring: 'stroke-slate-300' };
	return { bar: 'bg-primary', text: 'text-primary', ring: 'stroke-primary' };
}

export class LookState {
	screen = $state<ScreenType>('dashboard');
	view = $state<ViewType>('table');
	filter = $state('All');
	dataset = $state<DatasetType>('projects');
	range = $state<RangeType>('7d');
	chart = $state<ChartKindType>(DEFAULT_CHART.projects);
	projects = $state<ProjectType[]>(structuredClone(PROJECTS));
	projectId = $state('p1');
	tab = $state<TabType>('edit');
	panelId = $state('');
	// What the + is adding, or nothing while its sheet is shut.
	adding = $state<DatasetType>();
	navSection = $state<string>('projects');
	// Which way the dashboard's next page slides in: 1 from the right, -1 from the left.
	slide = $state(0);
	// The record on show: which page it belongs to and its name.
	record = $state<{ page: PageType; key: string }>();
	// The first tab 0, the second 1, and in between while a finger swipes from one to the other.
	tabProgress = $state(0);
	isSaving = $state(false);
	toast = $state('');
	workspaces = $state<Record<string, PanelType[]>>({});
	transports = $state<TransportType[]>(structuredClone(TRANSPORTS));
	facilities = $state<FacilityType[]>(structuredClone(FACILITIES));
	customers = $state<string[]>([...CLIENTS]);
	// Customers added here, with their city; their names are in `customers` too.
	added = $state<ClientType[]>([]);
	members = $state<TeamMemberType[]>(structuredClone(TEAM));
	organization = $state<OrganizationType>(structuredClone(ORGANIZATION));
	asking = $state<ConfirmType>();

	project = $derived(
		this.projects.find((project) => project.id === this.projectId) ?? this.projects[0]
	);
	panels = $derived(this.workspaces[this.projectId] ?? []);
	overall = $derived(percentOf(this.panels));
	isFrozen = $derived(FROZEN.includes(this.project?.status));

	#saveTimer: ReturnType<typeof setTimeout> | undefined;
	#toastTimer: ReturnType<typeof setTimeout> | undefined;
	#keepTimer: ReturnType<typeof setTimeout> | undefined;
	#isFull = false;

	// What this browser kept, or every project's panels up front, so the list shows the percent each one opens at.
	// Any change is written back a moment later.
	constructor() {
		const kept = readKept();
		if (kept) {
			this.projects = kept.projects;
			this.workspaces = kept.workspaces;
			this.transports = kept.transports;
			this.facilities = kept.facilities;
			this.customers = kept.customers;
			this.added = kept.added;
			this.members = kept.members;
			if (kept.organization) this.organization = kept.organization;
			for (const customer of kept.added) registerCustomer(customer);
			for (const member of kept.members) registerPerson(member);
		} else
			for (const project of this.projects) {
				this.workspaces[project.id] = createPanels(project);
				project.progress = percentOf(this.workspaces[project.id]);
			}
		$effect(() => {
			const text = JSON.stringify({
				projects: this.projects,
				workspaces: this.workspaces,
				transports: this.transports,
				facilities: this.facilities,
				customers: this.customers,
				added: this.added,
				members: this.members,
				organization: this.organization
			} satisfies KeptType);
			clearTimeout(this.#keepTimer);
			this.#keepTimer = setTimeout(() => this.#keep(text), 300);
		});
	}

	#keep(text: string) {
		try {
			localStorage.setItem(KEEP, text);
			this.#isFull = false;
		} catch {
			if (!this.#isFull)
				this.say('This browser is full, so new changes are not kept after a reload');
			this.#isFull = true;
		}
	}

	#ensure(id: string) {
		const project = this.projects.find((item) => item.id === id);
		if (project && !this.workspaces[id]) this.workspaces[id] = createPanels(project);
	}

	progressOf(project: ProjectType) {
		return this.workspaces[project.id] && project.id === this.projectId
			? this.overall
			: project.progress;
	}

	// A count card picks what the chart and the list show, and the chart that suits it. The view (list, cards or
	// board) stays as it is: every page has all three since run 12.
	pick(dataset: DatasetType) {
		this.slide = Math.sign(PAGES.indexOf(dataset) - PAGES.indexOf(this.dataset));
		this.navSection = dataset;
		this.dataset = dataset;
		this.chart = DEFAULT_CHART[dataset];
		this.filter = 'All';
	}

	// A project opens on its Page, before Edit and Preview (run 13), unless asked for another tab.
	open(id: string, tab: TabType = 'page') {
		if (this.screen === 'workspace') this.#keepProject();
		this.#ensure(id);
		this.projectId = id;
		this.panelId = '';
		this.tab = tab;
		this.tabProgress = PROJECT_TABS.indexOf(tab);
		this.screen = 'workspace';
	}

	openRecord(page: PageType, key: string, tab: TabType = 'page') {
		if (this.screen === 'workspace') this.#keepProject();
		this.record = { page, key };
		this.tab = tab === 'preview' ? 'page' : tab;
		this.tabProgress = this.tab === 'page' ? 0 : 1;
		this.screen = 'record';
	}

	// Settings: the organization's details and report wording (run 15).
	openSettings() {
		if (this.screen === 'workspace') this.#keepProject();
		this.screen = 'settings';
	}

	// The organization's new name follows it into every project's Organization drop-down.
	nameOrganization(name: string) {
		const before = this.organization.name;
		this.organization.name = name;
		for (const panels of Object.values(this.workspaces))
			for (const panel of panels)
				for (const field of panel.fields)
					if (field.label === 'Organization') {
						if (field.value === before) field.value = name;
						field.options = field.options?.map((option) => (option === before ? name : option));
					}
		this.flash();
	}

	// A team member's uploaded photo shows wherever their face does.
	setPhoto(member: TeamMemberType, photo: string) {
		member.photo = photo;
		registerPerson(member);
		this.flash();
	}

	home() {
		if (this.screen === 'workspace') this.#keepProject();
		this.screen = 'dashboard';
		this.navSection = this.dataset;
	}

	// Mark sent remembers the state before, and Unsend goes back to it.
	markSent(project: ProjectType) {
		if (project.status !== 'Sent') project.before = project.status;
		project.status = 'Sent';
		this.saved();
		this.say(`"${project.title}" marked sent. It can't be edited now.`);
	}

	unsend(project: ProjectType) {
		project.status = project.before && project.before !== 'Sent' ? project.before : 'Review';
		project.before = undefined;
		this.saved();
		this.say(`"${project.title}" is back to ${project.status}`);
	}

	// Leaving a project writes back what the dashboard lists: its progress and its trip's transports and facilities.
	#keepProject() {
		const trip = this.workspaces[this.projectId]?.find((panel) => panel.kind === 'transport');
		if (!trip) return;
		this.project.progress = this.overall;
		this.project.stops = trip.stops
			.filter((stop) => stop.name || stop.facility)
			.map((stop) => ({
				point: stop.point || 'Stop',
				transport: stop.name,
				facility: stop.facility
			}));
	}

	create(title: string, client: string) {
		this.adding = undefined;
		const id = createId('p');
		this.projects.unshift({
			id,
			number: `TC-${24032 + this.projects.length}`,
			title: title.trim() || 'Untitled project',
			subtitle: '',
			type: 'Cargo',
			client,
			stops: [],
			location: 'Houston, TX',
			dates: 'Today',
			status: 'Draft',
			team: ['Collin Tippit'],
			updated: 'Just now',
			progress: 0
		});
		this.workspaces[id] = createPanels(this.projects[0]).map((panel) => ({
			...panel,
			fields: panel.fields.map((field) =>
				field.label === 'Organization'
					? { ...field, value: this.organization.name, options: [this.organization.name] }
					: ['Title', 'Customer'].includes(field.label)
						? field
						: { ...field, value: '' }
			),
			assigned: [],
			days: [],
			groups: [],
			stops: panel.kind === 'transport' ? [stopOf()] : [],
			items: panel.kind === 'items' ? [itemOf()] : []
		}));
		this.open(id, 'edit');
	}

	remove(id: string) {
		const index = this.projects.findIndex((project) => project.id === id);
		const [removed] = this.projects.splice(index, 1);
		this.say(`"${removed.title}" moved to Trash`);
	}

	// Every delete asks first; Cancel keeps the thing.
	confirm(ask: ConfirmType) {
		this.asking = ask;
	}

	// Called by every input, so the "Saved" badge shows auto-save at work.
	saved() {
		this.project.updated = 'Just now';
		this.flash();
	}

	flash() {
		this.isSaving = true;
		clearTimeout(this.#saveTimer);
		this.#saveTimer = setTimeout(() => (this.isSaving = false), 700);
	}

	say(message: string) {
		this.toast = message;
		clearTimeout(this.#toastTimer);
		this.#toastTimer = setTimeout(() => (this.toast = ''), 2600);
	}

	// Is that name taken on its page? Records are known by their name.
	has(page: PageType, name: string) {
		const names =
			page === 'customers'
				? this.customers
				: page === 'team'
					? this.members.map((member) => member.name)
					: page === 'transport'
						? this.transports.map((transport) => transport.name)
						: this.facilities.map((facility) => facility.name);
		return names.includes(name);
	}

	// "Add new" from the Project panel or the +: the lists grow, as their dashboard pages show.
	addTransport(transport: Omit<TransportType, 'source'>) {
		if (this.has('transport', transport.name))
			return this.say(`${transport.name} is already there`);
		this.transports.push({ ...transport, source: 'manual' });
		this.say(`${transport.name} added to Transport Mode`);
	}

	addFacility(facility: FacilityType) {
		if (this.has('facilities', facility.name)) return this.say(`${facility.name} is already there`);
		this.facilities.push(facility);
		this.say(`${facility.name} added to Facilities`);
	}

	addCustomer(name: string, city = '', kind = '') {
		if (this.has('customers', name)) return this.say(`${name} is already there`);
		this.setCustomer(name, { city, kind });
		this.customers.push(name);
		this.say(`${name} added to Customers`);
	}

	// A customer's types or city, edited on its page: kept here with the rest of its card.
	setCustomer(name: string, patch: Partial<ClientType>) {
		const index = this.added.findIndex((customer) => customer.name === name);
		const before = this.added[index] ?? clientOfName(name);
		const after = registerCustomer({ ...before, ...patch });
		if (index < 0) this.added.push(after);
		else this.added[index] = after;
		this.flash();
	}

	// A new name follows the record into every project, panel and drop-down that uses it.
	rename(page: PageType, from: string, to: string) {
		const name = to.trim();
		if (!name || name === from) return false;
		if (this.has(page, name)) {
			this.say(`${name} is already there`);
			return false;
		}
		const swap = (value: string) => (value === from ? name : value);
		if (page === 'customers') {
			this.customers = this.customers.map(swap);
			this.setCustomer(from, { name });
			this.added = this.added.filter((customer) => customer.name !== from);
			for (const project of this.projects) project.client = swap(project.client);
		}
		if (page === 'team') {
			const member = this.members.find((item) => item.name === from);
			if (member) {
				member.name = name;
				registerPerson(member);
			}
			for (const project of this.projects) project.team = project.team.map(swap);
		}
		for (const project of this.projects)
			project.stops = project.stops.map((stop) => ({
				...stop,
				transport: page === 'transport' ? swap(stop.transport) : stop.transport,
				facility: page === 'facilities' ? swap(stop.facility) : stop.facility
			}));
		if (page === 'transport') {
			const transport = this.transports.find((item) => item.name === from);
			if (transport) transport.name = name;
		}
		if (page === 'facilities') {
			const facility = this.facilities.find((item) => item.name === from);
			if (facility) facility.name = name;
		}
		for (const panels of Object.values(this.workspaces))
			for (const panel of panels) {
				if (page === 'team') {
					panel.owner = swap(panel.owner);
					panel.assigned = panel.assigned.map(swap);
				}
				if (page === 'customers')
					for (const field of panel.fields)
						if (field.label === 'Customer') {
							field.value = swap(field.value);
							field.options = field.options?.map(swap);
						}
				for (const stop of panel.stops) {
					if (page === 'transport') stop.name = swap(stop.name);
					if (page === 'facilities') stop.facility = swap(stop.facility);
				}
			}
		if (this.record?.page === page && this.record.key === from) this.record = { page, key: name };
		this.flash();
		return true;
	}

	// Deleting a record asks first (the caller's confirm); its projects keep the name they had.
	removeRecord(page: PageType, key: string) {
		if (page === 'customers') this.customers = this.customers.filter((name) => name !== key);
		if (page === 'team') this.members = this.members.filter((member) => member.name !== key);
		if (page === 'transport')
			this.transports = this.transports.filter((transport) => transport.name !== key);
		if (page === 'facilities')
			this.facilities = this.facilities.filter((facility) => facility.name !== key);
		if (this.screen === 'record' && this.record?.key === key) this.home();
		this.say(`${key} moved to Trash`);
	}

	addMember(member: Pick<TeamMemberType, 'name' | 'email' | 'role'>) {
		if (this.has('team', member.name)) return this.say(`${member.name} is already there`);
		this.members.push({
			...member,
			rank: 9,
			title: '',
			label: '',
			phone: '',
			location: '',
			href: '',
			profileURL: '',
			slug: ''
		});
		this.say(`${member.name} added to the Team`);
	}

	addPanel() {
		const count = this.panels.filter((panel) => panel.id.startsWith('panel')).length + 1;
		const panel = newPanel(count);
		this.panels.push(panel);
		this.panelId = panel.id;
		this.saved();
	}

	removePanel(id: string) {
		const index = this.panels.findIndex((panel) => panel.id === id);
		const [removed] = this.panels.splice(index, 1);
		this.say(`${removed.name} removed`);
		this.saved();
	}

	// Only the photo panels move, and only among themselves, as in the app prototype.
	movePanel(from: number, to: number) {
		if (this.isFrozen || !this.panels[from]?.isDraggable || !this.panels[to]?.isDraggable)
			return false;
		const [panel] = this.panels.splice(from, 1);
		this.panels.splice(to, 0, panel);
		this.saved();
	}
}

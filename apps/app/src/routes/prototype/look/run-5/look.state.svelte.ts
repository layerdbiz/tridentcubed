// PROTOTYPE (#161): in-memory state for the look. A project opens with every panel closed (Justin's run 8 note 4).
// Every input counts toward its panel, and the panels toward the project, so the percents move as you type. The
// Transport and Facility lists live here, so one added from a project shows on its dashboard page. Every delete asks
// first (`confirm`, Justin 2026-10-25). Run 9: everything is kept in this browser, so a reload keeps your edits.
// Run 11 (2026-10-26 19:22): a project marked Sent remembers its state before, so Unsend puts it back; a Sent or
// Complete project is frozen (`isFrozen`); the floating bar's + adds a project, customer, team member, transport or
// facility (`adding`), and the dashboard's pages slide in from the side they sit on (`slide`).
import { DEFAULT_CHART, type ChartKindType, type RangeType } from './chart.data';
import {
	CLIENTS,
	createId,
	createPanels,
	FACILITIES,
	itemOf,
	newPanel,
	PAGES,
	PROJECTS,
	registerCustomer,
	stopOf,
	TRANSPORTS,
	type ClientType,
	type DatasetType,
	type FacilityType,
	type PanelStatusType,
	type PanelType,
	type ProjectType,
	type StatusType,
	type TransportType
} from './look.data';
import { TEAM, type TeamMemberType } from './team.data';

export type ScreenType = 'dashboard' | 'workspace';
export type ViewType = 'table' | 'cards' | 'board';
export type TabType = 'edit' | 'preview';

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
const KEEP = 'trident-look-161-run-11';
type KeptType = {
	projects: ProjectType[];
	workspaces: Record<string, PanelType[]>;
	transports: TransportType[];
	facilities: FacilityType[];
	customers: string[];
	added: ClientType[];
	members: TeamMemberType[];
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
	chart = $state<ChartKindType>('area');
	projects = $state<ProjectType[]>(structuredClone(PROJECTS));
	projectId = $state('p1');
	tab = $state<TabType>('edit');
	panelId = $state('');
	// What the + is adding, or nothing while its sheet is shut.
	adding = $state<DatasetType>();
	navSection = $state<string>('projects');
	// Which way the dashboard's next page slides in: 1 from the right, -1 from the left.
	slide = $state(0);
	// Panels 0, Preview 1, and in between while a finger swipes from one to the other.
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
	asking = $state<ConfirmType>();

	project = $derived(
		this.projects.find((project) => project.id === this.projectId) ?? this.projects[0]
	);
	visible = $derived(
		this.filter === 'All' || this.dataset !== 'projects'
			? this.projects
			: this.projects.filter((project) => project.status === this.filter)
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
			for (const customer of kept.added) registerCustomer(customer.name, customer.city);
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
				members: this.members
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

	// A count card picks what the chart and the list show, and the chart that suits it; each has its own filters.
	pick(dataset: DatasetType) {
		this.slide = Math.sign(PAGES.indexOf(dataset) - PAGES.indexOf(this.dataset));
		this.navSection = dataset;
		this.dataset = dataset;
		this.chart = DEFAULT_CHART[dataset];
		this.filter = 'All';
		if (dataset !== 'projects' && this.view === 'board') this.view = 'table';
	}

	open(id: string) {
		this.#keepProject();
		this.#ensure(id);
		this.projectId = id;
		this.panelId = '';
		this.screen = 'workspace';
	}

	home() {
		this.#keepProject();
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
				['Title', 'Organization', 'Customer'].includes(field.label)
					? field
					: { ...field, value: '' }
			),
			assigned: [],
			days: [],
			groups: [],
			stops: panel.kind === 'transport' ? [stopOf()] : [],
			items: panel.kind === 'items' ? [itemOf()] : []
		}));
		this.open(id);
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
		this.isSaving = true;
		this.project.updated = 'Just now';
		clearTimeout(this.#saveTimer);
		this.#saveTimer = setTimeout(() => (this.isSaving = false), 700);
	}

	say(message: string) {
		this.toast = message;
		clearTimeout(this.#toastTimer);
		this.#toastTimer = setTimeout(() => (this.toast = ''), 2600);
	}

	// "Add new" from the Project panel: the Transport and Facility lists grow, as their dashboard pages show.
	addTransport(transport: Omit<TransportType, 'source'>) {
		this.transports.push({ ...transport, source: 'manual' });
		this.say(`${transport.name} added to Transport`);
	}

	addFacility(facility: FacilityType) {
		this.facilities.push(facility);
		this.say(`${facility.name} added to Facilities`);
	}

	addCustomer(name: string, city = '') {
		this.added.push(registerCustomer(name, city));
		this.customers.push(name);
		this.say(`${name} added to Customers`);
	}

	addMember(member: Pick<TeamMemberType, 'name' | 'email' | 'role'>) {
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

// PROTOTYPE (#161): in-memory state for the look. A project opens with every panel closed (Justin's run 8 note 4).
// Every input counts toward its panel, and the panels toward the project, so the percents move as you type. The
// Transport and Facility lists live here, so one added from a project shows on its dashboard page. Every delete asks
// first (`confirm`, Justin 2026-10-25). Run 9: everything is kept in this browser, so a reload keeps your edits.
// Run 11 (2026-10-26 19:22): a project marked Sent remembers its state before, so Unsend puts it back; a Sent or
// Complete project is frozen (`isFrozen`); the floating bar's + adds a project, customer, team member, transport or
// facility (`adding`), and the dashboard's pages slide in from the side they sit on (`slide`). Run 12 (2026-11-07): a
// customer, team member, transport or facility opens its own screen (`record`, tabs Page and Edit), where it is edited
// or deleted; a rename follows it into every project that uses it. Run 15 (2026-11-10): the organization's own details
// and report wording live here too (`organization`), edited on the Settings screen. Run 16 (2026-11-10, "no dummy
// data"): the Project panel is the project (an effect copies its title, subtitle, type, customer, location and team
// onto the project's row as they change, so its Page, rows and cards follow Edit); every project and record keeps
// when it was made and last changed; one `add` and one `patch` serve the + sheet and every Edit tab. Run 17: the
// places picked in location fields are kept with their coordinates (`places`), and the map pins read them.
import { DEFAULT_CHART, type ChartKindType, type RangeType } from './chart.data';
import {
	clientOf as clientOfName,
	createPanels,
	forgetCustomer,
	DATASETS,
	itemOf,
	newPanel,
	nowIso,
	ORGANIZATION,
	PAGES,
	registerCustomer,
	registerPerson,
	stopOf,
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
import type { PlaceType } from './map.data';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toStableId } from '#lib/rows/rows.utils.js';
import type { SaveStatusType } from '#lib/rows/rows.state.svelte.js';
import { lookOf } from './look.constants';
import type { PageType } from './records.data';

export type RecordDraftType = ClientType | TeamMemberType | TransportType | FacilityType;
import type { TeamMemberType } from './team.data';

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

// Run 9 kept the projects, their panels and the lists in this browser. The database replaced that storage table by
// table: customers (#183), the team (#185), the Transport Modes, Facilities, places and organization (#184), and
// projects and their panels (#186). Nothing is kept here any more, and what an earlier version kept is cleared.
const KEEP = 'trident-v1-app';

// Sent and Complete projects can be looked at, not edited (2026-10-26 19:22); Archived ones too, as the server
// refuses them (#186).
export const FROZEN: StatusType[] = ['Sent', 'Complete', 'Archived'];

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
	projects = $state<ProjectType[]>([]);
	projectId = $state('');
	tab = $state<TabType>('edit');
	panelId = $state('');
	// The project whose status is being changed in the Change Status sheet, by id.
	statusFor = $state<string>();
	// What the + is adding, or nothing while its sheet is shut.
	adding = $state<DatasetType>();
	// "Add new" in a dropdown opens that same sheet on one page (run 28): what it starts filled with, whether its
	// page chips are hidden, and who is told the name once it is added.
	addSeed: Record<string, unknown> | undefined;
	isAddLocked = $state(false);
	#afterAdd: ((name: string) => void) | undefined;
	// The project a record was opened from by a dropdown's pencil; back returns there.
	#backTo: { projectId: string; tab: TabType; panelId: string } | undefined;
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
	transports = $state<TransportType[]>([]);
	facilities = $state<FacilityType[]>([]);
	// The customers' names, in the order the lists show them (#183: the server's rows, through mapper.ts).
	customers = $state<string[]>([]);
	// Every customer in `customers`, whole: its id, details and contacts.
	added = $state<ClientType[]>([]);
	// Records in the Trash: out of the lists, but a project that used one still shows its name (#183).
	trashed: {
		customers: ClientType[];
		team: TeamMemberType[];
		transports: TransportType[];
		facilities: FacilityType[];
	} = { customers: [], team: [], transports: [], facilities: [] };
	// What the header's cloud shows: the sync loop's save state once look.svelte has started it (#183).
	sync: SaveStatusType = { state: 'saved', reason: '', retry() {} };
	// The Not saved sheet, opened from the red cloud.
	isSaveSheetOpen = $state(false);
	// The Team records (#185: the server's rows, through mapper.ts).
	members = $state<TeamMemberType[]>([]);
	// Who is signed in (#185): their User id and their membership's role, from the server (look.svelte). Their Team
	// record is `me`; a new project's Team Lead is them.
	userId = $state('');
	role = $state<TeamMemberType['role'] | ''>('');
	isSuperAdmin = $state(false);
	me = $derived(this.members.find((member) => member.userId && member.userId === this.userId));
	// Only an Admin changes a Team role (the server refuses it from anyone else).
	isAdmin = $derived(this.isSuperAdmin || this.role === 'admin');
	organization = $state<OrganizationType>(structuredClone(ORGANIZATION));
	// Every place a location field has been given, with where it is: looked up once, then read from here. The
	// server's rows since #184 (the seed's starting places, then every one a member picked).
	places = $state<PlaceType[]>([]);
	asking = $state<ConfirmType>();
	// Each project's row and Team Assigned rows as the server last gave them (#186, mapper.ts): what a project whose
	// panels have not loaded saves as, since only its status and percent change from the lists.
	fromServer: Record<string, { values: Record<string, unknown>; team: RowType[] }> = {};
	// The row ids of the Team Assigned, by project and Team record (mapper.ts).
	teamRowIds = new Map<string, string>();

	project = $derived(
		this.projects.find((project) => project.id === this.projectId) ?? this.projects[0]
	);
	panels = $derived(this.workspaces[this.projectId] ?? []);
	overall = $derived(percentOf(this.panels));
	isFrozen = $derived(FROZEN.includes(this.project?.status));

	#saveTimer: ReturnType<typeof setTimeout> | undefined;
	#toastTimer: ReturnType<typeof setTimeout> | undefined;

	// Everything comes from the server: the lists at start, a project's panels as it opens (#186).
	constructor() {
		try {
			localStorage.removeItem(KEEP);
		} catch {
			// No storage here (a private window, a test): nothing to clear.
		}
		// The Project panel is the project: its row follows the panel as it is typed in.
		$effect(() => this.#syncProject());
	}

	// Whether a project's panels have loaded (look.svelte loads them as it opens).
	isLoaded(id: string) {
		return Boolean(this.workspaces[id]);
	}

	// Who may delete a project (the server refuses the rest): an Admin any, anyone else their own Draft.
	canDelete(project: ProjectType) {
		return this.isAdmin || (project.status === 'Draft' && project.createdBy === this.userId);
	}

	// A project's percent is always worked out from its panels as they are now (run 18: a new project used to show
	// 0% in the lists until it had been opened and left).
	progressOf(project: ProjectType) {
		const panels = this.workspaces[project.id];
		return panels ? percentOf(panels) : project.progress;
	}

	// A count card picks what the chart and the list show, and the chart that suits it. The view (list, cards or
	// board) stays as it is: every page has all three since run 12.
	pick(dataset: DatasetType) {
		this.slide = Math.sign(PAGES.indexOf(dataset) - PAGES.indexOf(this.dataset));
		this.navSection = dataset;
		this.dataset = dataset;
		// Chart Choice B (run 22): the chart picked stays for every page; A gives each page its own.
		if (this.variant('chart-choice') === 'A') this.chart = DEFAULT_CHART[dataset];
		this.filter = 'All';
	}

	// A project opens on its Page, before Edit and Preview (run 13), unless asked for another tab.
	open(id: string, tab: TabType = 'page') {
		if (this.screen === 'workspace') this.#keepProject();
		this.projectId = id;
		this.panelId = '';
		this.tab = tab;
		this.tabProgress = PROJECT_TABS.indexOf(tab);
		this.screen = 'workspace';
	}

	addFor(page: PageType, seed: Record<string, unknown>, done: (name: string) => void) {
		this.addSeed = seed;
		this.#afterAdd = done;
		this.isAddLocked = true;
		this.adding = page;
	}

	// The + sheet has added `name`: true when a dropdown was waiting for it, which then picks it.
	finishAdd(name: string) {
		const done = this.#afterAdd;
		this.endAdd();
		done?.(name);
		return Boolean(done);
	}

	endAdd() {
		this.adding = undefined;
		this.addSeed = undefined;
		this.#afterAdd = undefined;
		this.isAddLocked = false;
	}

	// A dropdown's pencil: the record opens on Edit, and back returns to the project and panel it was opened from.
	editRecord(page: PageType, key: string) {
		if (this.screen === 'workspace')
			this.#backTo = { projectId: this.projectId, tab: this.tab, panelId: this.panelId };
		this.openRecord(page, key, 'edit');
	}

	openRecord(page: PageType, key: string, tab: TabType = 'page') {
		if (this.screen === 'workspace') this.#keepProject();
		this.record = { page, key };
		this.tab = tab === 'preview' ? 'page' : tab;
		this.tabProgress = this.tab === 'page' ? 0 : 1;
		this.screen = 'record';
	}

	// The look a part of the app shows (look.constants.ts): the one Justin settled on in the prototype.
	variant(id: string) {
		return lookOf(id);
	}

	// The saved place a location's words name, whatever their capitals.
	placeOf(name: string) {
		const text = name.trim().toLowerCase();
		return text ? this.places.find((place) => place.name.toLowerCase() === text) : undefined;
	}

	// A suggestion picked in a location field joins the saved places, once, for every member (#184). Its id is worked
	// out from its name, so two members picking the same new place save one row.
	keepPlace(place: PlaceType) {
		if (this.placeOf(place.name)) return;
		const id = toStableId(this.organization.id ?? '', 'place', place.name.trim().toLowerCase());
		this.places.push({ ...place, id, created: nowIso() });
	}

	// Settings: the organization's details and report wording (run 15).
	openSettings() {
		if (this.screen === 'workspace') this.#keepProject();
		this.tab = 'page';
		this.tabProgress = 0;
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

	home() {
		const back = this.#backTo;
		this.#backTo = undefined;
		if (this.screen === 'record' && back) {
			this.open(back.projectId, back.tab);
			this.panelId = back.panelId;
			return;
		}
		if (this.screen === 'workspace') this.#keepProject();
		this.screen = 'dashboard';
		this.navSection = this.dataset;
	}

	// Mark sent remembers the state before, and Unsend goes back to it.
	markSent(project: ProjectType) {
		if (project.status === 'Archived' && !this.isAdmin)
			return this.say('Only an Admin can archive a project or bring it back');
		if (project.status !== 'Sent') project.before = project.status;
		project.status = 'Sent';
		project.updated = nowIso();
		this.flash();
		this.say(`"${project.title}" marked sent. It can't be edited now.`);
	}

	unsend(project: ProjectType) {
		project.status = project.before && project.before !== 'Sent' ? project.before : 'Review';
		project.before = undefined;
		project.updated = nowIso();
		this.flash();
		this.say(`"${project.title}" is back to ${project.status}`);
	}

	// Leaving a project writes back what the dashboard lists: its progress and its trip's transports and facilities.
	#keepProject() {
		const trip = this.workspaces[this.projectId]?.find((panel) => panel.kind === 'transport');
		if (!trip || FROZEN.includes(this.project.status)) return;
		this.project.progress = this.overall;
		this.project.stops = trip.stops
			.filter((stop) => stop.name || stop.facility)
			.map((stop) => ({
				point: stop.point || 'Stop',
				transport: stop.name,
				facility: stop.facility
			}));
	}

	// What the Project panel holds, copied onto the project's row: the one place its Page, rows, cards, map pin and
	// number read from.
	#syncProject() {
		const panel = this.panels.find((item) => item.kind === 'project');
		const project = this.project;
		if (!panel || !project || FROZEN.includes(project.status)) return;
		const value = (label: string) =>
			panel.fields.find((field) => field.label === label)?.value ?? '';
		// Where the project is: the city of its first stop's facility (run 19). No stop yet keeps what it had.
		const first = this.panels
			.find((item) => item.kind === 'transport')
			?.stops.find((stop) => stop.facility);
		const city = first
			? (this.facilities.find((facility) => facility.name === first.facility)?.city ?? '')
			: project.location;
		const next = {
			title: value('Title').trim() || 'Untitled project',
			subtitle: value('Subtitle'),
			type: value('Project Type'),
			client: value('Customer'),
			location: city
		};
		for (const [key, text] of Object.entries(next) as [keyof typeof next, string][])
			if (project[key] !== text) project[key] = text;
		const team = [panel.owner, ...panel.assigned].filter(Boolean);
		if (team.join('|') !== project.team.join('|')) project.team = team;
	}

	// A new project, from the Project panel the + sheet filled in: that panel becomes the project's own.
	create(draft: PanelType) {
		this.adding = undefined;
		const id = crypto.randomUUID();
		const now = nowIso();
		const value = (label: string) =>
			draft.fields.find((field) => field.label === label)?.value ?? '';
		this.projects.unshift({
			id,
			title: value('Title').trim() || 'Untitled project',
			subtitle: value('Subtitle'),
			type: value('Project Type'),
			client: value('Customer'),
			stops: [],
			location: value('Location'),
			created: now,
			updated: now,
			status: 'Draft',
			team: [draft.owner, ...draft.assigned].filter(Boolean),
			progress: 0,
			day: now.slice(0, 10),
			createdBy: this.userId || undefined
		});
		this.workspaces[id] = createPanels(this.projects[0]).map((panel) =>
			panel.kind === 'project'
				? { ...($state.snapshot(draft) as PanelType), id: panel.id, key: 'project' }
				: {
						...panel,
						days: [],
						groups: [],
						stops: panel.kind === 'transport' ? [stopOf()] : [],
						items: panel.kind === 'items' ? [itemOf()] : []
					}
		);
		this.open(id, 'edit');
		this.#advance(id);
	}

	// Deleting a project sends it and everything in it to the Trash (#186). Only an Admin deletes a project that is
	// not their own Draft; the server refuses it too.
	remove(id: string) {
		const index = this.projects.findIndex((project) => project.id === id);
		if (index < 0) return;
		if (!this.canDelete(this.projects[index]))
			return this.say('Only an Admin can delete a project that is not your own Draft');
		const [removed] = this.projects.splice(index, 1);
		delete this.workspaces[id];
		if (this.screen === 'workspace' && this.projectId === id) this.home();
		this.say(`"${removed.title}" moved to Trash`);
	}

	// Every delete asks first; Cancel keeps the thing.
	confirm(ask: ConfirmType) {
		this.asking = ask;
	}

	// Called by every input, so the "Saved" badge shows auto-save at work.
	saved() {
		this.project.updated = nowIso();
		this.flash();
		// After the browser has finished with this input (a drop-down's new value lands a moment later).
		const id = this.projectId;
		setTimeout(() => this.#advance(id));
	}

	// A Draft becomes In Progress by itself once its Project panel is complete (Justin, 2026-11-10): every field
	// filled, an owner, and someone assigned. Nothing else moves a status automatically.
	#advance(id: string) {
		const project = this.projects.find((item) => item.id === id);
		const panel = this.workspaces[id]?.find((item) => item.kind === 'project');
		if (!project || !panel || project.status !== 'Draft') return;
		const { done, total } = metricsOf(panel);
		if (done < total) return;
		project.status = 'In Progress';
		this.say(`"${project.title}" is now In Progress`);
	}

	// Any status, picked by hand in the Change Status sheet or a ⋮ shortcut. Sent keeps what it was before, so
	// Unsend can go back.
	setStatus(project: ProjectType, status: StatusType) {
		if (project.status === status) return;
		if ((status === 'Archived' || project.status === 'Archived') && !this.isAdmin)
			return this.say('Only an Admin can archive a project or bring it back');
		if (status === 'Sent') return this.markSent(project);
		project.before = undefined;
		project.status = status;
		project.updated = nowIso();
		this.flash();
		this.say(`"${project.title}" is now ${status}`);
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
		return this.#namesOf(page).includes(name);
	}

	// Is that name taken on its page by another record, whatever its capitals? Two records on a page never share a
	// name (spec #179 story 47); the server refuses it too.
	isTaken(page: PageType, name: string, except = '') {
		const text = name.trim().toLowerCase();
		return this.#namesOf(page).some(
			(each) => each !== except && each.trim().toLowerCase() === text
		);
	}

	#namesOf(page: PageType) {
		return page === 'customers'
			? this.customers
			: page === 'team'
				? this.members.map((member) => member.name)
				: page === 'transport'
					? this.transports.map((transport) => transport.name)
					: this.facilities.map((facility) => facility.name);
	}

	// One way in for a new customer, team, transport mode or facility (run 16): the + sheet and the panels' "Add new"
	// both hand over a filled-in draft (look.data.ts draftOf). It is stamped with now and joins its page's list.
	add(page: PageType, draft: RecordDraftType) {
		const name = draft.name.trim();
		if (!name) return false;
		if (this.isTaken(page, name)) {
			this.say(`${name} is already there`);
			return false;
		}
		const now = nowIso();
		const item = { ...$state.snapshot(draft), name, created: now, updated: now };
		if (page === 'customers') {
			const customer = item as ClientType;
			this.added.push(
				registerCustomer({
					...customer,
					id: customer.id ?? crypto.randomUUID(),
					code: customer.code || clientOfName(name).code
				})
			);
			this.customers.push(name);
		} else if (page === 'team') {
			const member = { ...(item as TeamMemberType) };
			member.id ??= crypto.randomUUID();
			delete member.userId;
			this.members.push(member);
			registerPerson(member);
		} else if (page === 'transport') {
			const transport = item as TransportType;
			this.transports.push({ ...transport, id: transport.id ?? crypto.randomUUID() });
		} else {
			const facility = item as FacilityType;
			this.facilities.push({ ...facility, id: facility.id ?? crypto.randomUUID() });
		}
		this.say(`${name} added to ${DATASETS[page].label}`);
		return true;
	}

	// One way to change a record from its Edit tab: the change is kept, stamped, and shows wherever the record does.
	patch(page: PageType, key: string, change: Record<string, unknown>) {
		const stamped = { ...change, updated: nowIso() };
		if (page === 'customers') return this.setCustomer(key, stamped as Partial<ClientType>);
		const item =
			page === 'team'
				? this.members.find((member) => member.name === key)
				: page === 'transport'
					? this.transports.find((transport) => transport.name === key)
					: this.facilities.find((facility) => facility.name === key);
		if (!item) return;
		Object.assign(item, stamped);
		if (page === 'team') registerPerson(item as TeamMemberType);
		this.flash();
	}

	// A customer's types or city, edited on its page: kept here with the rest of its card.
	setCustomer(name: string, patch: Partial<ClientType>) {
		const index = this.added.findIndex((customer) => customer.name === name);
		const before = this.added[index] ?? clientOfName(name);
		const after = registerCustomer({ id: crypto.randomUUID(), ...before, ...patch });
		if (index < 0) this.added.push(after);
		else this.added[index] = after;
		this.flash();
	}

	// A new name follows the record into every project, panel and drop-down that uses it.
	rename(page: PageType, from: string, to: string) {
		const name = to.trim();
		if (!name || name === from) return false;
		if (this.isTaken(page, name, from)) {
			this.say(`${name} is already there`);
			return false;
		}
		const swap = (value: string) => (value === from ? name : value);
		if (page === 'customers') {
			this.customers = this.customers.map(swap);
			this.setCustomer(from, { name });
			forgetCustomer(from);
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
		this.patch(page, name, {});
		return true;
	}

	// Deleting a record asks first (the caller's confirm); its projects keep the name they had.
	removeRecord(page: PageType, key: string) {
		if (page === 'customers') {
			const gone = this.added.find((customer) => customer.name === key);
			this.customers = this.customers.filter((name) => name !== key);
			this.added = this.added.filter((customer) => customer.name !== key);
			if (gone) this.trashed.customers.push(gone);
			forgetCustomer(key);
		}
		if (page === 'team') {
			const gone = this.members.find((member) => member.name === key);
			this.members = this.members.filter((member) => member.name !== key);
			if (gone) this.trashed.team.push(gone);
		}
		if (page === 'transport') {
			const gone = this.transports.find((transport) => transport.name === key);
			this.transports = this.transports.filter((transport) => transport.name !== key);
			if (gone) this.trashed.transports.push(gone);
		}
		if (page === 'facilities') {
			const gone = this.facilities.find((facility) => facility.name === key);
			this.facilities = this.facilities.filter((facility) => facility.name !== key);
			if (gone) this.trashed.facilities.push(gone);
		}
		if (this.screen === 'record' && this.record?.key === key) this.home();
		this.say(`${key} moved to Trash`);
	}

	addPanel() {
		const count = this.panels.filter((panel) => panel.control === 'remove').length + 1;
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

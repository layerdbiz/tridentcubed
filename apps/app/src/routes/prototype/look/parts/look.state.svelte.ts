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
	CLIENTS,
	createId,
	createPanels,
	DATASETS,
	FACILITIES,
	itemOf,
	ME,
	newPanel,
	nowIso,
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
import { seedPlaces, type PlaceType } from './map.data';
import { defaultOf } from './variants.data';
import type { PageType } from './records.data';

export type RecordDraftType = ClientType | TeamMemberType | TransportType | FacilityType;
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
const KEEP = 'trident-look-161-run-21';
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
	// Since run 17.
	places?: PlaceType[];
};

// Sent and Complete projects can be looked at, not edited (2026-10-26 19:22).
export const FROZEN: StatusType[] = ['Sent', 'Complete'];

const SIGNED_OUT = 'trident-look-161-signed-out';

function readSignedIn() {
	try {
		return localStorage.getItem(SIGNED_OUT) !== '1';
	} catch {
		return true;
	}
}

function keepSignedIn(isSignedIn: boolean) {
	try {
		if (isSignedIn) localStorage.removeItem(SIGNED_OUT);
		else localStorage.setItem(SIGNED_OUT, '1');
	} catch {
		// A browser that keeps nothing simply asks again next time.
	}
}

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
	// Which look each part of the app is showing, by part id (variants.data.ts); a part not listed shows A.
	variants = $state<Record<string, string>>({});
	// The project whose status is being changed in the Change Status sheet, by id.
	statusFor = $state<string>();
	// What the + is adding, or nothing while its sheet is shut.
	adding = $state<DatasetType>();
	// Whether someone is signed in (run 33): until then the login page stands over the app. Nothing is checked
	// yet; this browser only remembers that Log out was pressed.
	isSignedIn = $state(readSignedIn());
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
	transports = $state<TransportType[]>(structuredClone(TRANSPORTS));
	facilities = $state<FacilityType[]>(structuredClone(FACILITIES));
	customers = $state<string[]>([...CLIENTS]);
	// Customers added here, with their city; their names are in `customers` too.
	added = $state<ClientType[]>([]);
	members = $state<TeamMemberType[]>(structuredClone(TEAM));
	organization = $state<OrganizationType>(structuredClone(ORGANIZATION));
	// Every place a location field has been given, with where it is: looked up once, then read from here.
	places = $state<PlaceType[]>(seedPlaces());
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
			if (kept.places) this.places = kept.places;
			for (const customer of kept.added) registerCustomer(customer);
		} else
			for (const project of this.projects) {
				this.workspaces[project.id] = createPanels(project);
				project.progress = percentOf(this.workspaces[project.id]);
			}
		// Whoever is signed in is in the app now: their dot is green, and it is the only one that can be until there
		// are real sign-ins.
		const me = this.members.find((member) => member.name === ME);
		if (me) me.seen = nowIso();
		for (const member of this.members) registerPerson(member);
		// The Project panel is the project: its row follows the panel as it is typed in.
		$effect(() => this.#syncProject());
		$effect(() => {
			const text = JSON.stringify({
				projects: this.projects,
				workspaces: this.workspaces,
				transports: this.transports,
				facilities: this.facilities,
				customers: this.customers,
				added: this.added,
				members: this.members,
				organization: this.organization,
				places: this.places
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
		this.#ensure(id);
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

	// The prototype selector: the letter a part is showing, and picking another.
	variant(id: string) {
		return this.variants[id] ?? defaultOf(id);
	}

	pickVariant(id: string, letter: string) {
		if (letter === defaultOf(id)) delete this.variants[id];
		else this.variants[id] = letter;
	}

	resetVariants() {
		this.variants = {};
	}

	// The saved place a location's words name, whatever their capitals.
	placeOf(name: string) {
		const text = name.trim().toLowerCase();
		return text ? this.places.find((place) => place.name.toLowerCase() === text) : undefined;
	}

	// A suggestion picked in a location field joins the saved places, once.
	keepPlace(place: PlaceType) {
		if (!this.placeOf(place.name)) this.places.push({ ...place, created: nowIso() });
	}

	// Settings: the organization's details and report wording (run 15).
	openSettings() {
		if (this.screen === 'workspace') this.#keepProject();
		this.tab = 'page';
		this.tabProgress = 0;
		this.screen = 'settings';
	}

	signIn() {
		this.isSignedIn = true;
		keepSignedIn(true);
	}

	signOut() {
		if (this.screen === 'workspace') this.#keepProject();
		this.screen = 'dashboard';
		this.navSection = this.dataset;
		this.isSignedIn = false;
		keepSignedIn(false);
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

	// What the Project panel holds, copied onto the project's row: the one place its Page, rows, cards, map pin and
	// number read from.
	#syncProject() {
		const panel = this.panels.find((item) => item.kind === 'project');
		const project = this.project;
		if (!panel || !project) return;
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
		const id = createId('p');
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
			progress: 0
		});
		this.workspaces[id] = createPanels(this.projects[0]).map((panel) =>
			panel.kind === 'project'
				? { ...($state.snapshot(draft) as PanelType), id: panel.id }
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

	// One way in for a new customer, team, transport mode or facility (run 16): the + sheet and the panels' "Add new"
	// both hand over a filled-in draft (look.data.ts draftOf). It is stamped with now and joins its page's list.
	add(page: PageType, draft: RecordDraftType) {
		const name = draft.name.trim();
		if (!name) return false;
		if (this.has(page, name)) {
			this.say(`${name} is already there`);
			return false;
		}
		const now = nowIso();
		const item = { ...$state.snapshot(draft), name, created: now, updated: now };
		if (page === 'customers') {
			const customer = item as ClientType;
			this.added.push(
				registerCustomer({ ...customer, code: customer.code || clientOfName(name).code })
			);
			this.customers.push(name);
		} else if (page === 'team') {
			this.members.push(item as TeamMemberType);
			registerPerson(item as TeamMemberType);
		} else if (page === 'transport') this.transports.push(item as TransportType);
		else this.facilities.push(item as FacilityType);
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
		this.patch(page, name, {});
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

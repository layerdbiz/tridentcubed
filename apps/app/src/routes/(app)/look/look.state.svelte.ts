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
import { untrack } from 'svelte';
import { DEFAULT_CHART, type ChartKindType, type RangeType } from './chart.data';
import {
	clientOf as clientOfName,
	createPanels,
	forgetCustomer,
	DATASETS,
	newPanel,
	nowIso,
	ORGANIZATION,
	PAGES,
	registerCustomer,
	registerPerson,
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
import { knowPlaces } from './location';
import type { PlaceType } from './map.data';
import { readMenuPanels, writeMenuPanels, type MenuPanelsType } from './menu-panels';
import type { RowType } from '#lib/rows/rows.schema.js';
import { toStableId } from '#lib/rows/rows.utils.js';
import type { SaveStatusType } from '#lib/rows/rows.state.svelte.js';
import { lookOf } from './look.constants';
import { contactsOf, type PageType } from './records.data';
import { hasRequired, sectionsOf, tallyOf, toPercent } from './tally';

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

// The states a project is no longer being worked on in: it opens on its Page, not on Edit (LookState.open).
const FINISHED: StatusType[] = ['Sent', 'Complete', 'Archived'];

// The inputs a panel holds, section by section (tally.ts, the one place that says what counts). The Project
// panel's Contact field reads the picked customer's contacts, so the app's customers are needed to count it.
function sectionsIn(panel: PanelType, look: LookState) {
	const customer = panel.fields.find((field) => field.label === 'Customer')?.value ?? '';
	return sectionsOf(panel, panel.kind === 'project' ? contactsOf(look, customer) : []);
}

// A panel's count is its sections' counts added up: every input counts once, done when it holds something. A
// panel with no input yet (no rows, no days) has one thing to do.
export function metricsOf(panel: PanelType, look: LookState): MetricsType {
	const inputs = sectionsIn(panel, look).flatMap((section) => section.inputs);
	const tally = tallyOf(inputs.map((input) => input.value));
	const total = Math.max(1, tally.total);
	// A panel switched off is not planned: it reads like any other panel, with nothing of its total done, 0% (#225).
	if (!panel.isEnabled) return { done: 0, total, percent: 0, status: 'Not planned' };
	const percent = toPercent(tally.done, total);
	const status: PanelStatusType =
		percent >= 100 ? 'Complete' : percent === 0 ? 'To do' : 'In progress';
	return { done: tally.done, total, percent, status };
}

// A project's percent: every input of its switched-on panels counts the same.
export function percentOf(panels: PanelType[], look: LookState) {
	const enabled = panels.filter((panel) => panel.isEnabled).map((panel) => metricsOf(panel, look));
	const done = enabled.reduce((sum, item) => sum + item.done, 0);
	const total = enabled.reduce((sum, item) => sum + item.total, 0);
	return total ? toPercent(done, total) : 0;
}

// Whether every input of a project's switched-on panels is filled in: its 100%, which only then reads 100.
function isDoneOf(panels: PanelType[], look: LookState) {
	const enabled = panels.filter((panel) => panel.isEnabled);
	return (
		enabled.length > 0 &&
		enabled.every((panel) => {
			const { done, total } = metricsOf(panel, look);
			return done === total;
		})
	);
}

// What moves a project's status by itself (#328, Justin 2026-11-25: "it needs to automatically change ... if it's
// at 100%, it needs to turn into a ready state"). A Draft becomes In Progress once its Project panel is complete
// (`isStarted`, Justin 2026-11-10), and a Draft or In Progress project becomes Ready once every input of its
// switched-on panels is filled in (`isDone`, its 100%). Nothing moves back: a Ready project stays Ready when it is
// edited (ADR 0006), and Review, Revision and the states after it are only ever picked by hand.
export function toFollowing(
	status: StatusType,
	{ isStarted, isDone }: { isStarted: boolean; isDone: boolean }
): StatusType {
	if (status !== 'Draft' && status !== 'In Progress') return status;
	if (isDone) return 'Ready';
	return isStarted ? 'In Progress' : status;
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
	if (status === 'Not planned')
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
	// The page of the open project's Preview a report link asked for (the QR code on a report page, #216), from 1;
	// 0 for none. The Preview opens there; opening a panel, or a project by hand, forgets it.
	pageAsked = $state(0);
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
	// The menu's panels (#212): which are open, the same in the sidebar and the phone's drawer, and remembered on
	// the device (menu-panels.ts).
	menuPanels = $state(readMenuPanels());
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
	// An Admin or a Manager changes the organization: its details, disclaimer and sign-off (#303). Team reads it.
	isOrganizationEditable = $derived(this.isAdmin || this.role === 'manager');
	organization = $state<OrganizationType>(structuredClone(ORGANIZATION));
	// Every place a location field has been given, with where it is: looked up once, then read from here. The
	// server's rows since #184 (the seed's starting places, then every one a member picked).
	places = $state<PlaceType[]>([]);
	// The Help text of every input by its key (#299), from the server's `help_text` rows. The app holds none of its own:
	// an input whose key has no row shows no ?.
	help = $state.raw<Record<string, string>>({});
	asking = $state<ConfirmType>();
	// Each project's row, Team Assigned rows and trip's stops (#188) as the server last gave them (#186, mapper.ts):
	// what a project whose panels have not loaded saves as, since only its status and percent change from the lists.
	fromServer: Record<
		string,
		{ values: Record<string, unknown>; team: RowType[]; stops: RowType[] }
	> = {};
	// The row ids of the Team Assigned, by project and Team record (mapper.ts).
	teamRowIds = new Map<string, string>();
	// The J count the server last gave each project (mapper.ts, #217): how a new one from the server is told from
	// one someone typed while a save was on its way.
	serverJobs = new Map<string, number>();

	project = $derived(
		this.projects.find((project) => project.id === this.projectId) ?? this.projects[0]
	);
	panels = $derived(this.workspaces[this.projectId] ?? []);
	overall = $derived(percentOf(this.panels, this));
	isFrozen = $derived(FROZEN.includes(this.project?.status));
	// How far the open project's work has got, for its status (`toFollowing`): its Project panel complete, and every
	// input filled in. Two yes-or-no answers, so the step below runs again only when one of them changes.
	#isStarted = $derived.by(() => {
		const panel = this.panels.find((item) => item.kind === 'project');
		return panel ? hasRequired(sectionsIn(panel, this)) : false;
	});
	#isDone = $derived(isDoneOf(this.panels, this));

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
		// Its status follows its work (#328) whatever filled the last input in: a keystroke, a pick that lands a
		// moment later, a photo whose upload finishes, or a project opened that was already done. The status is read
		// untracked, so one picked by hand stays until the work moves on.
		$effect(() => {
			const isStarted = this.#isStarted;
			const isDone = this.#isDone;
			if (this.screen !== 'workspace' || !this.isLoaded(this.projectId)) return;
			untrack(() => this.#follow(this.projectId, { isStarted, isDone }));
		});
	}

	// Opens or shuts one of the menu's panels, and keeps that on the device (#212).
	toggleMenuPanel(panel: keyof MenuPanelsType) {
		this.menuPanels[panel] = !this.menuPanels[panel];
		writeMenuPanels(this.menuPanels);
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
		return panels ? percentOf(panels, this) : project.progress;
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

	// The page of what is open, never the list last visited (Justin, 2026-11-16: his own Team page, opened from his
	// picture while on Projects, said Projects). A project belongs to Projects and a record to its own page. The
	// dashboard and the Organization, which is none of the five pages, give the list on show or last on show.
	get place(): DatasetType {
		if (this.screen === 'workspace') return 'projects';
		if (this.screen === 'record' && this.record) return this.record.page;
		return this.dataset;
	}

	// Unless asked for a tab, a project still being worked on opens on Edit, where its panels are, and one that is
	// Sent, Complete or Archived on its Page (Justin, 2026-11-16: the Page of an unfinished project is not the
	// place to land). Every other kind of record opens on its Page.
	open(id: string, tab?: TabType) {
		if (this.screen === 'workspace') this.#keepProject();
		const status = this.projects.find((project) => project.id === id)?.status;
		const first = tab ?? (status && FINISHED.includes(status) ? 'page' : 'edit');
		this.projectId = id;
		this.panelId = '';
		this.pageAsked = 0;
		this.tab = first;
		this.tabProgress = PROJECT_TABS.indexOf(first);
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
	/** The Help text of the input `key` names (`project.title`), or nothing, which shows no ?. */
	helpOf(key: string) {
		return this.help[key] ?? '';
	}

	keepPlace(place: PlaceType) {
		if (this.placeOf(place.name)) return;
		const id = toStableId(this.organization.id ?? '', 'place', place.name.trim().toLowerCase());
		this.places.push({ ...place, id, created: nowIso() });
		knowPlaces([place]);
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
		// Its number's two typed parts and the customer's own number for the job (#217).
		if (panel.day && project.day !== panel.day) project.day = panel.day;
		if (project.job !== panel.job) project.job = panel.job;
		const reference = panel.customerReference?.trim() ?? '';
		if ((project.customerReference ?? '') !== reference) project.customerReference = reference;
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
			day: draft.day || now.slice(0, 10),
			job: draft.job,
			customerReference: draft.customerReference?.trim() ?? '',
			createdBy: this.userId || undefined
		});
		this.workspaces[id] = createPanels(this.projects[0]).map((panel) =>
			panel.kind === 'project'
				? { ...($state.snapshot(draft) as PanelType), id: panel.id, key: 'project' }
				: panel
		);
		this.open(id, 'edit');
		this.advance(id);
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

	// Called by every input, so the "Saved" badge shows auto-save at work. The status follows in the effect above.
	saved() {
		this.project.updated = nowIso();
		this.flash();
	}

	// Moves a project's status on as far as its work has got (`toFollowing`): In Progress once its Project panel is
	// complete (every input but the optional reference number, #229; a Team Lead is team enough, #328), Ready once
	// every input of its switched-on panels is filled in.
	advance(id = this.projectId) {
		const panels = this.workspaces[id];
		const panel = panels?.find((item) => item.kind === 'project');
		if (!panels || !panel) return;
		this.#follow(id, {
			isStarted: hasRequired(sectionsIn(panel, this)),
			isDone: isDoneOf(panels, this)
		});
	}

	#follow(id: string, work: { isStarted: boolean; isDone: boolean }) {
		const project = this.projects.find((item) => item.id === id);
		if (!project) return;
		const status = toFollowing(project.status, work);
		if (status === project.status) return;
		project.status = status;
		this.say(`"${project.title}" is now ${status}`);
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

// PROTOTYPE (#161): in-memory state for the look. A project opens with every panel closed (Justin's run 8 note 4).
// Every input counts toward its panel, and the panels toward the project, so the percents move as you type. The
// Transport and Facility lists live here, so one added from a project shows on its dashboard page. Every delete asks
// first (`confirm`, Justin 2026-10-25).
import { DEFAULT_CHART, type ChartKindType, type RangeType } from './chart.data';
import {
	createId,
	createPanels,
	FACILITIES,
	newPanel,
	PROJECTS,
	stopOf,
	TRANSPORTS,
	type DatasetType,
	type FacilityType,
	type PanelStatusType,
	type PanelType,
	type ProjectType,
	type TransportType
} from './look.data';

export type ScreenType = 'dashboard' | 'workspace';
export type ViewType = 'table' | 'cards' | 'board';
export type TabType = 'edit' | 'preview';

export type MetricsType = { done: number; total: number; percent: number; status: PanelStatusType };

// The "Are you sure?" dialog: what is about to go, and what to do on yes.
export type ConfirmType = { title: string; note?: string; onyes: () => void };

export function metricsOf(panel: PanelType): MetricsType {
	let done = 0;
	let total = 0;
	if (panel.kind === 'fields') {
		total = panel.fields.length;
		done = panel.fields.filter((field) => field.value.trim()).length;
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
	isNewOpen = $state(false);
	navSection = $state<string>('home');
	isSaving = $state(false);
	toast = $state('');
	workspaces = $state<Record<string, PanelType[]>>({});
	transports = $state<TransportType[]>(structuredClone(TRANSPORTS));
	facilities = $state<FacilityType[]>(structuredClone(FACILITIES));
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

	#saveTimer: ReturnType<typeof setTimeout> | undefined;
	#toastTimer: ReturnType<typeof setTimeout> | undefined;

	// Every project's panels up front, so the list shows the percent each one opens at.
	constructor() {
		for (const project of this.projects) {
			this.workspaces[project.id] = createPanels(project);
			project.progress = percentOf(this.workspaces[project.id]);
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
		this.navSection = 'home';
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
				['Title', 'Organization', 'Client'].includes(field.label) ? field : { ...field, value: '' }
			),
			assigned: [],
			days: [],
			groups: [],
			stops: panel.kind === 'transport' ? [stopOf()] : []
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
		if (!this.panels[from]?.isDraggable || !this.panels[to]?.isDraggable) return false;
		const [panel] = this.panels.splice(from, 1);
		this.panels.splice(to, 0, panel);
		this.saved();
	}
}

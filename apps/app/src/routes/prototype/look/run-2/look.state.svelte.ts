// PROTOTYPE (#161): in-memory state shared by the variants, so switching variant keeps your place.
// Every input counts toward its panel, and the panels toward the project, so the percents move as you type.
import {
	createId,
	createPanels,
	newPanel,
	PROJECTS,
	type PanelStatusType,
	type PanelType,
	type ProjectType,
	type StatusType
} from './look.data';

export type ScreenType = 'dashboard' | 'workspace';
export type ViewType = 'table' | 'cards' | 'board';
export type TabType = 'edit' | 'preview';

export type MetricsType = { done: number; total: number; percent: number; status: PanelStatusType };

export function metricsOf(panel: PanelType): MetricsType {
	let done = 0;
	let total = 0;
	if (panel.kind === 'fields') {
		total = panel.fields.length;
		done = panel.fields.filter((field) => field.value.trim()).length;
	} else if (panel.kind === 'team') {
		total = 2;
		done = Number(Boolean(panel.owner)) + Number(panel.assigned.length > 0);
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
		// A photo group counts its title, its layout and having photos.
		total = Math.max(1, panel.groups.length * 3);
		done = panel.groups.reduce(
			(sum, group) =>
				sum + Number(Boolean(group.title.trim())) + 1 + Number(group.photos.length > 0),
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
	filter = $state<StatusType | 'All'>('All');
	projects = $state<ProjectType[]>(structuredClone(PROJECTS));
	projectId = $state('p1');
	tab = $state<TabType>('edit');
	panelId = $state('client');
	isNewOpen = $state(false);
	navSection = $state<string>('dashboard');
	isSaving = $state(false);
	toast = $state('');
	workspaces = $state<Record<string, PanelType[]>>({});

	project = $derived(
		this.projects.find((project) => project.id === this.projectId) ?? this.projects[0]
	);
	visible = $derived(
		this.filter === 'All'
			? this.projects
			: this.projects.filter((project) => project.status === this.filter)
	);
	panels = $derived(this.workspaces[this.projectId] ?? []);
	overall = $derived.by(() => {
		const enabled = this.panels.filter((panel) => panel.isEnabled).map(metricsOf);
		const done = enabled.reduce((sum, item) => sum + item.done, 0);
		const total = enabled.reduce((sum, item) => sum + item.total, 0);
		return total ? Math.round((done / total) * 100) : 0;
	});

	#saveTimer: ReturnType<typeof setTimeout> | undefined;
	#toastTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		this.#ensure(this.projectId);
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

	open(id: string) {
		this.#keepProgress();
		this.#ensure(id);
		this.projectId = id;
		this.screen = 'workspace';
	}

	home() {
		this.#keepProgress();
		this.screen = 'dashboard';
		this.navSection = 'dashboard';
	}

	#keepProgress() {
		if (this.workspaces[this.projectId]) this.project.progress = this.overall;
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
			carrier: '',
			facility: '',
			dates: 'Today',
			status: 'Draft',
			team: ['Riley Ford'],
			updated: 'Just now',
			progress: 0
		});
		this.workspaces[id] = createPanels(this.projects[0]).map((panel) => ({
			...panel,
			fields: panel.fields.map((field) =>
				field.isReadonly || field.label === 'Title' || field.label === 'Company'
					? field
					: { ...field, value: '' }
			),
			assigned: [],
			days: [],
			groups: []
		}));
		this.panelId = 'client';
		this.open(id);
	}

	remove(id: string) {
		const index = this.projects.findIndex((project) => project.id === id);
		const [removed] = this.projects.splice(index, 1);
		this.say(`"${removed.title}" moved to Trash`);
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

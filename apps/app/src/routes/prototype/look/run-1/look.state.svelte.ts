// PROTOTYPE (#161): in-memory state shared by the three variants, so switching variant keeps your place.
import { PROJECTS, type StatusType } from './look.data';

export type ScreenType = 'dashboard' | 'workspace';
export type ViewType = 'table' | 'cards' | 'board';
export type TabType = 'edit' | 'preview';

export class LookState {
	screen = $state<ScreenType>('dashboard');
	view = $state<ViewType>('table');
	filter = $state<StatusType | 'All'>('All');
	projectId = $state('p1');
	tab = $state<TabType>('edit');
	panelId = $state('project');
	isNewOpen = $state(false);
	navSection = $state<string>('dashboard');

	project = $derived(PROJECTS.find((project) => project.id === this.projectId) ?? PROJECTS[0]);
	projects = $derived(
		this.filter === 'All' ? PROJECTS : PROJECTS.filter((project) => project.status === this.filter)
	);

	open(id: string) {
		this.projectId = id;
		this.screen = 'workspace';
	}

	home() {
		this.screen = 'dashboard';
		this.navSection = 'dashboard';
	}
}

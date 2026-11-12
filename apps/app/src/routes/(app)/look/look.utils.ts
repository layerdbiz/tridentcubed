// The address follows what is on screen (#161, kept in V1 by #180): the screen, its tab and view, the open project,
// panel or record, and the dashboard's page, range and chart ride in the address's search, so a reload, the back
// button or a shared link lands on the same place. look.svelte reads it at start and on back or forward, and writes it.
import type { ChartKindType, RangeType } from './chart.data';
import { PAGES, type DatasetType } from './look.data';
import type { LookState, ScreenType, TabType, ViewType } from './look.state.svelte';
import type { PageType } from './records.data';

// An address's search, as the browser or Kit's read-only page.url hands it over.
type AddressType = Pick<URLSearchParams, 'get' | 'has'>;

const SCREENS: ScreenType[] = ['dashboard', 'workspace', 'record', 'settings'];

// Puts the address's place on screen. Anything it names that is not there (an old link, a deleted project or
// record) opens the dashboard instead.
export function openAddress(look: LookState, params: AddressType) {
	look.tab = (params.get('tab') as TabType) ?? 'page';
	look.view = (params.get('view') as ViewType) ?? 'table';
	const asked = params.get('project');
	const hasProject = look.projects.some((project) => project.id === asked);
	if (asked && hasProject) look.open(asked, look.tab);
	const screen = params.get('screen') as ScreenType;
	look.screen = SCREENS.includes(screen) ? screen : 'dashboard';
	if (look.screen === 'workspace' && !hasProject) look.screen = 'dashboard';
	const panel = params.get('panel');
	if (panel && look.panels.some((item) => item.id === panel)) look.panelId = panel;
	// Old links said ?set=clients (Customers since run 11); anything unknown stays on Projects.
	const set = params.get('set')?.replace('clients', 'customers') as DatasetType | undefined;
	if (set && PAGES.includes(set)) look.pick(set);
	// ?screen=record&record=customers:KOGA opens a record's own page.
	const [recordPage, ...recordKey] = (params.get('record') ?? '').split(':');
	if (look.screen === 'record') {
		const page = recordPage as PageType;
		const key = recordKey.join(':');
		if (PAGES.slice(1).includes(page) && look.has(page, key)) look.openRecord(page, key, look.tab);
		else look.screen = 'dashboard';
	}
	if (params.has('range')) look.range = params.get('range') as RangeType;
	if (params.has('chart')) look.chart = params.get('chart') as ChartKindType;
}

// Which place an address is: its screen, and the project or record that screen shows. Two addresses of one place
// differ only in a tab, view, panel or the dashboard's page, which replace the history entry instead of adding one.
export function placeOf(params: AddressType) {
	const screen = params.get('screen') ?? 'dashboard';
	if (screen === 'workspace') return `${screen}:${params.get('project') ?? ''}`;
	if (screen === 'record') return `${screen}:${params.get('record') ?? ''}`;
	return screen;
}

// The address for what is on screen now, from the address it replaces.
export function toAddress(look: LookState, from: URL) {
	const url = new URL(from.href);
	// The prototype's look picks (?v=…, and ?variant= before them) do not ship.
	url.searchParams.delete('variant');
	url.searchParams.delete('v');
	url.searchParams.set('screen', look.screen);
	url.searchParams.set('tab', look.tab);
	url.searchParams.set('view', look.view);
	url.searchParams.set('project', look.projectId);
	url.searchParams.set('set', look.dataset);
	url.searchParams.set('range', look.range);
	url.searchParams.set('chart', look.chart);
	url.searchParams.set('panel', look.panelId);
	if (look.screen === 'record' && look.record)
		url.searchParams.set('record', `${look.record.page}:${look.record.key}`);
	else url.searchParams.delete('record');
	return url;
}

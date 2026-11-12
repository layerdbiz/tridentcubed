import { describe, expect, it } from 'vite-plus/test';
import { draftPanel } from './look.data';
import { LookState } from './look.state.svelte';
import { openAddress, placeOf, toAddress } from './look.utils';

const HOME = 'https://dev.app.tridentcubed.com/';

// What a reload does: a new LookState (with what this browser kept) reads the address the last one wrote.
function reload(look: LookState, address: URL) {
	const next = new LookState();
	next.projects = look.projects;
	next.workspaces = look.workspaces;
	openAddress(next, address.searchParams);
	return next;
}

function withProject() {
	const look = new LookState();
	const panel = draftPanel(look.organization.name, 'Capt. Cezary Poninski');
	panel.fields[0].value = 'Hatch survey';
	look.create(panel);
	return look;
}

describe('the address', () => {
	it('lands a reload on the same project, tab and panel', () => {
		const look = withProject();
		look.tab = 'preview';
		look.panelId = 'timelog';
		const next = reload(look, toAddress(look, new URL(HOME)));
		expect(next.screen).toBe('workspace');
		expect(next.projectId).toBe(look.projectId);
		expect(next.project?.title).toBe('Hatch survey');
		expect(next.tab).toBe('preview');
		expect(next.panelId).toBe('timelog');
	});

	it('lands a reload on the same record and tab', () => {
		const look = new LookState();
		look.openRecord('customers', 'KOGA', 'edit');
		const address = toAddress(look, new URL(HOME));
		expect(address.searchParams.get('record')).toBe('customers:KOGA');
		const next = reload(look, address);
		expect(next.screen).toBe('record');
		expect(next.record).toEqual({ page: 'customers', key: 'KOGA' });
		expect(next.tab).toBe('edit');
	});

	it('lands a reload on the same dashboard page, view, range and chart', () => {
		const look = new LookState();
		look.pick('team');
		look.view = 'board';
		look.range = '1y';
		look.chart = 'bar';
		const next = reload(look, toAddress(look, new URL(HOME)));
		expect(next.screen).toBe('dashboard');
		expect(next.dataset).toBe('team');
		expect(next.navSection).toBe('team');
		expect(next.view).toBe('board');
		expect(next.range).toBe('1y');
		expect(next.chart).toBe('bar');
	});

	it('lands a reload on Settings', () => {
		const look = new LookState();
		look.openSettings();
		expect(reload(look, toAddress(look, new URL(HOME))).screen).toBe('settings');
	});

	it('opens the dashboard for a project or record that is not there', () => {
		const look = new LookState();
		openAddress(look, new URLSearchParams('screen=workspace&project=p1&tab=edit'));
		expect(look.screen).toBe('dashboard');
		expect(look.project).toBeUndefined();
		openAddress(look, new URLSearchParams('screen=record&record=transport:MV%20Coral%20Dawn'));
		expect(look.screen).toBe('dashboard');
	});

	it('names a new place for another screen, project or record, and the same place for a tab or view', () => {
		const place = (search: string) => placeOf(new URLSearchParams(search));
		expect(place('')).toBe(place('screen=dashboard&set=team&view=board'));
		expect(place('screen=workspace&project=a&tab=page')).toBe(
			place('screen=workspace&project=a&tab=edit&panel=items')
		);
		expect(place('screen=workspace&project=a')).not.toBe(place('screen=workspace&project=b'));
		expect(place('screen=record&record=team:Ian%20Derda')).not.toBe(
			place('screen=record&record=customers:KOGA')
		);
		expect(place('screen=dashboard&project=a')).not.toBe(place('screen=workspace&project=a'));
		expect(place('screen=settings')).not.toBe(place('screen=dashboard'));
	});

	it('carries no prototype selector picks', () => {
		const look = new LookState();
		const address = toAddress(look, new URL(`${HOME}?v=cover:B,sidebar:A&variant=b`));
		expect(address.searchParams.has('v')).toBe(false);
		expect(address.searchParams.has('variant')).toBe(false);
	});
});

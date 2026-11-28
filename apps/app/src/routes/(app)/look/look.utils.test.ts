import { describe, expect, it } from 'vite-plus/test';
import { toReportAddress } from '#lib/report/report.utils.js';
import { draftOf, draftPanel } from './look.data';
import { LookState } from './look.state.svelte';
import { openAddress, placeOf, toAddress } from './look.utils';
import type { TeamMemberType } from './team.data';

const HOME = 'https://dev.app.tridentcubed.com/';

// What a reload does: a new LookState (with what this browser kept, and the customers the server sends) reads the
// address the last one wrote.
function reload(look: LookState, address: URL) {
	const next = new LookState();
	next.projects = look.projects;
	next.workspaces = look.workspaces;
	next.customers = look.customers;
	next.added = look.added;
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
		const timelog = look.panels.find((panel) => panel.kind === 'timelog')?.id ?? '';
		look.panelId = timelog;
		const next = reload(look, toAddress(look, new URL(HOME)));
		expect(next.screen).toBe('workspace');
		expect(next.projectId).toBe(look.projectId);
		expect(next.project?.title).toBe('Hatch survey');
		expect(next.tab).toBe('preview');
		expect(next.panelId).toBe(timelog);
	});

	it('lands a reload on the same record and tab', () => {
		const look = new LookState();
		look.customers = ['KOGA'];
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

	it('opens a project’s Preview at the page a report link asks for (#216)', () => {
		const look = withProject();
		const next = new LookState();
		next.projects = look.projects;
		next.workspaces = look.workspaces;
		// The address the report link's route sends the browser on to.
		openAddress(next, new URL(toReportAddress(look.projectId, '5'), HOME).searchParams);
		expect(next.screen).toBe('workspace');
		expect(next.tab).toBe('preview');
		expect(next.pageAsked).toBe(5);
		// A reload lands on the same page; opening another project forgets it.
		const address = toAddress(next, new URL(HOME));
		expect(address.searchParams.get('page')).toBe('5');
		expect(reload(next, address).pageAsked).toBe(5);
		next.open(look.projectId, 'edit');
		expect(next.pageAsked).toBe(0);
		expect(toAddress(next, new URL(`${HOME}?page=5`)).searchParams.has('page')).toBe(false);
	});

	it('asks for no page outside a project', () => {
		const look = new LookState();
		openAddress(look, new URLSearchParams('screen=workspace&tab=preview&project=gone&page=5'));
		expect(look.screen).toBe('dashboard');
		expect(look.pageAsked).toBe(0);
		openAddress(look, new URLSearchParams('screen=dashboard&page=5'));
		expect(look.pageAsked).toBe(0);
	});

	it('lands a reload on Settings', () => {
		const look = new LookState();
		look.openSettings();
		expect(reload(look, toAddress(look, new URL(HOME))).screen).toBe('settings');
	});

	// Two Team members: the signed-in person, a Member, and someone else.
	function team(role: LookState['role']) {
		const look = new LookState();
		look.role = role;
		look.userId = 'user-rosa';
		look.members = [
			{ ...(draftOf('team') as TeamMemberType), id: crypto.randomUUID(), name: 'Rosa M. Vega' },
			{ ...(draftOf('team') as TeamMemberType), id: crypto.randomUUID(), name: 'Tom Reyes' }
		];
		look.members[0].userId = 'user-rosa';
		return look;
	}

	it('opens one’s own Email Signature at the Preview of one’s Team page, and a reload stays there (#354)', () => {
		const look = team('team');
		look.openSignature();
		expect(look.screen).toBe('record');
		expect(look.record).toEqual({ page: 'team', key: 'Rosa M. Vega' });
		expect(look.tab).toBe('preview');
		expect(look.tabProgress).toBe(2);

		const next = team('team');
		openAddress(next, toAddress(look, new URL(HOME)).searchParams);
		expect(next.record).toEqual({ page: 'team', key: 'Rosa M. Vega' });
		expect(next.tab).toBe('preview');
	});

	it('gives another Team member’s page a Preview for an Admin only (#354)', () => {
		const admin = team('admin');
		admin.openRecord('team', 'Tom Reyes', 'preview');
		expect(admin.recordTabs).toEqual(['page', 'edit', 'preview']);
		expect(admin.tab).toBe('preview');

		const member = team('team');
		member.openRecord('team', 'Tom Reyes', 'preview');
		expect(member.recordTabs).toEqual(['page', 'edit']);
		expect(member.tab).toBe('page');
	});

	it('lands a reload on Settings, for anyone (#403)', () => {
		const look = new LookState();
		look.role = 'team';
		look.openAccount();
		expect(reload(look, toAddress(look, new URL(HOME))).screen).toBe('account');
	});

	// Everyone has an Activity Log since #403 (Justin, 2026-11-28), each of only what they are privy to.
	it('lands anyone’s reload on the Activity Log (#306, #403)', () => {
		for (const role of ['admin', 'team'] as const) {
			const look = new LookState();
			look.role = role;
			look.openActivity();
			expect(look.screen).toBe('activity');
			const address = toAddress(look, new URL(HOME));
			const next = new LookState();
			next.role = role;
			openAddress(next, address.searchParams);
			expect(next.screen).toBe('activity');
		}
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

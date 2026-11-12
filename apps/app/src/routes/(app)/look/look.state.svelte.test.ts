import { describe, expect, it } from 'vite-plus/test';
import { draftPanel } from './look.data';
import { LookState } from './look.state.svelte';

// The tests run on Svelte's server build, where LookState's effects do nothing: what is checked here is the state
// itself, not what the screens draw from it.
function fresh() {
	return new LookState();
}

describe('a new app', () => {
	it('starts with no projects, transports or facilities', () => {
		const look = fresh();
		expect(look.projects).toEqual([]);
		expect(look.transports).toEqual([]);
		expect(look.facilities).toEqual([]);
	});

	it('starts with the real organization, team and places, and no customers until the server sends them', () => {
		const look = fresh();
		expect(look.organization.name).toBe('Trident Cubed');
		expect(look.members).toHaveLength(17);
		expect(look.members.map((member) => member.name)).toContain('Capt. Cezary Poninski');
		expect(look.customers).toEqual([]);
		expect(look.places.map((place) => place.name)).toContain('Houston, TX');
	});

	it('opens on the dashboard with nothing open', () => {
		const look = fresh();
		expect(look.screen).toBe('dashboard');
		expect(look.project).toBeUndefined();
		expect(look.panels).toEqual([]);
		expect(look.overall).toBe(0);
		expect(look.isFrozen).toBe(false);
	});

	it('makes a project from the + sheet and opens it on Edit with empty panels', () => {
		const look = fresh();
		look.create(draftPanel(look.organization.name, 'Capt. Cezary Poninski'));
		expect(look.projects).toHaveLength(1);
		expect(look.screen).toBe('workspace');
		expect(look.tab).toBe('edit');
		const kinds = look.panels.map((panel) => panel.kind);
		expect(kinds.slice(0, 4)).toEqual(['project', 'transport', 'items', 'timelog']);
		const items = look.panels.find((panel) => panel.kind === 'items')!;
		expect(items.items.every((item) => !item.quantity && !item.description)).toBe(true);
		const timelog = look.panels.find((panel) => panel.kind === 'timelog')!;
		expect(timelog.days).toEqual([]);
		for (const panel of look.panels.filter((item) => item.kind === 'photos'))
			expect(panel.groups).toEqual([]);
	});
});

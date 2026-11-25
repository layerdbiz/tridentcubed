// The Operations panel's stages (#215): what a new project starts with, and how a project from before them is
// carried over once without losing anything.
import { describe, expect, it } from 'vite-plus/test';
import {
	createPanels,
	groupOf,
	panelOf,
	STAGES,
	type PanelType,
	type ProjectType
} from './look.data';
import { LookState, metricsOf } from './look.state.svelte';
import { upgradeOperations } from './stages';

function oldPanel(groups: PanelType['groups'] = [], name = 'Inspection') {
	const panel = panelOf({
		id: crypto.randomUUID(),
		key: 'inspection',
		name,
		icon: 'icon-[mdi--camera-outline]',
		kind: 'photos',
		control: 'switch',
		isEnabled: true
	});
	panel.groups = groups;
	return panel;
}

function stored() {
	return { id: crypto.randomUUID(), src: `/files/${crypto.randomUUID()}`, description: 'Hatch 2' };
}

describe('a new project', () => {
	it('has an Operations panel with the four stages, each switched on and empty', () => {
		const panels = createPanels({ stops: [], team: [] } as unknown as ProjectType);
		const operations = panels.find((panel) => panel.key === 'operations');
		expect(operations?.name).toBe('Operations');
		expect(operations?.groups.map((group) => [group.title, group.isEnabled, group.photos])).toEqual(
			STAGES.map((title) => [title, true, []])
		);
		expect(panels.some((panel) => panel.key === 'inspection')).toBe(false);
	});
});

describe('a project from before stages', () => {
	it('keeps its groups, descriptions and photos, in order, under the new title', () => {
		const preloading = { ...groupOf('Preloading'), description: 'On the quay', photos: [stored()] };
		const loading = {
			...groupOf('Loading Operations'),
			layout: 6 as const,
			photos: [stored(), stored()]
		};
		const panel = oldPanel([preloading, loading, groupOf('Securing'), groupOf('Lifting Gear')]);
		const before = structuredClone(panel.groups);

		expect(upgradeOperations(panel)).toBe(true);

		expect(panel.name).toBe('Operations');
		expect(panel.key).toBe('operations');
		expect(panel.groups).toEqual(before);
	});

	it('gets each starting stage it has no group for, switched off beside its own groups', () => {
		const own = { ...groupOf('Overview'), photos: [stored()] };
		const panel = oldPanel([own, groupOf('  securing ')]);

		upgradeOperations(panel);

		expect(panel.groups.map((group) => [group.title, group.isEnabled])).toEqual([
			['Overview', true],
			['  securing ', true],
			['Preloading', false],
			['Loading Operations', false],
			['Lifting Gear', false]
		]);
		expect(panel.groups[0]).toEqual(own);
	});

	it('gets the stages switched on when it had no groups', () => {
		const panel = oldPanel();
		upgradeOperations(panel);
		expect(panel.groups.map((group) => [group.title, group.isEnabled])).toEqual(
			STAGES.map((title) => [title, true])
		);
	});

	it('keeps a title someone gave the panel', () => {
		const panel = oldPanel([], 'Cargo Condition');
		upgradeOperations(panel);
		expect(panel.name).toBe('Cargo Condition');
	});

	it('is carried over once: a stage renamed or removed afterwards is not added again', () => {
		const panel = oldPanel();
		upgradeOperations(panel);
		panel.groups[0].title = 'Pre-discharge';
		panel.groups.splice(1, 1);

		expect(upgradeOperations(panel)).toBe(false);
		expect(panel.groups.map((group) => group.title)).toEqual([
			'Pre-discharge',
			'Securing',
			'Lifting Gear'
		]);
	});

	it('leaves every other panel alone', () => {
		const panel = oldPanel([groupOf('Hold 1')]);
		panel.key = 'discharge';
		panel.name = 'Discharge';
		expect(upgradeOperations(panel)).toBe(false);
		expect(panel.groups.map((group) => group.title)).toEqual(['Hold 1']);
	});
});

describe('a group switched off', () => {
	it('counts for nothing in its panel, and counts again once it is switched on', () => {
		const panel = oldPanel([{ ...groupOf('Preloading'), photos: [stored()] }, groupOf('Securing')]);
		// The panel's own title, then a title, a description and the photos of each group (#229).
		const look = new LookState();
		expect(metricsOf(panel, look)).toMatchObject({ done: 4, total: 7, percent: 57 });

		panel.groups[1].isEnabled = false;
		expect(metricsOf(panel, look)).toMatchObject({ done: 3, total: 4, percent: 75 });

		panel.groups[1].isEnabled = true;
		expect(metricsOf(panel, look)).toMatchObject({ done: 4, total: 7 });
	});
});

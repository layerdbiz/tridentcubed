import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { createProjectSchema } from './projects.schema';
import { createDefaultState, loadState } from './projects.state';
import type * as projectTypes from './projects.types';

const key = 'survey-report-test-project';

const schema = createProjectSchema({
	pages: [],
	panels: [
		{
			id: 'client',
			order: 1,
			visibility: null,
			icon: '',
			title: 'Client',
			type: null,
			description: '',
			required: false,
			readonly: false,
			enabled: true,
			draggable: false,
			notes: '',
			reference: [],
			photo: '',
			iconClass: '',
			iconUrl: ''
		}
	],
	inputs: [
		{
			id: 'client-name',
			visibility: null,
			panel: 'Client',
			label: 'Name',
			path: 'client.name',
			source: null,
			type: null,
			input: null,
			options: [],
			placeholder: '',
			value: '',
			editable: true,
			required: false,
			repeatable: false,
			validation: [],
			outputToPages: [],
			outputToPageSection: [],
			example: '',
			notes: '',
			reference: []
		}
	]
});

function createEditedState(): projectTypes.PersistedStateType {
	const state = createDefaultState(schema);
	const client = state.sections.find((section) => section.type === 'fields');
	if (!client || client.type !== 'fields') throw new Error('No fields section in the schema');
	client.fields['client.name'] = 'Acme Shipping';
	return { ...state, previewZoom: 0.6, hasUserZoomed: true };
}

function getClientName(state: projectTypes.PersistedStateType): unknown {
	const client = state.sections.find((section) => section.type === 'fields');
	return client?.type === 'fields' ? client.fields['client.name'] : undefined;
}

beforeEach(() => {
	const store = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (name: string) => store.get(name) ?? null,
		setItem: (name: string, value: string) => store.set(name, value),
		removeItem: (name: string) => store.delete(name)
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('loadState', () => {
	it('restores what the project page saved through persistJson', () => {
		// persistJson serializes the state, then its local adapter stringifies that text again
		localStorage.setItem(key, JSON.stringify(JSON.stringify(createEditedState())));

		const state = loadState(schema, key);
		expect(getClientName(state)).toBe('Acme Shipping');
		expect(state.previewZoom).toBe(0.6);
		expect(state.hasUserZoomed).toBe(true);
	});

	it('still reads state written once, as new and seeded projects are', () => {
		localStorage.setItem(key, JSON.stringify(createEditedState()));

		expect(getClientName(loadState(schema, key))).toBe('Acme Shipping');
	});

	it('falls back to the default state when nothing is saved', () => {
		expect(loadState(schema, key)).toEqual(createDefaultState(schema));
	});
});

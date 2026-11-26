// The menu's search (#345): what typing in the search pop-up finds. Names first: a project's title or a record's
// name, then what else it is known by.
import { describe, expect, it } from 'vite-plus/test';
import {
	type ClientType,
	draftOf,
	draftPanel,
	type FacilityType,
	type TransportType
} from './look.data';
import { LookState } from './look.state.svelte';
import { searchOf } from './search';

function addCustomer(look: LookState, name: string, city = '') {
	const draft = draftOf('customers') as ClientType;
	draft.name = name;
	draft.city = city;
	expect(look.add('customers', draft)).toBe(true);
}

function addTransport(look: LookState, name: string, mode = 'Vessel') {
	const draft = draftOf('transport') as TransportType;
	draft.name = name;
	draft.mode = mode;
	expect(look.add('transport', draft)).toBe(true);
}

function addFacility(look: LookState, name: string, city = 'Houston, TX') {
	const draft = draftOf('facilities') as FacilityType;
	draft.name = name;
	draft.kind = 'Port';
	draft.city = city;
	expect(look.add('facilities', draft)).toBe(true);
}

function names(look: LookState, query: string) {
	return searchOf(look, query).map((result) => `${result.page}: ${result.name}`);
}

describe('the menu’s search', () => {
	it('finds a customer by part of its name, whatever its capitals', () => {
		const look = new LookState();
		addCustomer(look, 'Oslo Caribbean Carrier');
		addCustomer(look, 'KOGA');

		expect(names(look, 'carib')).toEqual(['customers: Oslo Caribbean Carrier']);
	});

	it('looks in every page: names that start with it, then names with a word that does, then the rest', () => {
		const look = new LookState();
		addCustomer(look, 'Gulf Lines', 'Houston, TX');
		addTransport(look, 'Houston Express', 'Truck');
		addFacility(look, 'Port of Houston', 'Houston, TX');
		addFacility(look, 'Barbours Cut', 'Houston, TX');
		const draft = draftPanel(look.organization.name, '');
		draft.fields.find((field) => field.label === 'Title')!.value = 'Houston discharge';
		look.create(draft);

		expect(names(look, 'houston')).toEqual([
			'projects: Houston discharge',
			'transport: Houston Express',
			'facilities: Port of Houston',
			'customers: Gulf Lines',
			'facilities: Barbours Cut'
		]);
	});

	it('needs every word typed, never minds accents, and says what each thing is and where', () => {
		const look = new LookState();
		addCustomer(look, 'São Paulo Shipping', 'Santos');
		addCustomer(look, 'Paulo Freight', 'Lisbon');
		addTransport(look, 'Paulo Star', 'Barge');

		expect(searchOf(look, 'sao paulo')).toEqual([
			{ page: 'customers', name: 'São Paulo Shipping', note: 'Customer · Santos' }
		]);
		expect(searchOf(look, 'star')).toEqual([
			{ page: 'transport', name: 'Paulo Star', note: 'Transport Mode · Barge' }
		]);
	});

	it('finds nothing for nothing typed', () => {
		const look = new LookState();
		addCustomer(look, 'KOGA');

		expect(searchOf(look, '   ')).toEqual([]);
	});
});

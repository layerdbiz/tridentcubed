// The menu's search (#345): what the search pop-up lists. Before anything is typed, the things changed last; once
// something is, what it finds, in one group per page with names first. A place shows as its city and state only.
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
	type ClientType,
	draftOf,
	draftPanel,
	type FacilityType,
	type TransportType
} from './look.data';
import { LookState } from './look.state.svelte';
import { searchOf } from './search';

function addCustomer(look: LookState, name: string, city = '', kind = '') {
	const draft = draftOf('customers') as ClientType;
	draft.name = name;
	draft.city = city;
	draft.kind = kind;
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

function addProject(look: LookState, title: string, customer = '') {
	const draft = draftPanel(look.organization.name, '');
	draft.fields.find((field) => field.label === 'Title')!.value = title;
	draft.fields.find((field) => field.label === 'Customer')!.value = customer;
	look.create(draft);
}

// Each group as its title and the names in it, in order.
function groups(look: LookState, query: string) {
	return searchOf(look, query).map((group) => [group.title, ...group.rows.map((row) => row.name)]);
}

function rowOf(look: LookState, query: string, name: string) {
	const row = searchOf(look, query)
		.flatMap((group) => group.rows)
		.find((one) => one.name === name);
	return row && { line: row.line, side: row.side };
}

describe('the menu’s search, once something is typed', () => {
	it('finds a customer by part of its name, whatever its capitals', () => {
		const look = new LookState();
		addCustomer(look, 'Oslo Caribbean Carrier');
		addCustomer(look, 'KOGA');

		expect(groups(look, 'carib')).toEqual([['Customers', 'Oslo Caribbean Carrier']]);
	});

	it('puts what it finds in one group per page, names that start with it first, and leaves out a page with none', () => {
		const look = new LookState();
		addCustomer(look, 'Gulf Lines', 'Houston, TX');
		addTransport(look, 'Houston Express', 'Truck');
		addFacility(look, 'Barbours Cut', 'Houston, TX');
		addFacility(look, 'Port of Houston', 'Houston, TX');
		addProject(look, 'Houston discharge');

		expect(groups(look, 'houston')).toEqual([
			['Projects', 'Houston discharge'],
			['Customers', 'Gulf Lines'],
			['Transport Mode', 'Houston Express'],
			['Facilities', 'Port of Houston', 'Barbours Cut']
		]);
	});

	it('shows a company’s place as its city and state, never its street', () => {
		const look = new LookState();
		addCustomer(
			look,
			'Gulfway Freight',
			'14035 Industrial Road, Houston, TX 77015, United States of America',
			'Freight Forwarder'
		);

		expect(rowOf(look, 'gulf', 'Gulfway Freight')?.line).toBe('Freight Forwarder · Houston, TX');
	});

	it('says on the right a project’s status and how many projects a record is on', () => {
		const look = new LookState();
		addCustomer(look, 'KOGA', 'Houston, TX');
		addCustomer(look, 'Bluefin Logistics', 'Galveston, TX');
		addProject(look, 'Turbine rotor heavy lift', 'KOGA');

		expect(rowOf(look, 'turbine', 'Turbine rotor heavy lift')).toEqual({
			line: 'KOGA',
			side: 'Draft'
		});
		expect(rowOf(look, 'koga', 'KOGA')?.side).toBe('1 project');
		expect(rowOf(look, 'bluefin', 'Bluefin Logistics')?.side).toBe('');
	});

	it('needs every word typed and never minds accents', () => {
		const look = new LookState();
		addCustomer(look, 'São Paulo Shipping', 'Santos');
		addCustomer(look, 'Paulo Freight', 'Lisbon');
		addTransport(look, 'Paulo Star', 'Barge');

		expect(groups(look, 'sao paulo')).toEqual([['Customers', 'São Paulo Shipping']]);
		expect(rowOf(look, 'star', 'Paulo Star')?.line).toBe('Sea · Barge');
	});

	it('finds nothing for a word nothing holds', () => {
		const look = new LookState();
		addCustomer(look, 'KOGA');

		expect(searchOf(look, 'zebra')).toEqual([]);
	});
});

describe('the menu’s search, before anything is typed', () => {
	afterEach(() => vi.useRealTimers());

	it('lists the ten things changed last, then each page’s ten changed last, newest first, and leaves out an empty page', () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const look = new LookState();
		for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
			vi.setSystemTime(new Date(Date.UTC(2026, 10, number)));
			addCustomer(look, `Customer ${number}`);
		}
		vi.setSystemTime(new Date(Date.UTC(2026, 10, 20)));
		addFacility(look, 'Barbours Cut');

		expect(groups(look, '  ')).toEqual([
			['Recents', 'Barbours Cut', ...[12, 11, 10, 9, 8, 7, 6, 5, 4].map((n) => `Customer ${n}`)],
			['Customers', ...[12, 11, 10, 9, 8, 7, 6, 5, 4, 3].map((n) => `Customer ${n}`)],
			['Facilities', 'Barbours Cut']
		]);
	});
});

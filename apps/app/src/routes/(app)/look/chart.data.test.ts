// The map's markers (#355, Justin, 2026-11-26): a customer or a person with no picture shows the same letters as
// everywhere else, never a letter of its own or a page icon; a project its customer's logo or the project icon;
// transport modes and facilities their icons.
import { describe, expect, it } from 'vite-plus/test';
import { pinOfProject, pinOfRecord } from './chart.data';
import { PAGE_ICONS, registerCustomer, resetPeople, type ProjectType } from './look.data';
import { LookState } from './look.state.svelte';
import type { RecordType } from './records.data';
import type { TeamMemberType } from './team.data';

const TONE = { stroke: '', fill: '', text: '', bg: 'bg-sky-500' };

function record(page: RecordType['page'], key: string) {
	return { page, key, icon: PAGE_ICONS[page], tone: TONE, location: '' } as unknown as RecordType;
}

function member(name: string): TeamMemberType {
	const base = { rank: 0, title: '', label: '', phone: '', email: '', location: '', href: '' };
	return { ...base, name, role: 'team' };
}

function lettersOf(src = '') {
	return decodeURIComponent(src).match(/>([^<]+)<\/text>/)?.[1];
}

describe('pinOfRecord', () => {
	it('shows a customer with no logo as its code', () => {
		registerCustomer({
			name: 'Blue Water Shipping',
			kind: '',
			icon: '',
			logo: '',
			city: '',
			code: 'BWS'
		});

		expect(
			lettersOf(pinOfRecord(new LookState(), record('customers', 'Blue Water Shipping')).image)
		).toBe('BWS');
	});

	it('shows a team member with no photo as their two letters', () => {
		resetPeople([member('Ana Lopez')]);

		expect(lettersOf(pinOfRecord(new LookState(), record('team', 'Ana Lopez')).image)).toBe('AL');
	});

	it('keeps a transport mode and a facility as their icons', () => {
		const pin = pinOfRecord(new LookState(), record('transport', 'Happy Star'));

		expect(pin).toMatchObject({ image: undefined, icon: PAGE_ICONS.transport });
	});
});

describe('pinOfProject', () => {
	it('shows a project with no customer logo as the project icon, never a letter of its title', () => {
		const project = {
			id: 'p1',
			title: 'Sample: Transformer discharge',
			client: 'Blue Water Shipping',
			status: 'Draft',
			location: 'Houston, TX'
		} as unknown as ProjectType;

		expect(pinOfProject(project)).toMatchObject({ image: undefined, icon: PAGE_ICONS.projects });
	});
});

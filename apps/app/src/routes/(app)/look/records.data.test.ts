import { describe, expect, it } from 'vite-plus/test';
import { LookState } from './look.state.svelte';
import { customerOf, locationOf } from './records.data';

// Each test names a customer of its own: an edited customer is also kept in the pack every LookState reads.
describe('locationOf', () => {
	it("is the customer's own location, and follows an edit to it", () => {
		const look = new LookState();
		look.setCustomer('Gulf Projects', { city: 'Houston, TX' });

		expect(locationOf(customerOf(look, 'Gulf Projects'))).toBe('Houston, TX');

		look.setCustomer('Gulf Projects', { city: 'Katy, TX' });

		expect(locationOf(customerOf(look, 'Gulf Projects'))).toBe('Katy, TX');
	});

	it('is the address as typed when no location is picked', () => {
		const look = new LookState();
		look.setCustomer('Bay Forwarding', { city: '', address: '1 Main St, Houston, TX 77002' });

		expect(locationOf(customerOf(look, 'Bay Forwarding'))).toBe('1 Main St, Houston, TX 77002');
	});

	it('is nothing for a customer with neither, and for no customer at all', () => {
		const look = new LookState();
		look.setCustomer('Coast Cargo', { city: ' ' });

		expect(locationOf(customerOf(look, 'Coast Cargo'))).toBe('');
		expect(locationOf(customerOf(look, ''))).toBe('');
	});
});

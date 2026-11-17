// The place lookup (#184): the look prototype's rules (one call per new text, the day's cap, nothing without a key),
// now answering signed-in members only. Geoapify is played by a fake fetch; nothing leaves the process.
import { describe, expect, it } from 'vite-plus/test';
import { createPlaceLookup } from './places';

const MEMBER = { userId: crypto.randomUUID(), organizationId: crypto.randomUUID() };
const GUEST = { userId: crypto.randomUUID(), organizationId: null };

function createGeoapify() {
	const asked: string[] = [];
	const fetch = (async (input: RequestInfo | URL) => {
		asked.push(String(input));
		return Response.json({
			results: [
				{
					formatted: 'Paris, Île-de-France, France',
					city: 'Paris',
					country: 'France',
					country_code: 'fr',
					result_type: 'city',
					lat: 48.8566,
					lon: 2.3522
				},
				{
					formatted: 'Houston, TX, United States of America',
					city: 'Houston',
					state_code: 'TX',
					country_code: 'us',
					result_type: 'city',
					lat: 29.7604,
					lon: -95.3698
				}
			]
		});
	}) as typeof globalThis.fetch;
	return { asked, fetch };
}

describe('the place lookup', () => {
	it('answers a member with places named the way the location field shows them', async () => {
		const geoapify = createGeoapify();
		const lookUp = createPlaceLookup({ readKey: () => 'key', fetch: geoapify.fetch });

		const answer = await lookUp(MEMBER, 'Pari');

		expect(answer).toEqual({
			status: 200,
			from: 'geoapify',
			places: [
				{
					name: 'Paris, France',
					detail: 'Paris, Île-de-France, France',
					lat: 48.8566,
					lng: 2.3522
				},
				{
					name: 'Houston, TX',
					detail: 'Houston, TX, United States of America',
					lat: 29.7604,
					lng: -95.3698
				}
			]
		});
	});

	it('answers nobody who is signed out, and no Guest, and asks Geoapify nothing for them', async () => {
		const geoapify = createGeoapify();
		const lookUp = createPlaceLookup({ readKey: () => 'key', fetch: geoapify.fetch });

		const signedOut = await lookUp(undefined, 'Paris');
		const guest = await lookUp(GUEST, 'Paris');

		expect(signedOut).toMatchObject({ status: 401, places: [] });
		expect(guest).toMatchObject({ status: 403, places: [] });
		expect(geoapify.asked).toEqual([]);
	});

	it('asks once per text, whatever its capitals, and not for under three letters', async () => {
		const geoapify = createGeoapify();
		const lookUp = createPlaceLookup({ readKey: () => 'key', fetch: geoapify.fetch });

		await lookUp(MEMBER, 'Pa');
		await lookUp(MEMBER, 'Paris');
		const again = await lookUp(MEMBER, ' PARIS ');

		expect(geoapify.asked).toHaveLength(1);
		expect(again.from).toBe('memory');
	});

	it('stops at the day’s cap, and starts again the next day', async () => {
		const geoapify = createGeoapify();
		let today = '2026-11-12';
		const lookUp = createPlaceLookup({
			readKey: () => 'key',
			fetch: geoapify.fetch,
			dayLimit: 2,
			readDay: () => today
		});

		await lookUp(MEMBER, 'Paris');
		await lookUp(MEMBER, 'Houston');
		const capped = await lookUp(MEMBER, 'London');
		today = '2026-11-13';
		const tomorrow = await lookUp(MEMBER, 'London');

		expect(capped).toMatchObject({ places: [], from: 'limit' });
		expect(tomorrow.from).toBe('geoapify');
		expect(geoapify.asked).toHaveLength(3);
	});

	it('answers with nothing and asks nothing when there is no key', async () => {
		const geoapify = createGeoapify();
		const lookUp = createPlaceLookup({ readKey: () => '', fetch: geoapify.fetch });

		const answer = await lookUp(MEMBER, 'Paris');

		expect(answer).toEqual({ status: 200, places: [], from: 'no key' });
		expect(geoapify.asked).toEqual([]);
	});
});

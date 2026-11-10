// PROTOTYPE (#161) run 17: place suggestions for the location field (Justin, 2026-11-10). The phone asks this
// endpoint, and only this endpoint asks Geoapify, so the key never leaves the server and every call passes one gate:
// a text of 3 to 80 characters, an answer already given is given again from memory, and a day's calls stop short of
// the free plan's 3,000. The app calls it only after typing pauses and only when its own saved places do not already
// have the answer (place-field.svelte), so a place is looked up once and then kept. With no key (a deploy that has
// none yet) it answers with nothing and the saved places still work.
// V1: declare the key in Kit's env config and keep places in the database; this reads the process's own variable.
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

type GeoapifyType = {
	formatted?: string;
	city?: string;
	state_code?: string;
	country?: string;
	country_code?: string;
	result_type?: string;
	lat?: number;
	lon?: number;
};

const DAY_LIMIT = 2500;
const KEPT = 500;
const answers = new Map<string, unknown[]>();
let day = '';
let calls = 0;

function keyOf() {
	if (!process.env.GEOAPIFY_API_KEY) {
		// The dev server does not put .env.local into the process; Node reads it itself.
		try {
			process.loadEnvFile('.env.local');
		} catch {
			// No file: no key.
		}
	}
	return process.env.GEOAPIFY_API_KEY ?? '';
}

// "Houston, TX" for a city in the United States, "London, United Kingdom" for one abroad, else the full address.
function nameOf(place: GeoapifyType) {
	const isCity = ['city', 'postcode', 'county', 'state'].includes(place.result_type ?? '');
	if (!isCity || !place.city) return place.formatted ?? '';
	if (place.country_code === 'us' && place.state_code) return `${place.city}, ${place.state_code}`;
	return [place.city, place.country].filter(Boolean).join(', ');
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const text = (url.searchParams.get('text') ?? '').trim().toLowerCase();
	if (text.length < 3 || text.length > 80) return json({ places: [] });
	const kept = answers.get(text);
	if (kept) return json({ places: kept, from: 'memory' });

	const key = keyOf();
	const today = new Date().toISOString().slice(0, 10);
	if (today !== day) [day, calls] = [today, 0];
	if (!key || calls >= DAY_LIMIT) return json({ places: [], from: key ? 'limit' : 'no key' });

	calls += 1;
	const query = new URLSearchParams({ text, format: 'json', limit: '5', lang: 'en', apiKey: key });
	const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${query}`);
	if (!response.ok) return json({ places: [], from: 'error' });
	const body = (await response.json()) as { results?: GeoapifyType[] };
	const names = new Set<string>();
	const places = (body.results ?? [])
		.map((place) => ({
			name: nameOf(place),
			detail: place.formatted ?? '',
			lat: place.lat,
			lng: place.lon
		}))
		.filter((place) => {
			if (!place.name || place.lat === undefined || place.lng === undefined) return false;
			if (names.has(place.name)) return false;
			names.add(place.name);
			return true;
		});
	if (answers.size >= KEPT) answers.delete(answers.keys().next().value!);
	answers.set(text, places);
	return json({ places, from: 'geoapify' });
};

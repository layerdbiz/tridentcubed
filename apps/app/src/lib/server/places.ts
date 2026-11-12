// The place lookup (spec #179 "Export and places", #184), carried over from the look prototype (#161 run 17). The
// location field asks `/api/places`, and only this asks Geoapify, so the key never leaves the server. The rules: only a
// signed-in member of an organization is answered; a text of 3 to 80 characters, whatever its capitals, is looked up
// once and then answered from memory; a day's calls stop short of the free plan's 3,000. The field asks only after
// typing pauses and only when the saved places (rows) have no answer, and a picked place is saved for every member, so
// a place is looked up once. With no key (a deployment that has none yet) it answers with nothing, and saved places
// still work.
import type { ActorType } from './db/claims';

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

export type FoundPlaceType = { name: string; detail: string; lat: number; lng: number };

export type PlaceAnswerType = {
	status: 200 | 401 | 403;
	places: FoundPlaceType[];
	from?: 'memory' | 'geoapify' | 'limit' | 'no key' | 'error';
};

export type PlaceLookupOptionsType = {
	readKey: () => string;
	fetch: typeof globalThis.fetch;
	/** Calls a day; the free plan allows 3,000. */
	dayLimit?: number;
	/** Today, as YYYY-MM-DD. */
	readDay?: () => string;
};

const DAY_LIMIT = 2500;
const KEPT = 500;

// "Houston, TX" for a city in the United States, "London, United Kingdom" for one abroad, else the full address.
function nameOf(place: GeoapifyType) {
	const isCity = ['city', 'postcode', 'county', 'state'].includes(place.result_type ?? '');
	if (!isCity || !place.city) return place.formatted ?? '';
	if (place.country_code === 'us' && place.state_code) return `${place.city}, ${place.state_code}`;
	return [place.city, place.country].filter(Boolean).join(', ');
}

function toPlaces(results: GeoapifyType[]) {
	const names = new Set<string>();
	const places: FoundPlaceType[] = [];
	for (const result of results) {
		const name = nameOf(result);
		if (!name || result.lat === undefined || result.lon === undefined || names.has(name)) continue;
		names.add(name);
		places.push({ name, detail: result.formatted ?? '', lat: result.lat, lng: result.lon });
	}
	return places;
}

/** The lookup, with its memory and its day's count: one per server process. */
export function createPlaceLookup(options: PlaceLookupOptionsType) {
	const dayLimit = options.dayLimit ?? DAY_LIMIT;
	const readDay = options.readDay ?? (() => new Date().toISOString().slice(0, 10));
	const answers = new Map<string, FoundPlaceType[]>();
	let day = '';
	let calls = 0;

	return async function lookUp(
		actor: Pick<ActorType, 'organizationId'> | undefined,
		words: string
	): Promise<PlaceAnswerType> {
		if (!actor) return { status: 401, places: [] };
		if (!actor.organizationId) return { status: 403, places: [] };
		const text = words.trim().toLowerCase();
		if (text.length < 3 || text.length > 80) return { status: 200, places: [] };
		const kept = answers.get(text);
		if (kept) return { status: 200, places: kept, from: 'memory' };

		const key = options.readKey();
		if (!key) return { status: 200, places: [], from: 'no key' };
		const today = readDay();
		if (today !== day) [day, calls] = [today, 0];
		if (calls >= dayLimit) return { status: 200, places: [], from: 'limit' };

		calls += 1;
		const query = new URLSearchParams({
			text,
			format: 'json',
			limit: '5',
			lang: 'en',
			apiKey: key
		});
		const response = await options.fetch(
			`https://api.geoapify.com/v1/geocode/autocomplete?${query}`
		);
		if (!response.ok) return { status: 200, places: [], from: 'error' };
		const body = (await response.json()) as { results?: GeoapifyType[] };
		const places = toPlaces(body.results ?? []);
		if (answers.size >= KEPT) answers.delete(answers.keys().next().value!);
		answers.set(text, places);
		return { status: 200, places, from: 'geoapify' };
	};
}

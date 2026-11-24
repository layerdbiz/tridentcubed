// The place lookup (#298, glossary: Lookup): the places Geoapify finds for what is typed, asked through our server
// (/api/places, whose rules live in `#lib/server/places.ts`: signed-in members only, the day's cap). The library's
// Select takes it through its `lookup` prop, which pauses, waits for three letters and remembers each answer for the
// visit; any other field can take it the same way. The saved places are the Select's known choices, so they show at
// once and are never looked up.
import type { LookupType, SelectOptionType } from '@layerd/ui';
import type { PlaceType } from './map.data';

// Every place the server has found this visit, by name, so a pick can be saved with its coordinates.
const FOUND = new Map<string, PlaceType>();

export const PLACES: LookupType = {
	letters: 3,
	credit: { name: 'Geoapify', href: 'https://www.geoapify.com/' },
	async find(text, signal) {
		const response = await fetch(`/api/places?text=${encodeURIComponent(text)}`, { signal });
		const { places } = (await response.json()) as { places: PlaceType[] };
		for (const place of places) FOUND.set(place.name, place);
		return places.map(toFoundChoice);
	}
};

/** A place found by the server, with the line that places it. */
function toFoundChoice(place: PlaceType): SelectOptionType {
	return {
		value: place.name,
		label: place.name,
		note: place.detail,
		icon: 'icon-[mdi--map-marker-plus-outline]'
	};
}

/** A saved place, as a choice the location field offers at once. */
export function toSavedChoice(place: PlaceType): SelectOptionType {
	return { value: place.name, label: place.name, note: 'Saved', icon: 'icon-[mdi--map-marker]' };
}

/** The place the server found under this name this visit, if it did. */
export function foundPlace(name: string) {
	return FOUND.get(name);
}

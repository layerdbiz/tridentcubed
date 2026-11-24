// Where a record is, read from its one Location (#320). A record keeps the place exactly as it was picked or typed,
// street and all, so its pin sits on the real spot; every view shows only `cityStateOf` it, "Houston, TX", and only a
// facility's or a company's own record and its stop page print the whole address. A person's address shows nowhere.
// The parts come from the saved place when the text was picked (the lookup read them once, `place.parts`); text typed
// by hand is read by the library's address reader, which remembers each line. Either way a view only reads.
import { toAddressParts, toCityState, type AddressPartsType } from '@layerd/ui';
import { SvelteMap } from 'svelte/reactivity';
import type { PlaceType } from './map.data';

// The parts of every saved place that has them, by its name in lower case.
const KNOWN = new SvelteMap<string, AddressPartsType>();

function keyOf(text: string) {
	return text.trim().toLowerCase();
}

/** Remembers the parts of saved places, as they load or one is picked. */
export function knowPlaces(places: PlaceType[]) {
	for (const place of places) if (place.parts) KNOWN.set(keyOf(place.name), place.parts);
}

/** Every part of a location: the saved place's when it has them, else read from the text. */
export function partsOf(text: string): AddressPartsType {
	return KNOWN.get(keyOf(text)) ?? toAddressParts(text);
}

/** What every view shows of a location: "Houston, TX", or abroad "London, United Kingdom". Never the street. */
export function cityStateOf(text: string) {
	return toCityState(partsOf(text ?? ''));
}

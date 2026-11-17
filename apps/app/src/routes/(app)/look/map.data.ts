// PROTOTYPE (#161) run 13: where each city in the sample data is, as [longitude, latitude], for the real map
// (world-map.svelte, Justin 2026-11-07: "use a real map"). It took over from a drawn map of the United States, so
// places abroad (London, Cartagena) now show too. Since run 17 this is only the places the prototype starts with:
// the app keeps its own list (LookState.places, the "places table"), which grows each time a suggestion is picked
// in a location field, and the pins read that list. Since #184 the places are rows: the starting ones come from the
// seed (lib/start/places.ts) and a picked one is saved once for every member.

// A saved place: what a location field's text means on the map. `detail` is the full address the lookup gave. Its id
// is the saved row's (#184): worked out from its name, so it is the same on every device.
export type PlaceType = {
	id?: string;
	name: string;
	lat: number;
	lng: number;
	detail?: string;
	created?: string;
};

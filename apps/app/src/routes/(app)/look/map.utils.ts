// The map's arithmetic, apart from the map itself so it can be tested (world-map.svelte draws with it).
//
// Justin, 2026-11-16: no number stands in for several things in one place; every logo, face and icon always shows.
// Each thing sits on a ring round its place (about five kilometres out, so they come apart as the map zooms in),
// and zoomed out, where that ring is too small to tell them apart, each is pushed out to a ring measured in
// pixels (`leastRing`). The same day: how close the map looks follows the sheet under it (`pointsFor`).

type PlaceType = { lng: number; lat: number; items: unknown[] };

/** How far apart, in pixels, two neighbours on a ring sit: a little less than a marker, so they overlap but show. */
const NEIGHBOUR = 27;

/** The smallest ring, in pixels, that keeps `count` markers apart from their neighbours. */
export function leastRing(count: number) {
	return count < 2 ? 0 : NEIGHBOUR / (2 * Math.sin(Math.PI / count));
}

/** Where the thing numbered `index` of `count` sits on its ring: straight up first, then round. */
export function angleOf(index: number, count: number) {
	return (index / count) * Math.PI * 2 - Math.PI / 2;
}

function distance(a: PlaceType, b: PlaceType) {
	const x = (a.lng - b.lng) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
	return Math.hypot(x, a.lat - b.lat);
}

/** How close the map looks: 0 shows every place, 1 the part where most things are, 2 the busiest place. */
export type ClosenessType = 0 | 1 | 2;

/**
 * The places the map fits at each closeness. The sheet at its highest shows them all; lower, the busiest place and
 * its nearest neighbours, until they hold six in ten of everything (but never every place, so the map does move in);
 * lowest, the busiest place alone.
 */
export function placesFor<T extends PlaceType>(places: T[], closeness: ClosenessType): T[] {
	if (closeness === 0 || places.length < 2) return places;
	const busiest = places.reduce((most, place) =>
		place.items.length > most.items.length ? place : most
	);
	if (closeness === 2) return [busiest];
	const near = places.toSorted((a, b) => distance(a, busiest) - distance(b, busiest));
	const all = places.reduce((sum, place) => sum + place.items.length, 0);
	const kept: T[] = [];
	let held = 0;
	for (const place of near.slice(0, -1)) {
		kept.push(place);
		held += place.items.length;
		if (held >= all * 0.6) break;
	}
	return kept;
}

/** How far in the map may go at each closeness, from the closest it goes with every place on show. */
export function zoomFor(maxZoom: number, closeness: ClosenessType) {
	return maxZoom + [0, 0.75, 2][closeness];
}

// The map's arithmetic, apart from the map itself so it can be tested (world-map.svelte draws with it).
//
// Justin, 2026-11-16: no number stands in for several things in one place; every logo, face and icon always shows.
// Things that share a place are scattered round it, close together and in no pattern the eye picks out (a ring
// "doesn't really look very good"). The scatter is worked out from the things' own names, so it is the same every
// time the map is drawn, and a thing keeps its seat whatever order the list comes in.

export type SeatType = { x: number; y: number };

/** Where the sheet under the map rests: 0 its highest, 1 the middle, 2 its lowest. */
export type ClosenessType = 0 | 1 | 2;

/**
 * What the map does at each rest (Justin, 2026-11-16). It always fits every place into the part that shows, and
 * takes a step in at each rest down: `inset` is how much of that part it leaves empty on each side, so the higher
 * the sheet the further out the map stands; `zoom` moves how far in it may go when the places are close together.
 * The markers follow: half their size with the sheet up, their own size in the middle, a quarter bigger at the
 * bottom (`size`).
 */
export const RESTS = [
	{ size: 0.5, inset: 0.2, zoom: -1 },
	{ size: 1, inset: 0.08, zoom: 0 },
	{ size: 1.25, inset: 0, zoom: 0.75 }
] as const;

// A number from 0 up to 1 that a text always gives (FNV-1a).
function chanceOf(text: string) {
	let hash = 2166136261;
	for (const letter of text) {
		hash ^= letter.codePointAt(0) ?? 0;
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) / 4294967296;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * Where each thing sharing a place sits, in gaps from the place (`gapOf`): alone, on the place itself; several, on
 * the seats of a sunflower's seeds, which never crowd, each nudged a little off its seat and the whole turned by an
 * amount of its own, with the things dealt to the seats in the order their names happen to give.
 */
export function scatterOf(keys: string[]): SeatType[] {
	if (keys.length < 2) return keys.map(() => ({ x: 0, y: 0 }));
	const turn = chanceOf(keys.toSorted().join('|')) * Math.PI * 2;
	const order = keys
		.map((key, index) => ({ key, index, chance: chanceOf(key) }))
		.toSorted((a, b) => a.chance - b.chance || a.key.localeCompare(b.key));
	const seats: SeatType[] = [];
	for (const [seat, { key, index }] of order.entries()) {
		const far = Math.sqrt(seat + 0.5) + (chanceOf(`${key}~far`) - 0.5) * 0.3;
		const angle = seat * GOLDEN + turn + (chanceOf(`${key}~angle`) - 0.5) * 0.5;
		seats[index] = { x: Math.cos(angle) * far, y: Math.sin(angle) * far };
	}
	// The scatter sits evenly round its place.
	const middle = {
		x: seats.reduce((sum, seat) => sum + seat.x, 0) / seats.length,
		y: seats.reduce((sum, seat) => sum + seat.y, 0) / seats.length
	};
	return seats.map((seat) => ({ x: seat.x - middle.x, y: seat.y - middle.y }));
}

/** A gap in pixels at the scatter's tightest: neighbours overlap a little but each shows; a crowd sits closer. */
export function gapOf(count: number) {
	return Math.min(22, Math.max(15, 24 - count * 0.4));
}

/** How far, in pixels, a scatter of `count` reaches from its place at its tightest. */
export function reachOf(count: number) {
	return count < 2 ? 0 : (Math.sqrt(count) + 0.3) * gapOf(count);
}

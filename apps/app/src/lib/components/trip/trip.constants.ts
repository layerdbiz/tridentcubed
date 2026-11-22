// The trip strip's sizes and set lengths (trip.svelte, trip.utils.ts), as Justin settled them on the prototype's
// Stops look, 2026-11-22 (#273). Every number is in points, at full size, on the 595 wide page.
import type { TripPointType } from './trip.types';

export const TRIP_SIZES = {
	/** A Transport Mode's name. */
	vehicle: 5.25,
	/** A facility's circle, its border and its icon. */
	dot: 50,
	border: 2,
	icon: 25,
	/** A vehicle's icon on the line. */
	mode: 14,
	/** The line, and its arrowhead: how long it is, and how far inside it the line stops. */
	line: 1.5,
	arrow: 5,
	arrowStop: 2.5
};

/** Start blue, every stopping point between amber, End green. A facility that ends one leg and starts the next is
 * a Stop. */
export const TRIP_COLORS: Record<TripPointType, string> = {
	Start: '#2563eb',
	Stop: '#f59e0b',
	End: '#10b981'
};
export const TRIP_LINE_COLOR = '#cbd5e1';

// The band's lettering, and a capital's height in it.
const BAND_TEXT = 5.6 * 1.1 * 0.85;
const BAND_CAP = BAND_TEXT * 0.72;
// Padding on the band's outer side, the lift that keeps its letters clear of the border's edge, and how far it
// stands from the border: a touch less than nothing, so no hairline shows between the two.
const BAND_PAD = 2.2;
const BAND_FOOT = 0.6;
const BAND_GAP = -0.4;
const BAND_THICK = BAND_CAP + BAND_PAD + BAND_FOOT;
/**
 * The filled band outside a facility's circle, with its point's word in white: flush against the border, from
 * just above the far left up over the top left. `base` is where its lettering stands and `middle` the band's own
 * middle, both measured out from the circle's border; `out` is how far it reaches; `ends` the padding at each
 * square end; `from` where it starts, in degrees clockwise from the right; `most` the furthest round it may run.
 */
export const TRIP_BAND = {
	text: BAND_TEXT,
	thick: BAND_THICK,
	base: BAND_GAP + BAND_FOOT,
	middle: BAND_GAP + BAND_THICK / 2,
	out: BAND_GAP + BAND_THICK,
	ends: BAND_PAD * 1.15,
	from: 197,
	most: 136
};

/**
 * The lettering inside a facility's ring. `text` is its size before it is fitted, kept between `least` and `most`
 * of it; `cap` a capital's height and `spacing` the space after each letter, as shares of the size; `inset` its
 * space from the border; `clear` the clear space each side of a dividing line, in capitals' heights; `line` the
 * least a dividing line may be, and `alone` the most of the ring one legend alone may take, in degrees; `stroke`
 * a dividing line's thickness, in capitals' heights.
 */
export const TRIP_RING = {
	text: 4,
	least: 0.3,
	most: 1.4,
	cap: 0.72,
	spacing: 0.14,
	inset: 2,
	clear: 1.4,
	line: 17.5,
	alone: 180,
	stroke: 0.175
};

/** The size every trip starts at; one too wide for its room is scaled down from it. */
export const TRIP_START_SCALE = 1.25;
/** Clear paper between a line and a vehicle's icon. */
export const TRIP_CLEAR = 6;
/** Clear paper between a line and a facility: the line stops short of the band round it. */
export const TRIP_NODE_CLEAR = Math.max(9, TRIP_BAND.out + 1);
/** The paper cleared around a vehicle's icon. */
export const TRIP_PAD = TRIP_SIZES.mode + 2 * TRIP_CLEAR;
/** The line that shows either side of the longest vehicle name, and the least that shows beside a short one. */
export const TRIP_SPACE = 8;
export const TRIP_LINE = 14;
/** An outer line with no vehicle, from its far end to the facility's edge; and the piece beyond the vehicle when
 * one facility stands alone. */
export const TRIP_OUTER = 42;
export const TRIP_OUTER_LONE = 32;
/** How much of what shows of an outer piece fades. */
export const TRIP_FADE = 0.55;
/**
 * Beside one facility alone: how much of the plain line fades and how much of the vehicle's line does, as shares
 * of each line's own length, and how much longer the piece beyond an arriving vehicle is.
 */
export const TRIP_LONE = { plain: 1, vehicle: 0.5, longer: 1.5 };
/** The widest the strip prints on the report's page: 28 either side of it. */
export const TRIP_AVAIL = 539;
/** The space between a vehicle's icon and its name. */
export const TRIP_UNDER = 4;

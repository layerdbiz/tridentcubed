// The trip strip's own types (trip.svelte): what it is given, and what its layout (trip.utils.ts) says to draw.

/** Where a facility sits on the trip. */
export type TripPointType = 'Start' | 'Stop' | 'End';

/** A leg as the strip reads it: one Transport Mode and the facilities it calls at, in order. An icon is an icon
 * class, as the app writes them (`icon-[mdi--ferry]`). */
export type TripLegType = {
	transport: { name: string; icon: string };
	stops: { point: TripPointType | ''; facility: string; city: string; icon: string }[];
};

/** How the page draws the strip's text. Every answer is in points, at full size. */
export type TripMeasureType = {
	/** A vehicle's name under its icon: how wide and tall it prints. */
	vehicle: (text: string) => { width: number; height: number };
	/** Lettering inside a ring: how long it runs for each point of its size, with its letters opened out and no
	 * space after the last one. */
	ring: (text: string) => number;
	/** A point's word on its band, at the band's own size: how long it runs. */
	band: (text: string) => number;
};

export type TripNodeType = {
	/** A place that is not on the report: where a line comes in from or goes out to. */
	isGhost: boolean;
	name: string;
	city: string;
	icon: string;
	/** Its point; two when it ends one leg and starts the next. */
	points: TripPointType[];
	/** The point it is drawn as: a facility where two legs meet is a Stop. */
	point: TripPointType;
	/** The word on its band: its point, and a Stop's number when the trip has two or more Stops. */
	word: string;
};
export type TripSegType = {
	/** The node it leaves from; it runs to the next. */
	index: number;
	/** Its Transport Mode. */
	name: string;
	icon: string;
};
export type TripRunType = { nodes: TripNodeType[]; segs: TripSegType[] };

/** The lettering inside one facility's ring, like a coin's legends. Angles are degrees clockwise from the right;
 * lengths are in points. */
export type TripRingType = {
	/** The lettering's size, the same in every ring on the strip, and the circle its dividing lines follow. */
	size: number;
	middle: number;
	legends: {
		/** The name along the top, its letters' heads to the rim; the location along the bottom, the right way up. */
		where: 'top' | 'bottom';
		text: string;
		/** The circle its lettering stands on, how many degrees of it the lettering takes, and how far along its
		 * own line its middle stands, in degrees. */
		radius: number;
		length: number;
		along: number;
	}[];
	/** The lines between the legends: every one in a ring is the same length. */
	rules: { from: number; to: number }[];
};

/** The filled band outside a facility's circle that carries its point's word. */
export type TripBandType = {
	text: string;
	/** Its lettering's size: the band's own, or less for a word too long for the band's room. */
	size: number;
	/** Where the band starts and ends, in degrees clockwise from the right, its square ends included. */
	from: number;
	to: number;
};

export type TripRowNodeType = TripNodeType & {
	/** Half of what it takes on the line, and how far it reaches from its centre with its band. */
	half: number;
	out: number;
	/** What is written in and round its circle; a ghost has neither. */
	ring?: TripRingType;
	band?: TripBandType;
};
export type TripRowSegType = TripSegType & {
	/** An outer line with no vehicle: a piece of line and nothing on it. */
	isBare: boolean;
	/** How wide its vehicle's name is, and where its vehicle stands. */
	width: number;
	middle: number;
	/** Whether it fades at its far end, and how much of it does. */
	fade: 'in' | 'out' | '';
	fading: number;
	/** Whether it carries the trip's one arrowhead, and how far short of the line's end the head's point stands:
	 * nothing on a line's tip, the facility's clear paper on a line that arrives at one. */
	hasArrow: boolean;
	tip: number;
};
export type TripRowType = {
	nodes: TripRowNodeType[];
	segs: TripRowSegType[];
	/** Each node's centre, from the row's left edge. */
	x: number[];
	width: number;
	/** The clear distance between two facilities, edge to edge: the same for every line. */
	gap: number;
};

export type TripStripType =
	| { kind: 'none' }
	/** A row, and the size it prints at: its starting size, or less when it is too wide for its room. */
	| { kind: 'row'; row: TripRowType; scale: number };

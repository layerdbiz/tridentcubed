// PROTOTYPE (#161) run 26: a trip as legs (Justin, 2026-11-11). A leg is one transport mode (one vessel, one
// truck) and the facilities it calls at, in order: it always has a Start and an End, and may have Stops between.
// The transport is picked once for the leg, never again for each facility. A trip is one leg after another: the
// vessel from its Start to its End, then the truck that picks the cargo up where the vessel ended.
// The trip is still stored as the panel's flat list of stops, so the report, the map and the Page read it as
// before; each stop carries its leg's id, and its point (Start, Stop, End) is its place in its leg. Stops saved
// before legs have no id: a run of them on the same transport reads as one leg.
// These functions change the list they are given, which is the panel's own.
import type { PointType, StopType } from './look.data';

export type LegType = { id: string; stops: StopType[] };
export type RowType = { point: PointType; stop?: StopType };
type TransportPickType = Partial<Pick<StopType, 'type' | 'mode' | 'name'>>;

export function legsOf(stops: StopType[]) {
	const legs: LegType[] = [];
	for (const stop of stops) {
		const leg = legs.at(-1);
		const previous = leg?.stops.at(-1);
		const isSame =
			previous &&
			(stop.leg || previous.leg
				? stop.leg === previous.leg
				: stop.name === previous.name && stop.mode === previous.mode && stop.point !== 'Start');
		if (leg && isSame) leg.stops.push(stop);
		else legs.push({ id: stop.leg ?? `leg-${stop.id}`, stops: [stop] });
	}
	return legs;
}

function pointAt(index: number, count: number): PointType {
	return index === 0 ? 'Start' : index === count - 1 ? 'End' : 'Stop';
}

// A leg's rows: Start, any Stops, End. A leg with one stop still shows both ends; the missing one has no stop yet.
export function rowsOf(leg: LegType): RowType[] {
	if (leg.stops.length > 1)
		return leg.stops.map((stop, index) => ({ point: pointAt(index, leg.stops.length), stop }));
	const [only] = leg.stops;
	return only?.point === 'End'
		? [{ point: 'Start' }, { point: 'End', stop: only }]
		: [{ point: 'Start', stop: only }, { point: 'End' }];
}

// Every stop takes its leg's id, and its point from its place in the leg.
export function adopt(stops: StopType[]) {
	for (const leg of legsOf(stops)) {
		for (const [index, stop] of leg.stops.entries()) {
			stop.leg = leg.id;
			if (leg.stops.length > 1) stop.point = pointAt(index, leg.stops.length);
		}
	}
}

// The leg's transport, set once for every facility on it.
export function setTransport(stops: StopType[], legId: string, pick: TransportPickType) {
	adopt(stops);
	for (const stop of stops) if (stop.leg === legId) Object.assign(stop, pick);
}

// A new stop on a leg, at a facility: a Start goes first, an End last, a Stop just before the End.
export function addRow(
	stops: StopType[],
	legId: string,
	point: PointType,
	facility: string,
	create: () => StopType
) {
	adopt(stops);
	const own = stops.filter((stop) => stop.leg === legId);
	const [first, last] = [own[0], own.at(-1)];
	const stop = Object.assign(create(), {
		leg: legId,
		point,
		facility,
		type: first?.type ?? '',
		mode: first?.mode ?? '',
		name: first?.name ?? ''
	});
	const indexOf = (other: StopType) => stops.findIndex((item) => item.id === other.id);
	if (!first || !last) stops.push(stop);
	else if (point === 'Start') stops.splice(indexOf(first), 0, stop);
	else if (point === 'End' || own.length < 2) stops.splice(indexOf(last) + 1, 0, stop);
	else stops.splice(indexOf(last), 0, stop);
	adopt(stops);
	return stop.id;
}

export function removeStop(stops: StopType[], id: string) {
	adopt(stops);
	const index = stops.findIndex((stop) => stop.id === id);
	if (index >= 0) stops.splice(index, 1);
	adopt(stops);
}

// The next leg starts where the trip last ended (the truck picks up where the vessel put the cargo down), with
// an End still to pick.
export function addLeg(stops: StopType[], create: () => StopType) {
	adopt(stops);
	const start = create();
	const id = `leg-${start.id}`;
	const blank = { leg: id, type: '' as const, mode: '', name: '' };
	Object.assign(start, blank, { point: 'Start', facility: stops.at(-1)?.facility ?? '' });
	stops.push(start, Object.assign(create(), blank, { point: 'End', facility: '' }));
	return id;
}

export function removeLeg(stops: StopType[], legId: string) {
	adopt(stops);
	for (let index = stops.length - 1; index >= 0; index -= 1)
		if (stops[index].leg === legId) stops.splice(index, 1);
}

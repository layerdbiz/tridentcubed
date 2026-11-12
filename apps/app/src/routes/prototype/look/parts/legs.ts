// PROTOTYPE (#161) run 26: a trip as legs (Justin, 2026-11-11). A leg is one transport mode (one vessel, one
// truck) and the facilities it calls at, in order. The transport is picked once for the leg, never again for each
// facility. A trip is one leg after another: the vessel, then the truck that picks the cargo up where the vessel
// put it down.
// Run 28 (Justin, 2026-11-12): a leg starts with one facility, and each facility says which point of the leg it
// is, a Start, a Stop or an End, because the job does not always begin where the trip does: sometimes the
// organization is hired only for the End. More facilities are added one at a time.
// The trip is still stored as the panel's flat list of stops, so the report, the map and the Page read it as
// before; each stop carries its leg's id. Stops saved before legs have no id: a run of them on the same transport
// reads as one leg.
// These functions change the list they are given, which is the panel's own.
import type { StopType } from './look.data';

export type LegType = { id: string; stops: StopType[] };
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

// Every stop takes its leg's id, so the legs stay as they are however their stops change after.
export function adopt(stops: StopType[]) {
	for (const leg of legsOf(stops)) for (const stop of leg.stops) stop.leg = leg.id;
}

// The leg's transport, set once for every facility on it.
export function setTransport(stops: StopType[], legId: string, pick: TransportPickType) {
	adopt(stops);
	for (const stop of stops) if (stop.leg === legId) Object.assign(stop, pick);
}

// One more facility on a leg, still to pick. The second is the leg's End; any after that are Stops, which go in
// before the End.
export function addRow(stops: StopType[], legId: string, create: () => StopType) {
	adopt(stops);
	const own = stops.filter((stop) => stop.leg === legId);
	const [first, end] = [own[0], own.find((stop) => stop.point === 'End')];
	const stop = Object.assign(create(), {
		leg: legId,
		point: end ? 'Stop' : own.length ? 'End' : 'Start',
		facility: '',
		type: first?.type ?? '',
		mode: first?.mode ?? '',
		name: first?.name ?? ''
	});
	const indexOf = (other: StopType) => stops.findIndex((item) => item.id === other.id);
	if (end) stops.splice(indexOf(end), 0, stop);
	else if (own.length) stops.splice(indexOf(own.at(-1)!) + 1, 0, stop);
	else stops.push(stop);
	return stop.id;
}

export function removeStop(stops: StopType[], id: string) {
	adopt(stops);
	const index = stops.findIndex((stop) => stop.id === id);
	if (index >= 0) stops.splice(index, 1);
}

// The next leg has one facility to begin with: a Start where the trip last was (the truck picks up where the
// vessel put the cargo down).
export function addLeg(stops: StopType[], create: () => StopType) {
	adopt(stops);
	const start = create();
	const id = `leg-${start.id}`;
	stops.push(
		Object.assign(start, {
			leg: id,
			point: 'Start',
			facility: stops.at(-1)?.facility ?? '',
			type: '',
			mode: '',
			name: ''
		})
	);
	return id;
}

export function removeLeg(stops: StopType[], legId: string) {
	adopt(stops);
	for (let index = stops.length - 1; index >= 0; index -= 1)
		if (stops[index].leg === legId) stops.splice(index, 1);
}

import { describe, expect, it } from 'vite-plus/test';
import { addLeg, addRow, legsOf, removeLeg, removeStop, setTransport } from './legs';
import type { StopType } from './look.data';

let count = 0;

function stop(change: Partial<StopType> = {}): StopType {
	count += 1;
	return { id: `s${count}`, point: '', type: '', mode: '', name: '', facility: '', ...change };
}

function vessel(point: StopType['point'], facility: string) {
	return stop({ point, facility, type: 'Sea', mode: 'Vessel', name: 'MV Coral Dawn' });
}

describe('legsOf', () => {
	it('reads stops saved before legs as one leg per run on the same transport', () => {
		const stops = [
			vessel('Start', 'East Harbor'),
			vessel('End', 'West Harbor'),
			stop({ point: 'End', facility: 'Depot 4', type: 'Road', mode: 'Truck', name: 'Truck 12' })
		];

		const legs = legsOf(stops);

		expect(legs.map((leg) => leg.stops.map((item) => item.facility))).toEqual([
			['East Harbor', 'West Harbor'],
			['Depot 4']
		]);
	});
});

describe('changing a trip', () => {
	it('sets the transport once for every facility on the leg', () => {
		const stops = [vessel('Start', 'East Harbor'), vessel('End', 'West Harbor')];
		const [leg] = legsOf(stops);

		setTransport(stops, leg.id, { name: 'MV Blue Tern' });

		expect(stops.map((item) => item.name)).toEqual(['MV Blue Tern', 'MV Blue Tern']);
	});

	it('starts a leg with one facility, where the trip last was', () => {
		const stops = [vessel('Start', 'East Harbor'), vessel('End', 'West Harbor')];

		const id = addLeg(stops, stop);

		const legs = legsOf(stops);
		expect(legs).toHaveLength(2);
		expect(legs[1].id).toBe(id);
		expect(legs[1].stops.map((item) => [item.point, item.facility, item.name])).toEqual([
			['Start', 'West Harbor', '']
		]);
	});

	it('adds the End second, then Stops before the End, all on the leg’s transport', () => {
		const stops = [vessel('Start', 'East Harbor')];
		const [leg] = legsOf(stops);

		addRow(stops, leg.id, stop);
		addRow(stops, leg.id, stop);

		expect(stops.map((item) => [item.point, item.name])).toEqual([
			['Start', 'MV Coral Dawn'],
			['Stop', 'MV Coral Dawn'],
			['End', 'MV Coral Dawn']
		]);
	});

	it('leaves a point as it was picked, whatever is added after', () => {
		const stops = [vessel('End', 'West Harbor')];
		const [leg] = legsOf(stops);

		addRow(stops, leg.id, stop);

		expect(stops.map((item) => item.point)).toEqual(['Stop', 'End']);
	});

	it('keeps two new legs apart though neither has a transport yet', () => {
		const stops: StopType[] = [];

		addLeg(stops, stop);
		addLeg(stops, stop);

		expect(legsOf(stops)).toHaveLength(2);
	});

	it('removes a stop on the way, and a whole leg', () => {
		const stops = [
			vessel('Start', 'East Harbor'),
			vessel('Stop', 'Mid Anchorage'),
			vessel('End', 'West Harbor')
		];
		const truck = addLeg(stops, stop);

		removeStop(stops, stops[1].id);
		removeLeg(stops, truck);

		expect(stops.map((item) => [item.point, item.facility])).toEqual([
			['Start', 'East Harbor'],
			['End', 'West Harbor']
		]);
	});
});

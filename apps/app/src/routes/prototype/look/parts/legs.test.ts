import { describe, expect, it } from 'vite-plus/test';
import { addLeg, addRow, legsOf, removeLeg, removeStop, rowsOf, setTransport } from './legs';
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

	it('shows a Start and an End for a leg with one stop', () => {
		const [leg] = legsOf([vessel('Start', 'East Harbor')]);

		expect(rowsOf(leg).map((row) => [row.point, row.stop?.facility])).toEqual([
			['Start', 'East Harbor'],
			['End', undefined]
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

	it('puts a stop on the way between the Start and the End', () => {
		const stops = [vessel('Start', 'East Harbor'), vessel('End', 'West Harbor')];
		const [leg] = legsOf(stops);

		addRow(stops, leg.id, 'Stop', 'Mid Anchorage', stop);

		expect(stops.map((item) => [item.point, item.facility, item.name])).toEqual([
			['Start', 'East Harbor', 'MV Coral Dawn'],
			['Stop', 'Mid Anchorage', 'MV Coral Dawn'],
			['End', 'West Harbor', 'MV Coral Dawn']
		]);
	});

	it('starts the next leg where the trip last ended', () => {
		const stops = [vessel('Start', 'East Harbor'), vessel('End', 'West Harbor')];

		const id = addLeg(stops, stop);

		const legs = legsOf(stops);
		expect(legs).toHaveLength(2);
		expect(legs[1].id).toBe(id);
		expect(legs[1].stops.map((item) => [item.point, item.facility, item.name])).toEqual([
			['Start', 'West Harbor', ''],
			['End', '', '']
		]);
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

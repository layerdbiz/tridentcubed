// PROTOTYPE (#161): the dashboard chart's numbers. Until run 15 its history was made up, walked back from today's
// count. Since run 16 (Justin, 2026-11-10: no dummy data) each point is a real count: how many of the page's
// projects or records had been made by then, from their `created` stamps, so the right edge still matches the card
// and the list (run 12 note 13: one number everywhere). The pie's slices are the page's labels, the same as the
// board's columns (note 11).
import type { DatasetType } from './look.data';
import type { LookState } from './look.state.svelte';
import { PLACES } from './map.data';
import {
	columnsOf,
	countOf,
	customerOf,
	shownProjects,
	shownRecords,
	type ToneType
} from './records.data';

export type RangeType = '24h' | '7d' | '30d' | 'qtr' | '6m' | '1y' | '5y' | 'all';
export type ChartKindType = 'area' | 'bar' | 'pie' | 'map';

export const RANGES: { id: RangeType; label: string; long: string }[] = [
	{ id: '24h', label: '24H', long: 'in 24 hours' },
	{ id: '7d', label: '7D', long: 'this week' },
	{ id: '30d', label: '30D', long: 'in 30 days' },
	{ id: 'qtr', label: 'QTR', long: 'this quarter' },
	{ id: '6m', label: '6M', long: 'in 6 months' },
	{ id: '1y', label: '1Y', long: 'this year' },
	{ id: '5y', label: '5Y', long: 'in 5 years' },
	{ id: 'all', label: 'ALL', long: 'since day one' }
];

// The time range's menu names.
export const RANGE_NAMES: Record<RangeType, string> = {
	'24h': '24 hours',
	'7d': '7 days',
	'30d': '30 days',
	qtr: 'Quarter',
	'6m': '6 months',
	'1y': '1 year',
	'5y': '5 years',
	all: 'All time'
};

export const CHART_KINDS: { id: ChartKindType; label: string; icon: string }[] = [
	{ id: 'area', label: 'Area', icon: 'icon-[mdi--chart-areaspline]' },
	{ id: 'bar', label: 'Bars', icon: 'icon-[mdi--chart-bar]' },
	{ id: 'pie', label: 'Pie', icon: 'icon-[mdi--chart-pie]' },
	{ id: 'map', label: 'Map', icon: 'icon-[mdi--map-marker-radius]' }
];

// Each card opens on the chart that suits it (Justin's note 11). Projects opens on the map since run 14 (note 6).
export const DEFAULT_CHART: Record<DatasetType, ChartKindType> = {
	projects: 'map',
	customers: 'map',
	team: 'pie',
	transport: 'pie',
	facilities: 'map'
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type BucketType = { label: string; end: number };

// The points along a range, oldest first, the last one now: its label and the moment it counts up to.
function bucketsOf(range: RangeType): BucketType[] {
	const shape: Record<RangeType, [number, 'hour' | 'day' | 'week' | 'month' | 'quarter']> = {
		'24h': [24, 'hour'],
		'7d': [7, 'day'],
		'30d': [30, 'day'],
		qtr: [13, 'week'],
		'6m': [26, 'week'],
		'1y': [12, 'month'],
		'5y': [20, 'quarter'],
		all: [28, 'quarter']
	};
	const [count, unit] = shape[range];
	const now = new Date();
	const buckets: BucketType[] = [];
	for (let back = count - 1; back >= 0; back -= 1) {
		const date = new Date(now);
		if (unit === 'hour') date.setHours(date.getHours() - back);
		if (unit === 'day') date.setDate(date.getDate() - back);
		if (unit === 'week') date.setDate(date.getDate() - back * 7);
		if (unit === 'month') date.setMonth(date.getMonth() - back);
		if (unit === 'quarter') date.setMonth(date.getMonth() - back * 3);
		const day = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
		buckets.push({
			end: date.getTime(),
			label:
				unit === 'hour'
					? `${String(date.getHours()).padStart(2, '0')}:00`
					: unit === 'day'
						? day
						: unit === 'week'
							? `Week of ${date.getDate()} ${MONTHS[date.getMonth()]}`
							: unit === 'month'
								? `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
								: `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
		});
	}
	return buckets;
}

export type ChartDataType = { labels: string[]; values: number[] };

// How many there were at each point of the range: everything made by then (`created`, records.data.ts createdOf).
export function chartOf(created: string[], range: RangeType): ChartDataType {
	const buckets = bucketsOf(range);
	const times = created.map((stamp) => new Date(stamp).getTime());
	return {
		labels: buckets.map((bucket) => bucket.label),
		values: buckets.map((bucket) => times.filter((time) => time <= bucket.end).length)
	};
}

// The count at a point in time.
export function headlineAt(data: ChartDataType, index: number) {
	return Math.round(data.values[index] ?? 0);
}

export type SliceType = { name: string; value: number; tone: ToneType };

// Pie slices are today's counts, never shares (note 12), one per label, zero or not.
export function slicesOf(look: LookState, dataset: DatasetType): SliceType[] {
	return columnsOf(look, dataset).map((column) => ({
		name: column.label,
		value: countOf(look, dataset, column.label),
		tone: column.tone
	}));
}

export type PinType = { city: string; lng: number; lat: number; count: number; names: string[] };

// Pins for the map, one per city with how many are there; a city the map does not know gets none.
export function pinsAt(places: [city: string, name: string][]): PinType[] {
	const pins = new Map<string, PinType>();
	for (const [city, name] of places) {
		const point = PLACES[city];
		if (!point) continue;
		const pin = pins.get(city) ?? { city, lng: point[0], lat: point[1], count: 0, names: [] };
		pin.count += 1;
		pin.names.push(name);
		pins.set(city, pin);
	}
	return [...pins.values()].sort((a, b) => a.count - b.count);
}

// The dashboard map: where the customers' offices, the team, the facilities, the transports (where each was last) or
// the projects are.
export function pinsOf(look: LookState, dataset: DatasetType, filter: string) {
	return pinsAt(
		dataset === 'projects'
			? shownProjects(look, filter).map((project) => [project.location, project.title])
			: shownRecords(look, dataset, filter).map((record) => [
					dataset === 'customers' ? customerOf(look, record.key).city : record.location,
					record.key
				])
	);
}

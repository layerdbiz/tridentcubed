// PROTOTYPE (#161): made-up history for the dashboard chart. It walks back in time from today's real count, so the
// right edge of the chart always matches the card and the list (run 12 note 13: one number everywhere). Seeded, so
// every load looks the same. The pie's slices are the page's labels, the same as the board's columns (note 11).
import type { DatasetType } from './look.data';
import type { LookState } from './look.state.svelte';
import { CITIES } from './map.data';
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

// Each card opens on the chart that suits it (Justin's note 11).
export const DEFAULT_CHART: Record<DatasetType, ChartKindType> = {
	projects: 'area',
	customers: 'map',
	team: 'pie',
	transport: 'pie',
	facilities: 'map'
};

// The prototype's "now": the day the sample projects are dated.
const NOW = new Date(2026, 4, 12, 14, 0);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function labelsOf(range: RangeType) {
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
	const labels: string[] = [];
	for (let back = count - 1; back >= 0; back -= 1) {
		const date = new Date(NOW);
		if (unit === 'hour') date.setHours(date.getHours() - back);
		if (unit === 'day') date.setDate(date.getDate() - back);
		if (unit === 'week') date.setDate(date.getDate() - back * 7);
		if (unit === 'month') date.setMonth(date.getMonth() - back);
		if (unit === 'quarter') date.setMonth(date.getMonth() - back * 3);
		const day = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
		labels.push(
			unit === 'hour'
				? `${String(date.getHours()).padStart(2, '0')}:00`
				: unit === 'day'
					? day
					: unit === 'week'
						? `Week of ${date.getDate()} ${MONTHS[date.getMonth()]}`
						: unit === 'month'
							? `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
							: `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
		);
	}
	return labels;
}

function random(seed: string) {
	let hash = 2166136261;
	for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
	return () => {
		hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
		hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
		return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
	};
}

// Walk back from today's value; longer ranges move more per step and drift down (the business grew).
function walk(now: number, count: number, range: RangeType, seed: string) {
	const next = random(seed);
	const step = {
		'24h': 0.4,
		'7d': 0.8,
		'30d': 0.9,
		qtr: 1,
		'6m': 1.2,
		'1y': 1.4,
		'5y': 1.6,
		all: 1.8
	}[range];
	const values = [now];
	let value = now;
	// Going back in time the numbers shrink: the business has been growing, more over a longer range.
	const growth = {
		'24h': 0.04,
		'7d': 0.3,
		'30d': 0.45,
		qtr: 0.55,
		'6m': 0.65,
		'1y': 0.75,
		'5y': 0.9,
		all: 0.95
	}[range];
	const drift = (growth * Math.max(1, now)) / Math.max(1, count - 1);
	for (let index = 1; index < count; index += 1) {
		value = Math.max(0, value + (next() - 0.5) * step - drift);
		values.unshift(Math.round(value * 10) / 10);
	}
	return values;
}

export type ChartDataType = { labels: string[]; values: number[] };

export function chartOf(
	dataset: DatasetType,
	range: RangeType,
	now: number,
	filter: string
): ChartDataType {
	const labels = labelsOf(range);
	return { labels, values: walk(now, labels.length, range, `${dataset}-${range}-${filter}`) };
}

// The count at a point in time.
export function headlineAt(data: ChartDataType, index: number) {
	return Math.round(data.values[index] ?? 0);
}

// What changed over the time range, for the count cards.
export function changeOf(look: LookState, dataset: DatasetType) {
	const data = chartOf(dataset, look.range, countOf(look, dataset), 'All');
	return headlineAt(data, data.values.length - 1) - headlineAt(data, 0);
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

export type PinType = { city: string; x: number; y: number; count: number; names: string[] };

// Map pins: where the customers' offices, the team, the facilities, the transports (where each was last) or the
// projects are, one pin per city with its count. Places off the US map are counted apart.
export function pinsOf(look: LookState, dataset: DatasetType, filter: string) {
	const places: [string, string][] =
		dataset === 'projects'
			? shownProjects(look, filter).map((project) => [project.location, project.title])
			: shownRecords(look, dataset, filter).map((record) => [
					dataset === 'customers' ? customerOf(look, record.key).city : record.location,
					record.key
				]);
	const pins = new Map<string, PinType>();
	const away: string[] = [];
	for (const [city, name] of places) {
		if (!city) continue;
		const point = CITIES[city];
		if (!point) {
			away.push(city);
			continue;
		}
		const pin = pins.get(city) ?? { city, x: point[0], y: point[1], count: 0, names: [] };
		pin.count += 1;
		pin.names.push(name);
		pins.set(city, pin);
	}
	return { pins: [...pins.values()].sort((a, b) => a.count - b.count), away };
}

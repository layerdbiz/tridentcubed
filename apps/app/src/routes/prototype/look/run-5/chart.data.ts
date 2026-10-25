// PROTOTYPE (#161): made-up history for the dashboard chart. Each series walks back in time from today's real
// count, so the right edge of the chart always matches the list below it. Seeded, so every load looks the same.
import {
	CLIENTS,
	clientOf,
	type DatasetType,
	type FacilityType,
	type ProjectType,
	type StatusType,
	type TransportType
} from './look.data';
import { CITIES } from './map.data';
import { labelsOf as labelsOfMember, TEAM } from './team.data';

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

export const CHART_KINDS: { id: ChartKindType; label: string; icon: string }[] = [
	{ id: 'area', label: 'Area', icon: 'icon-[mdi--chart-areaspline]' },
	{ id: 'bar', label: 'Bars', icon: 'icon-[mdi--chart-bar]' },
	{ id: 'pie', label: 'Pie', icon: 'icon-[mdi--chart-pie]' },
	{ id: 'map', label: 'Map', icon: 'icon-[mdi--map-marker-radius]' }
];

// Each card opens on the chart that suits it (Justin's note 11).
export const DEFAULT_CHART: Record<DatasetType, ChartKindType> = {
	projects: 'area',
	clients: 'map',
	team: 'pie',
	transport: 'pie',
	facilities: 'map'
};

// The organization's lists, for the charts of the Transport and Facilities pages.
export type ListsType = { transports: TransportType[]; facilities: FacilityType[] };

// Full class strings so Tailwind finds them; `text` colours gradient stops through currentColor.
export type ToneType = { stroke: string; fill: string; text: string; bg: string };

function tone(name: string): ToneType {
	return TONES[name];
}

const TONES: Record<string, ToneType> = {
	slate: {
		stroke: 'stroke-slate-400',
		fill: 'fill-slate-400',
		text: 'text-slate-400',
		bg: 'bg-slate-400'
	},
	primary: {
		stroke: 'stroke-primary',
		fill: 'fill-primary',
		text: 'text-primary',
		bg: 'bg-primary'
	},
	warning: {
		stroke: 'stroke-warning',
		fill: 'fill-warning',
		text: 'text-warning',
		bg: 'bg-warning'
	},
	violet: {
		stroke: 'stroke-violet-500',
		fill: 'fill-violet-500',
		text: 'text-violet-500',
		bg: 'bg-violet-500'
	},
	danger: { stroke: 'stroke-danger', fill: 'fill-danger', text: 'text-danger', bg: 'bg-danger' },
	success: {
		stroke: 'stroke-success',
		fill: 'fill-success',
		text: 'text-success',
		bg: 'bg-success'
	},
	sky: { stroke: 'stroke-sky-500', fill: 'fill-sky-500', text: 'text-sky-500', bg: 'bg-sky-500' },
	teal: {
		stroke: 'stroke-teal-500',
		fill: 'fill-teal-500',
		text: 'text-teal-500',
		bg: 'bg-teal-500'
	},
	indigo: {
		stroke: 'stroke-indigo-500',
		fill: 'fill-indigo-500',
		text: 'text-indigo-500',
		bg: 'bg-indigo-500'
	},
	amber: {
		stroke: 'stroke-amber-500',
		fill: 'fill-amber-500',
		text: 'text-amber-500',
		bg: 'bg-amber-500'
	},
	green: {
		stroke: 'stroke-green-600',
		fill: 'fill-green-600',
		text: 'text-green-600',
		bg: 'bg-green-600'
	},
	rose: {
		stroke: 'stroke-rose-500',
		fill: 'fill-rose-500',
		text: 'text-rose-500',
		bg: 'bg-rose-500'
	}
};

const STATUS_TONE: Partial<Record<StatusType, string>> = {
	Draft: 'slate',
	'In Progress': 'primary',
	Review: 'warning',
	Sent: 'violet',
	Revision: 'danger',
	Complete: 'success'
};
const CLIENT_TONE = [
	'sky',
	'teal',
	'indigo',
	'amber',
	'green',
	'rose',
	'violet',
	'warning',
	'success',
	'slate'
];
const PALETTE = ['primary', 'sky', 'violet', 'amber', 'teal'];
// Stacked bottom to top, so In Progress draws the top line in the brand blue.
const OPEN: StatusType[] = ['Revision', 'Draft', 'Sent', 'Review', 'In Progress'];

export type SeriesType = { name: string; tone: ToneType; values: number[] };
export type ChartDataType = { labels: string[]; series: SeriesType[]; isCount: boolean };

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
	// Going back in time the numbers shrink a little: the business has been growing.
	const drift = (range === '5y' || range === 'all' ? 0.08 : 0.07) * Math.max(1, now);
	for (let index = 1; index < count; index += 1) {
		value = Math.max(0, value + (next() - 0.55) * 2 * step - drift);
		values.unshift(Math.round(value * 10) / 10);
	}
	return values;
}

export function chartOf(
	dataset: DatasetType,
	range: RangeType,
	projects: ProjectType[],
	filter: string
): ChartDataType {
	const labels = labelsOf(range);
	const live = projects.filter((project) => project.status !== 'Archived');
	let counts: [string, number, string][] = [];
	if (dataset === 'projects') {
		const statuses = filter === 'All' ? OPEN : ([filter] as StatusType[]);
		counts = statuses.map((status) => [
			status,
			live.filter((project) => project.status === status).length,
			STATUS_TONE[status] ?? 'slate'
		]);
	} else if (dataset === 'clients') {
		counts = CLIENTS.map((name, index) => [
			name,
			live.filter((project) => project.client === name).length,
			CLIENT_TONE[index]
		]);
	} else if (dataset === 'team') {
		const names = [...new Set(live.flatMap((project) => project.team))];
		counts = names.map((name) => [
			name,
			live.filter((project) => project.team.includes(name)).length,
			'primary'
		]);
	} else if (dataset === 'transport') {
		const names = [...new Set(live.flatMap((project) => project.transports))];
		counts = names.map((name) => [
			name,
			live.filter((project) => project.transports.includes(name)).length,
			'primary'
		]);
	} else {
		const names = [...new Set(live.map((project) => project.facility).filter(Boolean))];
		counts = names.map((name) => [
			name,
			live.filter((project) => project.facility === name).length,
			'primary'
		]);
	}
	if (dataset !== 'projects' && dataset !== 'clients')
		counts = counts
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([name, value], index) => [name, value, PALETTE[index]]);
	return {
		labels,
		isCount: dataset !== 'projects',
		series: counts.map(([name, value, toneName]) => ({
			name,
			tone: tone(toneName),
			values: walk(value, labels.length, range, `${dataset}-${range}-${name}`)
		}))
	};
}

// The big number above the chart at a point in time: projects add up; the other pages count who or what was busy.
export function headlineAt(data: ChartDataType, index: number) {
	const point = data.series.map((series) => series.values[index] ?? 0);
	return data.isCount
		? point.filter((value) => value >= 0.5).length
		: Math.round(point.reduce((sum, value) => sum + value, 0));
}

export type SliceType = { name: string; value: number; tone: ToneType };

// Pie slices are today's counts, never shares (note 12): projects by status, clients by their projects, the team by
// each person's first label, so everyone counts once, transport by type across the live projects, and facilities
// by kind.
const TYPE_TONE: Record<string, string> = {
	Sea: 'primary',
	Air: 'sky',
	Rail: 'amber',
	Road: 'teal',
	Port: 'primary',
	Airport: 'sky',
	'Rail yard': 'amber',
	Depot: 'teal'
};

export function slicesOf(
	dataset: DatasetType,
	projects: ProjectType[],
	filter: string,
	lists: ListsType
): SliceType[] {
	const live = projects.filter((project) => project.status !== 'Archived');
	let slices: [string, number, string][] = [];
	if (dataset === 'projects') {
		const statuses = filter === 'All' ? [...OPEN].reverse() : ([filter] as StatusType[]);
		slices = statuses.map((status) => [
			status,
			live.filter((project) => project.status === status).length,
			STATUS_TONE[status] ?? 'slate'
		]);
	} else if (dataset === 'clients') {
		slices = CLIENTS.map((name, index) => [
			name,
			live.filter((project) => project.client === name).length,
			CLIENT_TONE[index]
		]);
	} else if (dataset === 'transport') {
		const counts = new Map<string, number>();
		for (const name of live.flatMap((project) => project.transports)) {
			const type = lists.transports.find((transport) => transport.name === name)?.type ?? 'Sea';
			counts.set(type, (counts.get(type) ?? 0) + 1);
		}
		slices = ['Sea', 'Air', 'Rail', 'Road'].map((type) => [
			type,
			counts.get(type) ?? 0,
			TYPE_TONE[type]
		]);
	} else if (dataset === 'facilities') {
		slices = ['Port', 'Airport', 'Rail yard', 'Depot'].map((kind) => [
			kind,
			lists.facilities.filter((facility) => facility.kind === kind).length,
			TYPE_TONE[kind]
		]);
	} else {
		const counts = new Map<string, number>();
		for (const member of TEAM) {
			const label = labelsOfMember(member)[0] ?? 'Other';
			counts.set(label, (counts.get(label) ?? 0) + 1);
		}
		const sorted = [...counts].sort((a, b) => b[1] - a[1]);
		const top = sorted.slice(0, 4);
		const other = sorted.slice(4).reduce((sum, [, value]) => sum + value, 0);
		slices = [...top, ...(other ? [['Other', other] as [string, number]] : [])].map(
			([name, value], index) => [name, value, [...PALETTE, 'slate'][index]]
		);
	}
	return slices
		.filter(([, value]) => value > 0)
		.map(([name, value, toneName]) => ({ name, value, tone: tone(toneName) }));
}

export type PinType = { city: string; x: number; y: number; count: number; names: string[] };

// Map pins: where the clients' offices, the team, the facilities or the projects (and their transports) are, one pin
// per city with its count. Places off the US map are counted apart.
export function pinsOf(dataset: DatasetType, projects: ProjectType[], lists: ListsType) {
	const live = projects.filter((project) => project.status !== 'Archived');
	const places: [string, string][] =
		dataset === 'clients'
			? CLIENTS.map((name) => [clientOf(name).city, name])
			: dataset === 'team'
				? TEAM.map((member) => [member.location, member.name])
				: dataset === 'facilities'
					? lists.facilities.map((facility) => [facility.city, facility.name])
					: dataset === 'transport'
						? live.flatMap((project) =>
								project.transports.map((name): [string, string] => [project.location, name])
							)
						: live.map((project) => [project.location, project.title]);
	const pins = new Map<string, PinType>();
	const away: string[] = [];
	for (const [city, name] of places) {
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

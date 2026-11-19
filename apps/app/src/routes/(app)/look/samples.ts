// Sample fill for a project's panels (Justin, 2026-11-16: "I used to be able to add … a day … a bunch of photos … I
// still want to have that back the same way that it had it in the prototype"). It is for trying a report out
// quickly: a filled-in Time Log day and stand-in survey photos, each plainly a sample. Nothing here is a real
// record. The photos are the Website's own service pictures, which the app already serves (`/services/...`).
import type { PhotoType } from './look.data';

/** A working day on site, as a Time Log reads. */
export const SAMPLE_DAY: [time: string, activity: string][] = [
	['07:00', 'Arrived on site, safety briefing with the terminal'],
	['07:45', 'Hatches opened, cargo condition checked before work'],
	['09:30', 'Discharge started, first lift landed on the quay'],
	['12:00', 'Break, cargo secured'],
	['13:00', 'Discharge resumed'],
	['16:15', 'Last lift landed, tally agreed with the stevedores'],
	['17:00', 'Left site']
];

const SAMPLE_PHOTOS = [
	'cargo-surveys.webp',
	'vessel-condition-surveys.webp',
	'project-cargo.webp',
	'warehouse-surveys.webp',
	'stowage-planning.webp',
	'terminal-surveys.webp',
	'draft-surveys.webp',
	'bunker-surveys.webp',
	'lifting-arrangement.webp',
	'road-transport.webp',
	'rail-engineering.webp',
	'port-captain-supercargo.webp',
	'vessel-hold-cleaning.webp',
	'dunnage-removal.webp'
];

/** The day after the last dated day, or today when there is none: the date a sample day takes (`YYYY-MM-DD`). */
export function toSampleDate(last: string | undefined, today = new Date()) {
	const date = last ? new Date(`${last}T12:00`) : new Date(today);
	if (last) date.setDate(date.getDate() + 1);
	return date.toISOString().slice(0, 10);
}

/** A filled-in day for the Time Log, dated after the last day there is. */
export function toSampleDay(
	lastDate: string | undefined,
	createId: () => string,
	today = new Date()
) {
	return {
		id: createId(),
		date: toSampleDate(lastDate, today),
		entries: SAMPLE_DAY.map(([time, activity]) => ({ id: createId(), time, activity }))
	};
}

/** `count` stand-in photos for a photo group, going on through the pictures from how many it already has. */
export function toSamplePhotos(
	already: number,
	count: number,
	createId: () => string
): PhotoType[] {
	return Array.from({ length: count }, (_, index) => ({
		id: createId(),
		src: `/services/${SAMPLE_PHOTOS[(already + index) % SAMPLE_PHOTOS.length]}`,
		description: ''
	}));
}

/**
 * A made-up packing list for the Items panel (#242), as a spreadsheet hands it over: headings merged over L, W and
 * H, each measure once in inches and pounds and once in meters and kilos, a blank row and a totals row. No
 * customer's list is like it; it shows what a real one prints as.
 */
export const SAMPLE_LIST: string[][] = [
	[
		'Item',
		'DESCRIPTION',
		'QTY',
		'Dimensions (IN)',
		'',
		'',
		'U/Weight (LBS)',
		'Total Weight (LBS)',
		'Dimensions (M)',
		'',
		'',
		'Total Weight (Kgs)',
		'TTL CBM',
		'TTL MT',
		'RVTNS'
	],
	['', '', '', 'L', 'W', 'H', '', '', 'L', 'W', 'H', '', '', '', ''],
	// prettier-ignore
	['1', 'ROTARY DRILL RIG, MAIN UNIT (STATIC)', '1', '472', '204', '151', '138,600', '138,600', '11.99', '5.18', '3.84', '62,868', '238.26', '62.87', '238.26'],
	// prettier-ignore
	['2', 'DRILL TOWER / MAST', '1', '1,008', '88', '101', '57,400', '57,400', '25.60', '2.24', '2.57', '26,036', '146.81', '26.04', '146.81'],
	// prettier-ignore
	['3', 'OPERATOR CAB, CRATED', '1', '118', '96', '102', '6,850', '6,850', '3.00', '2.44', '2.59', '3,107', '18.93', '3.11', '18.93'],
	// prettier-ignore
	['4', 'DRILL PIPE RACK', '2', '366', '48', '40', '9,200', '18,400', '9.30', '1.22', '1.02', '8,346', '23.03', '8.35', '23.03'],
	// prettier-ignore
	['5', 'COUNTERWEIGHT SET', '4', '72', '48', '30', '11,000', '44,000', '1.83', '1.22', '0.76', '19,958', '6.80', '19.96', '19.96'],
	// prettier-ignore
	['6', 'SPARE PARTS CRATE', '3', '96', '48', '52', '2,150', '6,450', '2.44', '1.22', '1.32', '2,926', '11.78', '2.93', '11.78'],
	[],
	// prettier-ignore
	['', 'TOTALS', '12', '', '', '', '', '271,700', '', '', '', '123,241', '445.61', '123.24', '458.78']
];

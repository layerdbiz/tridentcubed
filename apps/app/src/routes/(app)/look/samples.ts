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

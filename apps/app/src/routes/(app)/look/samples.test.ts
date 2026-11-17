import { describe, expect, it } from 'vite-plus/test';
import { SAMPLE_DAY, toSampleDate, toSampleDay, toSamplePhotos } from './samples';

function counter() {
	let next = 0;
	return () => `id-${(next += 1)}`;
}

describe('a sample day for the Time Log', () => {
	it('is dated the day after the last dated day', () => {
		expect(toSampleDate('2026-11-16')).toBe('2026-11-17');
		expect(toSampleDate('2026-12-31')).toBe('2027-01-01');
	});

	it('is dated today when there is no day yet', () => {
		expect(toSampleDate(undefined, new Date('2026-11-16T15:00:00Z'))).toBe('2026-11-16');
	});

	it('holds a whole working day, every entry with a time, an activity and an id of its own', () => {
		const day = toSampleDay('2026-11-16', counter());

		expect(day.date).toBe('2026-11-17');
		expect(day.entries).toHaveLength(SAMPLE_DAY.length);
		expect(day.entries.every((entry) => entry.time && entry.activity)).toBe(true);
		expect(new Set([day.id, ...day.entries.map((entry) => entry.id)]).size).toBe(
			SAMPLE_DAY.length + 1
		);
	});
});

describe('sample photos for a photo group', () => {
	it('are pictures the app serves, with no description, each with an id of its own', () => {
		const photos = toSamplePhotos(0, 4, counter());

		expect(photos).toHaveLength(4);
		expect(photos.every((photo) => photo.src.startsWith('/services/'))).toBe(true);
		expect(photos.every((photo) => photo.description === '')).toBe(true);
		expect(new Set(photos.map((photo) => photo.id)).size).toBe(4);
	});

	it('go on through the pictures, so a second lot differs from the first', () => {
		const first = toSamplePhotos(0, 4, counter()).map((photo) => photo.src);
		const second = toSamplePhotos(4, 4, counter()).map((photo) => photo.src);

		expect(new Set([...first, ...second]).size).toBe(8);
	});
});

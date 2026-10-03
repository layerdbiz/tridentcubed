import { describe, expect, it } from 'vite-plus/test';

import {
	clamp,
	getOverallMetrics,
	getSectionMetrics,
	getSectionStatusLabel,
	nextId,
	slugify,
	syncIdCounterFromSections,
	toPercent
} from './projects.utils';
import type * as projectTypes from './projects.types';

const base = {
	title: 'Section',
	icon: '',
	open: true,
	locked: false,
	placement: 'middle'
} as const;

function createFields(fields: projectTypes.DetailsFieldsType): projectTypes.FieldSectionType {
	return { ...base, id: 'details-1', type: 'fields', enabled: true, section: 'details', fields };
}

function createTimeLog(days: projectTypes.TimeDayType[]): projectTypes.TimeLogSectionType {
	return { ...base, id: 'time-log-2', type: 'time-log', enabled: true, days };
}

describe('slugify', () => {
	it('turns a report title into a file-safe slug', () => {
		expect(slugify('  Pump Station #4 / Inspection  ')).toBe('pump-station-4-inspection');
	});

	it('falls back when nothing usable is left', () => {
		expect(slugify('***')).toBe('survey-report');
	});
});

describe('clamp and toPercent', () => {
	it('keeps values inside the range', () => {
		expect(clamp(140, 0, 100)).toBe(100);
		expect(clamp(-5, 0, 100)).toBe(0);
	});

	it('rounds and guards against an empty total', () => {
		expect(toPercent(1, 3)).toBe(33);
		expect(toPercent(5, 0)).toBe(0);
	});
});

describe('section metrics', () => {
	it('counts filled fields, treating a list as filled when any item is', () => {
		const metrics = getSectionMetrics(
			createFields({ client: 'Acme', site: ' ', crew: ['', 'Sam'] })
		);
		expect(metrics).toEqual({ done: 2, total: 3, percent: 67 });
		expect(getSectionStatusLabel(metrics)).toBe('IN PROGRESS');
	});

	it('counts a time log day and each entry time and text', () => {
		const metrics = getSectionMetrics(
			createTimeLog([
				{
					id: 'day-3',
					dateISO: '2026-10-03',
					entries: [{ id: 'entry-7', time: '08:00', text: '' }]
				}
			])
		);
		expect(metrics).toEqual({ done: 2, total: 3, percent: 67 });
	});

	it('leaves disabled sections out of the overall total', () => {
		const disabled = { ...createFields({ client: '' }), enabled: false };
		const overall = getOverallMetrics([createFields({ client: 'Acme' }), disabled]);
		expect(overall).toEqual({ done: 1, total: 1, percent: 100 });
		expect(getSectionStatusLabel(overall)).toBe('COMPLETE');
		expect(getSectionStatusLabel({ done: 0, total: 1, percent: 0 })).toBe('TO DO');
	});
});

describe('ids', () => {
	it('continues numbering after the highest id in saved sections', () => {
		syncIdCounterFromSections([
			createTimeLog([
				{ id: 'day-3', dateISO: '', entries: [{ id: 'entry-41', time: '', text: '' }] }
			])
		]);
		expect(nextId('photo')).toBe('photo-42');
	});
});

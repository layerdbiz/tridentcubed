// A report's link (#216): what a report page's QR code holds, and where in the app it opens.
import { describe, expect, it } from 'vite-plus/test';
import { toPageNumber, toReportAddress, toReportLink } from './report.utils';

const APP = 'https://dev.app.tridentcubed.com';
const PROJECT = '0b9f3c1e-6a52-4d1b-9c47-2f8e5a7d3b10';

describe('a report link', () => {
	it('is a short address of the app naming the project and the page', () => {
		expect(toReportLink(APP, PROJECT, 5)).toBe(`${APP}/report/${PROJECT}/5`);
	});

	it('stays short enough for a small printed code', () => {
		// 84 characters is what a 37 by 37 code holds at medium error correction.
		expect(toReportLink(APP, PROJECT, 120).length).toBeLessThanOrEqual(84);
	});

	it('opens the project’s Preview at the page asked for', () => {
		const address = new URL(toReportAddress(PROJECT, '5'), APP);
		expect(address.pathname).toBe('/');
		expect(Object.fromEntries(address.searchParams)).toEqual({
			screen: 'workspace',
			tab: 'preview',
			project: PROJECT,
			page: '5'
		});
	});

	it('opens the Preview from its first page when no page, or no real page, is asked for', () => {
		for (const page of [undefined, '', '0', '-2', 'abc', '2.5', '1e3'])
			expect(new URL(toReportAddress(PROJECT, page), APP).searchParams.has('page')).toBe(false);
	});

	it('reads a page number as a whole number from 1, and anything else as none', () => {
		expect(toPageNumber('1')).toBe(1);
		expect(toPageNumber('12')).toBe(12);
		expect(toPageNumber('0')).toBe(0);
		expect(toPageNumber('5x')).toBe(0);
		expect(toPageNumber(null)).toBe(0);
	});
});

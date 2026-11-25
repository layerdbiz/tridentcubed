import { describe, expect, it } from 'vite-plus/test';
import { toLengthLabel, toThumbnailSize, toThumbnailTime, toVideoLink } from './video.utils.js';

const ID = '3f2b8a1c-5d4e-4f6a-9b7c-1d2e3f4a5b6c';

describe('toVideoLink: where the app plays a stored video (#327)', () => {
	it('is the video page for a stored file', () => {
		expect(toVideoLink('https://dev.app.tridentcubed.com', `/files/${ID}`)).toBe(
			`https://dev.app.tridentcubed.com/video/${ID}`
		);
	});

	it.each([[''], ['blob:https://app/123'], ['/files/not-an-id'], [`/start/${ID}`]])(
		'is nothing for %j',
		(source) => {
			expect(toVideoLink('https://app', source)).toBe('');
		}
	);
});

describe('toLengthLabel: a video length as a clock reads it', () => {
	it.each([
		[7.4, '0:07'],
		[0.3, '0:01'],
		[65, '1:05'],
		[3723, '1:02:03']
	])('%d seconds read %s', (seconds, label) => {
		expect(toLengthLabel(seconds)).toBe(label);
	});

	it.each([[0], [undefined], [Number.NaN], [-3], [Number.POSITIVE_INFINITY]])(
		'is nothing for %j',
		(seconds) => {
			expect(toLengthLabel(seconds)).toBe('');
		}
	);
});

describe('toThumbnailTime and toThumbnailSize: the frame a thumbnail is made of', () => {
	it('is a second in, or a tenth of the way through a short video', () => {
		expect(toThumbnailTime(60)).toBe(1);
		expect(toThumbnailTime(4)).toBeCloseTo(0.4);
		expect(toThumbnailTime(0)).toBe(0);
		expect(toThumbnailTime(Number.NaN)).toBe(0);
	});

	it('fits the longest side in 1280 pixels, its shape kept, and never grows a small one', () => {
		expect(toThumbnailSize(3840, 2160)).toEqual({ width: 1280, height: 720 });
		expect(toThumbnailSize(1080, 1920)).toEqual({ width: 720, height: 1280 });
		expect(toThumbnailSize(640, 360)).toEqual({ width: 640, height: 360 });
	});
});

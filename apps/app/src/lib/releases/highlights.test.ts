// The release notes people on dev.app read are plain (Justin, 2026-11-28): written for someone who is not technical,
// each feature under a short title that names it, a few short points on what it does now. These checks hold the shape;
// the words themselves are apps/app/AGENTS.md's "A dev release is told in its highlights".
import { describe, expect, it } from 'vite-plus/test';
import { HIGHLIGHTS, type HighlightType } from './highlights';

const TITLE_WORDS = 5;
const POINTS = { least: 1, most: 3 };
const POINT_WORDS = 25;
// Words of the work behind the app, which people reading the notes need not know.
const DEVELOPER_WORDS =
	/\b(next\.app|dev\.app|commits?|components?|branch(es)?|deploy\w*|API|refactor\w*|database|prereleases?|bugs?)\b/i;

function toWords(text: string) {
	return text.split(/\s+/).filter(Boolean);
}

const items = Object.entries(HIGHLIGHTS).flatMap(([version, { features, fixes }]) =>
	[...features, ...fixes].map((item): [string, string, HighlightType] => [
		version,
		item.title,
		item
	])
);

describe('release notes', () => {
	it.each(items)('%s: "%s" names the feature in a few words', (_version, title) => {
		expect(toWords(title).length).toBeLessThanOrEqual(TITLE_WORDS);
		expect(title).not.toMatch(/^Your\b/i);
		expect(title).not.toMatch(DEVELOPER_WORDS);
	});

	it.each(items)(
		'%s: "%s" tells what it does in a few short points',
		(_version, _title, { points }) => {
			expect(points.length).toBeGreaterThanOrEqual(POINTS.least);
			expect(points.length).toBeLessThanOrEqual(POINTS.most);
			for (const point of points) {
				expect(toWords(point).length).toBeLessThanOrEqual(POINT_WORDS);
				expect(point).not.toMatch(DEVELOPER_WORDS);
			}
		}
	);
});

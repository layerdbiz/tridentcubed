import { describe, expect, it } from 'vite-plus/test';

import { inputs } from './inputs';
import { pages } from './pages';
import { panels } from './panels';

const panelIds = new Set<string>(panels.map((panel) => panel.id));
const pageIds = new Set<string>(pages.map((page) => page.id));
const inputIds = new Set<string>(inputs.map((input) => input.id));

function findDuplicates<T>(values: readonly T[]): T[] {
	const seen = new Set<T>();
	const duplicates = new Set<T>();
	for (const value of values) {
		if (seen.has(value)) duplicates.add(value);
		seen.add(value);
	}
	return [...duplicates];
}

describe('definitions', () => {
	it('names an existing panel on every input', () => {
		const offenders = inputs
			.filter((input) => !panelIds.has(input.panel))
			.map((input) => `${input.id} -> ${input.panel}`);
		expect(offenders).toEqual([]);
	});

	it('outputs every input to existing pages', () => {
		const offenders = inputs.flatMap((input) =>
			input.outputToPages
				.filter((pageId) => !pageIds.has(pageId))
				.map((pageId) => `${input.id} -> ${pageId}`)
		);
		expect(offenders).toEqual([]);
	});

	it('references existing inputs from inputs', () => {
		const offenders = inputs.flatMap((input) =>
			input.reference
				.filter((inputId) => !inputIds.has(inputId))
				.map((inputId) => `${input.id} -> ${inputId}`)
		);
		expect(offenders).toEqual([]);
	});

	it('references existing panels and pages from panels', () => {
		const offenders = panels.flatMap((panel) =>
			panel.reference
				.filter((id) => !panelIds.has(id) && !pageIds.has(id))
				.map((id) => `${panel.id} -> ${id}`)
		);
		expect(offenders).toEqual([]);
	});

	it('references existing pages from pages', () => {
		const offenders = pages
			.filter((page) => page.reference && !pageIds.has(page.reference))
			.map((page) => `${page.id} -> ${page.reference}`);
		expect(offenders).toEqual([]);
	});

	it('keeps ids unique per kind', () => {
		expect(findDuplicates(inputs.map((input) => input.id))).toEqual([]);
		expect(findDuplicates(panels.map((panel) => panel.id))).toEqual([]);
		expect(findDuplicates(pages.map((page) => page.id))).toEqual([]);
	});

	it('keeps order unique per kind', () => {
		expect(findDuplicates(panels.map((panel) => panel.order))).toEqual([]);
		expect(findDuplicates(pages.map((page) => page.order))).toEqual([]);
	});
});

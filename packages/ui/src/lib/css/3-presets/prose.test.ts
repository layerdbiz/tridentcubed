// ui.css loads the text styles (prose) into every app, so each of their rules must stay inside `.prose`. A few lost it
// once and set the padding of every table cell and the margins of every list in a list across the app (#371).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const css = readFileSync(join(import.meta.dirname, 'prose.css'), 'utf8');

// Every selector of every rule outside an at-rule such as `@theme`, split on the commas between selectors.
function toSelectors(text: string): string[] {
	const rules = text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*\}/g);
	const selectors: string[] = [];
	for (const [, list] of rules) {
		if (list.trim().startsWith('@')) continue;
		let depth = 0;
		let current = '';
		for (const character of list) {
			if (character === '(') depth++;
			if (character === ')') depth--;
			if (character === ',' && depth === 0) {
				selectors.push(current.trim());
				current = '';
			} else current += character;
		}
		selectors.push(current.trim());
	}
	return selectors;
}

describe('prose.css', () => {
	it('styles only what sits in .prose, never a bare table cell or list', () => {
		const selectors = toSelectors(css);

		expect(selectors).toContain(
			'.prose :where(tbody td, tfoot td):not(:where(.not-prose, .not-prose *))'
		);
		expect(selectors.filter((selector) => !selector.includes('.prose'))).toEqual([]);
	});
});

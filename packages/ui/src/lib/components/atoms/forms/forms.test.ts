// forms.css loads with the library's fields, so it must never reach any other fieldset on the page (an app's own
// fieldset round a form fell apart when the first library field joined it, #299).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const css = readFileSync(join(import.meta.dirname, 'forms.css'), 'utf8');

describe('forms.css', () => {
	it('styles only the library’s own fields, never a bare fieldset', () => {
		const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

		expect(rules).toMatch(/\bfieldset\.field\b/);
		expect(rules).not.toMatch(/\bfieldset\b(?!\.field\b)/);
	});
});

// The box's sizes come from the theme, each with the library's own as its fallback, so the app can match its screens
// (14px words in a 40px box) while the site keeps the library's.
describe('forms.css sizes', () => {
	const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

	it.each(['size', 'height', 'radius', 'pad', 'label', 'weight', 'color'])(
		'reads the theme’s --theme-field-%s, with a fallback',
		(token) => {
			expect(rules).toMatch(new RegExp(`var\\(--theme-field-${token},`));
		}
	);

	it('gives the compact box the same words, height, corners and colour', () => {
		expect(rules).toMatch(
			/:is\(fieldset\.field, input\.field-compact\)\s*{[^}]*font-size:\s*var\(--field-size\)/
		);
		const compact = rules.match(/input\.field-compact\s*{[^}]*}/)?.[0] ?? '';

		for (const size of [
			'(--input-height)',
			'(--field-radius)',
			'(--notch-indent)',
			'(color:--field-color)'
		])
			expect(compact).toContain(size);
	});
});

// A box with nothing in it is as tall as one with a value, its insides in the same place (Transport panel, #395):
// an outline round the whole fieldset drew the empty one taller, with a grey band above it.
describe('forms.css box', () => {
	const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

	it('draws every box with its border, never an outline', () => {
		expect(rules).not.toMatch(/outline-(?:1|2|base|info|\[)/);
	});

	it('lifts an empty box’s label onto the border while the box is in use (#395)', () => {
		const empty = rules.match(/fieldset\.field\.field-empty[^{]*legend\s*{/g) ?? [];

		expect(empty.length).toBeGreaterThan(0);
		for (const selector of empty) expect(selector).toMatch(/:not\(:focus-within[,)]/);
	});

	it('keeps the label’s row one height in every state, so the border sits at one place', () => {
		expect(rules).toMatch(/fieldset\.field legend\s*{[^}]*height:\s*var\(--legend-line\)/);
	});

	it('sizes the label’s words inside it, so its spacing is measured in the box’s own size', () => {
		const legend = rules.match(/fieldset\.field legend\s*{[^}]*}/)?.[0] ?? '';

		expect(legend).not.toMatch(/font-size/);
		expect(rules).toMatch(
			/fieldset\.field legend > \*\s*{[^}]*font-size:\s*calc\(var\(--legend-ratio\) \* 1em\)/
		);
	});
});

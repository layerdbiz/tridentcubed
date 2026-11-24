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

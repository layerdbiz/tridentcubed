// The dev server loads every library component's styles, so an Accordion rule on the page's root switched on height
// animation for the whole app there, and nowhere live (#371). It stays on the Accordion itself.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const source = readFileSync(join(import.meta.dirname, 'accordion.svelte'), 'utf8');
const style = source.slice(source.indexOf('<style'));

describe('Accordion styles', () => {
	it('animates its own height only, never the whole page’s', () => {
		expect(style).toMatch(/\.accordion\s*\{\s*interpolate-size:\s*allow-keywords;/);
		expect(style).not.toMatch(/:root|\bhtml\b|\bbody\b/);
	});
});

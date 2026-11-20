import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';
import postcss, { type AcceptedPlugin, type AtRule, type Container, type Rule } from 'postcss';
import { describe, expect, it } from 'vite-plus/test';
import viteConfig from '../vite.config';

// The lag on every tap, swipe and Preview drag (#251). The colour pairs are written with `light-dark()`, and each
// app's PostCSS gives browsers without it a stand-in. For the pairs, which are variables, that stand-in is one rule
// that matches every element and sets every pair on it again: 1,012 variables an element in the built app. Applied
// to every browser, the style work of one swipe took a second on a fast computer and froze a phone for longer.
// So the rule stays behind "only where `light-dark()` is missing", and every other browser gets the real function.
const configs = import.meta.glob<{ default: { plugins: AcceptedPlugin[] } }>(
	'../../*/postcss.config.js',
	{ eager: true }
);

/** Each app's folder name and its PostCSS plugins. */
const apps = Object.entries(configs).map(
	([path, config]) =>
		[
			fileURLToPath(new URL(path, import.meta.url))
				.split('/')
				.at(-2) as string,
			config.default.plugins
		] as const
);

const PAIRS = ':root { --pair: light-dark(white, black); } .card { color: var(--pair); }';

/** The "only where `light-dark()` is missing" block a rule sits in, if it sits in one. */
function guardOf(rule: Rule) {
	let parent: Container | undefined = rule.parent as Container | undefined;
	while (parent) {
		if (parent.type === 'atrule') {
			const block = parent as AtRule;
			if (block.name === 'supports' && /^not\s*\(color:\s*light-dark\(/.test(block.params)) {
				return block;
			}
		}
		parent = parent.parent as Container | undefined;
	}
	return undefined;
}

async function toBuilt(plugins: AcceptedPlugin[]) {
	return postcss(plugins).process(PAIRS, { from: undefined });
}

describe("the stand-in for light-dark() in every app's styles", () => {
	it('finds the apps', () => {
		expect(apps.map(([name]) => name).toSorted()).toEqual(['app', 'overview', 'play', 'site']);
	});

	it.each(apps)(
		'%s keeps the every-element rule to browsers without light-dark()',
		async (_, plugins) => {
			const built = await toBuilt(plugins);
			const everyElement: Rule[] = [];
			built.root.walkRules((rule) => {
				if (rule.selector.trim().endsWith('*')) everyElement.push(rule);
			});

			expect(everyElement.length).toBeGreaterThan(0);
			for (const rule of everyElement) expect(guardOf(rule), rule.selector).toBeDefined();
		}
	);

	it.each(apps)(
		'%s keeps the real light-dark() for the browsers that have it',
		async (_, plugins) => {
			const built = await toBuilt(plugins);

			expect(built.css).toMatch(/@supports\s*\(color:\s*light-dark\(/);
			expect(built.css).toContain('--pair: light-dark(white, black)');
		}
	);
});

describe('the minifier every app is built with', () => {
	// Vite minifies with Lightning CSS, for browsers as old as its default target. Left to itself it rewrites the real
	// `light-dark()` into a second stand-in, worked out once at the top of the page, so a section with its own colour
	// scheme (the website's dark footer) would keep the page's colours.
	it('leaves the real light-dark() as it is', async () => {
		const config = viteConfig({ command: 'build', mode: 'production' });
		const built = await toBuilt(apps[0][1]);

		const { code } = transform({
			filename: 'pairs.css',
			code: new TextEncoder().encode(built.css),
			minify: true,
			// Safari 16.4, older than `light-dark()`.
			targets: { safari: (16 << 16) | (4 << 8) },
			...config.css?.lightningcss
		});
		const minified = new TextDecoder().decode(code);

		expect(minified).toContain('light-dark(#fff,#000)');
		expect(minified).not.toContain('--lightningcss-light');
	});
});

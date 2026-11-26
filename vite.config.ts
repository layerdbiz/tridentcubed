import { defineConfig } from 'vite-plus';

// Generated or frozen files that the formatter and linter must leave byte-stable
// (packages/tools/README.md, invariants 1 to 3). The tsconfig bases in packages/config/ts are
// frozen per #12 (invariant 12).
const generated = [
	'packages/tools/**',
	'packages/config/ts/**',
	'apps/*/src/lib/index.ts',
	'apps/app/src/lib/releases/releases.json',
	'packages/ui/src/lib/index.ts',
	'packages/ui/src/lib/base/index.ts',
	'packages/ui/src/lib/base/helpers/index.ts',
	'packages/ui/src/lib/components/index.ts',
	'packages/ui/src/lib/utils/index.ts'
];

// Not code, or owned elsewhere: docs, synced agent skills, archived sources, static assets,
// and vnow's own config files
const outOfScope = [
	'**/*.md',
	'**/vnow.json',
	'.agents/**',
	'.claude/**',
	'.archive/**',
	'docs/**',
	'packages/ui/static/**',
	'pnpm-lock.yaml',
	'prototypes/**'
];

export default defineConfig({
	// Before every commit, `vp staged` formats and lints the staged files (.vite-hooks/pre-commit, #370).
	// Every lint rule here but one is a warning, so warnings stop the commit, or nothing would: the
	// repo has none. The last flag lets a commit of only ignored or unlintable files (a barrel, a YAML
	// file) pass; the ignore patterns below still decide what is checked.
	staged: {
		'*.{js,mjs,cjs,ts,svelte,css,json,yml,yaml}':
			'vp check --fix --deny-warnings --no-error-on-unmatched-pattern',
		// The look check (Justin, 2026-11-26): a library component off the base component, or naming palette
		// colours, stops the commit (packages/tools/src/checks/look.ts, CODING_STANDARDS.md).
		'packages/ui/src/lib/components/**/*.svelte': 'node packages/tools/bin/look.js'
	},
	// The root's half of `pnpm dev`: the barrels watcher, run beside each app's dev server under
	// `vp run --parallel` (packages/tools, the workspace launcher; invariant 5). The apps' tasks
	// come from `createAppConfig`.
	run: {
		tasks: { 'workspace:dev': { command: 'pnpm barrels:watch', cache: false } }
	},
	fmt: {
		useTabs: true,
		singleQuote: true,
		trailingComma: 'none',
		printWidth: 100,
		singleAttributePerLine: true,
		sortPackageJson: false,
		svelte: true,
		ignorePatterns: [...generated, ...outOfScope],
		// Sort Tailwind classes against the UI source stylesheet, not each app's app.css: that
		// imports the compiled `@layerd/ui/ui.css` (packages/ui/dist), which exists only after a
		// build and has its `@theme` palette flattened, so the sorter misorders `text-primary-50` (#129)
		overrides: [
			{
				files: ['apps/*/**', 'packages/ui/**'],
				options: { sortTailwindcss: { stylesheet: './packages/ui/src/lib/ui.css' } }
			}
		]
	},
	lint: {
		jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
		rules: {
			'vite-plus/prefer-vite-plus-imports': 'error',
			// Destructuring a prop out before a rest spread is how components drop it
			'no-unused-vars': [
				'warn',
				{ ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			// String() on unknown runtime values (storage, form and Sheetari data) is deliberate
			'typescript/no-base-to-string': 'off',
			// Unions like 'html' | 'body' | string keep editor autocomplete for the known values
			'typescript/no-redundant-type-constituents': 'off',
			// Caught errors are interpolated into log messages on purpose
			'typescript/restrict-template-expressions': 'off'
		},
		ignorePatterns: [...generated, ...outOfScope],
		// Type-aware rules only. tsgolint cannot read types exported from .svelte files,
		// so svelte-check stays the type checker (#12).
		options: { typeAware: true, typeCheck: false }
	}
});

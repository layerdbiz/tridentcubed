import { defineConfig } from 'vite-plus';

// Generated or frozen files that the formatter and linter must leave byte-stable
// (packages/tools/README.md, invariants 1 to 3). The reference configs in packages/config are
// frozen per #12.
const generated = [
	'packages/tools/**',
	'packages/config/**',
	'apps/*/src/lib/index.ts',
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
	'.todo/**',
	'docs/**',
	'packages/ui/static/**',
	'pnpm-lock.yaml',
	'skills-lock.json'
];

export default defineConfig({
	fmt: {
		useTabs: true,
		singleQuote: true,
		trailingComma: 'none',
		printWidth: 100,
		singleAttributePerLine: true,
		sortPackageJson: false,
		svelte: true,
		ignorePatterns: [...generated, ...outOfScope],
		// Sort Tailwind classes against each package's own stylesheet
		overrides: [
			...['app', 'play', 'report', 'site'].map((app) => ({
				files: [`apps/${app}/**`],
				options: { sortTailwindcss: { stylesheet: `./apps/${app}/src/app.css` } }
			})),
			{
				files: ['packages/ui/**'],
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

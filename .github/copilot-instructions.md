# Template Monorepo Conductor

This file is the universal conductor for the repo.
Keep it lean and repo-wide only.
Path-specific rules live in `.github/instructions/*.instructions.md`.

## Repo Shape

- This repo is a monorepo using pnpm workspaces and Turborepo.
- Apps: `apps/app`, `apps/play`, `apps/report`, `apps/site`, `apps/storybook`.
- Packages: `packages/config`, `packages/tools`, `packages/ui`.

## Universal Workflow

- Always work from the repo root. Never `cd` into app or package folders.
- Ask permission before running any terminal command.
- Assume the development server is already running unless the user says otherwise.
- During development, prefer ` pnpm dev` over manual build or generation commands.
- Do not run ` pnpm build`, ` pnpm turbo build`, ` pnpm barrels`, ` pnpm stories`, ` pnpm site`, or ` pnpm sb` unless the user explicitly asks.
- When package installation is required, use root-level ` pnpm --filter <package-name> add <dependency>`.
- When terminal commands are explicitly approved, keep the leading space prefix in repo commands.

## Universal Coding Rules

- DRY-extend-never-delete: never remove working logic, loggers, or helpers; only add, refactor, or replace when trust breaks.
- Atomic: each function does one job; build flows from atoms; reuse helpers.
- Flexible APIs: matcher, transformer, and check APIs accept String, RegExp, or Function and receive `(value, pos)`.
- Loops and style: use `for...of` only; no `forEach` or `for (i = ...)`; use dot notation.
- In Svelte markup attributes, do not use JavaScript template literals for class or attribute composition. Prefer Svelte interpolation inside quoted attributes, for example `class="panel {(props.class ?? '').trim()}"`.
- For shared `@layerd/ui` base layout work, keep `rails` as the container switch, keep `rail` placement-only, normalize old long rail names back to the short canonical names, use `content` as the default middle rail, use `gutter-*` as the reusable full-width-minus-spacing family, and use `inset` as a modifier rather than a canonical rail family.
- Naming: camelCase public, snake_case private, kebab-case CSS; booleans use `is` or `has`; converters use `toX`.
- Reuse before write: scan prior summaries, extend utilities, and ask if unsure.
- Output hygiene: keep answers lean, readable, modular, and emit only needed code.
- Tool awareness: align with Svelte 5, SvelteKit 2, Tailwind 4, Vite 5, Node 20, and Deno; no jQuery.
- Security and performance: validate inputs, avoid eval, and use async/await.
- Accessibility: include ARIA and WCAG considerations; ensure contrast and keyboard flow.
- Prefer the latest practical baseline-native web APIs with the smallest footprint, ideally HTML and CSS first with minimal JavaScript. Only include older fallbacks if explicitly requested.

## Repo-wide Testing Policy

- The user handles testing, validation, and examples.
- Do not create test components, test files, demo files, or example files unless explicitly requested.
- Do not modify components for testing purposes.
- Do not run tests or validation commands unless the user explicitly asks.

## Instruction Routing

- Use `.github/instructions/apps.app.instructions.md` for report-generator app architecture and data-system rules.
- Use `.github/instructions/apps.storybook.instructions.md` for Storybook-specific generation and story structure rules.
- Use `.github/instructions/apps.instructions.md` for generic app-scope greeting rules outside `apps/app` and `apps/storybook`.
- Use `.github/instructions/packages.ui.instructions.md` for UI package source rules.
- Use `.github/instructions/packages.ui.generated.instructions.md` for generated barrel rules.
- Use `.github/instructions/packages.instructions.md` for non-UI package greeting rules.
- Use `.github/instructions/workspace.package-json.instructions.md` for package manifest rules.
- Use `.github/instructions/workspace.tooling.instructions.md` for shared config rules.
- Use `.github/instructions/turbo.instructions.md` for `turbo.json` watch and dependency rules.
- Use `.github/instructions/rules.instructions.md` only when restructuring or reviewing Copilot customization files and preserved review-only rules.

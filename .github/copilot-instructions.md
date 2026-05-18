# Template Monorepo Conductor

This file is the universal conductor for the repo.
Keep it lean and repo-wide only.
Path-specific rules live in `.github/instructions/*.instructions.md`.

## Repo Shape

- This repo is a monorepo using pnpm workspaces and Turborepo.
- Apps: `apps/app`, `apps/play`, `apps/report`, `apps/site`, `apps/storybook`.
- Additional standard apps may be added under `apps/*`; workspace tooling discovers apps dynamically from each app's `package.json`.
- Packages: `packages/config`, `packages/tools`, `packages/ui`.

## Universal Workflow

- Always work from the repo root. Never `cd` into app or package folders.
- Ask permission before running any terminal command.
- Assume the development server is already running unless the user says otherwise.
- During development, prefer ` pnpm dev` over manual build or generation commands.
- Do not run ` pnpm build`, ` pnpm turbo build`, ` pnpm barrels`, or ` pnpm stories` unless the user explicitly asks.
- Root `pnpm dev`, `pnpm watch`, `pnpm build`, and `pnpm preview` route through the root `workspace` script and the local Turbo-backed workspace launcher in `packages/tools`.
- The root `apps` object in `package.json` controls the default apps for root `dev`, `build`, and `preview`. Use `pnpm <command> -- <app>` for one-off overrides without changing the default app map.
- Barrels are global across discovered apps with `src/lib` and should not be narrowed to match the root runtime app defaults.
- Shared static symlinks are discovery-based and should skip apps that already own a real `static` directory.
- When package installation is required, use root-level ` pnpm --filter <package-name> add <dependency>`.
- When terminal commands are explicitly approved, keep the leading space prefix in repo commands.

## Universal Architecture Contracts

### Import And Export Surface

- If a symbol is publicly exported from `packages/ui`, import it from `@layerd/ui`.
- In app code, import app-shared symbols from `$lib`, not from deep relative paths into `src/lib`.
- Use route-local relative imports only for private route-colocated files that are intentionally not exported through `$lib`.
- In `packages/ui`, use the smallest package-local relative import only for truly private modules that are not exported from `@layerd/ui`.
- Do not maintain parallel manual export systems alongside the generated barrels.

### Base Component Contract

- `Component` from `@layerd/ui` is the default starting point for new reusable component authoring in `packages/ui`, app `src/lib`, and route-owned app components.
- Use `Component` instead of recreating root element rendering, passthrough HTML attributes, class merging, children or snippet rendering, layout snippets, rails container behavior, rail placement, or shared debug and layout helpers manually.
- `Root` is the internal runtime owner beneath `Component`; do not import it for normal app or UI component authoring.
- Wrapper components should preserve `Component` props and layout or snippet behavior unless a deliberate API change is required.
- `rails` enables the rail-aware container runtime. `rail` is placement-only. Treat `inset` as a modifier rather than as its own rail family.

### Generated Barrels

- `packages/ui/src/lib/index.ts` and discovered `apps/*/src/lib/index.ts` files are generated architecture contracts.
- Do not hand-edit generated barrel files or recreate the same exports by hand elsewhere.
- If app code needs a shared symbol, prefer exporting it through `src/lib` and importing it from `$lib` instead of deep imports.
- Barrel coverage is global across discovered apps with `src/lib`; it is separate from the root runtime app defaults.

### Instruction Maintenance

- When editing shared architecture in `packages/ui`, especially base runtime, rails, snippets, MQ, or shared utilities, also update the affected `.github/instructions/*.instructions.md` files in the same pass.
- Keep those instruction updates small and targeted, but do not leave live instructions describing removed or outdated runtime behavior.

## Universal Coding Rules

- DRY-extend-never-delete: never remove working logic, loggers, or helpers; only add, refactor, or replace when trust breaks.
- Atomic: each function does one job; build flows from atoms; reuse helpers.
- Flexible APIs: matcher, transformer, and check APIs accept String, RegExp, or Function and receive `(value, pos)`.
- Loops and style: use `for...of` only; no `forEach` or `for (i = ...)`; use dot notation.
- In Svelte markup attributes, do not use JavaScript template literals for class or attribute composition. Prefer Svelte interpolation inside quoted attributes, for example `class="panel {(props.class ?? '').trim()}"`.
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

- Use `.github/instructions/apps.instructions.md` as the shared baseline for app source files under `apps/**`; more specific app instruction files should add only local workflow or product rules.
- Use `.github/instructions/apps.app.instructions.md` for report-generator app architecture and data-system rules in `apps/app`.
- Use `.github/instructions/apps.play.instructions.md` for play and prototyping workflow rules in `apps/play`.
- Use `.github/instructions/apps.storybook.instructions.md` for Storybook-specific generation and story workflow rules in `apps/storybook`.
- Use `.github/instructions/packages.ui.instructions.md` as the strongest source of truth for UI package component authoring and package-local import rules.
- Use `.github/instructions/packages.instructions.md` for non-UI packages in `packages/tools` and `packages/config`.
- Use `.github/instructions/workspace.package-json.instructions.md` for package manifest rules, including the root runtime app map and workspace scripts.
- Use `.github/instructions/workspace.tooling.instructions.md` for shared config files and `pnpm-workspace.yaml`.
- Use `.github/instructions/turbo.instructions.md` for `turbo.json` watch, dependency, and barrel-glob rules.

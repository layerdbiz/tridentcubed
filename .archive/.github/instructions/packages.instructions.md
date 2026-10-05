---
name: Packages Rules
description: 'Use when editing non-UI packages in packages/tools or packages/config. Covers workspace tooling generators, shared config packages, and non-UI package conventions.'
applyTo: 'packages/tools/**,packages/config/**'
---

# Non-UI Package Rules

## When Working In `packages/config`

`packages/config/*` contains shared workspace foundations such as Svelte, TypeScript, and Vite base configs.

- Keep these packages additive and workspace-wide; avoid burying app-specific runtime behavior in shared config packages.
- Prefer updating the shared config packages and their consuming instruction files together when conventions change.
- Preserve the `@layerd/config-*` package boundaries instead of scattering duplicate config logic into app or package-local files.

## When Working In `packages/tools`

`@layerd/tools` is the repo's command package for local codegen and workspace utilities.

- Follow the existing command shape instead of inventing parallel entrypoints: package or root script, bin entrypoint in `packages/tools/bin` that imports one generator, and implementation in `packages/tools/src/generators/*.ts`. There is no command router.
- Keep new tooling additive. Do not break or rename existing commands unless explicitly requested.
- Reuse `TOOLS_CONFIG`, `Logger`, `resolvePath`, `writeFileAtomic`, and `getWorkspaceApps` before adding new helpers or registries.
- Scripts and bins should call generators, not duplicate command logic.

## Active Tooling Contracts

### `workspace`

- Root `pnpm dev`, `pnpm watch`, `pnpm build`, and `pnpm preview` route through `packages/tools/bin/workspace.js` and `packages/tools/src/generators/workspace-launcher.ts`.
- Keep Turbo as the actual executor.
- Keep default app enablement in the root `package.json` `apps` object.
- Preserve one-off overrides via `pnpm <command> -- <app>` instead of restoring a large per-app alias matrix.

### `barrels`

- `packages/tools/src/generators/barrels.ts` generates `packages/ui/src/lib/index.ts`, `packages/ui/src/lib/base/index.ts`, `packages/ui/src/lib/base/helpers/index.ts`, `packages/ui/src/lib/utils/index.ts`, `packages/ui/src/lib/components/index.ts`, and `apps/*/src/lib/index.ts` for every discovered app that has `src/lib`.
- The generator scans `.svelte`, `.ts`, and `.svelte.ts` files, skips barrels, tests, backups, server entries, and config files, and writes the source export contract only.
- Export ordering matters: the root UI barrel keeps grouped `base`, `utils`, and `components` surfaces, while the generated sub-barrels stay grouped by their own public surface.
- Svelte component files are exported as default components plus detected interface types when present.
- `.svelte.ts` modules that expose a default export are emitted as both default and named exports.
- Treat the UI barrels and app lib barrels as architecture-level import contracts. Do not hand-maintain parallel export lists or narrow barrel coverage to the root runtime defaults.
- Do not invent a second typed or dist-only barrel system unless the user explicitly asks for that architecture change.

### `sheetari`

- Archived on #48 at `.archive/packages/tools/src/generators/sheetari.ts`. The Report Generator's definitions are typed modules in `apps/app/src/lib/definitions`; the website reads Sheetari live through `*.remote.ts`.

### `stories`

- `packages/tools/src/generators/stories.ts` generates Storybook stories under `apps/storybook/src/stories`.
- Keep it working, but do not treat story generation as the primary app development workflow.
- The generator has no watch mode; `pnpm watch` reruns it through Turbo.

### `symlinks`

- `packages/tools/src/generators/symlinks.ts` manages shared static asset symlinks from `packages/ui/static` into discovered app static folders.
- Preserve discovery-based targets and the non-destructive behavior that skips apps which already own a real `static` directory.

## Working Rules

- Keep command behavior small and practical; prefer single-purpose generators.
- If a command is manual-only today, keep it manual-only unless the user explicitly asks for orchestration changes.
- Keep runtime defaults in the root `package.json` `apps` object and keep one-off selection in the workspace launcher rather than moving that logic into Turbo.
- Keep barrels global across discovered apps with `src/lib`; do not couple barrel coverage to the root runtime defaults.
- When documenting or changing tooling, distinguish between active workflow commands and secondary or dormant commands.

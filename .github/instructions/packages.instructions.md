---
name: Packages Rules
description: "Use when editing non-UI packages in packages/tools or packages/config. Covers workspace tooling generators, shared config packages, and non-UI package conventions."
applyTo:
	- 'packages/tools/**/*'
	- 'packages/config/**/*'
---

## When Working In `packages/config`

`packages/config/*` contains shared workspace foundations such as Svelte, TypeScript, and Vite base configs.

- Keep these packages additive and workspace-wide; avoid burying app-specific runtime behavior in shared config packages.
- Prefer updating the shared config packages and their consuming instruction files together when conventions change.
- Preserve the `@layerd/config-*` package boundaries instead of scattering duplicate config logic into app or package-local files.

## When Working In `packages/tools`

`@layerd/tools` is the repo's command package for local codegen and workspace utilities.
Follow the existing command shape instead of inventing parallel entrypoints:

- package script or root script
- bin entrypoint in `packages/tools/bin`
- command router in `packages/tools/src/main.ts` when applicable
- implementation in `packages/tools/src/generators/*.ts`

Keep new tooling additive.
Do not break or rename existing commands unless explicitly requested.

## Current Commands In `@layerd/tools`

### `barrels`

- Purpose: generates barrel exports for `@layerd/ui` and, in workspace mode, for every discovered app with a `src/lib` folder
- Implementation: `packages/tools/src/generators/barrels.ts`
- Invocation path: root `pnpm barrels` -> `pnpm --filter @layerd/tools run barrels:run --workspace`
- Repo role: active and important to the current dev/build flow
- Constraint: preserve dynamic app discovery from `apps/*/package.json`, broad app barrel coverage, and the current Turbo orchestration/output behavior

### `workspace`

- Purpose: launches the root runtime app selection flow for `dev`, `watch`, `build`, and `preview`
- Implementation: `packages/tools/bin/workspace.js` and `packages/tools/src/generators/workspace-launcher.ts`
- Invocation path: root `pnpm dev`, `pnpm watch`, `pnpm build`, or `pnpm preview`
- Overrides: `pnpm <command> -- <app>` for one-off app targets without changing the root `apps` object
- Repo role: active entrypoint for root runtime orchestration
- Constraint: keep default app enablement in the root `package.json` `apps` object; do not reintroduce a large per-app alias matrix unless explicitly requested

### `sheetari`

- Purpose: fetches the four app Sheetari JSON endpoints and writes local mirrors into `apps/app/src/lib/data`
- Outputs: `config.json`, `inputs.json`, `panels.json`, `pages.json`, `instructions.json`
- Implementation: `packages/tools/src/generators/sheetari.ts`
- Invocation path: root `pnpm sheetari` -> `pnpm --filter @layerd/tools sheetari`
- Repo role: standalone manual command
- Constraint: do not wire it into dev watch or automatic save-based workflows unless explicitly requested

### `stories` and `story`

- Purpose: generates Storybook stories from UI components
- Implementation: `packages/tools/src/generators/stories.ts`
- Outputs: files under `apps/storybook/src/stories`
- Repo role: secondary or legacy reference workflow, not part of the main active app workflow
- Constraint: keep it working, but do not treat Storybook generation as the primary orchestration model for current app work
- Note: watch mode is not implemented in the generator

### `symlinks`

- Purpose: manages shared static asset symlinks from `packages/ui/static` into discovered app static folders
- Implementation: `packages/tools/src/generators/symlinks.ts`
- Related commands: `symlinks`, `symlinks:clean`, `symlinks:check`
- Repo role: standalone workspace utility
- Constraint: preserve discovery-based targets and the non-destructive behavior that skips apps which already own a real `static` directory

### `types`

- Purpose: reserved placeholder for type patching
- Implementation: `packages/tools/src/generators/types.ts`
- Repo role: not actively implemented
- Constraint: do not present it as a completed workflow; treat it as dormant unless explicitly asked to revive it

## Working Rules For `packages/tools`

- Reuse `TOOLS_CONFIG`, `Logger`, `resolvePath`, and `writeFileAtomic` before adding new utilities
- Reuse `getWorkspaceApps` when tooling needs app discovery; do not introduce new handwritten app registries unless explicitly requested.
- Keep command behavior small and practical; prefer single-purpose generators
- Match the existing operational style: scripts and bins should call generators, not duplicate logic
- If a command is manual-only today, keep it manual-only unless the user explicitly asks for orchestration changes
- Keep runtime defaults in the root `package.json` `apps` object and keep one-off selection in the workspace launcher rather than moving that logic into Turbo.
- Keep barrels global across discovered apps with `src/lib`; do not couple barrel coverage to the root runtime defaults.
- When documenting or changing tooling, distinguish between active workflow commands (`barrels`, `sheetari`) and secondary or dormant commands (`stories`, `types`)

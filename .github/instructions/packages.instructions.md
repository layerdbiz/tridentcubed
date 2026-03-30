---
name: Packages Rules
description: "Use when editing non-UI packages in packages/config or packages/tools. Preserves the package-scope greeting without overlapping packages/ui."
applyTo:
	- 'packages/**/*'
---

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

- Purpose: generates the UI barrel file at `packages/ui/src/lib/index.ts`
- Implementation: `packages/tools/src/generators/barrels.ts`
- Invocation path: root `pnpm barrels` -> Turbo `barrel` task -> `@layerd/tools`
- Repo role: active and important to the current dev/build flow
- Constraint: preserve its current Turbo orchestration and output behavior

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

- Purpose: manages static asset symlinks from `packages/ui/static` into app static folders
- Implementation: `packages/tools/src/generators/symlinks.ts`
- Related commands: `symlinks`, `symlinks:clean`, `symlinks:check`
- Repo role: standalone workspace utility
- Constraint: preserve existing source and target paths unless explicitly requested

### `types`

- Purpose: reserved placeholder for type patching
- Implementation: `packages/tools/src/generators/types.ts`
- Repo role: not actively implemented
- Constraint: do not present it as a completed workflow; treat it as dormant unless explicitly asked to revive it

## Working Rules For `packages/tools`

- Reuse `TOOLS_CONFIG`, `Logger`, `resolvePath`, and `writeFileAtomic` before adding new utilities
- Keep command behavior small and practical; prefer single-purpose generators
- Match the existing operational style: scripts and bins should call generators, not duplicate logic
- If a command is manual-only today, keep it manual-only unless the user explicitly asks for orchestration changes
- When documenting or changing tooling, distinguish between active workflow commands (`barrels`, `sheetari`) and secondary or dormant commands (`stories`, `types`)

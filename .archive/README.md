# .archive

Comparison-only code kept for reference, outside the type-checked tree.

Each folder keeps its original repository path beneath this one, so a file that
lived at `packages/ui/src/legacy/...` is now at
`.archive/packages/ui/src/legacy/...` (one exception: the TODO reconciliation
table sits in `.archive/.todo/` beside the CSV it keys on). Nothing here is
imported, built, published or type-checked:

- `.archive/` is outside the pnpm workspace globs (`apps/*`, `packages/*`,
  `packages/config/*`).
- Every `tsconfig.json` includes only its own package's `src/`, so svelte-check
  never sees these files.
- The barrels generator scans only `src/lib`.
- The `@layerd/ui` npm `files` list never shipped them.

Read or diff these folders against the live code when you need the history;
do not import from them. Moved on 2026-09-20 by ticket
[#30](https://github.com/layerdbiz/tridentcubed/issues/30), step 0 of the
toolchain order decided on
[#12](https://github.com/layerdbiz/tridentcubed/issues/12), so that
svelte-check can be a zero-error gate on `apps/app`, `apps/site` and
`packages/ui`.

| Archived path | What it was |
| --- | --- |
| `packages/ui/src/legacy` | earlier UI component tree and its `+todo` notes |
| `packages/ui/src/+merge` | merge scratch space for the UI `lib` |
| `packages/ui/src/+versions` | UI `v1` snapshot |
| `apps/play/src/+merge` | layout snippets and rails merge scratch space |
| `apps/play/src/+versions` | play app `v1`, `v2`, `v3` snapshots |
| `apps/app/src/routes/simple` | Sheetari-backed test-sheet route of the prototype ([#48](https://github.com/layerdbiz/tridentcubed/issues/48), 2026-10-05) |
| `apps/app/src/routes/(demo)` | `persist` prop sandbox of the prototype (#48, 2026-10-05) |
| `apps/app/src/routes/(app)/projects/example.html` | standalone "group repeater blueprint" HTML of the prototype, unreferenced (#48, 2026-10-05) |
| `apps/app/src/lib/data` | April 2026 Sheetari snapshot (definition JSON) and the CSV mirrors (#48, 2026-10-05) |
| `packages/tools/src/generators/sheetari.ts`, `packages/tools/bin/sheetari.js` | Sheetari snapshot generator (#48, 2026-10-05) |
| `apps/storybook` | frozen Kit 2 Storybook app, failed to start on its pins and its Vite config blocked Vite Task ([#100](https://github.com/layerdbiz/tridentcubed/issues/100), 2026-10-05, decided on #22) |
| `packages/tools/src/generators/stories.ts`, `packages/tools/src/generators/stories/`, `packages/tools/bin/stories.js`, `packages/tools/src/config.ts` (the `storybook` slice) | stories generator that wrote `apps/storybook/src/stories` from JSDoc tags (#100, 2026-10-05) |
| `.github/copilot-instructions.md` | root Copilot instructions, contradicted by `AGENTS.md` ([#16](https://github.com/layerdbiz/tridentcubed/issues/16), 2026-10-05) |
| `.github/instructions` | nine path-scoped Copilot instruction files, superseded by the root and scoped `AGENTS.md` (#16, 2026-10-05) |
| `.github/prompts` | nine Copilot prompts; component, remote-function and summarize prompts superseded by the `/oneezy-ui-component`, `/oneezy-app-route` and `/handoff` skills (#16, 2026-10-05) |
| `.github/chatmodes` | the "Beast Mode (old)" Copilot chatmode (#16, 2026-10-05) |
| `.todo` | historical backlog: `TODO.csv`, `TODO.txt`, the `ICONS.md` PRD and the grid-breakout note, reconciled on #50; the reconciliation table `2026-09-28-todo-reconciliation.md` moved here from `docs/research/` beside the CSV it keys on (#16, 2026-10-05) |
| `instructo.md` | Svelte-expert prompt with the email-signature design notes, now a header comment on `apps/site/src/lib/email/email.remote.ts` (#16, 2026-10-05) |
| `TODO.md` | root TODO list, reconciled on #50 (#16, 2026-10-05) |

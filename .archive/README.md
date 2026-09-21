# .archive

Comparison-only code kept for reference, outside the type-checked tree.

Each folder keeps its original repository path beneath this one, so a file that
lived at `packages/ui/src/legacy/...` is now at
`.archive/packages/ui/src/legacy/...`. Nothing here is imported, built,
published or type-checked:

- `.archive/` is outside the pnpm workspace globs (`apps/*`, `packages/*`,
  `packages/config/*`).
- Every `tsconfig.json` includes only its own package's `src/`, so svelte-check
  never sees these files.
- The barrels and stories generators scan only `src/lib`.
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

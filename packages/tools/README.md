# @layerd/tools

Workspace automation for the Trident monorepo: the `workspace` launcher and the
`barrels` and `symlinks` generators. Everything here runs
straight from TypeScript source through Node's type stripping; there is no build
step. `bin/*.js` are the entrypoints, `src/generators/*.ts` the implementations,
`src/config.ts` the paths and targets, `src/utils.ts` the shared scanner.

Each generator carries its own contract in a header comment at the top of its
source file. Read that before changing the generator. This file holds what no
single generator can tell you: how the pieces connect, what was verified by
running them, and the invariants any toolchain change must keep.

Decided on ticket [#9](https://github.com/layerdbiz/tridentcubed/issues/9)
(2026-09-18). Justin: "I spent a long time getting this repo automatic."
What runs today works; change is welcome only when proven by running
`pnpm dev`, `pnpm build` and `pnpm preview` and looking at the output.

## How the pieces connect

**Workspace launcher.** `pnpm dev|watch|build|preview` at the root call
`bin/workspace.js`. It reads the root `package.json` `apps` map, keeps the apps
set to `true`, validates them against `apps/*/package.json` names, and spawns
Turbo from `node_modules`. Positional app names on the command line override the
map; anything after `--` passes through to Turbo. The map is a developer
convenience for "which apps start when I type `pnpm dev`". It never limits what
the generators touch.

**Turbo graph.** `build` depends on `//#barrels` (root script, workspace-mode
barrels) and `^build`. `dev` and `watch` run `//#barrels:watch` beside each
app's `dev`; `watch` is an alias of `dev` since the stories generator left
(#100). See `turbo.json` for the task list.
A persistent task (`dev`, `barrels:watch`) is never listed in another task's
`dependsOn`: Turbo would wait for it forever. Run it beside the other task
instead, as `dev` does (carried from the retired Copilot instructions on #16).

**Barrels.** Eleven committed `index.ts` files: five UI targets from
`src/config.ts` plus one per app that has `src/lib`. The UI root barrel is the
public API of `@layerd/ui`; the repo holds roughly 180 bare `@layerd/ui`
imports. App barrels have no importers today. Contract: `src/generators/barrels.ts`.

**Symlinks.** Would link each `apps/<app>/static` to `packages/ui/static`. No
app has a `static` folder; every app serves the shared folder through
`kit.files.assets`. The generator is the
reserved first attempt at a shared-assets package with per-app override.
Contract: `src/generators/symlinks.ts`.

**Stories.** Archived with the app it wrote into on
[#100](https://github.com/layerdbiz/tridentcubed/issues/100) (2026-10-05), at
`.archive/packages/tools/src/generators/stories.ts` with its `stories/` helpers,
`bin` and its slice of `config.ts`.

**Sheetari.** The snapshot generator is archived on
[#48](https://github.com/layerdbiz/tridentcubed/issues/48) (2026-10-05), at
`.archive/packages/tools/src/generators/sheetari.ts` with its `bin` and the
`apps/app/src/lib/data` snapshot. The Report Generator's definitions are typed
modules in `apps/app/src/lib/definitions`; the website still reads Sheetari
live through its `*.remote.ts` files. The definition sheet is a frozen
reference, edited nowhere: it carries the note "moved to code on 2026-10-05"
(added by hand; this line stands in until it does).

## Verified by running (2026-09-18, this worktree, Node 24.21, pnpm 9.15.4)

- `pnpm install` runs only `svelte-kit sync` in each package. It creates no
  symlinks, no barrels and no UI `dist`.
- `pnpm build` inside `apps/site` (exactly what Vercel runs, see below) builds
  successfully with **no** `packages/ui/dist` present. SvelteKit's
  `@layerd/ui/*` alias resolves `@layerd/ui/ui.css` to
  `packages/ui/src/lib/ui.css`, and the app's own `postcss.config.js` applies
  the light-dark transform: zero `light-dark(` calls survive in the built CSS.
- The `@layerd/ui/ui.css` to `packages/ui/dist/ui.css` alias in each app's
  `vite.config` is therefore not hit in a production build. Its effect in
  `vite dev` is **unverified**. Justin recalls a specific reason for it. Leave it
  until `pnpm dev` with and without it has been compared.
- `pnpm barrels` on this checkout, after the header comments below were added,
  produced no diff.
- Kit 2.50.2 warns that `kit.files.assets` is deprecated. That deprecation was
  reverted in Kit 2.54.0 ([PR #15482](https://github.com/sveltejs/kit/pull/15482),
  2026-03-05): still supported, soft-deprecated in the types only. Upgrading Kit
  removes the warning. Kit 3 prereleases remove `files.lib`, not `files.assets`.

## Verified by running (2026-10-03, Kit 3, Vite+ 1.0, Node 24, pnpm 12)

- Kit 3 moved the Kit config into the `sveltekit()` plugin and deprecated its
  `alias` option, so each app's `vite.config.ts` now aliases `@layerd/ui` to
  `packages/ui/src/lib` with Vite's `resolve.alias`. That one alias covers
  `@layerd/ui/ui.css` too. The `dist/ui.css` alias is gone: resolving the
  stylesheet to `dist` broke both Vercel builds, which have no UI `dist` and
  need the source `@theme` for Tailwind.
- Invariant 5 under Vite Task (#85 experiment): a root `run.tasks` entry that a
  package `build` lists in `dependsOn`, and a persistent watch run beside
  `vp dev` with `vp run --parallel`, both work with the untouched generator.
  Vite Task loads every package's Vite config to build its task graph; the
  frozen Kit 2 config that stopped it is archived (#100). Turbo stays.

## Verified by running (2026-10-05, #101, this container, Node 22.22, pnpm 12.8.1)

- With the four apps on `createAppConfig`: `pnpm build app site play report`
  from the root, `pnpm exec vp build` inside `apps/app`, `pnpm test` (21
  tests), `vp lint`, `pnpm barrels` with zero diff, `svelte-check` zero on
  app, site and ui, and `vp dev --host` plus `vp preview --host` serving app
  and site with `packages/ui/static` at the same URLs. The Vite config loader
  imports the factory as a workspace package and Node strips its types; no
  bundling step is involved.

## Vercel

Two projects, `tridentcubed` (site) and `tridentcubed-app` (app), both on
Node 24.x through the `engines` field, both deploy every push to `dev`. Root directory is `apps/site` or
`apps/app`; build command `pnpm build` in that directory, which is the app's
own `vp build`; install command `pnpm install`; "include files outside the
root directory" on. Vercel therefore never runs Turbo, the barrels generator or
the UI package build. Committed barrels are the only barrels Vercel sees.

## Invariants for "Settle the toolchain"

Ticket [#12](https://github.com/layerdbiz/tridentcubed/issues/12) must keep
every one of these true. Each is checkable.

Decided 2026-09-19 on that ticket; the decision lives in its resolution
comment, not here. It keeps all thirteen. Invariants 1 and 7 are gate steps
on every upgrade PR; 3 is met by ignoring generated paths in the formatter
config; 4 is met by an `engines` field of `24.x` in the root and every app
plus the adapter runtime `nodejs24.x`; 5 is why Turborepo stays the
orchestrator and Vite Task is not adopted.

1. **Generated files are committed and current.** Barrels live in
   git. Vercel trusts them. Proof for any toolchain change: on a clean checkout
   run `pnpm barrels`; `git status` shows no diff.
2. **The barrels generator is not modified by a toolchain ticket.** Node,
   TypeScript, pnpm and Turbo changes are proven by invariant 1 plus `pnpm dev`,
   `pnpm build` and `pnpm preview`, all inspected by eye.
3. **Barrel output is byte-stable.** No formatter rewrites any generated
   `index.ts`. If a formatter is adopted, either ignore
   those paths or prove it is a no-op on them.
4. **Tools run from source on Node 24 LTS.** Type stripping and
   `erasableSyntaxOnly` are the mechanism. Target: an `engines` field and both
   Vercel projects on 24.x.
5. **A root task can precede package builds.** `//#barrels` before every
   `build`, and a persistent, interruptible `//#barrels:watch` beside `dev`.
   Any task runner that replaces Turbo must express both, and the workspace
   launcher must be rewritten to spawn it (it resolves `turbo/bin/turbo`).
6. **Apps consume UI source.** Every app aliases `@layerd/ui` to
   `packages/ui/src/lib`. The alias lives in one place, the `createAppConfig`
   factory in `packages/config/vite` (#101). The UI `dist` is not on the app
   critical path.
7. **The UI package build keeps working.** `svelte-package` plus
   `postcss` to `dist/ui.css`, and the `exports` map including the
   `./src` entry, because `@layerd/ui` is published on npm for use outside this
   repo. Check with `pnpm --filter @layerd/ui build` and `publint`.
8. **UI subpath entrypoints are preserved, not extended.** The
   `@layerd/ui/base|helpers|utils|components` aliases and exports are unfinished
   work with no importers. Keep them intact; finishing or dropping them is a
   separate decision.
9. **Every app keeps serving `packages/ui/static`.** Today via
   `kit.files.assets`. Any replacement must serve the same files at the same
   URLs.
10. **The Report Generator's definitions are typed modules** in
    `apps/app/src/lib/definitions`, checked by `svelte-check`; the Report
    Generator reads neither Sheetari nor Google Sheets. The website reads
    Sheetari live through `*.remote.ts`, one sheet id per app.
11. **Both experimental flags stay on** in every app config
    (`kit.experimental.remoteFunctions`, `compilerOptions.experimental.async`).
12. **`packages/config/ts` stays where it is.** Every `tsconfig.json` extends
    it by relative path. Each app's `vite.config.ts` is its one config file
    since Kit 3; no `svelte.config.js` exists outside `.archive/`. The four
    apps (app, site, play, report) get that file from
    `createAppConfig({ root, prerender?, test? })` in `@layerd/config-vite`,
    each reduced to the import plus its overrides (decided 2026-10-05 on #22,
    built on #101). The factory computes every path from its own location and
    the `root` it is given, never from the working directory, which is what
    broke the shared `svelte.config.js` of the first attempt.
    `@layerd/config-svelte` is deleted; `packages/ui` keeps its own config.
13. **One build path per app, identical locally and on Vercel:** the app's own
    `vp build` with committed generated files, or a deliberate move of Vercel
    onto the workspace build path. Not a silent drift between the two.

## Removed dead pieces

Cleaned up on ticket [#23](https://github.com/layerdbiz/tridentcubed/issues/23)
(2026-10-05), proven by `pnpm barrels` with zero diff, then `pnpm build`,
`pnpm dev` and `pnpm preview` inspected by eye. None of them ran.

- `barrel` task in `turbo.json`: no package defined a `barrel` script.
- `src/generators/types.ts`, a stub, with its `types` bin, export and script.
- `src/main.ts`, a second command router. `bin/stories.js` was its only
  importer, and importing it ran the barrels generator as a side effect
  before every story run; the bin then imported `src/generators/stories.ts`
  directly, like the other bins (both archived since, #100).
- `test` script: ran the barrels generator, tested nothing. The root
  `pnpm test` never selected this package.
- Story generator `run({ watch })` and symlink `watchSymlinks`: stubs.

Still true, not a dead piece: pnpm ignores `@parcel/watcher`'s build script
(`allowBuilds` in `pnpm-workspace.yaml`), so chokidar falls back to Node's
`fs.watch`. Allow it if watch is slow.

## Open questions held on the map

Shared static assets as a package with per-app override; finishing or dropping
the UI subpath entrypoints; developing the UI library in the monorepo while
publishing it standalone; whether a component showcase returns (#100). See map
[#1](https://github.com/layerdbiz/tridentcubed/issues/1), Not yet specified.

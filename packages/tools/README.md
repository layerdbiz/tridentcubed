# @layerd/tools

Workspace automation for the Trident monorepo: the `workspace` launcher and the
`barrels`, `symlinks`, `stories` and `sheetari` generators. Everything here runs
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
app's `dev`; `watch` adds `storybook#story`. See `turbo.json` for the task list.

**Barrels.** Eleven committed `index.ts` files: five UI targets from
`src/config.ts` plus one per app that has `src/lib`. The UI root barrel is the
public API of `@layerd/ui`; the repo holds roughly 180 bare `@layerd/ui`
imports. App barrels have no importers today. Contract: `src/generators/barrels.ts`.

**Symlinks.** Would link each `apps/<app>/static` to `packages/ui/static`. No
app has a `static` folder; every app serves the shared folder through
`kit.files.assets` and Storybook through `staticDirs`. The generator is the
reserved first attempt at a shared-assets package with per-app override.
Contract: `src/generators/symlinks.ts`.

**Stories.** One `.stories.svelte` per UI component, written into
`apps/storybook/src/stories`, driven by JSDoc tags on the component. Story
files are generator-owned; orphans are deleted. Storybook is frozen on the map.
Contract: `src/generators/stories.ts`.

**Sheetari.** Snapshots four endpoints of one Google Sheet into
`apps/app/src/lib/data`. Nothing reads that snapshot. Every app reads Sheetari
live through remote functions. Contract: `src/generators/sheetari.ts`.

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

## Vercel

Two projects, `tridentcubed` (site, Node 22.x) and `tridentcubed-app` (app,
Node 24.x), both deploy every push to `dev`. Root directory is `apps/site` or
`apps/app`; build command `pnpm build` in that directory, which is the app's
own `vite build`; install command `pnpm install`; "include files outside the
root directory" on. Vercel therefore never runs Turbo, the barrels generator or
the UI package build. Committed barrels are the only barrels Vercel sees.

## Invariants for "Settle the toolchain"

Ticket [#12](https://github.com/layerdbiz/tridentcubed/issues/12) must keep
every one of these true. Each is checkable.

1. **Generated files are committed and current.** Barrels, stories and the
   Sheetari snapshot live in git. Vercel trusts them. Proof for any toolchain
   change: on a clean checkout run `pnpm barrels`; `git status` shows no diff.
2. **The barrels generator is not modified by a toolchain ticket.** Node,
   TypeScript, pnpm and Turbo changes are proven by invariant 1 plus `pnpm dev`,
   `pnpm build` and `pnpm preview`, all inspected by eye.
3. **Barrel output is byte-stable.** No formatter rewrites any generated
   `index.ts` or `.stories.svelte`. If a formatter is adopted, either ignore
   those paths or prove it is a no-op on them.
4. **Tools run from source on Node 24 LTS.** Type stripping and
   `erasableSyntaxOnly` are the mechanism. Target: an `engines` field and both
   Vercel projects on 24.x.
5. **A root task can precede package builds.** `//#barrels` before every
   `build`, and a persistent, interruptible `//#barrels:watch` beside `dev`.
   Any task runner that replaces Turbo must express both, and the workspace
   launcher must be rewritten to spawn it (it resolves `turbo/bin/turbo`).
6. **Apps consume UI source.** Every app aliases `@layerd/ui` to
   `packages/ui/src/lib`. The UI `dist` is not on the app critical path.
7. **The UI package build keeps working.** `svelte-package` plus
   `postcss` to `dist/ui.css`, and the `exports` map including the
   `./src` entry, because `@layerd/ui` is published on npm for use outside this
   repo. Check with `pnpm --filter @layerd/ui build` and `publint`.
8. **UI subpath entrypoints are preserved, not extended.** The
   `@layerd/ui/base|helpers|utils|components` aliases and exports are unfinished
   work with no importers. Keep them intact; finishing or dropping them is a
   separate decision.
9. **Every app keeps serving `packages/ui/static`.** Today via
   `kit.files.assets` and Storybook `staticDirs`. Any replacement must serve the
   same files at the same URLs.
10. **Runtime data comes from Sheetari live reads** in `*.remote.ts` files,
    one sheet id per app. The snapshot generator and the CSVs beside it are
    unread and never part of a build.
11. **Both experimental flags stay on** in every app config
    (`kit.experimental.remoteFunctions`, `compilerOptions.experimental.async`),
    with Storybook forcing `async` off under Storybook.
12. **`packages/config/ts` stays where it is.** Every `tsconfig.json` extends
    it by relative path. The per-app `svelte.config.js` and `vite.config` copies
    are canonical today; `@layerd/config-svelte` and `@layerd/config-vite` are
    reference copies, imported only by Storybook's Vite config.
13. **One build path per app, identical locally and on Vercel:** the app's own
    `vite build` with committed generated files, or a deliberate move of Vercel
    onto the workspace build path. Not a silent drift between the two.

## Known dead pieces

Removal candidates for the cleanup ticket, on their own branch, verified by dev,
build and preview before merge. None of them run today.

- `barrel` task in `turbo.json`: no package defines a `barrel` script.
- `src/generators/types.ts`: a stub; `bin` `types` and script `types` point at
  `src/main.ts`, which is a second, unused command router.
- `test` script: runs the barrels generator, tests nothing.
- Story generator `run({ watch })` and symlink `watchSymlinks`: stubs.
- pnpm ignores `@parcel/watcher`'s build script; chokidar falls back to
  Node's `fs.watch`. Add it to `onlyBuiltDependencies` if watch is slow.

## Open questions held on the map

Shared static assets as a package with per-app override; finishing or dropping
the UI subpath entrypoints; developing the UI library in the monorepo while
publishing it standalone; the Storybook rework. See map
[#1](https://github.com/layerdbiz/tridentcubed/issues/1), Not yet specified.

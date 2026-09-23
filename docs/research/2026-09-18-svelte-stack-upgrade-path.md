Breaking changes from Trident's pins to current Svelte, SvelteKit, Vite, Turborepo, pnpm, Tailwind

Research for Wayfinder ticket [#11](https://github.com/layerdbiz/tridentcubed/issues/11). Observed September 18, 2026 (America/Chicago). Versions and publish dates come from the npm registry (`npm view <pkg> version time`) on that day; changes come from each project's own changelog, release notes, migration guide or reference docs, linked on every claim. Nothing was upgraded or built for this report. "Unverified" marks claims I could not trace to a primary source.

Pinned versions are those in the ticket and were not re-inventoried. Repo facts used below were confirmed by grep on the `research/svelte-stack-upgrade` branch: every `apps/*/svelte.config.js` sets `kit.experimental.remoteFunctions: true`, `compilerOptions.experimental.async: true`, adapter-vercel `runtime: "nodejs22.x"` and `vitePlugin.inspector: true`; root `package.json` has `"packageManager": "pnpm@9.15.4"` and a `pnpm.onlyBuiltDependencies` block; `pnpm-lock.yaml` is `lockfileVersion: '9.0'`; root `tsconfig.json` has `"ignoreDeprecations": "6.0"`; `turbo.json` points at `https://turborepo.com/schema.json`; no app `vite.config` uses `esbuild`, `rollupOptions` or `manualChunks`; no source file uses the remote-function APIs `.run()`, `.updates(`, `.withOverride(` or `requested(`; nothing depends on Vitest.

## Summary

- The two experimental flags Trident relies on are still experimental at current stable. Svelte's [await-expressions docs](https://svelte.dev/docs/svelte/await-expressions) say `experimental.async` is opt-in, "subject to breaking changes outside of a semver major release", and that "the experimental flag will be removed in Svelte 6". SvelteKit's [configuration reference](https://svelte.dev/docs/kit/configuration) still lists `kit.experimental.remoteFunctions` (default `false`, "not yet stable and may be changed or removed at any time"). Neither was renamed.
- SvelteKit 2.50.2 to 2.70.3 contains five entries the changelog labels `breaking`, all inside remote functions (2.56.0, 2.58.0, 2.59.0, 2.61.0). Trident's ten `*.remote.ts` files use `query`, `query.batch`, `form`, `prerender` and none of the affected surfaces (`.run()`, client-driven `.updates()`, `requested()`), so the kit upgrade is low-risk here, but it must be verified by running the apps.
- Vite 8 is the one hard boundary. `@sveltejs/vite-plugin-svelte` 7.x requires Vite 8 and Svelte >= 5.46.4, folds the inspector into itself, and drops deprecated options. The frozen `@storybook/sveltekit@10.2.7` declares `vite: ^5 || ^6 || ^7`, so the storybook app cannot take Vite 8 while Storybook stays frozen.
- pnpm 9.15.4 to 12.4.2 crosses three majors. pnpm 11 removes `onlyBuiltDependencies` and the `package.json#pnpm` field (both used here), requires Node 22+, and defaults `minimumReleaseAge` to one day, which blocks installing anything published in the last 24 hours (today that includes svelte 5.57.1 and turbo 2.11.x). A codemod handles most of it. Lockfile format remains `9.0` (observed in pnpm's own repo, not stated in docs).
- TypeScript: 6.0.3 is the highest version the Svelte toolchain accepts as a normal dependency (kit peer `^5.3.3 || ^6.0.0`, svelte-check `^5 || ^6`). TypeScript 7.0.2 ships no programmatic API, so tools like svelte-check "must continue using TypeScript 6.0". Root `tsconfig.json` uses `moduleResolution: "node"`, which 6.0 deprecates (hence today's `ignoreDeprecations: "6.0"`) and 7.0 removes.
- Turborepo 2.8.3 to 2.11.2 has no `turbo.json` schema removals; it deprecates the daemon and several flags, and adds pnpm 11 lockfile parsing (2.10.0) and `devEngines.packageManager` support (2.11.0). Tailwind 4.1.18 to 4.3.3 is additive plus one deprecation (`start-*`/`end-*`) and one CSS-output change for `*-0`/`*-1` spacing utilities.

## Versions at a glance

| Package | Pinned | Pin published | Current stable | Current published | Majors crossed |
| --- | --- | --- | --- | --- | --- |
| svelte | ^5.50.0 | 2026-02-06 | 5.57.1 | 2026-09-18 | 0 |
| @sveltejs/kit | ^2.50.2 | 2026-02-02 | 2.70.3 | 2026-08-18 | 0 (3.0.0-next.27 is prerelease) |
| @sveltejs/adapter-vercel | ^6.3.1 | 2026-01-23 | 6.3.4 | 2026-06-18 | 0 (7.0.0-next.9 targets kit 3) |
| @sveltejs/vite-plugin-svelte | ^6.2.4 | 2026-01-09 | 7.3.0 | 2026-08-08 | 1 (7.0.0 on 2026-02-23) |
| @sveltejs/vite-plugin-svelte-inspector | ^5.0.2 | 2026-01-06 | 5.0.2 | 2026-01-06 | 0, but obsolete with vps 7 |
| @sveltejs/package | ^2.5.7 | 2025-11-26 | 2.5.8 | 2026-06-02 | 0 |
| vite | ^7.3.1 | 2026-01-07 | 8.3.0 | 2026-09-10 | 1 (8.0.0 on 2026-03-12) |
| turbo | 2.8.3 | 2026-02-03 | 2.11.2 | 2026-09-18 | 0 |
| pnpm | 9.15.4 | 2025-01-13 | 12.4.2 | 2026-09-15 | 3 (10.0.0 2025-01-07, 11.0.0 2026-04-28, 12.0.0 2026-08-26) |
| tailwindcss, @tailwindcss/vite, @tailwindcss/postcss | 4.1.18 | 2025-12-11 | 4.3.3 | 2026-07-16 | 0 |
| @tailwindcss/forms | ^0.5.11 | | 0.5.11 | | 0 (no change) |
| @tailwindcss/typography | ^0.5.19 | 2025-09-24 | 0.5.20 | 2026-06-08 | 0 |
| svelte-check | ^4.3.6 | 2026-01-31 | 4.7.6 | 2026-08-13 | 0 |
| typescript | ^5.9.3 | 2025-09-30 | 7.0.2 (6.0.3 is the last JS-API release) | 7.0.2 2026-07-08; 6.0.3 2026-04-16 | 2 |
| storybook (frozen) | ^10.2.7 | 2026-02-05 | 10.6.0 | 2026-09-02 | 0, report only |
| unplugin-icons | ^23.0.1 | 2026-01-14 | 24.0.0 | 2026-09-11 | 1 |
| vite-plugin-devtools-json | ^1.0.0 | 2025-08-13 | 1.1.0 | 2026-07-20 | 0 |
| runed | ^0.37.1 | | 0.37.1 | | 0 (no change) |
| mode-watcher | ^1.1.0 | | 1.1.0 | | 0 (no change) |
| layerchart | 2.0.0-next.43 | 2025-11-14 | 2.5.0 | 2026-09-09 | prerelease to stable (2.0.0 on 2026-07-01) |
| three | ^0.182.0 | 2025-12-10 | 0.186.0 | 2026-09-08 | 4 minor releases (three treats each as breaking) |
| globe.gl | ^2.45.0 | 2025-10-31 | 2.46.2 | 2026-08-22 | 0 |
| @sparticuz/chromium-min (apps/app) | 143.0.4 | 2026-01-02 | 153.0.0 | 2026-09-11 | Chromium 143 to 153 |
| puppeteer-core (apps/app) | 24.38.0 | 2026-03-04 | 25.11.0 | 2026-09-14 | 1 (25.0.0 on 2026-05-12) |

Source for every row: npm registry `time` metadata read 2026-09-18. TypeScript 6.0.0/6.0.1 and 7.0.0/7.0.1 have no `time` entries on npm; the release posts date [6.0 to 2026-03-23](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) and [7.0 to 2026-07-08](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), matching the 6.0.2 and 7.0.2 npm dates.

## Per-package findings

### Svelte 5.50.0 to 5.57.1

Source: [packages/svelte/CHANGELOG.md](https://github.com/sveltejs/svelte/blob/main/packages/svelte/CHANGELOG.md).

- No entry between 5.50.0 and 5.57.1 is labelled breaking; all are minor features or patches. Minor features: TrustedTypes for `{@html}` (5.51.0, 5.52.0), comments in tags and server-side error boundaries (5.53.0), `css`/`runes`/`customElement` compiler options as functions (5.54.0), declarations in the template (5.56.0, [#18282](https://github.com/sveltejs/svelte/pull/18282)), `createContext().has`, `defaultValue` on `<select>`, `SvelteMap.getOrInsert` (5.57.0).
- Async flag: the changelog history shows `await` support arriving under `experimental.async` ([#15844](https://github.com/sveltejs/svelte/pull/15844)) and experimental async SSR ([#16748](https://github.com/sveltejs/svelte/pull/16748)); no later entry stabilises or renames it. The [await-expressions docs](https://svelte.dev/docs/svelte/await-expressions) confirm: "This feature is currently experimental, and you must opt in by adding the `experimental.async` option", "The experimental flag will be removed in Svelte 6", and behaviour "subject to breaking changes outside of a semver major release". Async runtime behaviour did change inside the range: 5.55.6 "replacing async 'blocking' strategy with 'merging'" ([#18205](https://github.com/sveltejs/svelte/pull/18205)) and "abort running obsolete async branches" ([#18118](https://github.com/sveltejs/svelte/pull/18118)). Components relying on the old blocking semantics may render intermediate states differently; this is behavioural, not syntactic.
- New warnings that surface as svelte-check noise rather than bugs: 5.57.0 warns on undeclared shorthand event handlers on `<svelte:window>`/`<svelte:document>`/`<svelte:body>` ([#18480](https://github.com/sveltejs/svelte/pull/18480)) and reports `derived_invalid_export` for `export let x = $derived(...)` in runes mode ([#18692](https://github.com/sveltejs/svelte/pull/18692)). 5.56.x adds `state_referenced_locally` and reactivity-loss warning fixes.
- Legacy syntax (`on:`, `<slot>`, `export let`) in `packages/ui/src/legacy/**` and `nav.svelte`: the [legacy overview](https://svelte.dev/docs/svelte/legacy-overview) says these features are "deprecated (though supported for now, unless otherwise specified) and will eventually be removed"; the [v5 migration guide](https://github.com/sveltejs/svelte/blob/main/documentation/docs/07-misc/07-v5-migration-guide.md) says "the `on:event` syntax is still supported and behaves the same as in Svelte 4" and slots "continue to work, however, and you can pass snippets to a component that uses slots", while "you cannot pass slotted content to a component that uses `{@render ...}` tags". No 5.5x release changes this. The only new failure mode is 5.57.0's `derived_invalid_export` if a runes-mode file still uses `export let` with `$derived`.
- vite-plugin-svelte 7 requires Svelte >= 5.46.4 for a "stable css hash" ([#1271](https://github.com/sveltejs/vite-plugin-svelte/pull/1271)); the pin already satisfies this.

### SvelteKit 2.50.2 to 2.70.3

Source: [packages/kit/CHANGELOG.md](https://github.com/sveltejs/kit/blob/main/packages/kit/CHANGELOG.md); config semantics from the [configuration reference](https://svelte.dev/docs/kit/configuration) and [remote functions docs](https://svelte.dev/docs/kit/remote-functions).

Flag status: `kit.experimental.remoteFunctions` remains an experimental boolean (default `false`; "This feature is not yet stable and may be changed or removed at any time"). The remote functions page still instructs adding both `kit.experimental.remoteFunctions: true` and `compilerOptions.experimental.async: true`, and notes "Available since 2.27". Neither was renamed or stabilised in 2.70.3.

Entries labelled `breaking` in the range, all in remote functions:

| Version | Change | Trident exposure |
| --- | --- | --- |
| 2.56.0 | "rework client-driven refreshes" ([#15562](https://github.com/sveltejs/kit/pull/15562)): `await cmd().updates(q1(), q2().withOverride(...))` no longer lets the client pick queries; server must opt in via `requested(query, limit)`. Also "stabilize remote function caching by sorting object keys" ([#15570](https://github.com/sveltejs/kit/pull/15570)) and "isolate command-triggered query refresh failures per-query" | None found: no `.updates(`/`.withOverride(` in source |
| 2.56.0 | "add `run()` method to queries, disallow awaiting queries outside render" ([#15533](https://github.com/sveltejs/kit/pull/15533)) | Reversed in 2.61.0; skipping straight to 2.70.3 never hits it |
| 2.58.0 | "require `limit` in `requested`"; "`requested` now yields `{ arg, query }` entries" ([#15739](https://github.com/sveltejs/kit/pull/15739)) | None: no `requested(` in source |
| 2.59.0 | server-side `refresh` promise now resolves when the refresh is queued, not when it completes ([#15705](https://github.com/sveltejs/kit/pull/15705)); adds experimental `query.live` | Check any server code that awaits `.refresh()` expecting completion (none found by grep) |
| 2.61.0 | "`.run()` method has been removed from remote queries"; "remote queries can now be awaited in any context" ([#15779](https://github.com/sveltejs/kit/pull/15779)) | None: no `.run()` in source; this is a relaxation for existing `await query()` code |

Other changes worth knowing: Vite 8 support ([2.53.0, #15024](https://github.com/sveltejs/kit/pull/15024)) with `rolldownVersion` detection in `src/exports/vite/index.js` and `codeSplitting` handling fixes in 2.53.1 to 2.67.0; TypeScript 6.0 support ([2.56.0, #15595](https://github.com/sveltejs/kit/pull/15595)); `sveltekit()` accepts config directly ([2.62.0](https://github.com/sveltejs/kit/pull/15944)); explicit env vars via `src/env.ts` behind `kit.experimental.explicitEnvironmentVariables` ([2.63.0](https://github.com/sveltejs/kit/pull/15934), `defineEnvVars` moved to `@sveltejs/kit/env` in 2.70.0); `prerender.handleInvalidUrl` ([2.67.0](https://github.com/sveltejs/kit/pull/16088)); remote responses now send `cache-control: private, no-store` ([2.65.2, #16020](https://github.com/sveltejs/kit/pull/16020)); server-side error boundaries (2.54.0). 2.54.0 removed the deprecation warnings for `config.kit.files.*`.

Peer ranges (npm, 2.70.3): `vite ^5.0.3 || ^6 || ^7.0.0-beta.0 || ^8`, `@sveltejs/vite-plugin-svelte ^3 || ^4.0.0-next.1 || ^5 || ^6.0.0-next.0 || ^7`, `typescript ^5.3.3 || ^6.0.0`. Kit 2.70.3 therefore works on both Vite 7 + vps 6 and Vite 8 + vps 7. SvelteKit 3.0.0-next.27 (npm `next` tag) declares `vite ^8.0.12`, `svelte ^5.56.4`, `typescript ^6.0.0`, `@sveltejs/vite-plugin-svelte ^7.0.0`; no SvelteKit 3 migration page exists yet (svelte.dev returns 404). Not a target for this effort.

### @sveltejs/adapter-vercel 6.3.1 to 6.3.4

Source: [packages/adapter-vercel/CHANGELOG.md](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/CHANGELOG.md), [adapter-vercel docs](https://svelte.dev/docs/kit/adapter-vercel), [index.d.ts](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/index.d.ts), Vercel [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [Node 20 deprecation changelog](https://vercel.com/changelog/node-js-20-is-being-deprecated).

- Patches only: 6.3.2 fixes 404s for immutable assets not matching static files; 6.3.3 stops copying Vercel build-environment system files; 6.3.4 prevents missing immutable assets being cached as 404 for a year ([#16077](https://github.com/sveltejs/kit/pull/16077)). No ISR or image config changes in the range.
- `runtime` option: docs say "This option is deprecated and will be removed in a future version, at which point all your functions will use whichever Node version is specified in the project configuration on Vercel." `index.d.ts` on main documents `'nodejs22.x'`, `'nodejs24.x'` as examples. Vercel lists available versions 24.x (default), 22.x, 20.x; Node 20 is disabled for new deployments on October 1, 2026. Trident's `nodejs22.x` remains valid; the forward-compatible move is to drop `runtime` and set Node in the Vercel project (or `engines.node`).
- adapter-vercel 7.0.0-next.9 exists only for `@sveltejs/kit ^3.0.0-next.0`; not applicable.

### @sveltejs/vite-plugin-svelte 6.2.4 to 7.3.0, and the inspector package

Source: [vite-plugin-svelte CHANGELOG](https://github.com/sveltejs/vite-plugin-svelte/blob/main/packages/vite-plugin-svelte/CHANGELOG.md), [docs/config.md](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md), [docs/inspector.md](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/inspector.md), [src/index.js](https://github.com/sveltejs/vite-plugin-svelte/blob/main/packages/vite-plugin-svelte/src/index.js).

7.0.0 (2026-02-23) major changes, verbatim from the changelog:

- "breaking(deps): require vite 8" ([#1266](https://github.com/sveltejs/vite-plugin-svelte/pull/1266)). npm peer: `vite ^8.0.0-beta.7 || ^8.0.0`, `svelte ^5.46.4`, engines `node ^20.19 || ^22.12 || >=24`.
- "breaking(options): remove deprecated options" ([#1274](https://github.com/sveltejs/vite-plugin-svelte/pull/1274)): `vitePlugin.hot` (use `compilerOptions.hmr`), `vitePlugin.ignorePluginPreprocessors`, `api.idFilter` (use `api.filter`), `plugin.api.sveltePreprocess` of other plugins. Trident's configs set none of these (grep found only `inspector`).
- "breaking(dev): no longer overrides compilerOptions.cssHash because Svelte now produces a stable css hash by itself" ([#1271](https://github.com/sveltejs/vite-plugin-svelte/pull/1271)).
- "breaking(inspector): integrate vite-plugin-svelte-inspector into vite-plugin-svelte to avoid circular dependency" ([#1270](https://github.com/sveltejs/vite-plugin-svelte/pull/1270)). `src/index.js` on main imports `svelteInspector` from `./plugins/inspector/index.js`, and 7.3.0's npm dependency list has no inspector package. `vitePlugin.inspector: true` remains the documented way to enable it (config.md, inspector.md). The standalone `@sveltejs/vite-plugin-svelte-inspector@5.0.2` declares peers `vite ^6.3.0 || ^7.0.0` and `@sveltejs/vite-plugin-svelte ^6.0.0-next.0`, so it must be removed from Trident's dependencies when moving to vps 7 or it will produce unmet-peer warnings and duplicate inspector wiring.
- 7.1.x to 7.3.0 are additive: server-environment optimizer in dev (7.1.0), `vitePreprocess` passes `typescript.onlyRemoveTypeImports` to `transformWithOxc` (7.1.1, relevant because Oxc replaces esbuild for TS stripping), inspector fixes for Vite+ (7.1.3), inspector context menu (7.2.0), environment passed to `dynamicCompileOptions` (7.3.0).

### @sveltejs/package 2.5.7 to 2.5.8

Source: [packages/package/CHANGELOG.md](https://github.com/sveltejs/kit/blob/main/packages/package/CHANGELOG.md). One patch: "bump `svelte2tsx` dependency to support TypeScript 6" ([#15896](https://github.com/sveltejs/kit/pull/15896)). Peer `svelte ^3.44 || ^4 || ^5.0.0-next.1`. Nothing affects the dual `/src` and `/dist` exports. `@sveltejs/package` 3.0.0-next.8 is a kit-3-era prerelease; not applicable.

### Vite 7.3.1 to 8.3.0

Source: [Migration from v7](https://github.com/vitejs/vite/blob/main/docs/guide/migration.md) and the [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) (2026-03-12).

- Node requirement unchanged from Vite 7: `^20.19.0 || >=22.12.0` (npm engines for 8.3.0). Local Node 24 and Vercel Node 22/24 both qualify.
- Bundler: "Vite 8 uses Rolldown and Oxc based tools instead of esbuild and Rollup." vite 8.3.0 depends on `rolldown ~1.2.6`. Automatic compatibility shims exist for `optimizeDeps.esbuildOptions` (now `optimizeDeps.rolldownOptions`), the `esbuild` option (now `oxc`), and `build.rollupOptions` (renamed `build.rolldownOptions`, deprecated); Trident's vite configs use none of these.
- Default browser targets move to Chrome/Edge 111, Firefox 114, Safari 16.4.
- JS minification by Oxc minifier; CSS minification by Lightning CSS by default. Property mangling and `esbuild.supported` are not supported; `esbuild` becomes an optional dependency that must be installed explicitly if any plugin calls `transformWithEsbuild`.
- "Consistent CommonJS Interop": the `default` import from CJS modules now follows a single rule in dev and build; "This change may break some existing code importing CJS modules", with `legacy.inconsistentCjsInterop: true` as a temporary escape hatch. This is the most likely runtime surprise for `three`, `globe.gl` and d3 subpackages pulled in by layerchart; unverified for those packages specifically.
- Removed: format-sniffing between `browser` and `module` fields; object-form `manualChunks` (function form deprecated in favour of `codeSplitting`); `build.rollupOptions.watch.chokidar`; passing a URL to `import.meta.hot.accept`. `build.commonjsOptions` is a no-op.
- Plugin ecosystem readiness as of the pins vs current: `@tailwindcss/vite` gained Vite 8 support in [4.2.2](https://github.com/tailwindlabs/tailwindcss/pull/19790) (peer `^5.2.0 || ^6 || ^7 || ^8` at 4.3.3; 4.1.18 is `^5.2.0 || ^6 || ^7`). `vite-plugin-devtools-json` 1.1.0 peers `^5 || ^6 || ^7 || ^8` (1.0.0 stops at ^7). `unplugin-icons` has no Vite peer. `@storybook/sveltekit@10.2.7` peers `vite ^5.0.0 || ^6.0.0 || ^7.0.0`; `@storybook/sveltekit@10.6.0` peers `^5 || ^6 || ^7 || ^8`.

### Tailwind CSS 4.1.18 to 4.3.3 (and plugins)

Source: [CHANGELOG.md](https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md).

- No breaking entries. Deprecated in 4.2.0: `start-*` and `end-*` in favour of `inset-s-*`/`inset-e-*` ([#19613](https://github.com/tailwindlabs/tailwindcss/pull/19613)); 4.3.0 makes valueless `start`/`end` generate nothing ([#20003](https://github.com/tailwindlabs/tailwindcss/pull/20003)).
- Changed output in 4.3.1: `m-0`/`left-0` now emit `0` instead of `calc(var(--spacing) * 0)`, and `m-1` emits `var(--spacing)` ([#20196](https://github.com/tailwindlabs/tailwindcss/pull/20196)). Only matters to CSS snapshot tests or code that parses generated CSS.
- 4.2.0 adds new default palettes (mauve, olive, mist, taupe), logical-property utilities, `@tailwindcss/webpack`; 4.3.0 adds `@container-size`, scrollbar, `zoom-*`, `tab-*` utilities and stacked/compound `@variant`. Adding palette names can shadow custom `--color-mauve`-style theme tokens if Trident defines any (unverified; grep `--color-(mauve|olive|mist|taupe)` before upgrading).
- Vite 8 support landed in 4.2.2; several `@tailwindcss/vite` resolution fixes for `@import`/`@plugin` paths and aliases in 4.2.4 to 4.3.0; `@tailwindcss/postcss` rebuild and ESM-types fixes in 4.3.x. Node 26 deprecation warning fix in 4.3.1.
- `@tailwindcss/forms` 0.5.11 is unchanged; `@tailwindcss/typography` 0.5.20 (2026-06-08) is a patch. Neither has a 4.3-specific requirement recorded; unverified beyond npm metadata.

### svelte-check 4.3.6 to 4.7.6

Source: [packages/svelte-check/CHANGELOG.md](https://github.com/sveltejs/language-tools/blob/master/packages/svelte-check/CHANGELOG.md).

- TypeScript 6.0 support in 4.4.6/4.4.8; "support TypeScript 7 Stable under npm alias" in 4.7.4 ([#3073](https://github.com/sveltejs/language-tools/pull/3073), which adds a version check that errors on TS 7 loaded directly; the author notes `svelte-kit sync` and typescript-eslint may still have issues).
- `--incremental` and `--tsgo` flags (4.4.0), `--tsgo-experimental-api` (4.7.0), `--config` (4.7.0), Svelte 5 declaration tags (4.5.0), reading Svelte config from `vite.config.js/ts` (4.6.0), zero-config `+error.svelte` props (4.7.3), "handle SvelteKit 3 having its config merged at the top level" (4.7.6).
- Peers at 4.7.6: `svelte ^4 || ^5.0.0-next.0`, `typescript ^5.0.0 || ^6.0.0`.

### TypeScript 5.9.3 to 6.0.3 / 7.0.2

Source: [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) (2026-03-23) and [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) (2026-07-08).

- 6.0 changed defaults: `strict` true, `module` esnext, `target` es2025, `types` `[]`, `noUncheckedSideEffectImports` true, `libReplacement` false, `rootDir` = tsconfig directory. Deprecated (error unless `ignoreDeprecations: "6.0"`): `baseUrl`, `moduleResolution node`/`node10`, `target es5`, `downlevelIteration`, `alwaysStrict false`, `esModuleInterop false`, import `asserts`. Removed: `moduleResolution classic`, `module amd/umd/systemjs/none`, `outFile`, `/// <reference no-default-lib>`.
- Trident's root `tsconfig.json` has `"moduleResolution": "node"` and `"ignoreDeprecations": "6.0"`, which is exactly the 6.0 escape hatch. Per the 6.0 post, `ignoreDeprecations: "6.0"` "will not work in TypeScript 7.0, which removes all deprecated features entirely". Replace `node` with `bundler` (or `nodenext`, as `packages/tools/tsconfig.json` already does) and delete `ignoreDeprecations` before any 7.x attempt. Verify `types: []` default does not drop ambient types the apps relied on being auto-included.
- 7.0 is the Go compiler. "No programmatic API ships with 7.0; tools requiring one (like Volar for Vue/Svelte) must continue using TypeScript 6.0. The team plans an API release with version 7.1." Kit 2.70.3's peer range excludes 7; svelte-check accepts 7 only through the alias route. Practical ceiling for Trident today: `typescript@^6.0.3`, optionally with `@typescript/typescript6` alias tricks per the 7.0 post if 7 is wanted for `tsc --build` only. TS 7's `--builders` flag parallelises project-reference builds, which Trident's root `references` would benefit from once tooling allows.

### pnpm 9.15.4 to 12.4.2

Source: GitHub releases [v10.0.0](https://github.com/pnpm/pnpm/releases/tag/v10.0.0), [v11.0.0](https://github.com/pnpm/pnpm/releases/tag/v11.0.0), [v12.0.0](https://github.com/pnpm/pnpm/releases/tag/v12.0.0); docs [settings/build](https://pnpm.io/settings/build), [settings/cli](https://pnpm.io/settings/cli), [migration guide](https://pnpm.io/migration).

- v10 (2025-01-07): dependency lifecycle scripts no longer run by default; allow via `pnpm.onlyBuiltDependencies` (Trident already has this block, so the v9 to v10 step is quiet). `manage-package-manager-versions` on by default, so `packageManager` in `package.json` drives the pnpm version. Hoisting default changed (nothing auto-hoisted). Lockfile v6 conversion removed. SHA256 hashing for long paths and lockfile checksums; `@yarnpkg/extensions` bump "may alter your lockfile".
- v11 (2026-04-28): "Node.js 22+ required"; pure ESM. "`allowBuilds` replaces the old build-dependency settings", and `onlyBuiltDependencies`, `onlyBuiltDependenciesFile`, `neverBuiltDependencies`, `ignoredBuiltDependencies`, `ignoreDepScripts` are removed ([#11220](https://github.com/pnpm/pnpm/pull/11220)). "pnpm no longer reads settings from the `pnpm` field of `package.json`. Settings should be defined in `pnpm-workspace.yaml`" ([#10086](https://github.com/pnpm/pnpm/pull/10086)). `.npmrc` is auth/registry only; other settings move to `pnpm-workspace.yaml`. `managePackageManagerVersions`, `packageManagerStrict`, `packageManagerStrictVersion` removed in favour of `pmOnFail` (`download` default). New defaults: `minimumReleaseAge: 1440` ("Newly published packages will not be resolved until they are at least 1 day old"; opt out with `minimumReleaseAge: 0`), `verifyDepsBeforeRun: install`, `optimisticRepeatInstall: true`. Lockfile: `patchedDependencies` entries simplified, auto-migrated ([#10911](https://github.com/pnpm/pnpm/pull/10911)).
- v12 (2026-08-26): unrecognised keys in `pnpm-workspace.yaml` fail with `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` when the project pins a matching pnpm version; canonical peer-cycle breaking ("Existing lockfiles keep working... The first install that actually re-resolves... re-keys walk-order-dependent peer variants"); `--frozen-lockfile false` removed (use `--no-frozen-lockfile`); git dependencies on known hosts canonicalised to HTTPS; `engineStrict` enforced through regular dependency edges.
- Lockfile version: none of the three release notes declares a lockfileVersion bump. pnpm's own `main` branch, pinned to `pnpm@12.5.1`, still has `lockfileVersion: '9.0'` in `pnpm-lock.yaml` (observed 2026-09-18). Treat "still 9.0" as observed, not documented.
- Migration tooling: the [migration guide](https://pnpm.io/migration) provides `pnpx codemod run pnpm-v10-to-v11`, which "Moves settings out of `package.json#pnpm` into `pnpm-workspace.yaml`", merges the build-dependency lists into `allowBuilds`, collapses strictness settings into `pmOnFail`, and bumps `packageManager`. Manual: rename any `npm_config_*` env usage to `pnpm_config_*` in CI; `pnpm link` needs paths; scripts named `clean`, `setup`, `deploy`, `rebuild` now shadow built-ins.
- Vercel: builds run whatever `packageManager` pins, so the pin change flips the Vercel install to pnpm 12 in the same deploy. Unverified whether Vercel's build image needs anything beyond the field; pnpm 11+ needs Node 22+, which Vercel's 22.x/24.x images satisfy.

### Turborepo 2.8.3 to 2.11.2

Source: GitHub releases [v2.9.0](https://github.com/vercel/turborepo/releases/tag/v2.9.0) (2026-03-30), [v2.10.0](https://github.com/vercel/turborepo/releases/tag/v2.10.0) (2026-06-24), [v2.11.0](https://github.com/vercel/turborepo/releases/tag/v2.11.0) (2026-09-18); [configuration reference](https://turborepo.dev/docs/reference/configuration).

- No `turbo.json` keys were removed. The reference marks `daemon` as "Deprecated: The daemon is no longer used for `turbo run` and this option will be removed in version 3.0" (2.9.0 "Remove daemon from `turbo run`, deprecate daemon flags and config"). 2.9.0 also deprecates `turbo-ignore` (use `turbo query affected`), `--parallel` (use `concurrency`), graphviz `--graph` formats, `turbo scan`, and `--scope` for `turbo prune`. Trident's `turbo.json` uses `tasks`, `dependsOn`, `cache`, `persistent`, `interruptible`, `inputs`, `outputs` only, all current.
- Opt-in future flags added in 2.9.0: `affectedUsingTaskInputs`, `filterUsingTasks`, `longerSignatureKey`, `global` config behind `futureFlags.globalConfiguration` (which "redefines `globalDependencies` as `global.inputs`"). Defaults unchanged until 3.0.
- Schema: 2.9.0 adds `allowComments`/`allowTrailingCommas`; 2.10.0 codemods rewrite `$schema` to versioned URLs and support `turbo.jsonc`. The docs domain moved to turborepo.dev (turborepo.com redirects with 301); the `$schema` URL in Trident's `turbo.json` still resolves via redirect, but `npx @turbo/codemod migrate` will rewrite it.
- Package-manager support: 2.10.0 "Support pnpm v11 multi-document lockfiles" and "flat patch lockfiles"; 2.11.0 adds `devEngines.packageManager` (including semver ranges), Corepack `packageManager` integrity hashes, and a pnpm lockfile parsing overhaul. Turbo <= 2.9 has no stated pnpm 11 lockfile support, so Turbo must reach 2.10+ before or together with pnpm 11+.
- 2.10.0 adds `cacheMaxAge`/`cacheMaxSize` local-cache eviction; 2.11.0 removes "incremental task caching" (an internal flag) and the `devtools` feature flag. Neither is referenced by Trident.

### Storybook 10.2.7 to 10.6.0 (frozen, report only)

Current stable 10.6.0, published 2026-09-02 (npm). `@storybook/sveltekit@10.6.0` peers `vite ^5 || ^6 || ^7 || ^8`, `storybook ^10.6.0`; `@storybook/sveltekit@10.2.7` peers `vite ^5 || ^6 || ^7`. No migration steps by request.

### Smaller dependencies

- unplugin-icons 23.0.1 to 24.0.0 ([release](https://github.com/unplugin/unplugin-icons/releases/tag/v24.0.0), 2026-09-11): one breaking entry, "Add Iconify FileSystemHMRIconLoader support" ([#440](https://github.com/unplugin/unplugin-icons/issues/440)); details of what breaks are not stated in the notes (unverified beyond the label). Svelte peer unchanged (`^3 || ^4 || ^5`).
- vite-plugin-devtools-json 1.0.0 to 1.1.0: adds Vite 8 to the peer range; no changelog entry located (unverified).
- runed 0.37.1 and mode-watcher 1.1.0: already current. runed peers `svelte ^5.7.0`, `@sveltejs/kit ^2.21.0`, `zod ^4.1.0`; mode-watcher `svelte ^5.27.0`.
- layerchart 2.0.0-next.43 to 2.5.0: the [2.0.0 release](https://github.com/techniq/layerchart/releases/tag/layerchart%402.0.0) (2026-07-01) lists breaking renames relative to v1 (`get*Context()` to `getChartContext()`, `bind:brushContext` to `bind:state`, `getRenderContext` to `getLayerContext`, `GeoContext` to `GeoProjection`, `Connector` merged into `Link`, `isVertical` to `valueAxis`, `tooltipContext` to `tooltip`, `domainExtent: 'original'` to `'data'`, default styles shipped with Tailwind 4 optional) and links the [v1-to-v2 guide](https://layerchart.com/docs/guides/migrations/v1-to-v2). Which of these landed after `next.43` is unverified; audit Trident's chart components against that list.
- three 0.182.0 to 0.186.0: the [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) lists per-release breaks, notably r183 `Clock` deprecated (use `Timer`), `PostProcessing` renamed `RenderPipeline`; r184 `FileLoader.load()`/`ImageBitmapLoader.load()` return nothing (use `onLoad`), environment/background rotation aligned; r185 `Object3D.updateWorldMatrix()` honours `matrixWorldNeedsUpdate`, TSL renames; r186 `Source` renamed `TextureSource`, `Object3D.dispose()` added, `PCFSoftShadowMap` removed for WebGPU, `Sky` `up` uniform removed. globe.gl 2.46.2 depends on `three: >=0.179 <1` (npm), so 0.186.0 is within its declared range; behavioural compatibility with the r183 to r186 changes is unverified.
- @sparticuz/chromium-min 143.0.4 to 153.0.0 and puppeteer-core 24.38.0 to 25.11.0 (apps/app): puppeteer's [supported browsers table](https://pptr.dev/supported-browsers) pairs Chrome 143.0.7499.192 with Puppeteer v24.35.0 and Chrome 153.0.8010.36 with Puppeteer v25.11.0, and chromium-min 153.0.0 ships Chromium 153.0.8010.36 ([release](https://github.com/Sparticuz/chromium/releases/tag/v153.0.0)), so the two must move together. puppeteer-core 25.0.0 ([release](https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-core-v25.0.0), 2026-05-12): "bump min NodeJS to 22", "move packages to ESM only", `executablePath` and `defaultArgs` now return Promises, removed `Puppeteer.product`, `MouseOptions.clickCount`, `Browser.isConnected()`, cookie `sameParty`. chromium-min 153.0.0 engines `node ^22.17.0 || >=24.0.0`, which is satisfied by Vercel's 22.x/24.x runtimes.

## Recommended upgrade order

| Step | Upgrade | Why here | Safe to combine |
| --- | --- | --- | --- |
| 1 | turbo 2.8.3 to 2.11.2; run `npx @turbo/codemod migrate` | No schema removals; needed for pnpm 11+ lockfile parsing (2.10.0) and `devEngines`/Corepack hashes (2.11.0). Independent of the framework stack. | Alone, or with step 2 |
| 2 | pnpm 9.15.4 to 12.4.2 via `pnpx codemod run pnpm-v10-to-v11`; set `minimumReleaseAge: 0` (or accept the 24 h delay) in `pnpm-workspace.yaml`; move `onlyBuiltDependencies` to `allowBuilds`; bump `packageManager` | Do the package-manager cut on an otherwise unchanged dependency set so a re-resolved lockfile diff is attributable to pnpm alone. Node 22+ satisfied locally and on Vercel. | With step 1; do not combine with dependency bumps |
| 3 | typescript 5.9.3 to 6.0.3; change root `moduleResolution` to `bundler`; drop `ignoreDeprecations`; pin `types` explicitly where needed; svelte-check to 4.7.6; @sveltejs/package to 2.5.8 | Kit 2.56+, svelte-check 4.4.8+ and @sveltejs/package 2.5.8 all declare TS 6 support; TS 7 is excluded by kit's peer range and has no API for svelte-check. Resolving the `moduleResolution` deprecation now removes the `ignoreDeprecations` dependency. | Together as one "typecheck" PR |
| 4 | svelte 5.50.0 to 5.57.1; @sveltejs/kit 2.50.2 to 2.70.3; @sveltejs/adapter-vercel 6.3.1 to 6.3.4; tailwindcss + @tailwindcss/vite + @tailwindcss/postcss 4.1.18 to 4.3.3; @tailwindcss/typography 0.5.20; unplugin-icons 24.0.0; vite-plugin-devtools-json 1.1.0; runed/mode-watcher unchanged | All of these support Vite 7 and vps 6, so they land without touching the bundler. Kit's remote-function breaks do not touch APIs Trident uses; the async "merging" strategy change is the behaviour to smoke-test. Tailwind 4.2.2+ is a prerequisite for step 5. | Together; keep Vite 7 |
| 5 | vite 7.3.1 to 8.3.0 and @sveltejs/vite-plugin-svelte 6.2.4 to 7.3.0 (atomic pair); remove `@sveltejs/vite-plugin-svelte-inspector`; keep `vitePlugin.inspector: true`; also bump `apps/storybook` only if Storybook is unfrozen (see blockers) | vps 7 requires Vite 8 and Vite 8 needs plugin support from steps 4. Kit 2.53+ already handles Rolldown. Test CJS default-import behaviour for three/globe.gl/d3 and compare minified output. | The pair must move together; keep everything else fixed |
| 6 | Optional, per-package: layerchart 2.5.0, three 0.186.0 + globe.gl 2.46.2, puppeteer-core 25.11.0 + @sparticuz/chromium-min 153.0.0, adapter-vercel `runtime` removal (or `nodejs24.x`) | Each has its own breaking surface (layerchart renames, three per-release breaks, puppeteer ESM/async API, Node 24 default). Isolate so regressions are attributable. | Each on its own |

Reasoning for the ordering: tooling (turbo, pnpm) first because both are independent of the Svelte stack and their lockfile churn is easier to review before dependency bumps; TypeScript next because it gates svelte-check and kit's peer ranges and removes the `ignoreDeprecations` debt; the Svelte/Kit/Tailwind band next because every package in it works on both Vite majors, which leaves Vite 8 as an isolated, reversible last step.

## Hard blockers for the Vite 8 migration

1. Storybook freeze. `@storybook/sveltekit@10.2.7` declares `vite: ^5.0.0 || ^6.0.0 || ^7.0.0`. With Storybook frozen, `apps/storybook` cannot declare Vite 8; either that app stays on Vite 7 + vps 6 (pnpm allows per-workspace versions, but `packages/ui` is consumed from `/src` by Storybook and would be compiled by two different plugin majors) or the freeze is lifted to 10.6.0, whose `@storybook/sveltekit` peers include `^8.0.0`.
2. `@sveltejs/vite-plugin-svelte` 7 has no Vite 7 mode and vps 6 has no Vite 8 mode (peers `^6.3.0 || ^7.0.0`). The bundler and plugin must be bumped in the same commit across every app and `packages/ui`.
3. `@sveltejs/vite-plugin-svelte-inspector@5.0.2` peers `vite ^6.3.0 || ^7.0.0` and `@sveltejs/vite-plugin-svelte ^6.0.0-next.0`; it must be removed, not bumped (there is no 6.x/7.x of it; the inspector is built into vps 7).
4. Prerequisite floors: `@tailwindcss/vite` >= 4.2.2, `vite-plugin-devtools-json` >= 1.1.0, `@sveltejs/kit` >= 2.53.0 (2.67.0 recommended for the `codeSplitting` fixes), `svelte` >= 5.46.4. Steps 3 and 4 above satisfy all of these.
5. Not a blocker but a caution: Vite 8's consistent CJS default-import rule can change runtime behaviour of CJS-shaped dependencies without a build error; `legacy.inconsistentCjsInterop: true` exists as a temporary fallback.

## Not blockers, but flagged

- pnpm 11+ `minimumReleaseAge: 1440` will refuse to resolve packages published within the last day. On the day of this report that includes svelte 5.57.1 and turbo 2.11.x. Set `minimumReleaseAge: 0` in `pnpm-workspace.yaml` for the upgrade window or wait 24 hours.
- Both experimental flags survive every upgrade in this plan. Svelte states the async flag disappears only in Svelte 6; SvelteKit gives no date for `remoteFunctions`. Kit 3.0.0-next exists but has no migration guide; nothing in this plan targets it.
- The `runtime: "nodejs22.x"` adapter option is deprecated but still accepted; Node 20 (not used) is disabled on Vercel from October 1, 2026.

## Sources

- Svelte changelog: https://github.com/sveltejs/svelte/blob/main/packages/svelte/CHANGELOG.md; await expressions: https://svelte.dev/docs/svelte/await-expressions; legacy overview: https://svelte.dev/docs/svelte/legacy-overview; v5 migration guide: https://github.com/sveltejs/svelte/blob/main/documentation/docs/07-misc/07-v5-migration-guide.md
- SvelteKit changelog: https://github.com/sveltejs/kit/blob/main/packages/kit/CHANGELOG.md; configuration: https://svelte.dev/docs/kit/configuration; remote functions: https://svelte.dev/docs/kit/remote-functions; PRs #15562, #15779; Vite plugin source: https://github.com/sveltejs/kit/blob/main/packages/kit/src/exports/vite/index.js
- adapter-vercel changelog: https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/CHANGELOG.md; docs: https://svelte.dev/docs/kit/adapter-vercel; index.d.ts: https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/index.d.ts; Vercel Node versions: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions; Node 20 deprecation: https://vercel.com/changelog/node-js-20-is-being-deprecated
- @sveltejs/package changelog: https://github.com/sveltejs/kit/blob/main/packages/package/CHANGELOG.md
- vite-plugin-svelte changelog: https://github.com/sveltejs/vite-plugin-svelte/blob/main/packages/vite-plugin-svelte/CHANGELOG.md; config: https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md; inspector: https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/inspector.md
- Vite migration: https://github.com/vitejs/vite/blob/main/docs/guide/migration.md; announcement: https://vite.dev/blog/announcing-vite8
- Tailwind changelog: https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md
- svelte-check changelog: https://github.com/sveltejs/language-tools/blob/master/packages/svelte-check/CHANGELOG.md; PR #3073
- TypeScript 6.0: https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/; 7.0: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- pnpm releases v10.0.0, v11.0.0, v12.0.0: https://github.com/pnpm/pnpm/releases; settings: https://pnpm.io/settings/build, https://pnpm.io/settings/cli; migration: https://pnpm.io/migration; pnpm repo lockfile header and package.json on main (observed)
- Turborepo releases v2.9.0, v2.10.0, v2.11.0: https://github.com/vercel/turborepo/releases; configuration: https://turborepo.dev/docs/reference/configuration
- unplugin-icons v24.0.0: https://github.com/unplugin/unplugin-icons/releases/tag/v24.0.0
- layerchart 2.0.0: https://github.com/techniq/layerchart/releases/tag/layerchart%402.0.0
- three.js migration guide: https://github.com/mrdoob/three.js/wiki/Migration-Guide
- puppeteer-core 25.0.0: https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-core-v25.0.0; supported browsers: https://pptr.dev/supported-browsers; @sparticuz/chromium v153.0.0: https://github.com/Sparticuz/chromium/releases/tag/v153.0.0
- npm registry metadata (`npm view <pkg> version time peerDependencies engines`) read 2026-09-18 for every version, date, peer range and engines claim.

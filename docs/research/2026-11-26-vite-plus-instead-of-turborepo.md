# Can Vite+ replace Turborepo now?

Observed November 26, 2026 (America/Chicago). Research for "🔎 repo: Check if Vite+ can replace Turborepo now" ([#364](https://github.com/layerdbiz/tridentcubed/issues/364)). It follows "Vite+ fit for Trident's toolchain" (`docs/research/2026-09-18-vite-plus-fit-for-trident.md`, #10), which looked at the 0.3.3 beta and kept Turborepo, and the toolchain decision on #12. It changes nothing in the repo.

Three kinds of source, each marked where it is used:

- **Docs and source**: viteplus.dev, the docs folder shipped inside `vite-plus` 1.0.0 and 1.8.0, voidzero.dev posts, github.com/voidzero-dev issues and releases, vercel.com/docs, the vercel/vercel source, turborepo.dev and the npm registry, all read 2026-11-26.
- **Build logs**: this repo's Vercel deployments, read through the Vercel API on 2026-11-26.
- **Trial**: a throwaway copy of `origin/next` (91cef05) in a cloud session's scratch folder, installed with `pnpm install --frozen-lockfile`, run with the repo's own `vite-plus` 1.0.0, plus a small throwaway workspace on 1.8.0. Nothing from either was pushed.

## Short answer

**Yes, Vite+ can take over from Turborepo here, in three small steps, and nothing gets slower.** The pieces Vite+ still lacks (a remote cache, a "persistent" task flag, a task dashboard, a `turbo.json` converter) are real gaps for big monorepos, but none of them does any work in this repo today:

- On Vercel, Turborepo's remote cache saved **nothing** in the last four dev builds read (`Cached: 0 cached, 3 total` every time). What Turbo did do was build the UI package first, about **7 s** of each build, which no app reads, because every app uses the UI source directly.
- What keeps Vercel at 30 to 45 s is Vercel's own build cache and its "skip unaffected projects" switch. Neither needs Turborepo.
- GitHub CI does not run Turborepo at all.
- On your PC, Turborepo only starts the barrels watcher beside `vp dev` and runs builds in order. Vite+ 1.0.0 did both in the trial, and cached the app build (34 s, then 3 s).

Vite+ also replaces Husky and lint-staged (`vp hooks`, `vp staged`); the repo has neither today. It does **not** do version numbers, tags, changelogs or GitHub Releases: that stays with "Add releases, versions and changelogs" (#157).

## 1. Where Vite+ is now

| Fact | Source |
| --- | --- |
| Latest `vite-plus` is **1.8.0** (2026-11-24). 1.0.0 was 2026-09-28; ten releases since, about one minor a week. The repo pins 1.0.0 (`pnpm-workspace.yaml` catalog). | npm registry |
| The 1.0 post calls it "stable" and says it "is far from feature-complete. Functionality such as remote caching, deeper monorepo diagnostics, `vp release`, and `vp docs` are planned for future versions." It lists `turbo` among the dependencies Vite+ replaces. No semver policy is published, and minors still change lint results (1.2.0: Oxlint and Oxfmt "may flag code that passed before"). | [Announcing Vite+ 1.0](https://voidzero.dev/posts/announcing-vite-plus-1-0) (2026-09-28); [releases](https://github.com/voidzero-dev/vite-plus/releases) |
| VoidZero joined Cloudflare; the projects stay MIT. | [VoidZero is Joining Cloudflare](https://voidzero.dev/posts/voidzero-cloudflare) (2026-06-04) |
| The Q4 2026 plan says Vite Task (`vp run`) "is intended to replace Turborepo and Nx", with "P0: Release Vite Task Remote Caching" on a Cloudflare Workers service. The tracking issue has 0 of 10 sub-issues done and the server repo says "not ready for use". | [vite-plus #3277](https://github.com/voidzero-dev/vite-plus/issues/3277) (2026-10-29); [vite-task #930](https://github.com/voidzero-dev/vite-task/issues/930); `voidzero-dev/vite-plus-remote-cache-cloudflare` README |
| There is no Turborepo migration. Since 1.7.0, `vp migrate` only warns: "Turborepo detected. Task orchestration and caching were not migrated. vp run does not read Turborepo configuration." | vite-plus 1.8.0 source; [migrate-rules](https://viteplus.dev/guide/migrate-rules) |

## 2. What Turborepo does in this repo today

| Where | What Turborepo does | Evidence |
| --- | --- | --- |
| Vercel `tridentcubed-dev-app` and `tridentcubed-dev` (dev.app, next.app, the dev site) | Vercel finds `turbo` and runs it: `//:barrels` (0.3 s), then `@layerd/ui:build` (6.7 s), then `app:build` or `site:build`. | Build log, `dpl_DEHkzmxLpuNTmgpnSKFSp9F86pFo` (dev, f3a0bd5): "Detected Turbo. Adjusting default settings...", "Remote caching enabled", `@layerd/ui:build: cache miss`, `app:build` starting 6.7 s later. |
| Same two projects: the remote cache | Saved nothing in the last four builds read. | `Cached: 0 cached, 3 total` in `dpl_DEHkzmxLpuNTmgpnSKFSp9F86pFo` (app, #352), `dpl_83u7C3xnTPziSyZh2xRRveaXUevi` (site, #330), `dpl_8Kzcp28Ge14nxHUU2DYwPeN3wcRj` (site, #334), `dpl_Hr3fw4JYpk8aWHswF7jhYeiyczme` (site, #321). |
| Same two projects: the UI build | Not needed. Every app aliases `@layerd/ui` to `packages/ui/src/lib` (invariant 6 in `packages/tools/README.md`; `resolve.alias` in `packages/config/vite/vite.config.ts`). CI builds each app with no UI build first and passes. | `ci.yml`: "No build step comes first: the apps alias `@layerd/ui` to the UI source". |
| Vercel `tridentcubed` and `tridentcubed-app` (www, app.tridentcubed.com) | Nothing. Both override the build command to `pnpm build`, so they never run Turbo. | `vercel project inspect`, read 2026-11-20 for the build-caching thread. Note: the "Vercel" section of `packages/tools/README.md` says Vercel never runs Turbo; that is true only for these two. |
| What keeps Vercel fast | Vercel's own build cache ("Restored build cache from previous deployment", `pnpm install` "Done in 44ms") and "skip unaffected projects" (the CANCELED site deployments for #332, #333, #336). | Build logs above; [Vercel build cache](https://vercel.com/docs/deployments/troubleshoot-a-build): it caches "every `node_modules` ... directory in the repository" per project and branch. |
| GitHub CI | Nothing. Jobs run `vp check`, `pnpm --filter ... test` and `pnpm build` in the app folder. | `.github/workflows/ci.yml` |
| Your PC and cloud threads | `pnpm dev`, `build` and `preview` go through the workspace launcher, which spawns `turbo watch //#barrels:watch <app>#dev` or `turbo run <app>#build`. Root `pnpm test` is `turbo run test --filter=app --filter=site --filter=@layerd/ui`. `pnpm symlinks*` and `preview:all` call `turbo`. | `packages/tools/src/generators/workspace-launcher.ts`; root `package.json` |
| Tests that read `turbo.json` | `apps/app/src/env.test.ts` checks the build's env list; `apps/site/src/turbo.test.ts` checks `.vercel/output/**` is a build output (a cached build once left Vercel nothing to deploy). | Those files |
| Other mentions | `.turbo` in `.gitignore` and four `tsconfig.json` excludes; the barrels generator's lock files in `.turbo/barrels-locks`; the block Turbo writes into `AGENTS.md`; invariant 5 and the "Turbo stays" lines in `packages/tools/README.md`. | `git grep -i turbo origin/next` |

## 3. Vite+ tried on a copy of this repo

| Question | Result |
| --- | --- |
| Does `vp run` work in this repo as it is? | **No, one file stops it.** Every `vp run` fails: "Failed to load task graph ... packages/config/vite ... config must export or return an object". Vite Task reads each package's `vite.config.ts`, and `packages/config/vite/vite.config.ts` is the `createAppConfig` factory, not a config. Renaming it (for example `config.ts`, with its `exports`, `files` and `tsconfig.json` entries) fixed it. **[trial, 1.0.0]** |
| Can a root task run before an app build (invariant 5, first half)? | **Yes.** A root task with `cache: false` and `dependsOn: ['template#gen-barrels']` on the app's build ran the barrels first. The root is named by its `package.json` name (`template` today); Turbo's `//#barrels` spelling fails ("Package '//' not found"). A task cannot share a name with a `package.json` script. **[trial, 1.0.0 and 1.8.0]** |
| Can the barrels watcher run beside `vp dev` (invariant 5, second half)? | **Yes, with `--parallel`.** `vp run --parallel --filter template --filter app dev` started the watcher and the dev server together and printed the Network URL. A dev task that `dependsOn` a never-ending watcher never starts, so the launcher uses `--parallel`. There is no `persistent` or `interruptible` option, no `turbo watch`, no task dashboard ([#3098](https://github.com/voidzero-dev/vite-plus/issues/3098)), and an open bug where Ctrl+C kills the other running tasks mid-cleanup ([#3581](https://github.com/voidzero-dev/vite-plus/issues/3581)). **[trial; docs]** |
| Is the app build cached? | **Yes, after tuning.** Out of the box it never cached: "read and wrote `.svelte-kit/generated/build/env/config.js`", then "read and wrote `node_modules/$app/tsconfig.json`". With `input: [{ auto: true }, '!.svelte-kit/**', '!.vercel/**', '!node_modules/**']` and matching `output` excludes, the second run was a hit, **34 s to 3 s** ("31.44s saved"). An edit to `src/app.html` rebuilt it. **[trial, 1.0.0]** |
| How easily does that cache miss? | Easily. A rerun missed with "env 'OLDPWD' changed", so the build's environment counts. On Vercel, where the commit settings change every push, expect a full build each time, which is what Turbo gives today (0 of 4). **[trial]** |
| Env vars | Tasks run in a clean environment: a variable reaches the task only if listed in `cache.env` or `cache.untrackedEnv` (the 11 build secrets), the same discipline `turbo.json` has now. `CI`, `VERCEL_*` and `*_TOKEN` pass by default. | [config/run](https://viteplus.dev/config/run); **[trial, 1.8.0]** |
| Cache size | 262 MB in `node_modules/.vite/task-cache` after a few builds of the app alone. **[trial]** |

## 4. Vercel without Turborepo

| Fact | Source |
| --- | --- |
| Vercel detects only Turborepo, Nx and Rush as monorepo tools, and has no Vite+ preset. A project that drops Turbo gets the SvelteKit preset's `vite build` unless a build command is set. | vercel/vercel `packages/fs-detectors/src/monorepos/monorepo-managers.ts`, `packages/frameworks/src/frameworks.ts` (main, 2026-11-26); [Configure a build](https://vercel.com/docs/builds/configure-a-build) |
| Vercel Remote Cache is automatic only for `turbo`; other tools need the Remote Cache SDK, which has Nx and Rush plugins and none for Vite+. | [Remote Caching](https://vercel.com/docs/monorepos/remote-caching) |
| "Skip unaffected projects" does **not** need Turborepo: a pnpm workspace with unique package names and declared dependencies is enough. | [Monorepos: skipping unaffected projects](https://vercel.com/docs/monorepos#skipping-unaffected-projects) |
| The build cache keeps every `node_modules` folder per project and branch, whatever runs the build. Whether that would also keep Vite Task's cache (`node_modules/.vite/task-cache`) between Vercel builds is **untested**. | [Troubleshoot a build](https://vercel.com/docs/deployments/troubleshoot-a-build) |

So the dev projects can build exactly the way production already does: `pnpm build` in the app folder, which is the app's own `vp build`, with the barrels already committed and checked in CI.

## 5. Commit hooks and releases

| Fact | Source |
| --- | --- |
| `vp hooks enable` points `core.hooksPath` at a generated dispatcher in `.vite-hooks/_` (ignored); the project commits `.vite-hooks/pre-commit`, for example `vp staged`. `vp config` in `prepare` keeps it installed on every clone. `VP_GIT_HOOKS=0` turns it off. | [Commit Hooks](https://viteplus.dev/guide/commit-hooks) |
| `vp staged` runs the `staged` block of `vite.config.ts` and bundles lint-staged 17; it needs Node 24.11 or later and Git 2.32 or later. "This ... should replace separate `lint-staged` configuration in most projects." Husky is switched by hand. | Same page; [config/staged](https://viteplus.dev/config/staged) |
| Vite+ has **nothing** for changelogs, Git tags or GitHub Releases. `vp release` is "planned"; `vp pm version` only forwards to `pnpm version`. | [1.0 post](https://voidzero.dev/posts/announcing-vite-plus-1-0); [vp pm version](https://viteplus.dev/guide/package-management/version) |

## 6. What could break or get slower

- **Vercel dev builds: faster, not slower.** Turbo's cache gave nothing and its UI build costs about 7 s. Expected change: a dev build about 7 s shorter (an estimate from one log; measure it on next.app).
- **Vercel needs a build command.** Without `turbo` the dev projects fall back to `vite build`. Set `"buildCommand": "pnpm build"` in `apps/app/vercel.json` and `apps/site/vercel.json`, which is what the production projects already run.
- **Every `vp run` is blocked until `packages/config/vite/vite.config.ts` is renamed.**
- **Local `pnpm dev` loses Turbo's dashboard** and, until #3581 is fixed, Ctrl+C can cut the other task's cleanup short.
- **Vite+ moves weekly.** Pin the exact version (the catalog already does) and move it in its own change, since a bump can turn lint red.
- **Not affected:** CI, the `pnpm check` gate, the barrels generator, the UI package build for npm, and skip unaffected projects.
- **Lost, and not used today:** Turbo's remote cache, `turbo prune`, `--affected`.

## 7. Size of the move

Small. About ten files, one or two sessions, in three steps that each stand alone:

1. **Build the dev Vercel projects without Turborepo.** Two `vercel.json` lines; Turbo stays for local use. Measure on next.app, then dev.
2. **Update Vite+ from 1.0.0 to 1.8.0.** The catalog line, then fix whatever new lint or format findings appear.
3. **Run the repo's tasks with Vite+ instead of Turborepo.** Rename the shared config file; give the root package a real name (`tridentcubed`); move the tasks into `run.tasks` (barrels before builds, no UI build before app builds, the 11 env names on the build); rewrite the launcher to spawn `vp run` (`--parallel` for dev); point root `test`, `symlinks*` and `preview:all` at `vp run` or `pnpm --filter`; rewrite `env.test.ts` and drop `turbo.test.ts`; move the barrels lock files out of `.turbo`; delete `turbo.json`, the `turbo` dependency and the Turbo block in `AGENTS.md`; update invariant 5 in `packages/tools/README.md`.

Optional fourth step: a pre-commit hook with `vp hooks` and `vp staged` running `vp check --fix` on staged files.

## Unverified

- A cache hit's restore of `.vercel/output`: deleting `.vercel` counted as a change and rebuilt, so this was not shown. It does not matter on Vercel if builds always run in full there.
- Whether Vercel's build cache would keep `node_modules/.vite/task-cache` between builds.
- The 7 s saving, taken from one dev app log; to be measured in step 1.
- Root-task references when the root `package.json` has no `name` (only a named root was tried).
- When remote caching, `vp release` and monorepo publishing ship: stated as Q4 2026 plans with no dates.

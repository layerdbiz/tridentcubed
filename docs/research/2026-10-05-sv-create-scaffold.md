# The `sv create` scaffold for V1, and how it runs under Vite+

Observed October 5, 2026, for wayfinder ticket #112 (map #111). The scaffold itself is committed, untouched, at [`prototypes/scaffold/`](../../prototypes/scaffold/); this note records the prompts, the files, what Vite+ changes, and where the result meets or misses this monorepo's conventions. It feeds the first grilling, "Restart V1 from the sv create scaffold or evolve apps/app" (#113). No feature code was written.

Terms. **`sv`** is the Svelte CLI; `sv create` scaffolds a project and `sv add` bolts add-ons onto it. **Vite+** (`vp`) is VoidZero's toolchain that bundles Vite, Vitest, Oxlint and Oxfmt behind one command; this repo runs on it. A **lockfile** records the exact package versions an install resolved.

## Short answer

1. **`sv create` does not know Vite+.** Its installer choices are npm, yarn, pnpm, pnpm-rush, bun, deno, nub and aube; it writes `vite dev` and `vitest` scripts and imports from `vitest`. There is no Vite+ prompt, flag or add-on.
2. **Vite+ knows `sv`.** `vp create svelte -- <sv arguments>` runs `sv create` and then rewrites the result for Vite+ in the same call; `vp migrate` does the same rewrite on an existing scaffold. Both touched the same six files (scripts to `vp`, test imports to `vite-plus/test`, `vite.config.ts` to `vite-plus` with `lazyPlugins`, a `pnpm-workspace.yaml` catalog, `devEngines`, `.gitignore`) and ran Oxfmt over everything. The rewrite is small and mechanical.
3. **The repo is on Vite+ 1.0.0.** `pnpm-workspace.yaml` pins `vite-plus: 1.0.0` and `vite: npm:@voidzero-dev/vite-plus-core@1.0.0`, the lockfile holds `vite-plus@1.0.0`, and `vp toolchain` reports Vite 8.3.1, Vitest 5.0.1, Oxlint 1.85.0, Oxfmt 0.70.0. Confirmed, nothing to upgrade.
4. **The scaffold works.** 59 files, about 880 lines (favicon aside), all Kit 3 idioms. With the six add-ons below it type-checks with zero errors, its two tests pass (one in Node, one in a real Chromium), and `vite build` and `vp build` both produce a Vercel function. Same results under plain Vite and under Vite+.
5. **Four things bite on day one**, none a blocker: the generated `.env` placeholder is not a valid URL and breaks `build` and `auth generate` until replaced; the component test needs a Playwright browser download; `better-auth@1.7.7` still declares SvelteKit 2 as its peer (pnpm installs it without a word, npm refuses); and the generated auth tables use `text` ids until `generateId: "uuid"` is set (both already in [the Better Auth research](2026-10-05-better-auth-on-sveltekit-3.md)).

## Prompts and answers

Run interactively, `sv create` asks three questions, then one per add-on, then the installer. The flags on the right answer each one; the whole run is reproducible non-interactively.

| Prompt (interactive) | Choices offered | Answer taken | Flag |
| --- | --- | --- | --- |
| Which template would you like? | SvelteKit minimal, SvelteKit demo, Svelte library, sv community add-on | SvelteKit minimal | `--template minimal` |
| Add type checking with TypeScript? | TypeScript syntax, JavaScript with JSDoc, No | TypeScript | `--types ts` |
| What would you like to add to your project? | prettier (pre-ticked), eslint, vitest, playwright, tailwindcss, enhanced-img, sveltekit-adapter, drizzle, better-auth, mdsvex, paraglide, storybook, ai-tools, experimental | tailwindcss, vitest, sveltekit-adapter, drizzle, better-auth, experimental | `--add ...` |
| tailwindcss: which plugins? | typography, forms | both | `tailwindcss="plugins:typography,forms"` |
| vitest: usages? | unit, component | both | `vitest="usages:unit,component"` |
| sveltekit-adapter: which adapter? | auto, node, static, vercel, cloudflare, netlify | vercel | `sveltekit-adapter="adapter:vercel"` |
| drizzle: database, client, docker? | postgresql, mysql, sqlite, d1; postgres.js, neon, mysql2, planetscale, node-sqlite, better-sqlite3, libsql, turso; docker yes/no | postgresql, postgres.js, no docker | `drizzle="database:postgresql+client:postgres.js+docker:no"` |
| better-auth: demo? | password, github | password | `better-auth="demo:password"` |
| experimental: features? | async, remoteFunctions, forkPreloads | async, remoteFunctions | `experimental="features:async,remoteFunctions"` |
| Install dependencies? | npm, yarn, pnpm, pnpm-rush, bun, deno, nub, aube | not here (`--no-install`); pnpm afterwards | `--install pnpm` |

Left out on purpose: prettier and eslint (Vite+ supplies Oxfmt and Oxlint), playwright end-to-end tests, enhanced-img (build-time only, see the media research), mdsvex, paraglide, storybook (retired here in #100), ai-tools (installs Svelte MCP tools and skills for Claude Code; worth a look on its own, not for this question), forkPreloads.

The exact command, as `sv` itself echoed it back:

```sh
npx sv@1.1.0 create --template minimal --types ts --add tailwindcss="plugins:typography,forms" vitest="usages:unit,component" sveltekit-adapter="adapter:vercel" drizzle="database:postgresql+postgresql:postgres.js+docker:no" better-auth="demo:password" experimental="features:async,remoteFunctions" --no-install scaffold
```

The `postgresql:postgres.js` in that echo is `sv`'s own spelling; `client:postgres.js` is what the help text documents and what was typed. Multi-value options take commas (`plugins:typography,forms`); a `+` between values is rejected as "missing their option name".

## What it writes

59 files, grouped by who wrote them. Every path is Kit 3: `#lib` via `package.json#imports`, `$app/env` and `$app/env/private`, `Handle` from `@sveltejs/kit/hooks`, `src/env.ts` declaring env vars, no `svelte.config.js` (the adapter and compiler options sit inside `sveltekit({...})` in `vite.config.ts`).

```text
Template (minimal, ts)
  package.json              scripts dev/build/preview/check/test, imports #lib and #lib/*
  vite.config.ts            tailwindcss(), sveltekit({ runes forced on, async, adapter, remoteFunctions }), vitest projects
  tsconfig.json             extends $app/tsconfig, strict, includes src + the two config files
  src/app.html, src/app.d.ts, src/lib/index.ts (empty placeholder), src/lib/assets/favicon.svg
  src/routes/+layout.svelte, +page.svelte, layout.css
  static/robots.txt, .gitignore, .npmrc (engine-strict=true), .vscode/*, README.md
tailwindcss
  src/routes/layout.css     @import 'tailwindcss' plus the forms and typography plugins
vitest (unit + component)
  src/lib/vitest-examples/  greet.ts + greet.spec.ts (Node), Welcome.svelte + Welcome.svelte.spec.ts (browser)
  vite.config.ts            two test projects: client (Playwright Chromium, *.svelte.spec.ts) and server (node)
sveltekit-adapter
  vite.config.ts            adapter from @sveltejs/adapter-vercel
drizzle (postgresql, postgres.js)
  drizzle.config.ts, src/lib/server/db/index.ts (postgres() client + drizzle), db/schema.ts (sample task table)
  .env, .env.example        DATABASE_URL placeholder; scripts db:push/generate/migrate/studio
better-auth (password demo)
  src/lib/server/auth.ts    betterAuth from better-auth/minimal, drizzleAdapter(pg), sveltekitCookies(getRequestEvent) last
  src/lib/server/db/auth.schema.ts   user, session, account, verification tables (text ids)
  src/hooks.server.ts       getSession into event.locals, then svelteKitHandler
  src/app.d.ts              Locals { user?, session? }
  src/env.ts                defineEnvVars: DATABASE_URL, ORIGIN, BETTER_AUTH_SECRET
  src/routes/demo/          DemoLinks.svelte, better-auth/+page(.server), better-auth/login/+page(.server)  (form actions, not remote functions)
experimental
  vite.config.ts            compilerOptions.experimental.async, experimental.remoteFunctions
```

Resolved versions after `pnpm install` (pnpm 10.28 standalone, because the folder sits outside the workspace globs): `@sveltejs/kit 3.0.0`, `svelte 5.57.1`, `@sveltejs/vite-plugin-svelte 7.3.1`, `@sveltejs/adapter-vercel 7.0.0`, `vite 8.3.2`, `vitest 4.1.11`, `@vitest/browser-playwright 4.1.11`, `playwright 1.63.0`, `vitest-browser-svelte 2.2.1`, `typescript 6.0.3`, `tailwindcss 4.3.3`, `better-auth 1.7.7`, `auth 1.7.7`, `drizzle-orm 0.45.3`, `drizzle-kit 0.31.11`, `postgres 3.4.9`, `@types/node 22.20.5`. The committed `pnpm-lock.yaml` is that install.

What ran, in `prototypes/scaffold/`, with `DATABASE_URL` set to a well-formed URL first:

| Step | Result |
| --- | --- |
| `pnpm install --ignore-workspace` | ok, 7 s; no peer warning printed for `better-auth`'s `@sveltejs/kit ^2.0.0` (pnpm 10.28 stays silent on optional peers; npm would fail, see the auth research) |
| `auth generate` | rewrote `auth.schema.ts`; with the shipped `.env` it first died with `ERR_INVALID_URL` on `postgres://user:password@host:port/db-name` (`port` is not a number) |
| `svelte-kit sync && svelte-check` | 1253 files, 0 errors, 0 warnings |
| `vitest --run` | 2 files, 2 tests pass (server in Node, client in headless Chromium); the client project needed `playwright install chromium-headless-shell` first (114 MB), and Kit warns that Vitest's `transformIndexHtml` hook is unsupported, harmlessly |
| `vite build` | ok, adapter-vercel writes the function; the same `.env` placeholder breaks it too, because Kit's post-build analysis imports `auth.ts`, which constructs the `postgres()` client at module load |

## What Vite+ changes

Two routes were tried on copies in the scratch folder; both gave the same result.

- `vp migrate --no-interactive` on the plain scaffold: "1 config update applied, 3 files had imports rewritten, inline Vite plugins wrapped with lazyPlugins", plus two review notes about Vitest 5 project inheritance and a `vp install`.
- `vp create svelte --no-interactive --package-manager pnpm -- <the same sv arguments>`: runs `sv create`, then "Rewrote imports in 3 files", "Wrapped inline Vite plugins with lazyPlugins", installs with pnpm 12.9.1 and formats the code. One command, about 15 s.

The diff against the plain scaffold, in both cases:

| File | Change |
| --- | --- |
| `package.json` | `dev/build/preview` become `vp dev/build/preview`, `test:unit` becomes `vp test`; `vite`, `vitest`, `@vitest/browser-playwright` move to `catalog:`; `vite-plus: catalog:` added; `devEngines.packageManager` pins pnpm 12.9.1 with `onFail: download` |
| `pnpm-workspace.yaml` (new) | catalog `vite: npm:@voidzero-dev/vite-plus-core@1.0.0`, `vitest: 5.0.1`, `vite-plus: 1.0.0`, `@vitest/browser-playwright: 5.0.1`; `overrides` forcing every `vite@*` and `vitest@*` to the catalog; `peerDependencyRules.allowAny` for both; `allowBuilds: esbuild: true` (from `vp create`; `vp migrate`'s pnpm refused the ignored esbuild build scripts until that line existed) |
| `vite.config.ts` | `defineConfig, lazyPlugins` from `vite-plus`, `playwright` from `vite-plus/test/browser-playwright`; plugins wrapped in `lazyPlugins(() => [...])`; `fmt: {}` and a `lint` block (`vite-plus/prefer-vite-plus-imports: error`, `typeAware: true, typeCheck: true`); `vp migrate` also adds `clearMocks: false` and `sharedViteServer: false` as Vitest 4 compatibility, `vp create` does not |
| `*.spec.ts` | `vitest` imports become `vite-plus/test`, `vitest/browser` becomes `vite-plus/test/browser`; `toHaveTextContent` is rewritten to `toMatchTextContent` |
| `.gitignore` | `.vitest/` |
| everything | formatted with Oxfmt defaults: two spaces, double quotes, trailing commas |

Then, with the folder's own `vp`: `vp check` passes formatting and reports 0 lint errors and 6 warnings (all `typescript/no-base-to-string` on `formData.get(...)?.toString()` in the demo login, a rule this repo turns off); `vp test --run` passes both projects on Vitest 5.0.1; `vp build` writes the Vercel function; `svelte-check` stays at 0 errors.

One false alarm worth recording: running the **repo's** `vp` binary against the standalone folder fails every `vp test` with `SvelteKit error: vite_ssr_environment_not_runnable`, because two copies of Vite are loaded (the repo's `@voidzero-dev/vite-plus-core` and the folder's). Inside the workspace there is one copy and this cannot happen; outside it, use the folder's `node_modules/.bin/vp`.

Also seen: the container's global pnpm 10.28 enforces a 24-hour `minimumReleaseAge` and refused `magic-string@1.4.3` (published five hours earlier) on every `pnpm run`; `vp migrate` wrote a `minimumReleaseAgeExclude` for it. The repo's own pnpm 12.8.1 has no such policy configured.

## Fit with this monorepo

Measured against `AGENTS.md`, `packages/config/vite/vite.config.ts` (`createAppConfig`) and `apps/app/AGENTS.md`.

| Convention here | The scaffold | Gap |
| --- | --- | --- |
| `pnpm exec vp` for everything | `vite`/`vitest` scripts | closed by `vp migrate` or by scaffolding through `vp create svelte` |
| One `vite.config.ts` per app, written as `createAppConfig({ root, prerender?, test? })` | one inline `vite.config.ts` with the same plugins (`tailwindcss()`, `sveltekit({...})`) | the factory already carries `vitePreprocess`, `inspector`, `adapter({ runtime: 'nodejs24.x' })`, `files.assets` for the shared static folder, `remoteFunctions`, `async`, `devtoolsJson`, the `@layerd/ui` alias and `server.fs.allow`. The scaffold adds two things the factory lacks: `compilerOptions.runes` forced on outside `node_modules`, and Vitest **projects** (a Playwright browser project for `*.svelte.spec.ts` beside a Node project). Either grows the factory or stays app-local in the `test` override |
| `#lib` via `package.json#imports`, never `$lib` | identical: `#lib` → `./src/lib/index.js`, `#lib/*` → `./src/lib/*` | none; the repo's apps add `#app.css` and `#ui.css` |
| Barrels generated into `src/lib/index.ts` | an empty placeholder `src/lib/index.ts` | none; the generator's globs (`apps/*/src/lib/**`) pick it up once the app lives under `apps/` |
| Tailwind: `src/app.css` importing the UI theme through `#ui.css`; PostCSS light-dark plugin | `src/routes/layout.css` with `@import 'tailwindcss'` and two plugins, imported from the root layout | rename and point at the theme; the forms and typography plugins are already app dependencies here |
| Oxfmt: tabs, single quotes, no trailing commas, width 100, Tailwind class sorting per app stylesheet | `sv` writes tabs and single quotes; `vp create`/`vp migrate` then reformat to Oxfmt defaults (spaces, double quotes) | inside the workspace the root config wins, so one `vp check --fix` restores the house style; the root `vite.config.ts` now ignores `prototypes/**` so the frozen scaffold does not trip the gate |
| Oxlint type-aware, `typeCheck: false` (tsgolint cannot read `.svelte` types), `no-base-to-string` off | `typeCheck: true`, default rules | the scaffold's own `lint` block is dropped when the app joins the workspace; its 6 warnings vanish with the repo rules |
| Tests beside the file as `<name>.test.ts`, imported from `vite-plus/test`; `app` runs in Node, `ui` in jsdom via `@testing-library/svelte` | `*.spec.ts`, `*.svelte.spec.ts`, imported from `vitest`, component tests in a **real browser** via `@vitest/browser-playwright` + `vitest-browser-svelte` | names and imports are a rename; browser-mode component tests are new here and need the Playwright browser download in CI and in cloud containers |
| Vercel adapter, Node 24 runtime, `engines.node 24.x`, `@types/node ^25` | `adapter()` with defaults, `@types/node ^22`, `.npmrc engine-strict=true` | pass `runtime: 'nodejs24.x'`, bump the types |
| Server code under `src/lib/server/` (`db/`, `auth.ts`), hooks in `src/hooks.server.ts`, remote functions as the data layer | `src/lib/server/auth.ts`, `src/lib/server/db/{index,schema,auth.schema}.ts`, `src/hooks.server.ts` | matches the layout in `apps/app/AGENTS.md` exactly; the demo routes use form actions and `+page.server.ts`, so they are the part to delete rather than keep |
| Valibot for validation | nothing | no add-on exists; a dependency, not a scaffold concern |
| Supabase, PWA/service worker, PowerSync | nothing | no add-ons exist; Drizzle's `postgres.js` client speaks to a Supabase Postgres URL unchanged, the service worker is Kit's built-in (see the PWA research) |

For scale: `apps/app/src` today is 48 files and about 12,000 lines; the scaffold is 59 files and under 900, of which the demo routes and Vitest examples are about a third.

## Reproduce

From the repo root, in a fresh folder outside `apps/` (so the workspace globs ignore it):

```sh
cd prototypes
npx sv@1.1.0 create scaffold --template minimal --types ts --no-install --add tailwindcss="plugins:typography,forms" vitest="usages:unit,component" sveltekit-adapter="adapter:vercel" drizzle="database:postgresql+client:postgres.js+docker:no" better-auth="demo:password" experimental="features:async,remoteFunctions"
cd scaffold && pnpm install --ignore-workspace
# edit .env: DATABASE_URL needs a numeric port, e.g. postgres://postgres:postgres@localhost:5432/scaffold
./node_modules/.bin/auth generate --config src/lib/server/auth.ts --output src/lib/server/db/auth.schema.ts --yes
./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json
./node_modules/.bin/playwright install chromium-headless-shell
./node_modules/.bin/vitest --run
./node_modules/.bin/vite build
```

The Vite+ shape in one step, same answers:

```sh
pnpm exec vp create svelte --no-interactive --package-manager pnpm -- scaffold-vp --template minimal --types ts --no-install --add tailwindcss="plugins:typography,forms" vitest="usages:unit,component" sveltekit-adapter="adapter:vercel" drizzle="database:postgresql+client:postgres.js+docker:no" better-auth="demo:password" experimental="features:async,remoteFunctions"
cd scaffold-vp && ./node_modules/.bin/vp check && ./node_modules/.bin/vp test --run && ./node_modules/.bin/vp build
```

## Open questions for #113

- Whether V1 wants browser-mode component tests (the scaffold's default) or keeps jsdom and Node; this decides whether `createAppConfig` learns Vitest projects.
- Whether `compilerOptions.runes` forced on belongs in the factory for every app.
- Whether `vp create svelte` becomes the documented way to start an app here, since it lands on Vite+ in one step and the only follow-up is `vp check --fix` for the house style.

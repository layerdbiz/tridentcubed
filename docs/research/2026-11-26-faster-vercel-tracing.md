# Can the Vercel tracing step get faster?

Observed November 26, 2026 (America/Chicago). Research for "🔎 app: Check how to make the Vercel tracing step faster" ([#397](https://github.com/layerdbiz/tridentcubed/issues/397)). It follows the Vite+ work (#364, #369), which first measured the step. It changes nothing in the repo or on Vercel.

Three kinds of source, each marked where it is used:

- **Docs and source**: svelte.dev, the sveltejs/kit and vercel/nft repositories, vercel.com/docs and the npm registry, read 2026-11-26. The installed `@sveltejs/adapter-vercel` 7.0.0 matches its GitHub tag line for line, so line numbers below are from the tag (`AV700`).
- **Build logs**: two `tridentcubed-dev-app` builds of `next` (`dpl_HKotxoyrq6gmFSTbrQGsVX6L1gNq` for 51927a4, `dpl_BpJb3b9wDPsjLzdQffBPf9vzQuE3` for c61ff9e), read through the Vercel API.
- **Trial**: a cloud checkout of `origin/next` (51927a4), `pnpm install --frozen-lockfile`, then `pnpm build` in `apps/app` on 4 cores, with timing lines added to the installed adapter. Every change was put back afterwards; nothing from the trial was pushed.

## Short answer

**The step is the Vercel adapter packing the app's server code into Vercel functions.** For each function it follows every `import` from the server code into `node_modules` (Node File Trace, the `@vercel/nft` package) and copies each file it finds. The app has four functions, so it does that four times, re-reading and re-parsing the same packages each time. Tracing is 90% of the step; copying is under 1 s.

**About 6 to 7 s of the 9 to 14 s can go, with no change to what gets deployed**:

| Change | Adapter step in the trial | Saved | Functions deployed |
| --- | --- | --- | --- |
| Today (adapter 7.0.0, nft 1.11.0) | 13.7 to 14.6 s | | 4, 123 MB |
| Newer trace package (nft 1.11.12, lockfile only) | 11.7 to 11.9 s | about 2 s | identical |
| One shared trace memory for the four traces (adapter patch) | 7.4 to 7.7 s | about 6 s | identical |
| Both | 7.2 to 7.6 s | about 6.5 s | identical |

"Identical" means the same file list in every function (diffed), the same `.vc-config.json` (same 300 s limit on `api/convert` and `api/export/pdf`) and the same routes. The only line that differs is a `/proc/<process id>/cgroup` file some package reads at build time, whose number changes with every build anyway.

On Vercel the step took **13.8 s** of a 42 s build (51927a4) and **9.4 s** of a 30 s build (c61ff9e): build machines vary by several seconds. A push to `next` is live in about 50 s, so this takes roughly an eighth off.

**Not recommended**: putting every route in one function (same saving, but it mixes the photo and PDF work into the function that serves every page), and dropping only `split` (2.5 s). Caching traces between Vercel builds is not possible. The warnings cost nothing.

## 1. Why four functions, and what `0.func` is

The adapter groups routes by their settings (AV700 L102-160, `hash_config` L366-374):

- Each route's settings are the adapter's defaults with the route's own `config` on top. Routes whose `runtime`, `regions`, `memory`, `maxDuration` and "has ISR" all match share one function.
- `maxDuration` on its own is enough to split a route off. It is compared with the adapter's default, not Vercel's, so `maxDuration: 300` splits even though 300 s is also Vercel's own default.
- `split: true` is not part of that comparison: it gives the route a function of its own every time (AV700 L153).
- With exactly one group the function is called `![-]/catchall`. With more, groups are numbered in route order: **`0.func` is every ordinary page and endpoint**, then `1.func` (`api/convert`), `2.func` (`api/export/pdf`), plus one extra `catchall.func` the adapter adds so 404s and remote functions reach SvelteKit (AV700 L177-226). The named entries (`api/convert.func`, `login.func`...) are links to these.

| Function | What runs there | Files | Size |
| --- | --- | --- | --- |
| `0.func` | every page and the other endpoints | 474 | 27 MB |
| `1.func` | photo conversion (sharp, libheif) | 522 | 43 MB |
| `2.func` | PDF export (puppeteer-core, chromium-min) | 1,309 | 31 MB |
| `catchall.func` | 404s and remote functions | 412 | 22 MB |

(Trial, `.vercel/output/functions/![-]/`.)

Fewer functions, measured:

- **One function for everything** (`maxDuration: 300` on the adapter, no route `config`): one trace, step 7.1 s, one 58 MB function. It saves as much as the shared trace memory, but changes how the app runs: with Fluid compute one instance serves several requests at once ([Fluid compute](https://vercel.com/docs/fluid-compute)), so a Chromium print or a full-size HEIC conversion would share memory and CPU with ordinary page requests, and every route would get the 5-minute limit. The routes were split on purpose (`api/convert/+server.ts`: "sharp and libheif load only here"). The adapter option also sits in `packages/config/vite/config.ts`, which all four apps share.
- **Drop `split: true`, keep `maxDuration: 300`**: the two long routes share one function with sharp and Chromium together. Three traces, step 11.2 s, about 2.5 s saved.

Fluid compute's default limit on Pro is 300 s, up to 800 s ([duration limits](https://vercel.com/docs/functions/configuring-functions/duration#duration-limits), [defaults by plan](https://vercel.com/docs/fluid-compute#default-settings-by-plan)). Whether this project has Fluid on was not read; the routes set 300 s themselves, so it does not matter to anything recommended here.

## 2. Where the time goes, and the shared trace memory

The trial's timing lines, today's setup:

| Part | Time |
| --- | --- |
| Copy the browser files | 0.1 s |
| Trace `0.func` | 2.5 s |
| Trace `1.func` | 3.2 s |
| Trace `2.func` | 4.7 s |
| Trace `catchall.func` | 2.1 s |
| Copy the traced files, all four | 0.6 s |

The Vercel log of 51927a4 shows the same shape: the warning block printed after each trace lands 3.1, 3.3, 4.8 and 2.5 s apart.

Each trace starts from nothing. `@vercel/nft` takes a `cache` object that keeps file contents, file lookups and each file's parsed imports between calls in the same process ([nft readme, cache](https://github.com/vercel/nft/blob/1.11.0/readme.md#cache)), but the adapter passes only `base`, `processCwd` and `ignore` (AV700 L545-550) and has no option to pass more ([index.d.ts](https://github.com/sveltejs/kit/blob/%40sveltejs/adapter-vercel%407.0.0/packages/adapter-vercel/index.d.ts)). Sharing one cache object across the four calls makes the second and later traces mostly lookups: in the trial they took 0.8, 2.3 and 0.1 s.

One catch: the adapter rewrites its own entry files (`.svelte-kit/vercel-tmp/index.js`, `server.js`, `serverless.js`) for every function, so a shared cache would hand the second function the first one's entry. The patch forgets those files before each trace. With that, all four functions came out identical to today's.

The patch, as tried (about 20 lines, `pnpm patch @sveltejs/adapter-vercel`):

```js
// Above create_function_bundle: one trace cache for every function of a build.
const nft_cache = {};

// The adapter rewrites its entry files for every function, so the cache forgets them first.
function forget_entry_files(tmp_dir) {
	for (const key of ['fileCache', 'statCache', 'symlinkCache', 'analysisCache']) {
		const map = nft_cache[key];
		if (!map) continue;
		for (const file of map.keys()) {
			if (file.startsWith(tmp_dir)) map.delete(file);
		}
	}
}

// In create_function_bundle, before the trace:
forget_entry_files(path.dirname(path.resolve(entry)));

// In the nodeFileTrace options:
cache: nft_cache
```

What it costs: a patch file in the repo that pnpm applies on every install, Vercel's included. When the adapter is updated the patch has to be redone; if it no longer fits, `pnpm install` stops with an error rather than building without it. The same change could be offered to SvelteKit, which would retire the patch.

## 3. The newer trace package

`@vercel/nft` 1.11.1 (2026-11-05) fixed slow analysis of large files ([vercel/nft #613](https://github.com/vercel/nft/pull/613)); the lockfile pins 1.11.0, and the adapter's `^1.10.2` range already allows the newest. `pnpm update -r @vercel/nft` moved it to **1.11.12** (pnpm held back 1.11.13 to 1.11.15, all under a day old; there were fifteen releases in three weeks). The lockfile was the only file that changed, every function came out identical, and the step went from about 14 s to about 11.8 s.

## 4. Caching between Vercel builds

Not possible today:

- Vercel's build cache keeps `node_modules`, `.vercel/builders` and `.vercel/cache`, and never `.vercel/output`; which files it keeps cannot be configured, and the SvelteKit preset caches no framework folder ([what is cached](https://vercel.com/docs/deployments/troubleshoot-a-build#what-is-cached)).
- nft's cache lives in memory only, with no way to save it to disk or tell when a file changed ([nft readme](https://github.com/vercel/nft/blob/1.11.0/readme.md#cache)).
- The Build Output API can only link a whole function to another, not share files between functions ([primitives](https://vercel.com/docs/build-output-api/v3/primitives)).

(Vercel spends another 15 to 20 s saving a 304 MB build cache after each deployment goes live. That happens after "Deployment completed" and delays nothing.)

## 5. The "failed to locate dependencies" warnings

They come from nft's "Failed to resolve dependency" notes, which the adapter collects after each trace and prints, once per function (AV700 L552-590). The lookup that fails happens during the trace anyway and only ends that branch, so they cost no measurable time.

- `resend` → `@react-email/render`: an optional peer the app does not install. Adapter 7.0.5 hides this one ([CHANGELOG](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/CHANGELOG.md)).
- `sharp` → `@img/sharp-<other platform>`: sharp's builds for other machines, which pnpm does not install on Linux. Still printed in 7.0.5. Harmless: the Linux x64 build is traced and shipped (`@img/sharp-libvips-linux-x64`, 18 MB, in `1.func`).
- `@opentelemetry/api`, `supports-color`, `bufferutil`, `utf-8-validate`: optional packages that SvelteKit, `debug` and `ws` try and do without.

## 6. Newer adapter versions

The newest adapter is **7.0.5** (2026-11-18). Its trace step is the same as 7.0.0's, and `main` matches 7.0.5: no version traces once for all functions or shares files between them ([CHANGELOG](https://github.com/sveltejs/kit/blob/main/packages/adapter-vercel/CHANGELOG.md), [registry](https://registry.npmjs.org/@sveltejs/adapter-vercel)). A request for opt-in bundling of Node functions is open with no maintainer reply ([sveltejs/kit #15675](https://github.com/sveltejs/kit/issues/15675)). The SvelteKit adapter page still lists the old 10/15/900 s defaults ([adapter-vercel docs](https://svelte.dev/docs/kit/adapter-vercel)).

## 7. Side finding: the test database rides along

Every function carries PGlite, the in-process Postgres the app uses for tests and for local runs with no settings: 16 MB in each of the four, 64 MB of the 123 MB. Drizzle's PGlite driver imports it, and nft follows even a guarded dynamic import (it reads `x ?? '@electric-sql/pglite'` as the string). Leaving it out through the patch's `ignore` (trial) took the functions to 58 MB in total and the step to 6.2 to 6.9 s, about 1 s more, and smaller functions start faster. The cost: a Vercel deployment with no database settings would fail instead of falling back to an empty in-memory database. Worth its own ticket, not part of this one.

## 8. Recommendation

**Yes, for two small changes together**: update `@vercel/nft` in the lockfile and add the shared-trace-memory patch. About 6 to 7 s off every app build, no change to what is deployed, PDF export and photo conversion keep their own functions and 5-minute limits. Check the result on next.app with one PDF download and one HEIC upload.

**No** to one function for everything and to dropping `split` only.

## Sources

- AV700: [`packages/adapter-vercel/index.js` at `@sveltejs/adapter-vercel@7.0.0`](https://github.com/sveltejs/kit/blob/%40sveltejs/adapter-vercel%407.0.0/packages/adapter-vercel/index.js)
- [SvelteKit adapter-vercel docs](https://svelte.dev/docs/kit/adapter-vercel)
- [vercel/nft readme 1.11.0](https://github.com/vercel/nft/blob/1.11.0/readme.md), [vercel/nft #613](https://github.com/vercel/nft/pull/613), [npm registry](https://registry.npmjs.org/@vercel/nft)
- Vercel: [Fluid compute](https://vercel.com/docs/fluid-compute), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), [Build Output API primitives](https://vercel.com/docs/build-output-api/v3/primitives), [build cache](https://vercel.com/docs/deployments/troubleshoot-a-build#what-is-cached)
- Vercel build logs `dpl_HKotxoyrq6gmFSTbrQGsVX6L1gNq`, `dpl_BpJb3b9wDPsjLzdQffBPf9vzQuE3`

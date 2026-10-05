Installable offline PWA on iPhone and Android with SvelteKit 3

Observed October 5, 2026. Research for ticket #126: what an installable, offline-capable Report Generator needs on iPhone Safari (iOS 26 / Safari 26.x, with Safari 27.0 shipped 2026-09-17) and Android Chrome, built on SvelteKit 3.0.0 (published 2026-10-01). It changes nothing in the repo. Sources are the WebKit blog and WebKit Bugzilla, Apple developer documentation, web.dev and developer.chrome.com, MDN and its `browser-compat-data` (BCD) JSON, svelte.dev docs plus the installed `@sveltejs/kit@3.0.0` source, the vite-pwa repositories and the npm registry. Press and tutorial sites were not used as evidence, with one exception flagged in section 8.

Terms used below. A **PWA** is a website the phone can install as an icon; on iPhone Apple calls it a **Home Screen web app**. A **service worker** is a script the browser keeps installed for your site that can answer requests from a local cache, which is what makes "offline" possible. A **manifest** is a small JSON file naming the app and its icons. **IndexedDB** and **OPFS** (origin private file system) are the two places a site can keep data on the device. **SSE** (server-sent events) is a long-lived HTTP response the server keeps writing to, which is how `query.live` streams.

## Short answer

Both platforms can install the app, run it offline from a cached shell, keep drafts and photos on the device, and take photos through the camera. The hard limits are all on iPhone, and they have not moved in 2025 or 2026: nothing runs after the app is closed (no Background Sync, Background Fetch or Periodic Sync), push notifications work only after the user adds the app to the Home Screen from the Share sheet, and there is no programmatic install prompt. Everything else that used to be an iPhone blocker is fixed: camera in installed apps (iOS 13.4), push and badging (16.4), install from Chrome and other browsers (16.4), manifest icons (15.4), the seven-day storage wipe (installed apps are exempt), a quota of up to 60% of the disk with `navigator.storage.persist()` honoured for installed apps (17), and since iOS 26 every site added to the Home Screen opens as an app without a manifest.

Recommendation, **high confidence on the platform facts, medium on the tooling call**: build the service worker with SvelteKit 3's own `src/service-worker/index.ts` and `$app/manifest`, not `@vite-pwa/sveltekit`, because that plugin's peer range still stops at Kit 2 (`^1.3.1 || ^2.0.1`, v1.1.0, no Kit 3 issue filed) while Kit 3 requires Vite 8. Precache the build's `immutable` files, `assets` and `prerendered` pages; serve navigations network-first with a cached fallback; never cache `/_app/remote/` responses (SvelteKit marks every one `cache-control: private, no-store`, and live queries would stream forever). Keep queued edits and captured photos in IndexedDB as an explicit outbox, replay it from the page on `online` and on launch (the only option on iPhone), call `navigator.storage.persist()` once installed, and apply new versions with SvelteKit's `updated.current` plus a full reload only when the outbox is empty. Treat push as an Android-first feature with an iPhone path that needs the Home Screen install first.

## 1. Manifest, icons and Apple's meta tags

| Fact | Source | Checked |
| --- | --- | --- |
| Chrome's install criteria: `name` or `short_name`; `icons` with 192px and 512px; `start_url`; `display` one of `fullscreen`, `standalone`, `minimal-ui`, `window-controls-overlay`; `prefer_related_applications` absent or `false`; served over HTTPS. | [web.dev install criteria](https://web.dev/articles/install-criteria), [MDN installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) | 2026-10-05 |
| Chrome dropped the "service worker with a `fetch` handler" requirement for menu install in Chrome 108 (mobile) and 112 (desktop), showing a default offline page instead; "the algorithm that displays the install prompt still requires the presence of a `fetch()` handler". | [Revisiting Chrome's installability criteria](https://developer.chrome.com/blog/update-install-criteria), 2023-12-05 | 2026-10-05 |
| Safari 26 (iOS 26, 2025-09-15): "By default, every website added to the Home Screen opens as a web app." "Giving users a web app experience simply no longer requires a manifest file." A manifest's benefits still apply if present; users can turn off "Open as Web App". | [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) | 2026-10-05 |
| Safari uses manifest `icons` "when there is no `apple-touch-icon` defined in the HTML head" and `purpose` is omitted or `any`; `apple-touch-icon` "takes precedence". Since Safari 15.4. | [WebKit Features in Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/) | 2026-10-05 |
| Apple's own meta tags (`apple-touch-icon` with `sizes="180x180"` etc., `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`) live only in an archived guide last updated 2016-12-12. | [Configuring Web Applications (archive)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) | 2026-10-05 |
| Manifest `id` supported by WebKit since 16.4 (so two installs of the same app can hold separate notification and badge state). | [WebKit Features in Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/) | 2026-10-05 |
| `theme-color`: Safari 15+, but "From Safari 26, the theme color is only used for installed web apps"; Chrome Android 92+. | [BCD `meta.json`](https://github.com/mdn/browser-compat-data/blob/main/html/elements/meta.json) | 2026-10-05 |

What to ship: a `manifest.webmanifest` with `name`, `short_name`, `id`, `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color`, 192 and 512 PNG icons (plus a `purpose: "maskable"` pair for Android), and a 180px `apple-touch-icon` link because Safari prefers it and ignores maskable. `apple-mobile-web-app-capable` is no longer needed for the standalone window on iOS 26 (the manifest `display` or the default covers it); keep `apple-mobile-web-app-status-bar-style` only if the status bar colour matters.

## 2. The service worker: SvelteKit 3 built-in versus vite-plugin-pwa / Workbox

| Fact | Source | Checked |
| --- | --- | --- |
| Kit 3: "if you have a `src/service-worker/index.ts` file it will be bundled and automatically registered" (`src/service-worker.ts` also valid). Imports: `$app/service-worker` (typed `self`), `$app/env` (`version`), `$app/manifest` (`immutable`, `assets`, `prerendered`). "The service worker is bundled for production, but not during development." Needs its own `tsconfig.json` extending `$app/tsconfig/service-worker`, excluded from the root one. | [Service workers](https://svelte.dev/docs/kit/service-workers) | 2026-10-05 |
| Registration is injected into server-rendered HTML as `navigator.serviceWorker.register('./service-worker.js', { type: 'module' })` on `load`; `kit.serviceWorker.register: false` disables it. | same, [configuration](https://svelte.dev/docs/kit/configuration) | 2026-10-05 |
| Docs' own strategy: cache `immutable` + `assets` on `install` under `cache-${version}`, delete other caches on `activate`, serve those from cache, everything else network-first with cache fallback, skipping non-GET and responses whose `cache-control` includes `no-store`. "If you're used to using Workbox you may prefer Vite PWA plugin." | same | 2026-10-05 |
| `@sveltejs/kit@3.0.0` peers: `vite ^8.0.12`, `svelte ^5.57.1`, `typescript ^6.0.0`, `@sveltejs/vite-plugin-svelte ^7.0.0`. | `npm view @sveltejs/kit` | 2026-10-05 |
| `@vite-pwa/sveltekit@1.1.0` (2025-11-27): peer `@sveltejs/kit: ^1.3.1 \|\| ^2.0.1`, depends on `vite-plugin-pwa ^1.2.0`. README: "From v0.3.0, `@vite-pwa/sveltekit` supports SvelteKit 2". No issue or PR about Kit 3 or Vite 8 in its tracker; latest issue #110 (2026-07-23) is about `base` with Svelte 5.56.7. Requires `kit.serviceWorker.register: false` and removal of Kit's own service worker. | [vite-pwa/sveltekit](https://github.com/vite-pwa/sveltekit), [its issues](https://github.com/vite-pwa/sveltekit/issues), [SvelteKit guide](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html), `npm view` | 2026-10-05 |
| `vite-plugin-pwa@2.0.0` (2026-10-03): peer `vite ^3.1.0 … \|\| ^8.0.0`, `workbox-build ^7.4.1`; Vite 8 support arrived in 1.3.0 (2026-05-05). So the core plugin is Vite 8 ready; the SvelteKit wrapper is not Kit 3 ready. | [releases](https://github.com/vite-pwa/vite-plugin-pwa/releases), `npm view` | 2026-10-05 |
| Workbox 7.4.1 (2026-05-04). README: "From now on, Chrome's Aurora team will be the new owners of Workbox." Not archived. | [GoogleChrome/workbox](https://github.com/GoogleChrome/workbox), `npm view` | 2026-10-05 |

Verdict: the built-in route is the only one that installs cleanly on Kit 3 today, and it already exposes the three lists a precache needs. Workbox's extra value (runtime caching strategies, `workbox-window` update prompts) is small for one app with one shell. Revisit if `@vite-pwa/sveltekit` publishes a Kit 3 peer range.

## 3. Offline shell and the update policy

| Fact | Source | Checked |
| --- | --- | --- |
| Browsers look for a new service worker on full-page navigations and after `push`/`sync` events; "Client-side navigations are neither". Kit calls `registration.update()` only during error recovery when version polling detects a redeploy. Docs show an `afterNavigate` hook that calls `registration.update()`; the new worker "will be installed in the background and take over as soon as the number of tabs managed by the existing service worker drops to zero." | [Service workers](https://svelte.dev/docs/kit/service-workers) | 2026-10-05 |
| Lifecycle: an updated worker waits "until the existing service worker is no longer controlling clients"; `skipWaiting()` makes it "kick out the current active worker"; `clients.claim()` takes over open pages. Functional-event update checks are capped to once per 24 hours. | [web.dev lifecycle](https://web.dev/articles/service-worker-lifecycle) | 2026-10-05 |
| Kit version detection: `x-sveltekit-version` header "on data, remote, and form action responses", when the tab regains focus or becomes visible, and a poll (`version.pollInterval`, default 3600000 ms; `0` disables). `updated.current` from `$app/state` turns `true`; `updated.check()` forces a check. Recommended `beforeNavigate` pattern sets `location.href = to.url.href` when `updated.current`. `version.name` should be deterministic (commit hash). | [configuration#version](https://svelte.dev/docs/kit/configuration#version), `@sveltejs/kit@3.0.0/types/index.d.ts` | 2026-10-05 |
| Safari 27.0 adds the Service Worker static routing API: "routing rules that the browser can use to bypass the service worker entirely for certain requests". Safari 26.6 fixed registrations with missing main scripts not being unregistered. | [Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/), [Safari 26.6](https://webkit.org/blog/18178/webkit-features-for-safari-26-6/) | 2026-10-05 |
| Kit docs: "browsers will empty caches if they get too full, so you should also be careful about caching large assets like video files." | [Service workers](https://svelte.dev/docs/kit/service-workers) | 2026-10-05 |

Shape that follows. Precache `immutable`, `assets` and `prerendered` (make the shell routes prerenderable or add an `/offline` page that is). Navigations: network-first, fall back to the cached shell. API: never cached (section 9). Queued edits never live in the Cache API or in memory; they live in IndexedDB keyed by a client id, so a service worker swap, a reload or an iOS process kill loses nothing. Update: on `updated.current`, show "update ready"; when the user accepts and the outbox is empty, reload; if the outbox is not empty, flush first or keep the old version running (the waiting worker stays harmless until the reload). `skipWaiting` only from that user action, never on install.

## 4. Storage quotas and eviction

| Fact | Source | Checked |
| --- | --- | --- |
| Safari 17+ / iOS 17+: origin quota "up to 60% of the total disk space" in browser apps, "up to 15%" in other apps (WebViews); overall 80% / 20%. A Home Screen web app "has the same origin quota and overall quota as when it is opened in a browser app". Eviction on an origin basis, least-recently-used, "when exceeding the overall quota, when the system is under storage pressure, or when the site has not been interacted with by the user for some time". `persist()` "grants a request based on heuristics like whether the website is opened as a Home Screen Web App"; persisted origins are excluded from eviction. `estimate()` reports usage and the origin quota. | [Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/), 2023-08-10 | 2026-10-05 |
| ITP seven-day cap: "deletes all cookies created in JavaScript and all other script-writeable storage after 7 days of no user interaction" (IndexedDB, LocalStorage, SessionStorage, media keys, service worker registrations and cache). "The first-party domain of home screen web applications is exempt." Home Screen apps "have their own counter of days of use". | [WebKit tracking prevention](https://webkit.org/tracking-prevention/), [Full third-party cookie blocking and more](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) | 2026-10-05 |
| Chrome: "An origin can use up to 60% of the total disk space"; eviction LRU per origin when the device runs out. `persist()` is auto-decided, no prompt, from site engagement, "Has the site been installed or bookmarked?", and notification permission. (web.dev's "Safari about 1GB" line predates WebKit's 2023 policy.) | [web.dev storage](https://web.dev/articles/storage-for-the-web), [persistent storage](https://web.dev/articles/persistent-storage) | 2026-10-05 |
| OPFS: `navigator.storage.getDirectory()` and `FileSystemSyncAccessHandle` (workers only) Safari 15.2, Chrome 86 / Android 109; `createWritable()` Safari 26 ("File System WritableStream API"). `showOpenFilePicker` Safari none, Chrome Android 132. `persist()` Safari 15.2, Chrome 55. | [BCD](https://github.com/mdn/browser-compat-data), [MDN sync access handle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle), [Safari 26 beta](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/) | 2026-10-05 |

Practical reading: on an iPhone with 64 GB free that is tens of gigabytes of quota in Safari or the installed app, so size is not the issue; eviction is. Call `persist()` after install on both platforms and check `persisted()` at launch; show a warning if it is false and the outbox is non-empty. The seven-day wipe is real for a site used in a Safari tab and gone once installed.

## 5. Background sync and uploading after the app closes

| Fact | Source | Checked |
| --- | --- | --- |
| Background Sync (`SyncManager`, `sync` event: "as soon as the network becomes available", even if the app is closed): Chrome 49+; Safari none, Firefox none. WebKit bug 182565 is still NEW with a July 2026 comment questioning exposure "without an install action". | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API), [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/SyncManager.json), [WebKit #182565](https://bugs.webkit.org/show_bug.cgi?id=182565) | 2026-10-05 |
| Background Fetch (large uploads/downloads continue after the tab closes, progress in the notification tray): Chrome 74+; Safari none. | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API), BCD | 2026-10-05 |
| Periodic Background Sync: Chrome 80+, "granted only to an installed web app that has been launched as a separate application", frequency from the site engagement score; Safari none. | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API), BCD | 2026-10-05 |

So on iPhone an upload happens only while the app is open in the foreground, and the outbox must survive a kill. On Android, Background Sync is a nice-to-have on top of the same page-driven replay, not the primary path. Design the replay to be idempotent (client-generated ids, server upsert) so a retry after a half-finished upload is safe.

## 6. Camera and file capture

| Fact | Source | Checked |
| --- | --- | --- |
| `getUserMedia`: Safari iOS 11, Chrome 53. In standalone Home Screen apps it was broken until iOS 13.4 (WebKit bug 185448, RESOLVED FIXED, "works fine (again) as of iOS 13.4 beta 1"). | BCD, [WebKit #185448](https://bugs.webkit.org/show_bug.cgi?id=185448) | 2026-10-05 |
| `MediaRecorder` (record video to a blob): Safari 14.1, Chrome 47. `ImageCapture.grabFrame` added in Safari 26. | BCD, [Safari 26 beta](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/) | 2026-10-05 |
| `<input type="file" accept="image/*" capture="environment">` opens the rear camera directly; values `user` / `environment`; desktop ignores it. Safari iOS 10, Chrome Android 25. | [MDN capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture), BCD | 2026-10-05 |
| Screen Wake Lock "now also works in Home Screen Web Apps on iOS and iPadOS 18.4" (kept the screen on during long captures). | [Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) | 2026-10-05 |

For a report's photos `<input capture>` is enough and the most reliable on both phones; `getUserMedia` is only needed for an in-app viewfinder. Write every captured `File`/`Blob` straight into IndexedDB before upload.

## 7. Push notifications

| Fact | Source | Checked |
| --- | --- | --- |
| iOS/iPadOS 16.4: "A web app that has been added to the Home Screen can request permission to receive push notifications"; the request must follow "direct user interaction"; manifest `display` must be `standalone` or `fullscreen`; Badging API and Focus integration included. BCD: "The `Notification` interface is undefined, unless the page is a web app saved to the home screen." `setAppBadge` iOS 16.4; Chrome Android none. | [Web Push for Web Apps on iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), BCD | 2026-10-05 |
| Declarative Web Push: "request a Web Push subscription and display user visible notifications without requiring an installed service worker"; `window.pushManager`; JSON with `"web_push": 8030` and a `notification` object; "available on iOS and iPadOS 18.4 for web apps added to the Home Screen". | [Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/), [Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) | 2026-10-05 |
| Android Chrome: Push API since Chrome 42 with a service worker, no install required; notifications are shown from the service worker (`showNotification`). | [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), BCD | 2026-10-05 |
| Safari 26.1 to 27.0 posts contain no web app, push or badging changes beyond bug fixes (26.2: "Fixed audio element failed to play when re-opening a Home Screen Web App"). | [26.1](https://webkit.org/blog/17541/webkit-features-for-safari-26-1/), [26.2](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/), [26.3](https://webkit.org/blog/17798/webkit-features-for-safari-26-3/), [26.4](https://webkit.org/blog/17862/webkit-features-for-safari-26-4/), [27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/) | 2026-10-05 |

## 8. Installation flow

| Fact | Source | Checked |
| --- | --- | --- |
| Android Chrome: `beforeinstallprompt` (Chrome 44+, never Safari or Firefox); capture it, call `prompt()` from a button, read `userChoice`. Chrome shows an "Add to home screen" bar or a richer dialog when the manifest has description/screenshots. | [web.dev installation prompt](https://web.dev/learn/pwa/installation-prompt), BCD | 2026-10-05 |
| iPhone: Share sheet, "Add to Home Screen". Since iOS 16.4 "Third-party web browsers can offer 'Add to Home Screen' in the Share menu"; MDN lists Safari, Chrome, Edge, Firefox and Orion. The same web.dev page still says Chrome and Edge on iOS "do not support PWA installation"; that text predates 16.4. | [Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/), [MDN installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) | 2026-10-05 |
| iOS 26: every site added opens as a web app unless the user turns off "Open as Web App". | [Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) | 2026-10-05 |
| EU: Apple's current DMA page lists alternative browser engines for "dedicated browser apps and apps providing in-app browsing experiences" and says nothing about Home Screen web apps. Apple's March 2024 reversal ("continue to offer the existing Home Screen web apps capability in the EU", built "directly on WebKit") is no longer on that page; the archived copy could not be fetched here, so only press reports carry the quote. Home Screen web apps in the EU run on WebKit regardless of the browser that installed them. | [Apple DMA page](https://developer.apple.com/support/dma-and-apps-in-the-eu/); secondary: [AlternativeTo](https://alternativeto.net/news/2024/3/apple-reverses-decision-to-remove-progressive-web-apps-from-ios-17-4-in-eu) | 2026-10-05 |

Trident's users are not in the EU, so this is a note, not a constraint. The install UI must branch: `beforeinstallprompt` button on Android, illustrated "Share → Add to Home Screen" instructions on iPhone (detect `navigator.standalone === true` or `display-mode: standalone` to hide them once installed).

## 9. Remote functions and `query.live` offline

Remote functions stay behind `experimental.remoteFunctions` and `compilerOptions.experimental.async` in Kit 3 ("not yet stable and may be changed or removed at any time", `types/index.d.ts`); `apps/app/vite.config.ts` already sets both.

| Fact | Source | Checked |
| --- | --- | --- |
| Transport: `query` and `query.live` are `GET {base}/_app/remote/{id}?payload=…`; `command`, `form` and `query.batch` are `POST`. The server rejects a non-GET live call with 405. Every remote response carries `cache-control: private, no-store`; live responses are `content-type: text/event-stream`. | `src/runtime/client/remote-functions/{query/index.js,command.svelte.js,form.svelte.js,query-batch.svelte.js,query-live/iterator.js}`, `src/runtime/server/remote-functions.js` in `@sveltejs/kit@3.0.0` | 2026-10-05 |
| Consequence for the service worker: the docs' "skip `no-store`" rule means no remote response is ever served from cache. Docs: "It's essential that you don't cache live query responses in a service worker, since the cloned response will continue streaming long after the page is closed." Offline data must therefore come from IndexedDB in the app, not from the HTTP cache. | [Remote functions](https://svelte.dev/docs/kit/remote-functions) | 2026-10-05 |
| `query.live` uses `fetch` with `accept: text/event-stream` and reads the body as a stream (not `EventSource`), so it works wherever `fetch` streaming works. Client reconnects "passively, with exponential backoff, and actively if `navigator.onLine` goes from `false` to `true`"; the loop stops retrying while `navigator.onLine` is `false`, listens for `online`, `offline`, `pagehide`, `beforeunload` and `pageshow` (resumes after bfcache restore), keeps the last good value on transport errors, and surfaces the error only if no value was ever received or the server returned an `HttpError`. `connected` and `reconnect()` are exposed. | same docs; `query-live/instance.svelte.js` | 2026-10-05 |
| A plain `query` offline: `fetch` rejects, the nearest `<svelte:boundary>` is invoked or `query.error` is set. A `form` submission: "If an error occurs during submission, the nearest `+error.svelte` page will be rendered." A `command` rejects. Nothing is queued or retried by Kit. `withOverride` is an in-memory optimistic value only. | [Remote functions](https://svelte.dev/docs/kit/remote-functions) | 2026-10-05 |
| Remote responses carry `x-sveltekit-version`, so a redeploy is noticed on the first successful call after reconnecting. | `remote_request` in `shared.svelte.js`; [configuration#version](https://svelte.dev/docs/kit/configuration#version) | 2026-10-05 |
| In an installed app `query.live` behaves as in a tab; it is a foreground stream and ends when the page is hidden on iOS (`pagehide` interrupts it) and reconnects on `pageshow`/`online`. No background delivery exists. | `query-live/instance.svelte.js` | 2026-10-05 |

Consequence: the offline story is an application-level outbox (IndexedDB) in front of `command`/`form`, with a reader that prefers local data and reconciles when a `query` succeeds; `query.live` is for "while online" freshness only, and single-flight `updates(...)` after a replayed command keeps the two in step.

## 10. iPhone limitations: resolved and remaining

| Then | Now | Source |
| --- | --- | --- |
| Camera dead in installed apps | Fixed iOS 13.4 | WebKit #185448 |
| No manifest icons, no `id` | Manifest icons 15.4, `id` 16.4 | WebKit 15.4, 16.4 |
| No push, no badge | Push + Badging 16.4 (installed only); Declarative Web Push 18.4 | WebKit 16.4, 18.4 |
| Safari-only install | Any browser's Share sheet since 16.4 | WebKit 16.4 |
| Seven-day storage wipe | Still applies to Safari tabs; installed apps exempt | WebKit ITP |
| ~1 GB quota, `persist()` ignored | Up to 60% of disk; `persist()` granted for installed apps (17) | WebKit storage policy |
| No OPFS | OPFS + sync access handle 15.2, `createWritable` 26 | BCD |
| Manifest needed for standalone | Not since iOS 26 | WebKit 26.0 |
| Wake lock broken in installed apps | Fixed 18.4 | BCD, WebKit 18.4 |
| **Remaining**: no Background Sync / Fetch / Periodic Sync; push and `Notification` only after Home Screen install; no `beforeinstallprompt`; no `showOpenFilePicker`; `setAppBadge` on iOS only; eviction possible unless persisted; WebKit engine only. | | sections 5, 7, 8, 4 |

## Open questions

- Will `@vite-pwa/sveltekit` add a `^3.0.0` peer range? Nothing filed as of 2026-10-05. If it lands before the PWA work starts, the choice in section 2 can be re-made; the built-in route stays valid either way.
- Does Chrome's `beforeinstallprompt` still require a `fetch` handler in 2026? The December 2023 post said yes "currently"; no later Chrome post was found. The planned service worker has a `fetch` handler, so it does not matter for Trident.
- The Apple-owned text of the March 2024 EU reversal could not be retrieved (the current DMA page no longer carries it and the archive was unreachable from this session). Low stakes for Trident.
- How long iOS keeps a backgrounded Home Screen web app alive before killing it is not documented by Apple; design assumes it can die at any moment, which the IndexedDB outbox covers.
- A prototype must prove: `persist()` returns `true` after Home Screen install on iOS 26; a 50 MB photo set survives a week uninstalled and a reboot; `query.live` resumes after airplane mode; a queued `command` replays once, not twice, after a version update and reload.

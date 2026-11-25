Live updates on open screens: SvelteKit's own live queries or PowerSync

Observed November 25, 2026, on branch `docs/282-live-updates-research`. Research for "🔎 app: Compare SvelteKit and PowerSync for live updates" ([#282](https://github.com/layerdbiz/tridentcubed/issues/282)) on the map "Act on the team's November feedback" ([#280](https://github.com/layerdbiz/tridentcubed/issues/280)), feeding "Add an Activity view to the profile menu" ([#306](https://github.com/layerdbiz/tridentcubed/issues/306)) and the open-screen half of "Add help text to every input" ([#299](https://github.com/layerdbiz/tridentcubed/issues/299)). It changes nothing in the app. Sources are the vendors' own docs, pricing pages and changelogs, the Postgres manual, and the source of the packages this repo installs (`@sveltejs/kit` 3.0.0, `postgres` 3.4.9), read in `node_modules` and linked on the npm CDN. GitHub's API for `sveltejs/kit` was blocked in this session, so that pull request was read as a rendered page. It builds on [the sync engine research](2026-10-05-sync-engines-for-offline-and-live.md) (#121), [the PWA research](2026-10-05-pwa-on-iphone-and-android.md) (#126) and ADRs 0002, 0006, 0007 and 0008.

Terms used below. A **live update** is a change reaching a screen that is already open, with no reload and without the screen asking again on a timer; asking on a timer is **polling**. **Server-sent events (SSE)** are one long HTTP response that the server keeps open and writes small messages into, one way only, server to browser. A **WebSocket** is a two-way connection. **`query.live`** is SvelteKit's own live remote function: the server runs a loop, and every value the loop hands back goes to the browser over SSE. A **doorbell** is a tiny message that says only "something in this table changed", with no data in it; the screen then reads again through the normal, checked path. **LISTEN/NOTIFY** is the doorbell built into Postgres: a trigger calls `pg_notify`, and every database connection that ran `LISTEN` on that channel hears it once the change is saved. A **Vercel Function instance** is one running copy of the app's server; Vercel stops a request that runs past the function's **max duration**.

## Short answer

**Recommendation for Justin to decide, medium confidence.** Use SvelteKit's `query.live` now, woken by a doorbell rung by the database itself. That one answer serves both first users today: an open Activity view and open screens showing help text each hold one live stream, and when the database rings, the server reads the new rows through the claims helper and sends them. When offline editing lands, help text (and every other row the devices keep) moves to PowerSync as ADR 0006 and ADR 0008 decided, and its doorbell retires; Activity stays on `query.live` for good, because ADR 0007 keeps admin pages on the server, never on the device.

Why, in five points:

1. **The signal has to come from the database, not from the save command.** Help text is changed straight in the database until an admin screen exists ([help.schema.ts](../../apps/app/src/lib/server/db/help.schema.ts), #299), and sign-ins are written by Better Auth, not by `saveRows`. Only the database sees every write. A trigger calling `pg_notify` hears all of them; PowerSync and Supabase Realtime read from the database for the same reason (sections 4 to 6).
2. **`query.live` is ready in the app today.** SvelteKit 3.0.0 is installed with remote functions switched on, and the service worker already leaves remote functions to the network (section 2). What SvelteKit does not give is the bell: something must wake the server's loop. Postgres LISTEN/NOTIFY does, through one listening connection per Vercel instance on Supabase's session pooler (port 5432), because the app's `DATABASE_URL` is the transaction pooler (port 6543), which drops LISTEN (section 4).
3. **PowerSync is not close.** Nothing of it is in the repo: no package, no code, the end-to-end proof (#128) is open, and the offline spec is not written. Bringing it forward for two small screens means building the device database, the token endpoint, Supabase's replication set-up and answering the IPv6 question first (section 5). Activity would not belong on the device even then.
4. **Supabase Realtime is the fastest and cheapest pipe, but not allowed today.** Its private channels need a token Supabase accepts in the browser, which ADR 0002 rules out and #117 never proved; ADR 0008 says V1 does not use Realtime. It comes back with live cursors after V1 (section 6).
5. **WebSockets add nothing here.** Vercel's support is generally available since 2026-10-20, but SvelteKit has no WebSocket API (its pull request was closed on 2026-02-05) and the data only flows one way, which is what SSE is for (section 7).

**Cost.** `query.live` on Vercel Pro: Active CPU only while the server works, so the cost is the memory of an instance kept alive by open streams. With the default 2 GB function and one instance, about **$5 a month** in office hours and about **$15** round the clock, inside the Pro plan's $20 monthly credit if other usage leaves room; more if streams spread over several instances (section 3). PowerSync: $0 on the free plan, $49 on Pro. Supabase Realtime: $0 inside Supabase Pro's quotas.

**What to prove before building** (a small spike on a Vercel preview, the kind `feature/*` branches now build): a stream that Vercel cuts at its max duration reconnects by itself; LISTEN through the session pooler works from a Vercel Function and comes back after the instance sleeps; a help text row changed in SQL reaches an open screen; a sign-in reaches an open Activity view.

**Justin's calls** (none decided here):

- A second live channel beside PowerSync for admin pages. ADR 0008 picked "the one connection it already has"; this adds one, until offline and for admin pages after. An ADR amendment or a new ADR records it.
- A new optional setting, the session pooler address for the listener, and a named exception to "the claims helper is the only way to the database" for a connection that runs only `LISTEN` and reads nothing.
- Triggers on `change`, `help_text` and the Better Auth `session` table on `trident-dev` (additive SQL, applied by hand).
- Whether the 60-second refresh (`keepFresh`) stays for the online dots once data stops needing it.

## Comparison

Prices per month. "Delay" is from a change being saved to the open screen showing it.

| | `query.live` + Postgres doorbell | PowerSync | Supabase Realtime | WebSocket on Vercel |
| --- | --- | --- | --- | --- |
| Ready in the repo now | Yes: Kit 3.0.0, flag on | No: no code, #128 open, offline spec unwritten | No: needs a browser Supabase token (#117 parked) | Vercel yes; SvelteKit has no WebSocket API |
| Hears a help text row changed in SQL | Yes, by trigger | Yes, by logical replication | Yes, by trigger (`realtime.broadcast_changes`) | Only with a doorbell, as in the first column |
| Where the open connection lives | A Vercel Function: 300 s default, 800 s max on Pro, then reconnect | PowerSync Cloud, not Vercel | Supabase, not Vercel | A Vercel Function, same limits |
| Extra cost | Vercel memory while streams are open: about $5 to $15 | Free plan $0 (50 peak clients, 2 GB synced), Pro $49 | $0 inside Pro (500 peak connections, 5 million messages) | As the first column |
| Delay | Not measured: save, ring, one read | 1 to 2 s expected by ADR 0008, unmeasured (#128) | Tens of milliseconds (ADR 0008) | As the first column |
| Fits the ADRs | ADR 0002 yes (server only); adds a channel beside ADR 0008's | ADR 0006 and 0008 chose it | ADR 0002 and 0008 rule it out for V1 | ADR 0002 yes |
| Works offline | No; pauses and resumes | Yes, it is the offline engine | No | No |

## 1. What the first two users need, from the repo

| Fact | Source | Checked |
| --- | --- | --- |
| Activity: "the organization's running list of what happens in the app, newest first, with sign-ins, projects created and every change in the history", for Admins, from the profile menu; "It updates live with no polling, as the live updates research decides." | [#306](https://github.com/layerdbiz/tridentcubed/issues/306), [GLOSSARY.md](../trident/GLOSSARY.md) "Activity" | 2026-11-25 |
| Every change in History is a `change` row the save command writes, with who, when, table, row, and the row before and after. | [change.schema.ts](../../apps/app/src/lib/server/db/change.schema.ts) | 2026-11-25 |
| A sign-in is a Better Auth `session` row, made through `databaseHooks.session.create`; that table holds the session `token`. | [auth.ts](../../apps/app/src/lib/server/auth.ts), [auth.schema.ts](../../apps/app/src/lib/server/db/auth.schema.ts) | 2026-11-25 |
| Help text is one `help_text` row per input, loaded with the lists; "until an admin screen comes they are changed in the database". #299: "everyone sees it the next time they open a page (and on open screens once live updates land)". | [help.schema.ts](../../apps/app/src/lib/server/db/help.schema.ts), [#299](https://github.com/layerdbiz/tridentcubed/issues/299) | 2026-11-25 |
| Today an open app takes in what others saved once a minute while the tab is shown (`keepFresh`, story 26) and on returning to the tab; each request also stamps the User as seen for the online dots, which stay green for 5 minutes. | [rows.state.svelte.ts](../../apps/app/src/lib/rows/rows.state.svelte.ts), [look.svelte](<../../apps/app/src/routes/(app)/look/look.svelte>), [presence.constants.ts](../../apps/app/src/lib/presence/presence.constants.ts) | 2026-11-25 |
| `DATABASE_URL` is "Supabase Postgres through its transaction pooler (port 6543)"; every read and write goes through the claims helper, and "a test fails the build when another path appears". | [env.ts](../../apps/app/src/env.ts), [db/index.ts](../../apps/app/src/lib/server/db/index.ts), [apps/app/AGENTS.md](../../apps/app/AGENTS.md) | 2026-11-25 |
| Once offline lands, "only sign-in, the PDF export and admin pages come from the server". | [ADR 0007](../adr/0007-the-app-is-installed-from-app-tridentcubed-com-and-runs-on-the-device.md) | 2026-11-25 |

Consequence: both users need a signal that fires on any write to three tables, including writes that never pass through the app's save command. Activity is an admin page, so it is a server page now and after offline.

## 2. SvelteKit `query.live`

| Fact | Source | Checked |
| --- | --- | --- |
| "`query.live` is for accessing real-time data from the server"; the callback, "typically an async generator function", returns an `AsyncIterable`. "On the client, the query stays connected while it's actively used in a component. Multiple instances share a connection." | [remote functions](https://svelte.dev/docs/kit/remote-functions) | 2026-11-25 |
| "If the connection drops, `connected` becomes `false`. SvelteKit will attempt to reconnect passively, with exponential backoff, and actively if `navigator.onLine` goes from `false` to `true`." "Only the latest pending value is kept"; "live streams are not event logs". | [remote functions](https://svelte.dev/docs/kit/remote-functions) | 2026-11-25 |
| "Don't cache live query responses in a service worker, since the cloned response will continue streaming long after the page is closed." Remote functions are "currently experimental", behind `experimental.remoteFunctions`. | [remote functions](https://svelte.dev/docs/kit/remote-functions) | 2026-11-25 |
| Transport: GET only, `content-type: text/event-stream`, `cache-control: private, no-store`; the server writes a `: keep-alive` comment after 30 s of quiet "to prevent proxies/load balancers with an idle timeout from closing" it. | [remote-functions.js](https://cdn.jsdelivr.net/npm/@sveltejs/kit@3.0.0/src/runtime/server/remote-functions.js) | 2026-11-25 |
| Client: retries a cut connection after 250 ms doubling to 10 s, ±20% jitter; stops retrying while `navigator.onLine` is false; closes on `pagehide` and reopens on `pageshow`. A loop that **ends**, a loop that **throws**, or a reconnect answered with an **HTTP error status** ends the live query for good, until the app calls `reconnect()`; only a network error is retried. | [instance.svelte.js](https://cdn.jsdelivr.net/npm/@sveltejs/kit@3.0.0/src/runtime/client/remote-functions/query-live/instance.svelte.js), [iterator.js](https://cdn.jsdelivr.net/npm/@sveltejs/kit@3.0.0/src/runtime/client/remote-functions/query-live/iterator.js) | 2026-11-25 |
| Trident runs `@sveltejs/kit` 3.0.0 with `experimental.remoteFunctions` on and `@sveltejs/adapter-vercel` 7.0.0 on `nodejs24.x`; the service worker sends remote functions to the network untouched. | [vite.config.ts](../../packages/config/vite/vite.config.ts), [apps/app/AGENTS.md](../../apps/app/AGENTS.md) "The installed app" | 2026-11-25 |

What this means in practice. SvelteKit gives the pipe, not the bell: the loop on the server must wait on something that wakes it when data changes. Two rules follow from the source. The loop must never end on its own to dodge Vercel's time limit, because the browser would then stop listening; it should run until Vercel cuts it, and the screen should call `reconnect()` on `online` and when the tab is shown again, as a safety net for a reconnect that met an error page. A hidden desktop tab keeps its stream open (only `pagehide` closes it), so a screen that does not need updates while hidden can drop its live query then.

## 3. Vercel limits and cost

| Fact | Source | Checked |
| --- | --- | --- |
| Max duration with fluid compute: Hobby 300 s; Pro and Enterprise "300s default, 800s maximum, and 1800s extended maximum Beta". It covers "time spent processing the request and sending the response, including streamed responses"; past it, a 504 `FUNCTION_INVOCATION_TIMEOUT`. | [limits](https://vercel.com/docs/functions/limitations) (updated 2026-08-24) | 2026-11-25 |
| Active CPU: "You are only billed during actual code execution and not during I/O operations". Provisioned memory is "billed for the entire instance lifetime" and "continues until the last in-flight request completes"; after that "the instance is paused, and no CPU or memory charges apply". | [pricing](https://vercel.com/docs/functions/usage-and-pricing) (updated 2026-06-16) | 2026-11-25 |
| Washington D.C. (iad1), the default region: Active CPU $0.128 per hour, memory $0.0106 per GB-hour; invocations $0.60 per million. Default function size 2 GB / 1 vCPU. | [pricing](https://vercel.com/docs/functions/usage-and-pricing), [limits](https://vercel.com/docs/functions/limitations) | 2026-11-25 |
| Pro: "$20/month Pro platform fee", which includes "$20/month in usage credit" usable "across all infrastructure resources". | [Pro plan](https://vercel.com/docs/plans/pro-plan) (updated 2026-09-15) | 2026-11-25 |
| "Multiple invocations can share the same physical instance"; Vercel "prioritize[s] existing idle resources before allocating new ones". 1,024 file descriptors shared across concurrent executions. | [fluid compute](https://vercel.com/docs/fluid-compute), [limits](https://vercel.com/docs/functions/limitations) | 2026-11-25 |
| WebSockets in Functions "generally available" on 2026-10-20. A connection "closes when its function hits the maximum duration"; new connections may reach any instance; keep "pub/sub coordination in an external data store". For data that flows "only from server to client", SSE is the better fit. | [changelog](https://vercel.com/changelog/websocket-support-is-now-generally-available), [WebSockets](https://vercel.com/docs/functions/websockets), [KB](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections) | 2026-11-25 |

Worked estimate (an estimate, not a measurement). An open stream costs almost no Active CPU: a keep-alive line every 30 s and one read per change. What it costs is memory, because it keeps its instance alive. One 2 GB instance is 2 × $0.0106 = about $0.021 an hour: 10 hours a day on 22 working days is about **$4.70 a month**, and round the clock about **$15.30**. Streams that land on two instances double that. Part of it overlaps with traffic the app serves anyway. Reconnecting every 300 s is 12 invocations an hour per open screen: ten screens for a working month is about 26,000, under two cents. Staying at the 300 s default is fine; a longer limit would save only reconnects. The project's real memory size and region are set in the Vercel dashboard, not in the repo; this assumes the defaults.

## 4. The doorbell: Postgres LISTEN/NOTIFY

| Fact | Source | Checked |
| --- | --- | --- |
| "If a `NOTIFY` is executed inside a transaction, the notify events are not delivered until and unless the transaction is committed." It goes to "each client application that has previously executed `LISTEN`" on that channel. Payload "must be shorter than 8000 bytes". | [NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html) | 2026-11-25 |
| Supabase transaction mode (6543): "Session-level state is lost between transactions. This covers … listen and notify"; use session mode or a direct connection. "The shared pooler is IPv4-only on every plan, in both session and transaction mode"; direct connections are IPv6 on Free and Pro without the IPv4 add-on. | [connecting](https://supabase.com/docs/guides/database/connecting-to-postgres) | 2026-11-25 |
| postgres.js: "When you call `.listen`, a dedicated connection will be created"; it "will automatically reconnect according to a backoff reconnection pattern", with an `onlisten` callback on every reconnect. | [postgres 3.4.9 README](https://cdn.jsdelivr.net/npm/postgres@3.4.9/README.md) "Listen & notify" | 2026-11-25 |
| PGlite, the in-process database the app uses with no settings: `.listen(channel, callback)` subscribes "to a pg_notify channel". | [PGlite API](https://pglite.dev/docs/api) | 2026-11-25 |

A suggested shape, for the build tickets to settle:

- **The bell.** Triggers call `pg_notify('changed', '<organization id>:<table>')`: on `change` and `help_text` after any insert, update or delete, and on `session` after an insert only (a sign-in; Better Auth also updates the row when it renews a session, which is not news). Each of those rows carries its organization (`active_organization_id` on `session`, set at sign-in). No row data travels, so the doorbell cannot leak anything; the payload is far under 8,000 bytes.
- **The ear.** Each Vercel instance opens one listening connection, on first use, to the session pooler (port 5432, IPv4), through a new optional setting. Live streams on that instance share it. With no settings, PGlite's own `listen` does the same, so dev, preview and tests need nothing.
- **The loop.** Each live query starts listening, then reads, then waits for its table's ring, then checks the User again and reads again. Starting to listen before the first read means a change made in between is not missed. A ring missed while an instance slept does not matter: every new stream reads first. Every read goes through the claims helper and the one permission check, exactly as `fetchLists` does.
- **Who may listen.** Activity is Admin-only; the loop re-checks the User on every ring, so someone who loses access stops receiving within one ring, and at the latest when Vercel ends the stream (300 s). PowerSync's pass, by comparison, lapses within 15 minutes (ADR 0008).

Two other bells were considered. Redis pub/sub is what Vercel suggests for its WebSockets, but it is a new service and it only hears what the app itself publishes, so a help text row changed in SQL would never ring it. Reading the database inside the loop every few seconds needs no new connection kind, but that is polling moved to the server, which #306 asks not to do.

## 5. PowerSync

| Fact | Source | Checked |
| --- | --- | --- |
| Free $0: "Up to 2 GB data synced / month", "Up to 500 MB of data hosted", "Up to 50 peak concurrent clients", 2 instances; "Free projects are deactivated after 1 week of inactivity" (a note lower on the same page says "longer than 2 weeks"). Pro from $49: 30 GB synced then $1 per GB, 1,000 peak clients then $30 per 1,000. | [pricing](https://www.powersync.com/pricing) | 2026-11-25 |
| After the first copy, "data is incrementally replicated using a change data capture stream" (Postgres logical replication); "Clients continue to connect only to the PowerSync Service"; it streams new operations as they appear. | [PowerSync Service](https://docs.powersync.com/architecture/powersync-service) | 2026-11-25 |
| Web SDK 2.7.0 (2026-11-09). HTTP streaming is "the default and recommended connection method". Svelte is named as compatible; integration packages exist for React, Vue, TanStack and Nuxt, none for Svelte. `watch` "executes a read query whenever a change to a dependent table is made". | [releases](https://releases.powersync.com/), [web SDK](https://docs.powersync.com/client-sdks/reference/javascript-web), [package.json](https://cdn.jsdelivr.net/npm/@powersync/web/package.json) | 2026-11-25 |
| Sync Streams: "your client app subscribes to the streams it needs … on demand"; filters "by static conditions or by parameters", e.g. `auth.user_id()`. Sync Rules "are deprecated". Neither page says whether Streams are beta or stable. | [Sync Streams](https://docs.powersync.com/sync/streams/overview), [migrate](https://docs.powersync.com/sync/rules/migrate-to-sync-streams) | 2026-11-25 |
| New on 2026-11-19: "a reference write endpoint", "a Node.js server that applies uploaded transactions to your source database", which "verifies the same JWT that your app sends to PowerSync". | [announcement](https://releases.powersync.com/announcements/write-path-guides-and-a-reference-write-implementation) | 2026-11-25 |
| Still to set up, from the 2026-10-05 research: a `powersync_role` "WITH REPLICATION BYPASSRLS LOGIN" and a publication on the database, a direct (IPv6) connection or Supabase's $4 IPv4 add-on (unsettled), a token endpoint from Better Auth's JWT plugin, Sync Streams, and the device database (wa-sqlite). | [sync engine research](2026-10-05-sync-engines-for-offline-and-live.md) section 1 | 2026-10-05 |
| How soon it lands: ADR 0006 accepted 2026-10-08; no PowerSync package in [apps/app/package.json](../../apps/app/package.json) and no code; the proof [#128](https://github.com/layerdbiz/tridentcubed/issues/128) is open (estimate 8, priority High); the roadmap puts offline as "the spec after" install (#199, shipped 2026-11-17). No date is written anywhere in the repo. | [roadmap](../trident/roadmap.md), [ADR 0006](../adr/0006-offline-work-lives-on-the-phone-and-syncs-through-powersync.md) | 2026-11-25 |

Fit. **Help text** suits PowerSync well once it is there: a row changed in SQL is replicated like any other and reaches every device with the lists, with no doorbell. **Activity** does not: it is an admin page that ADR 0007 keeps on the server; `change` holds the before and after of every row, so syncing it to devices spends the sync allowance for screens that never work offline; and sign-ins live in `session`, whose tokens must never reach a device. Using PowerSync for both now would mean taking the whole of #128's open work first.

## 6. Supabase Realtime, the third option

| Fact | Source | Checked |
| --- | --- | --- |
| Broadcast from the database (triggers with `realtime.broadcast_changes()`) "is the recommended method for scalability and security"; Postgres Changes "does not scale as well as Broadcast". | [subscribing to database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) | 2026-11-25 |
| Private channels: RLS policies on `realtime.messages`, the channel opened with `private: true`, and the user's JWT; "Realtime Authorization … is required for receiving Broadcast messages". Public channels need "Allow public access" left on. | [authorization](https://supabase.com/docs/guides/realtime/authorization), [subscribing](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) | 2026-11-25 |
| Pro: Realtime "500 included, then $10 per 1000" peak connections and "5 Million included, then $2.50 per Million" messages; Pro "from $25/month". | [pricing](https://supabase.com/pricing) | 2026-11-25 |
| Supabase's third-party sign-in providers are Clerk, Firebase, Auth0, Cognito and WorkOS; Better Auth would need an unproven custom JWKS registration or a server-minted token. #117, which was to prove one, closed as later work on 2026-10-09. | [Better Auth research](2026-10-05-better-auth-with-supabase.md) section 1, [#117](https://github.com/layerdbiz/tridentcubed/issues/117) | 2026-11-25 |
| ADR 0008: "V1 does not use Supabase Realtime"; cursors and letter-by-letter typing "need Supabase Realtime (#117) and a performance test first". | [ADR 0008](../adr/0008-live-editing-and-presence-ride-powersync.md) | 2026-11-25 |

Verdict. Realtime is relevant, but later. It would cost nothing extra and keep the open connection off Vercel, and a public channel used only as a doorbell is possible on paper. But it puts supabase-js and a Supabase key in the browser, which ADR 0002 rules out, and it reopens a decision ADR 0008 made on purpose. It is the right tool when cursors arrive.

## 7. WebSockets

| Fact | Source | Checked |
| --- | --- | --- |
| SvelteKit's "feat: native support for Websockets" ([kit#12973](https://github.com/sveltejs/kit/pull/12973)) was closed unmerged on 2026-02-05 ("a much more streamlined design in mind"); on 2026-07-06 the maintainers said they would revisit WebSockets after SvelteKit 3. Neither Kit 3.0.0 nor adapter-vercel 7.0.0 has a WebSocket option. | [kit#12973](https://github.com/sveltejs/kit/pull/12973), installed package types | 2026-11-25 |
| Vercel's examples are plain `ws`, Express, Hono, h3, Nitro, Bun and Next.js; SvelteKit is not among them. | [WebSockets](https://vercel.com/docs/functions/websockets) | 2026-11-25 |

Verdict. A WebSocket would need a separate server file beside SvelteKit's output, the same doorbell, and the same max duration, for data that only flows one way. Not worth it.

## 8. Can one answer serve both now?

Yes. A single `query.live` design with one doorbell covers Activity and help text today, with nothing bought, and it works with no settings in dev and tests. It also leaves a clean hand-over: when PowerSync lands, help text and the lists stop needing their live query, and the `help_text` trigger can go; Activity, and any later admin page, keeps its own. Nothing built for the doorbell is thrown away by PowerSync, and nothing in it blocks Realtime cursors later.

Suggested order, for the tickets to settle:

1. The spike on a Vercel preview (see "What to prove" above), on `trident-dev` only if Justin agrees to the triggers and the setting.
2. #306 builds Activity on it.
3. Open screens take in help text the same way (the remaining half of #299).
4. The 60-second refresh can then stop taking in data; whether it stays for the online dots is Justin's call (point 4 of his calls).

## Open questions

- What exactly does Vercel do to an SSE response at max duration once it has started: cut the connection (the browser retries) or end it some other way (the browser may stop)? The source says only a network error is retried; only the spike can show which happens.
- Does a listening connection through Supabase's session pooler survive, or come back cleanly, when Vercel pauses an instance with no requests in flight? The docs describe the pause and postgres.js describes the reconnect, but not the two together.
- How many instances do a team's streams spread over? Vercel says it prefers busy instances but promises nothing, so the $5 to $15 estimate could double or triple.
- Which function serves `/_app/remote/` under adapter-vercel 7.0.0, and can a live query get its own max duration without changing every page's? Not documented; it matters only if the 300 s default turns out too short.
- When does PowerSync land? Neither the repo nor any source dates the offline spec or #128.
- Are PowerSync's Sync Streams beta or stable, and is the free plan deactivated after one week or two of inactivity? Its own pages do not say or disagree.
- Measured delay for each option on a real phone: none of the sources give one, and #128 has not run.

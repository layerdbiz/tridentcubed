# apps/app (Report Generator)

Product vocabulary: `docs/trident/GLOSSARY.md`, via `GLOSSARY-MAP.md`.
Roadmap: `docs/trident/roadmap.md`. Shared conventions: root `AGENTS.md`.
Layout confirmed against SvelteKit docs on #42
(`docs/research/2026-09-26-sveltekit-app-layout.md`).

## Layout

```text
src/env.ts                     the settings the app reads (Kit 3 defineEnvVars), all optional
src/hooks.server.ts            session and actor into event.locals, Better Auth's /api/auth/*, the guard
src/lib/server/                server-only code: db/ (Drizzle schema, schema.sql, clients, claims.ts the
                               claims helper, policy.ts its SQL, seed.ts the one seed and its SQL),
                               auth.ts, server.ts (the one claims helper + auth, and `requireStaff` /
                               `requireSignedIn`, the check every remote function starts with),
                               access.ts (the sign-in rule), permission.ts (the one permission check),
                               settings.ts, guard.ts, signin.ts, email.ts, testing.ts (test helpers),
                               rows.ts (the save command's work and the queries' reads), files.ts
                               (upload addresses and file links), store.ts (the file store: Supabase
                               Storage or a local folder), export.ts (the PDF export: who may ask, the
                               print document, the file name), pdf-browser.ts (the export browser)
scripts/seed-sql.ts            prints the one seed as SQL (`pnpm --silent --filter app db:seed-sql`)
src/lib/rows/                  saving: rows.schema.ts (the row registry), rows.remote.ts (`saveRows`,
                               `fetchLists`), rows.utils.ts (the difference), rows.state.svelte.ts (the sync loop)
src/lib/files/                 files: files.schema.ts (the upload request), files.remote.ts (`askUpload`),
                               files.utils.ts (read time and place, shrink), files.state.svelte.ts (the
                               upload helper: `Upload`, `startUpload`)
src/lib/start/                 the starting files the seed's rows point at, served at /start/... (routes/start)
src/routes/login/              the login page (server-rendered; emailed code, then Google/Microsoft)
src/routes/waiting/            Waiting for access, where a Guest is kept (server-rendered)
src/routes/(app)/              the signed-in app, drawn on the device (ssr off in its +layout.ts)
src/routes/api/                server routes the app calls: export/pdf, places
src/routes/files/[id]/         the app's address of a file: checks the member, sends on to a signed link
src/routes/local-files/        the local folder store's signed addresses (no Supabase settings only)
src/routes/report/             a report's link, /report/<project>/<page>: what a report page's QR code
                               holds; sends the browser on to that project's Preview (behind sign-in)
src/lib/report/                the report link: report.utils.ts builds it and the app address it opens
src/lib/<feature>/             code two or more routes share: <feature>.remote.ts, .types.ts, .schema.ts
src/lib/components/<name>/     app-only components (business-shaped, so not @layerd/ui)
src/routes/<group>/<route>/    +page.svelte thin; <route>.svelte renders it; <route>.<role>.ts beside it
```

- A feature starts beside its route and moves to `src/lib/<feature>/` when
  a second route imports it.
- Support modules are `<folder>.<role>.ts` with the roles `remote`, `types`,
  `utils`, `schema`, `state`, `constants`. A colocated module that must stay
  server-only takes `.server.ts`.
- Route-colocated components are kebab nouns (`photo-grid.svelte`).
  Route-local types end in `Type`.
- Imports: `@layerd/ui` for the library, the `#lib/...js` subpath import for app code
  (Kit 3 replaced the `$lib` alias with `package.json#imports`).

## Data

- Report definitions (inputs, panels, pages) are code in `src/lib/definitions/`,
  imported directly (`#lib/definitions/index.js`); no remote function reads them (#48).
- Remote functions are the data layer: `fetchX` for `query`, `query.batch`
  and `query.live`; `getXData` for `prerender`; `submitX` for `form`.
  `command` naming is decided on the platform map with persistence.
- Remote functions are public endpoints: each `.remote.ts` checks
  `getRequestEvent().locals` and throws or redirects itself. A
  `+page.server.ts` guards the page, not the data; the hook guards many
  routes. `.remote.ts` files import `#lib/server/...` but never live under it.
- `load` remains for redirects only.

## Known exceptions

The signed-in app is the look prototype's screens (#161), carried across
whole by #180: `src/routes/(app)/look/` holds about ninety parts with one
state class (`look.state.svelte.ts`), several 1,000-line files, support
modules named for what they hold (`look.data.ts`, `chart.data.ts`,
`legs.ts`) rather than by role, and the code of looks the prototype
selector used to switch (`look.constants.ts` fixes each part's look). They
change on the UI cleanup after sign-in and the database (spec #179, Out of
Scope), not mid-feature. The browser-only Report Generator they replaced is
in `.archive/apps/app`.

The mapper there is split the same way: `mapper.ts` and its parts named for
what they map (`mapper.lists.ts`, `mapper.trip.ts`, `mapper.photos.ts`),
with what they share in `mapper.utils.ts`. Each round trip test sits beside
the mapper as `mapper.<part>.test.ts` (`mapper.projects.test.ts`,
`mapper.team.test.ts`), even when no `<part>.ts` exists.

## Saving to the database

Decided on "Sign in and save to the real database" (#179), 2026-11-12;
the why is in ADR 0002, 0003 and 0005.

- **The claims helper is the only way to the database.** App code never
  imports the Drizzle client or opens a query any other way: every read and
  write runs inside the claims helper's transaction, which sets the acting
  User's claims and switches to the restricted role so Row Level Security
  applies. A test fails the build when another path appears. The one
  permission check runs before it; Row Level Security is the net behind.
  Get it with `const { claims } = await getServer()` and run work as
  `claims.run(locals.actor, (tx) => ...)`; a new table's policy is
  `organizationPolicy('<table>')` from `db/policy.ts`.
- **One save command: `saveRows`** (`src/lib/rows/rows.remote.ts`). Every
  change to a row (records, projects, panels, stops, entries, photos, status,
  Trash, roles) goes to the server through it as a batch of row changes,
  `{ changes: [{ changeId, table, id, operation: 'put' | 'delete', values }] }`.
  The lists load through `fetchLists`; a project's own rows (registry
  scope `project`, plus every row carrying its `projectId`) through
  `fetchProject` as it opens, taken in with the sync loop's `merge`. Do not add a remote function for a
  new kind of row. A named `command` is for what is not a row only: an
  upload address, a place lookup, a PDF export.
- **Adding a table** is one entry in the row registry
  (`src/lib/rows/rows.schema.ts`: its columns with their Valibot checks, its
  parent, its scope), its Drizzle table (with `rowColumns()` and
  `organizationPolicy`) named in `DRIZZLE_TABLES` of `src/lib/server/rows.ts`, and a
  rule in the one permission check only if it has one of its own. Then
  teach the mapper (`routes/(app)/look/mapper.ts`) both directions (screen
  state to rows, rows to screen state) and add a round trip test at the save
  seam (`mapper.test.ts`): state through the mapper, the save command and
  the queries back to equal state, order included. The save command and the
  queries read the registry, so they need no change.
- **Ids are UUIDs made on the device**, and the server sets created and
  updated times. The screens keep naming records by name; only the mapper
  translates names to ids.
- **Files go to private storage, never into a row** (ADR 0004, #187). A
  picture column is declared with `PICTURE` in the registry and keeps the
  app's file address (`/files/<id>`). A picture field uploads through the
  upload helper when given its `target` (`{ table, column, id }`); the
  server's `createUpload` checks the column holds files and asks the one
  permission check before it hands out an upload address.
- **Schema changes** are Drizzle schema edits tested on the in-process
  Postgres. Vercel builds never migrate the Supabase database.

## The installed app

Decided on "Install the app on phones" (#199), 2026-11-17; the why is in
ADR 0007. Working with no signal is the offline spec's (ADR 0006): none of
it belongs here.

```text
src/routes/manifest.webmanifest/   the manifest: a server route, with its builder and test beside it
src/app.html                       the page head's links to the manifest and the Apple touch icon
packages/ui/static/install/        the icons (shared static files)
scripts/icons.ts                   remakes the icons from the dark logo on black (`pnpm --filter app icons`)
src/service-worker/                the service worker: index.ts, its own tsconfig, and
                                   service-worker.utils.ts, what it stores and what a request gets, as
                                   plain tested functions
src/routes/offline/                the Needs Internet screen the service worker shows
src/lib/install/                   Install App: install.constants.ts, install.state.svelte.ts (it starts
                                   hearing the browser in src/hooks.client.ts) and how-to.svelte; used by
                                   routes/(app)/look/account-menu.svelte and routes/login/login.svelte
src/lib/components/sheet/          the one sheet (slides up on a phone, a pop-up from tablet width up),
                                   here because the login page's how-to opens in it too
src/lib/update/                    the update note: its rule, its test and the note, wired into the
                                   signed-in app only; in lib because the service worker reads its
                                   one message (update.constants.ts) too
```

- **Data always comes from the server.** The service worker never stores
  or answers data. It answers this version's built files and the named
  static files (`KEPT_STATIC`) from the device, and gives a page request
  that fails the Needs Internet screen. Every
  other request goes to the network untouched: remote functions, server
  routes, file addresses and anything that is not a plain read. That rule
  is the one tested function beside `index.ts`; change what a request gets
  there, test first.
- **The service worker keeps a named list.** On install it stores this
  version's built files, the Needs Internet screen and `KEPT_STATIC`,
  nothing else. Every app serves the same static folder
  (`packages/ui/static`, 99 MB with the Website's videos and photos), so a
  static file the installed app needs is added to `KEPT_STATIC` by name.
- **The app answers the manifest; it is not a static file.** A file in the
  shared static folder would be the Website's manifest too. The name
  follows the address the manifest was asked on: `app.tridentcubed.com`
  gives "Trident Cubed" and "Trident", any other address gives "Trident
  Cubed Dev" and "Trident Dev". No setting and no environment variable.
- **Addresses and icon names are written once,** in
  `src/lib/install/install.constants.ts` (`MANIFEST_PATH`, `OFFLINE_PATH`,
  `WORKER_PATH`, the icon URLs, `LOGO`, `KEPT_STATIC`, `BLACK`). Import
  them. The sign-in guard (`src/lib/server/guard.ts`) opens those paths
  and files, each by its one address, to a signed-out browser, which asks
  for the manifest, the icons and the service worker with no session.
- **The Needs Internet screen works alone.** The service worker answers
  with it at whatever address was asked for, so it is prerendered and
  starts no SvelteKit router, which would try to draw the asked-for route.
  Try Again and the browser's `online` event are a plain reload.
- **Updates use the default handover.** A new service worker waits until
  the app is closed; it does not call `skipWaiting()` on install. A tap on
  the update note asks the waiting worker to take over and reloads, and the
  tap waits while the Save state is Saving or Not saved.
  SvelteKit's own version check (`updated` of `$app/state`) is the only
  thing that says a new version exists; the note then asks the browser to
  fetch the new service worker, since an open app loads no page and the
  browser looks for one only then. When to switch is the update rule
  (`src/lib/update/update.state.svelte.ts`); change it there, test first.
- **A page load is the browser's own request.** The service worker turns
  on navigation preload when it takes over and answers a page load with
  that request, never with one it sends itself: a request sent from a
  service worker reaches the server as a plain read (`Sec-Fetch-Dest:
  empty`), not as a page load. Vercel's Skew Protection keeps a visitor on
  the deployment they started with by a cookie and moves them to the newest
  one on a page load only, so a page load sent from the service worker left
  an open app on the old deployment, and the update note came back after
  every tap. With preload on, the browser asks for every page load itself,
  so one the service worker leaves alone would be asked twice: an address
  that is not a page gets the browser's request handed back as it came.
- **Ask the browser what it can do.** Install App knows three things, each
  asked of the browser: whether the app runs installed, whether a one-tap
  install was offered, whether an install just happened. Nothing reads the
  user agent or the platform; the User picks iPhone or Android in the
  how-to.
- **Run it on a production build.** The service worker is registered from
  a build only: `pnpm exec vp build`, then
  `pnpm exec vp preview --host --port 4174`. SvelteKit 3 would register it
  from the dev server too; the shared config (`packages/config/vite`) turns
  that off, so a dev page is never answered from stored files.
- **Pages link their files from the root** (`paths: { relative: false }` in
  `vite.config.ts`), because the Needs Internet screen is shown at addresses
  it was not made for.
- Labels are Title Case: "Install App", "Needs Internet", "Try Again".

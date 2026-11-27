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
                               claims helper, policy.ts its SQL, triggers.ts what the database does by
                               itself, seed.ts the one seed and its SQL),
                               auth.ts, server.ts (the one claims helper + auth, and `requireStaff` /
                               `requireSignedIn`, the check every remote function starts with),
                               access.ts (the sign-in rule), permission.ts (the one permission check),
                               settings.ts, guard.ts, signin.ts, email.ts, testing.ts (test helpers),
                               rows.ts (the save command's work and the queries' reads), files.ts
                               (upload addresses and file links), store.ts (the file store: Supabase
                               Storage or a local folder), convert.ts (a picture the device could not
                               read, converted on the server and swapped in, #294), export.ts (the PDF
                               export: who may ask, the print document, the file name), pdf-browser.ts
                               (the export browser), activity.ts (the Activity's read, and what the
                               app records itself, #306)
scripts/seed-sql.ts            prints the one seed as SQL (`pnpm --silent --filter app db:seed-sql`)
src/lib/rows/                  saving: rows.schema.ts (the row registry), rows.remote.ts (`saveRows`,
                               `fetchLists`), rows.utils.ts (the difference), rows.state.svelte.ts (the sync loop)
src/lib/files/                 files: files.schema.ts (the upload and convert requests, the picture sizes and
                               the types the server converts, what kind an attachment is and its icon),
                               files.remote.ts (`askUpload`), files.utils.ts (shrink, or send untouched, on the
                               device), files.state.svelte.ts (the upload helper: `Upload`, `startUpload`, and
                               `AttachmentUpload` for a PDF or video and the picture made of it, #327)
src/lib/pdf/                   PDFs in photo groups (#327): pdf.utils.ts (PDF.js on the device: a PDF's pages
                               counted and drawn, once), pdf.constants.ts (the decoders, fonts and character
                               maps PDF.js reads for some PDFs, served with the app), pdf.state.svelte.ts (a
                               stored PDF's page count read from the PDF itself, for an Items PDF, #295)
src/lib/video/                 videos in photo groups (#327): video.utils.ts (the length and the Thumbnail
                               made on the device, the app address that plays one)
src/lib/components/attachment/ pdf-page.svelte: one page of a stored PDF in its spot on the Preview
src/lib/metadata/              metadata.utils.ts: every metadata field of a picture carried byte for byte into
                               the shrunk copy, the original's field list for the File row (#292), and the
                               time and place the file says; the test pictures in fixtures/ (drawn, no
                               client data)
src/lib/start/                 the starting files the seed's rows point at, served at /start/... (routes/start)
src/routes/login/              the login page (server-rendered; emailed code, then Google/Microsoft)
src/routes/waiting/            Waiting for access, where a Guest is kept (server-rendered)
src/routes/(app)/              the signed-in app, drawn on the device (ssr off in its +layout.ts)
src/routes/api/                server routes the app calls: export/pdf, places, convert (#294)
src/routes/files/[id]/         the app's address of a file: checks the member, sends on to a signed link
src/routes/video/[id]/         plays a stored video: what a video's Thumbnail links to in the PDF (#327)
src/routes/local-files/        the local folder store's signed addresses (no Supabase settings only)
src/routes/report/             a report's link, /report/<project>/<page>: what a report page's QR code
                               holds; sends the browser on to that project's Preview (behind sign-in)
src/lib/report/                the report link: report.utils.ts builds it and the app address it opens
src/lib/activity/              the Activity (#306): activity.remote.ts (`fetchActivity`, an Admin's only;
                               `recordActivity`, a project opened or its PDF downloaded), activity.note.ts
                               (`noteActivity`, which loads that command when first used), activity.types.ts
                               and activity.utils.ts (the Grouped view's runs); the screen is
                               routes/(app)/look/activity-page.svelte
src/lib/signature/             Email Signature (#354): signature.utils.ts (a signature from the Team record, the
                               signature Sheets filling in the rest), .types.ts, .constants.ts; the server's
                               work is lib/server/signature.ts (who may open which, the pictures made with
                               sharp), asked at routes/api/signature (its own Vercel function);
                               routes/signature/[file] answers a signature's pictures to anyone, since every
                               reader's mail app loads them signed out; the screen is
                               routes/(app)/look/signature-page.svelte
src/lib/start/files.ts         the starting files' built addresses, for routes/start and the signature pictures
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
  `organizationPolicy('<table>')` from `db/policy.ts`, or `userPolicy('<table>')`
  for a table each User keeps for themselves (the menu's pins, `pinned`), whose
  `user_id` the save command sets.
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
- **A picture the device cannot read goes untouched** (ADR 0004, #294): a
  HEIC in Chrome on Windows and Android, a TIFF (`CONVERTIBLE_TYPES`), or a
  photo whose own copy fell short (#292). The upload helper then asks
  `/api/convert`, its own Vercel function with sharp and libheif, and
  gives the row the file's address only once the server's copy is swapped
  in. Only the member who sent the file may convert it, and the kind of
  picture (photo or logo) comes from its column. The untouched file is deleted once the copy checks out; when it
  cannot (a TIFF), it stays beside the copy, named on the file row
  (`original_path`). Camera RAW is turned down on the device for now.
- **Schema changes** are Drizzle schema edits tested on the in-process
  Postgres. Vercel builds never migrate the Supabase database. A trigger,
  which drizzle-kit cannot write, goes in `db/triggers.ts`: the in-process
  Postgres runs it, and each Supabase database is given the same SQL by hand.

## Releases and What's New

- **A release is a tag and a GitHub release, nothing else (#157).** Each
  push to dev runs `.github/workflows/release.yml`: it works the version
  out from the commit titles since the newest `v*` tag
  (`src/lib/releases/releases.utils.ts`, breaking = major, feat = minor,
  fix or perf = patch, else no release), tags dev's newest commit and
  publishes the GitHub release with notes shaped like What's New
  (`scripts/release.ts`, `--dry-run` previews, `--first` previews v1.0.0,
  `--head <tag>` writes an older one's notes again). Nothing is committed for a
  release, so dev stays a fast-forward of next. Never tag or publish by
  hand.
- **The version comes from the tags.** A build reads them from git
  (`src/lib/releases/releases.server.ts`; Vercel's copy has none, so it
  fetches them from the public repository) and writes the label into the
  app (`__APP_VERSION__`, `vite.config.ts`) and into What's New's history.
  On dev and main a build with something new is the release being made, so
  it shows `v1.2.0` before the workflow has made the tag.
- **Every push to next is a prerelease (Justin, 2026-11-27).** The same
  workflow tags next's newest commit `v1.0.0-next.1`, `-next.2` and on,
  whatever the push holds, and publishes a GitHub release named that and
  nothing more: no Pre-release badge, never Latest, made from next
  (`--target next`) and saying so in its first line, with what came since
  the one before. The count leads to the release to come: v1.0.0 before the
  first, then the version next's changes since the last release make
  (`v1.1.0-next.1`). next.app shows its version, and its build names it
  before the tag exists. Each one ends a What's New section, like a release.
- **The first release is made (Justin, 2026-11-27).** `IS_RELEASING` in
  `releases.utils.ts` is on: the push that brought next into dev made
  v1.0.0. Each later push to dev with a feature or a fix makes the next
  version, and dev still takes next only on Justin's word.
- **What's New is the one update prompt (Justin, 2026-11-27).** It opens
  by itself the moment a new version is out, and when the app is opened on
  something new; its button reloads onto the newest version. There is no
  "New version, tap to update" note on any branch.
- **v1.0.0 is one list (Justin, 2026-11-27).** The first release is told in
  its own words, `src/lib/releases/first-release.ts`: what the app does
  today, features only, each once, in everyday words, in place of every day
  of work before it. dev.app's What's New and the v1.0.0 GitHub notes show
  that one list, with nothing behind the scenes. dev and main name only
  releases; next.app keeps its next versions, each commit staying in the
  prerelease that brought it. Releases after it list their commits'
  `What's New:` lines as usual.
- **A dev release is one section, dated the day it reached dev (Justin,
  2026-11-27).** However many days its work took on next, a release made
  on dev is one What's New section and one `## <date>` in its GitHub notes,
  dated by its tag (the workflow tags it the moment the push lands), or
  today for the one being made. next.app keeps a section per prerelease
  and per day.
- **What's New always opens on its glow (Justin, 2026-11-27).** It is a
  full library `Dialog` (`variant="full"`): on a phone it fills the whole
  screen, with no grab handle, and its list fades out under the head and
  above the button as it scrolls (`fade="y"`, the library `Scroller`). Its
  head is the library `Glow` from edge to edge, ending on the library's wave
  `Divider`, which takes its own room under padded words and hangs a pixel
  past the glow's edge so no line shows; the X is at the top right. It
  names the release in view: as the list scrolls down it moves from
  v1.0.0-next.6 to next.5, next.4 and on, each in its own pair of theme
  colours (`toReleaseGlow`), the light easing from one to the next. The
  newest says "New release" when it holds something the person has not
  seen, else "Latest release"; older ones "Earlier release". Every section
  is open, and every line looks alike: nothing is marked new line by line.
- **What's New is plain (Justin, 2026-11-27).** It lists each day under
  its date in bold (`2026-11-27`, the team's clock), and in it only
  Features and Fixes people notice, in everyday words. Every release also
  ends a section, so each section is one release's day, naming its version
  and linking its GitHub notes.
  The days and the notes written from them live in
  `src/lib/releases/history.utils.ts`.
- **A change shows only with its plain words.** A `feat`, `fix` or `perf`
  commit people will notice carries one line per thing they will notice in
  its message body: `What's New: Pin anything to the menu.` Short, everyday
  words, no code names, no ticket numbers (the notes add those). A commit
  with no such line stays out of What's New and goes under the GitHub
  notes' folded Behind the scenes, as does every other kind. The commits
  made before this rule have their words in `src/lib/releases/notes.ts`,
  keyed by their title words; never add to it, write the line instead. The
  repository and its releases are public: no client names, data or
  screenshots in either.

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
src/lib/update/                    the update rule What's New's button follows, its test and the
                                   service worker's words; in lib because the service worker reads its
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
  What's New's button asks the waiting worker to take over and reloads, and
  the tap waits while the Save state is Saving or Not saved.
  SvelteKit's own version check (`updated` of `$app/state`) is the only
  thing that says a new version exists; What's New then asks the browser to
  fetch the new service worker, since an open app loads no page and the
  browser looks for one only then. When to switch is the update rule
  (`src/lib/update/update.state.svelte.ts`); change it there, test first.
- **Each request names its version (#401).** Vercel's Skew Protection
  keeps a browser on the deployment it started with by a cookie
  (`__vdpl`), and a request sent from a service worker is no page load to
  Vercel, so the cookie holds it on that deployment. So the service worker
  names the deployment itself: its install asks for its own files with
  `x-deployment-id` set to the deployment it was built in
  (`__DEPLOYMENT_ID__`, written in by `vite.config.ts`), and a page load
  is asked of the newest one (`x-deployment-id` empty, `cache:
  'no-store'`). The server sets the cookie to the deployment that served
  each page and marks the page `no-store` (`src/lib/server/pin.ts`), so
  the page's files come from the same one. Navigation preload stays off:
  the page is asked for here, and preload would ask a second time. Before
  #401 an install asked for the new files under the old cookie, got 404s
  and never finished, so Reload had nothing to switch to.
- **Nobody stays on an old version (Justin, 2026-11-26).** With a newer
  version out, What's New's X, a tap outside and Escape do what its button
  does. A reload made for the newest version that still brings an older
  page clears the service worker and its caches and reloads once per
  version and tab (`src/lib/update/rescue.ts`).
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

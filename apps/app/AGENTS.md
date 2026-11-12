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
                               claims helper, policy.ts its SQL, seed.ts the one seed), auth.ts, server.ts
                               (the one claims helper + auth), access.ts (the sign-in rule), permission.ts
                               (the one permission check), settings.ts, guard.ts, signin.ts, email.ts,
                               testing.ts (test helpers), rows.ts (the save command's work and the
                               queries' reads), files.ts (upload addresses and file links), store.ts
                               (the file store: Supabase Storage or a local folder), pdf-browser.ts
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
  The lists load through `fetchLists`. Do not add a remote function for a
  new kind of row. A named `command` is for what is not a row only: an
  upload address, a place lookup, a PDF export.
- **Adding a table** is one entry in the row registry
  (`src/lib/rows/rows.schema.ts`: its columns with their Valibot checks, its
  parent, its scope), its Drizzle table (with `rowColumns()` and
  `organizationPolicy`) named in `TABLES` of `src/lib/server/rows.ts`, and a
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

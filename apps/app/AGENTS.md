# apps/app (Report Generator)

Product vocabulary: `docs/trident/GLOSSARY.md`, via `GLOSSARY-MAP.md`.
Roadmap: `docs/trident/roadmap.md`. Shared conventions: root `AGENTS.md`.
Layout confirmed against SvelteKit docs on #42
(`docs/research/2026-09-26-sveltekit-app-layout.md`).

## Layout

```text
src/env.ts                     the settings the app reads (Kit 3 defineEnvVars), all optional
src/hooks.server.ts            session into event.locals, Better Auth's /api/auth/*, the sign-in guard
src/lib/server/                server-only code: db/ (Drizzle schema, schema.sql, clients), auth.ts,
                               server.ts (the one db + auth), settings.ts, guard.ts, signin.ts, email.ts,
                               testing.ts (test helpers), pdf-browser.ts
src/routes/login/              the login page (server-rendered; emailed code, then Google/Microsoft)
src/routes/(app)/              the signed-in app, drawn on the device (ssr off in its +layout.ts)
src/routes/api/                server routes the app calls: export/pdf, places
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
- **One save command.** Every change to a row (records, projects, panels,
  stops, entries, photos, status, Trash, roles) goes to the server through
  the one generic save command as a batch of row changes. Do not add a
  remote function for a new kind of row. A named `command` is for what is
  not a row only: an upload address, a place lookup, a PDF export.
- **Adding a table** is one entry in the row registry: its columns, its
  parent, its Valibot validation and its rules (who may change which
  columns, and when the row is frozen). Then teach the mapper both
  directions (screen state to rows, rows to screen state) and add a round
  trip test at the save seam: state through the mapper, the save command and
  the queries back to equal state, order included. The save command and the
  queries read the registry, so they need no change.
- **Ids are UUIDs made on the device**, and the server sets created and
  updated times. The screens keep naming records by name; only the mapper
  translates names to ids.
- **Schema changes** are Drizzle schema edits tested on the in-process
  Postgres. Vercel builds never migrate the Supabase database.

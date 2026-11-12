---
status: accepted
---

# Restart Report Generator V1 from the sv create scaffold

The Report Generator in `apps/app` (48 files, about 12,000 lines, state in localStorage, no server, database or login) is a prototype. V1 needs a database, authentication, permissions, offline editing and live multi-user editing underneath every input, and evolving the prototype would mean rewriting most of it under the old shape. Decided on 2026-10-05 ([#113](https://github.com/layerdbiz/tridentcubed/issues/113)): V1 starts from the SvelteKit `sv create` scaffold recorded on [#112](https://github.com/layerdbiz/tridentcubed/issues/112), created with the `sv` CLI (`sv create` and its add-ons, which set up Better Auth, Drizzle and the rest) into `apps/app` once the prototype has moved to `.archive/apps/app`, moved onto Vite+ with `vp migrate`, and conformed to the repository's config factory and conventions. The platform is built first; report features are re-authored on it with the prototype as reference.

## Considered options

- Evolve `apps/app` in place: rejected, the shape (localStorage state, 1,500-line route files) is what has to change.
- A new folder beside the prototype (`apps/generator`): rejected, Vercel, docs and `AGENTS.md` already point at `apps/app`.
- Creating the V1 app during the platform map: rejected, the map produces decisions and small prototypes, not deliverables; the app is the first build ticket after `/to-spec`.

## Consequences

- Only `apps/app/src/lib/definitions/` is copied whole; everything else in the prototype is reference material, deleted when V1 ships.
- The `persist` helper in `packages/ui` waits for the live-editing decision; the preview and PDF export wait for the data model.
- `sv create` with its add-ons, then `vp migrate`, is the documented way to start an app in this repository; `sv` has no Vite+ option (checked on sv 1.1.1), and `vp create svelte -- <sv arguments>` runs the same two steps in one call (#112). A new app replaces its generated `vite.config.ts` with `createAppConfig`.

## Amendment, 2026-11-12

Decided on "Sign in and save to the real database" ([#179](https://github.com/layerdbiz/tridentcubed/issues/179)), on autopilot and for Justin's review. The look prototype ([#161](https://github.com/layerdbiz/tridentcubed/issues/161)) was made after this decision and holds the screens Justin approved, so its screens are carried into V1 whole and become the signed-in app: not redesigned, not rebuilt on `@layerd/ui` (importing it breaks the edit panels' layout), and not split up. This replaces "only the definitions are copied" above. The V1 app still starts from the `sv create` scaffold, and the browser-only Report Generator still moves to `.archive/apps/app`. The screens keep their one in-memory state class and their names for records; a mapper is the only code that turns that state into database rows and back, so the screens reach the database unchanged. The prototype selector, its letters and the made-up sample data do not ship.

The UI cleanup Justin agreed should come first (splitting the panel editor and the report preview, one shared field component, moving the screens onto ids and the shared UI library, deleting the unused looks' code) now follows the database work instead, so a working sign-in comes sooner. Until then `apps/app/AGENTS.md` lists the carried screens as a known exception.

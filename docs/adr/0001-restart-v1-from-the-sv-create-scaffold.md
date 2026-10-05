---
status: accepted
---

# Restart Report Generator V1 from the sv create scaffold

The Report Generator in `apps/app` (48 files, about 12,000 lines, state in localStorage, no server, database or login) is a prototype. V1 needs a database, authentication, permissions, offline editing and live multi-user editing underneath every input, and evolving the prototype would mean rewriting most of it under the old shape. Decided on 2026-10-05 ([#113](https://github.com/layerdbiz/tridentcubed/issues/113)): V1 starts from the SvelteKit `sv create` scaffold recorded on [#112](https://github.com/layerdbiz/tridentcubed/issues/112), created with `vp create svelte` into `apps/app` once the prototype has moved to `.archive/apps/app`, and conformed to the repository's config factory and conventions. The platform is built first; report features are re-authored on it with the prototype as reference.

## Considered options

- Evolve `apps/app` in place: rejected, the shape (localStorage state, 1,500-line route files) is what has to change.
- A new folder beside the prototype (`apps/generator`): rejected, Vercel, docs and `AGENTS.md` already point at `apps/app`.
- Creating the V1 app during the platform map: rejected, the map produces decisions and small prototypes, not deliverables; the app is the first build ticket after `/to-spec`.

## Consequences

- Only `apps/app/src/lib/definitions/` is copied whole; everything else in the prototype is reference material, deleted when V1 ships.
- The `persist` helper in `packages/ui` waits for the live-editing decision; the preview and PDF export wait for the data model.
- `vp create svelte` is the documented way to start an app in this repository; a new app replaces its generated `vite.config.ts` with `createAppConfig`.

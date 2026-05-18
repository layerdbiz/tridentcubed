---
name: Report Generator Rules
description: 'Use when editing the report generator app in apps/app. Covers Sheetari and local mirror architecture, route-first structure, remote functions, and report-specific editor and preview rules.'
applyTo: 'apps/app/**/*.svelte,apps/app/**/*.ts,apps/app/**/*.js,apps/app/**/*.css'
---

# Report Generator App Rules

These rules are specific to `apps/app`. Shared app import and component rules live in the app baseline instructions.

## Product Flow

- The core workflow is projects list -> project details workspace -> edit panels and inputs -> preview pages -> export.
- Keep changes additive and practical; do not turn routine edits into a large restructure.

## Planning Sources Of Truth

- The upstream planning source is Google Sheets -> Sheetari.
- The workspace source of truth is the local mirror in `apps/app/src/lib/data`.
- Keep `inputs`, `panels`, `pages`, and `instructions` distinct.
- Use the local JSON mirror first when understanding the current app state.
- Do not manually parse Google Sheets or recreate sheet-backed schema in code.
- If upstream sheet structure changes, refresh the local mirror with `pnpm sheetari`.
- A Google Sheets connection may exist, but use it only if the user explicitly asks to edit the live sheet.

## Data Responsibilities

- `inputs` define fields, storage paths, and page ownership via `outputToPages` and `outputToPageSection`.
- `panels` define editor panels, order, visibility, and panel behavior.
- `pages` define preview or export pages, order, names, and page layout.
- `instructions` document the contract for the other sheets.
- Editor panel creation comes from `panels`, page creation and ordering comes from `pages`, and preview ownership comes from `inputs` first.
- Avoid title-based routing or long-lived code-side heuristics when explicit sheet data can own the relationship.
- If many-to-many panel or page mappings become necessary, prefer a dedicated sheet-backed join model instead of overloading panel data with output logic.

## Simple Route Carveout

- `apps/app/src/routes/simple/**` is the proving ground for the reduced sheet model.
- Keep simple-route work additive; do not remove or rewrite the legacy `(app)/projects` flow.
- Prefer direct Sheetari reads through route-local remote functions for the first simple-route pass.
- Panels own panel layout, pages own page layout, and inputs bridge panels to pages without owning page layout.
- Pages stay hidden unless referenced by inputs or explicitly included.
- `visibility: none` removes the row from the app.
- Avoid non-core enhancements during this foundation pass, including drag and drop, progress bars, and user-controlled page zoom.

## Route-First Structure

- Feature logic lives under `src/routes`.
- Keep route helpers colocated with the route and use `$lib` only when logic is truly shared across route families.
- Use prefix-dot support filenames such as `projects.remote.ts`, `projects.types.ts`, `projects.utils.ts`, and `projects.schema.ts`.
- Baseline route files are `+page.svelte`, `*.remote.ts`, and `*.types.ts`.
- Add `*.schema.ts`, `*.utils.ts`, `+page.server.ts`, or `*.server.ts` only when they are justified.
- Remote functions are the primary data layer; prefer them over manual fetch patterns and keep them colocated with the route.

## Details Workspace Behavior

- The project details page remains the main workspace.
- On desktop, prefer split edit plus preview when that is the intended working surface.
- On mobile, the same details page may switch views with tabs or another compact control.
- Use shallow routing as URL and history enhancement for panels, drawers, modals, or mobile view state, not as the only source of truth for core state that must survive reloads or SSR.

## Sheet Output Guidance

- When giving the user paste-ready sheet rows, output tables in the live column order from the local mirror.
- Show only the changed rows unless the user asks for a full sheet view.
- Identify which sheet each table belongs to.
- Never tell the user to type the literal string `null`; blank sheet cells should stay blank.

## Guardrails

- Keep the existing Sheetari-backed remote function architecture unless the user explicitly asks to change it.
- Reuse existing UI components rather than creating route-specific replacements by default.
- Do not perform large refactors without explicit instruction.

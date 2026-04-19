---
name: Report Generator Rules
description: 'Use when editing the report generator app in apps/app. Covers route-first co-located architecture, remote functions, Sheetari-driven field definitions, file naming, and minimal SvelteKit structure.'
applyTo: 'apps/app/**/*.{svelte,ts,js,css}'
---

# Report Generator App — Architecture & Development Rules

---

# 1. Overview

## 1.1 Purpose

This app is a **report generation system** used to:

- Create structured reports (projects)
- Input data through dynamic form sections (panels)
- Persist data (localstorage → DB later)
- Generate preview pages (paginated)
- Export to formats (PDF, DOCX, HTML, MD)

---

## 1.2 Core Flow

Projects List  
→ Project  
→ Edit (Panels > Inputs)  
→ Preview (Pages)
→ Export

---

## 1.3 Architecture Philosophy

- Route-colocated everything
- Remote functions = primary data layer
- Minimal files (only when needed)
- No over-engineering
- Atomic + reusable UI via external `@layerd/ui` components
- Prefer declarative systems over hardcoded UI
- No legacy patterns unless required

---

# 1.4 Planning Source of Truth (Google Sheets + Sheetari + Local Mirror)

This app uses **Google Sheets as the planning source of truth** and **Sheetari** to turn those sheets into JSON.

For app work inside this repo, there are two layers you must keep distinct:

- the **upstream planning source**: Google Sheets -> Sheetari
- the **local workspace mirror**: JSON files in `apps/app/src/lib/data/`

Both matter.
Do not collapse them into one concept.

The core app data currently comes from four sheet-backed JSON sources:

- `inputs`
- `panels`
- `pages`
- `instructions`

These have distinct roles and should not be conflated:

- `inputs` defines the input fields, their storage paths, and which output pages consume them via `outputToPages`
- `panels` defines the editor panels, their order, visibility, and panel behavior
- `pages` defines the output pages, their order, names, and render variants
- `instructions` documents the contract for the other sheets and should be treated as the schema reference

These sheets are still evolving, so changes should stay minimal and intentional. This data model is the foundation of the app, so we need to keep it clean, easy to reason about, and consistent as we refine it.

## Simple Route Migration Carveout

The new `routes/simple/` surface is the proving ground for the reduced sheet model.

When working in `apps/app/src/routes/simple/`:

- keep the work additive and do not remove or rewrite the legacy `(app)/projects` flow
- prefer direct Sheetari reads through route-local remote functions for the first simple-route implementation
- treat `panels`, `inputs`, and `pages` as the source of truth for the simple route
- use `instructions` only as secondary reference help while it catches up
- panels own panel `layout`
- pages own page `layout`
- inputs bridge panels to pages, but do not control panel layout
- pages are hidden by default and should render only when referenced by inputs or explicitly included by a dedicated page-level include field
- `visibility: none` means fully remove the row from the app, even if other rows still reference it
- keep route logic in the route file unless it clearly belongs in a route-local remote file, types file, or utility file
- reuse existing UI components and avoid drag/drop, progress bars, user-controlled page zoom, and other non-core enhancements during this foundation pass

When preparing rows for Google Sheets or telling the user what to paste into a sheet:

- never tell the user to enter the literal value `null` into a sheet cell
- if a sheet value is absent, leave the cell blank instead
- the local JSON mirror may still represent blank sheet cells as `null` after Sheetari sync, and that is expected
- when the user asks for changes to any app data sheet (`inputs`, `panels`, `pages`, or `instructions`) for manual copy/paste, always include paste-ready table output for the affected rows
- those tables must use the current live column order from the local JSON mirror, not alphabetical key order
- explicitly tell the user which sheet the rows belong to
- prefer showing only the rows that changed, unless the user asks for a full sheet view

At times, we may edit the sheet structure as `.csv` files first, then upload those changes back into Google Sheets so the updated JSON can be consumed through Sheetari.

app data (json)

- https://sheetari.deno.dev/1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k/panels
- https://sheetari.deno.dev/1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k/inputs?range=b1:u
- https://sheetari.deno.dev/1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k/pages

app data instructions (json)

- https://sheetari.deno.dev/1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k/instructions

The local mirrored copies live here:

```txt
apps/app/src/lib/data/
  config.json
  inputs.json
  panels.json
  pages.json
  instructions.json
```

Refresh the local mirror with:

```txt
pnpm sheetari in the root directory of this monorepo (e.g. `/v/@layerdbiz/template`)
```

## Workspace Source Of Truth

When working on the app inside this repository, the local JSON mirror is the default source of truth for context, inspection, planning, and code assistance.

That means:

- read `apps/app/src/lib/data/*.json` first when understanding current app data
- use the local mirror when giving the user guidance about the current structure
- assume the user may update upstream sheet data separately, then run `pnpm sheetari` to refresh the local copy
- if the local mirror is stale or missing, refresh it or ask the user to refresh it before making assumptions

The Sheetari URLs remain the upstream remote source and the refresh source, but they are not the first place to look during normal app work when the local mirror exists.

## Remote Function Rule

Keep the existing Sheetari setup in the app's remote functions unless the user explicitly asks to change that architecture.

This means:

- do not remove or rewrite the existing Sheetari-backed remote functions just because the local mirror exists
- treat the local mirror as the default workspace reference copy
- treat Sheetari as the upstream sync source that produces the local mirror
- if sheet structure changes upstream, refresh the local mirror with `pnpm sheetari` before relying on the new data locally
- a Google Sheets MCP connection is available for upstream read/write access, but do not use it unless the user explicitly asks you to edit the live Google Sheet
- unless explicitly instructed otherwise, prefer planning against the local JSON mirror first and treat live sheet edits as a deliberate upstream operation

---

## Sheet → JSON (Sheetari)

We DO NOT manually convert or parse Google Sheets.

We use:

👉 https://github.com/oneezy/sheetari

Sheetari:

- takes a Google Sheet URL
- returns JSON via URL
- is the **only source of sheet → JSON conversion**

---

## Data Flow (Critical)

```txt
Google Sheet
  → Sheetari (JSON API)
  → local mirror in `apps/app/src/lib/data`
  → App consumes JSON
  → Generates editor panels from `panels`
  → Generates form inputs from `inputs`
  → User fills data
  → Structured report object
  → Preview pages from `pages`
  → Export
```

---

## Implementation Rules

- Treat the sheet as the **upstream source of truth for field, panel, page, and instruction definitions**
- Treat the local mirror in `apps/app/src/lib/data` as the **workspace source of truth** during app development
- DO NOT recreate schema manually if it exists in sheet
- DO NOT attempt to parse Google Sheets manually
- ALWAYS assume Sheetari provides clean JSON
- ALWAYS prefer reading the local mirror before hitting remote Sheetari URLs when the mirror exists
- When upstream sheet data changes, refresh the local mirror with `pnpm sheetari`
- Prefer config-driven UI over hardcoded inputs
- When giving the user paste-ready sheet rows, render blank cells as blank cells, not as the literal string `null`
- Editor panel creation must come from `panels`, not from `pages`
- Output page creation, naming, and ordering must come from `pages`, not from panel titles or panel order
- Output page ownership should come from `inputs.outputToPages` first, with code-side fallbacks used only as temporary compatibility bridges
- DO NOT hardcode panel-to-page, panel-to-section, or page-to-panel routing in app code when that relationship belongs to sheet data
- Do not use `panels.reference` as the steady-state source of output page routing; panel references may support inheritance or reuse, but output ownership should come from `inputs.outputToPages` and `inputs.outputToPageSection`
- Treat title-based matching as a bug-prone migration bridge only, not as an acceptable steady-state architecture
- When a single panel must contribute to multiple preview pages or multiple page sections, prefer a dedicated sheet-backed join model over overloading code-side conditionals or heuristics
- Optional output pages should appear when mapped input data has meaningful content or when the page is explicitly required
- Prefer explicit row references in sheet data over title-based heuristics whenever possible

## Output Mapping Contract

Use this contract moving forward for preview/export ownership:

- `inputs.outputToPages` + `inputs.outputToPageSection` owns field-level rendering on pages
- `panels` should describe editor behavior and panel capability/configuration, not output routing
- If the app needs stable many-to-many panel preview mappings at scale, add a dedicated sheet-backed join source such as `panel_outputs` instead of encoding that logic in TypeScript

Recommended `panel_outputs` row shape for the next evolution:

- `id`: unique row id such as `POUT-001`
- `panelId`: source panel row id such as `PANEL-009`
- `pageId`: destination page row id such as `PAGE-009`
- `section`: target page section such as `header`, `main`, or `footer`
- `role`: relationship role such as `primary`, `secondary`, `append`, or `summary`
- `order`: explicit output order when multiple mappings target the same page/section
- `enabled`: whether the mapping is active by default
- `required`: whether this contribution is mandatory for the page
- `notes`: implementation context only; never execution logic

Why this is the recommended path:

- `panels` should define editor behavior
- `pages` should define preview/export surfaces
- `inputs` should define field ownership
- a join source should define many-to-many panel/page relationships

If preview/export routing is unclear, expand the existing input contract before adding more routing behavior to panel data.

---

## Constraint

The app already has working logic.

⚠️ DO NOT refactor large portions of the app unless explicitly requested.

This is a **gradual alignment**, not a rewrite.

---

# 2. Core Rules (Non-Negotiable)

## 2.1 Route-First Architecture

All feature logic lives inside `src/routes`.

```txt
routes/(app)/projects/
  +page.svelte
  projects.remote.ts
  projects.types.ts
```

### Rules:

- Co-locate everything with the route
- Do NOT default to `$lib` unless truly shared
- Routes act as **feature modules**

---

## 2.2 File Naming Convention (STRICT)

Use prefix dot notation ALWAYS:

```txt
projects.types.ts
projects.schema.ts
projects.utils.ts
projects.remote.ts
```

### Why:

- Fast VS Code search
- No ambiguity
- Scales across large codebase

❌ DO NOT:

```txt
types.ts
schema.ts
utils.ts
```

---

## 2.3 File Creation Rules

### Required (baseline)

```txt
+page.svelte
*.remote.ts
*.types.ts
```

---

### Optional (ONLY when needed)

```txt
*.schema.ts
*.utils.ts
+page.server.ts
```

---

### Rare (only when justified)

```txt
*.server.ts
```

---

# 3. Sveltekit Remote Functions Data Model

## Remote Functions = Primary Data Layer

Docs:
[https://svelte.dev/docs/kit/remote-functions](https://svelte.dev/docs/kit/remote-functions)

---

### Responsibilities

Remote functions:

- run on server
- are callable from UI
- replace manual fetch patterns
- validate inputs (via schema if needed)
- handle reads + writes
- return typed data

---

### Usage

```txt
+page.svelte
  ↓
*.remote.ts
  ↓
db (lib/server)
```

---

### Rules

- Prefer remote functions over manual fetch
- Prefer remote over load functions
- Keep remote functions colocated with route

---

# 4. File Responsibilities

## `+page.svelte`

- UI only
- Use async/await (modern Svelte)
- Call remote functions directly
- renders state
- Avoid manual fetch unless necessary
- Imports components from `@layerd/ui`

## Projects Details View

- The project details page should remain the primary workspace for a single project.
- On desktop, the details page should show edit and preview together in a split view when that is the intended working surface.
- On mobile, the same details page may switch between edit and preview using tabs or another compact route-aware control.
- Do not replace the desktop split workspace with separate full-page edit and preview routes unless the user explicitly asks for that behavior.
- Child routes such as `edit/` and `preview/` should support the details experience rather than forcing a completely different page model when the product intent is a shared workspace.

## Shallow Routing

- Use shallow routing for route-aware UI state such as focused panels, modals, drawers, or mobile view selection when the user wants URL/history integration without a full route replacement.
- Do not make `page.state` the only source of truth for core workspace state that must survive reloads or SSR; shallow routing is a progressive enhancement.
- Prefer a reload-safe URL shape for canonical view state, and use shallow routing to improve navigation feel and history behavior on top of that.

---

## `*.remote.ts`

- server execution layer
- main interface for UI → server
- consider using `valibot` package like sveltekit examples

---

## `*.types.ts`

- defines contracts
- shared across feature

---

## `*.schema.ts` (optional)

- validation rules
- input parsing

---

## `*.utils.ts` (optional)

- pure helper functions
- no DB access

---

## `+page.server.ts` (optional)

- route guards
- redirects
- SSR-only concerns

---

## `*.server.ts` (rare)

- only when logic is reused across multiple remotes

---

# 5. Folder Structure

```txt
src/
├─ lib/
│  ├─ server/
│  │  ├─ db.ts
│  │  ├─ auth.ts
│  │  └─ permissions.ts
│  │
│  └─ server/
│     └─ hooks.server.ts
│
├─ routes/
│  ├─ +error.svelte
│  ├─ +layout.svelte
│  ├─ +layout.ts
│  │
│  ├─ (auth)/
│  │  └─ login/
│  │     ├─ +page.svelte
│  │     ├─ login.remote.ts
│  │     └─ login.types.ts
│  │
│  └─ (app)/
│     ├─ projects/
│     │  ├─ +page.svelte
│     │  ├─ projects.remote.ts
│     │  ├─ projects.types.ts
│     │  ├─ projects.schema.ts
│     │  ├─ create/
│     │  │  ├─ +page.svelte
│     │  │  ├─ create.remote.ts
│     │  │  └─ create.types.ts
│     │  └─ [projectId]/
│     │     ├─ +page.svelte
│     │     ├─ detail.remote.ts
│     │     ├─ detail.types.ts
│     │     ├─ edit/
│     │     │  ├─ +page.svelte
│     │     │  ├─ edit.remote.ts
│     │     │  ├─ edit.types.ts
│     │     │  └─ edit.schema.ts
│     │     └─ preview/
│     │        ├─ +page.svelte
│     │        ├─ preview.remote.ts
│     │        └─ preview.types.ts
│     │
│     ├─ clients/
│     ├─ users/
│     ├─ org/
│     └─ settings/
```

---

# 6. Shared Logic Rules

## Global (`lib`)

ONLY for:

- DB
- Auth
- Permissions
- Truly shared utilities

NOT for:

- creating components

---

## Route-Family Shared

Top of route:

```txt
projects/
  projects.types.ts
  projects.remote.ts
```

---

## Leaf-Level

Only used by that route.

---

# 7. Database Rules

Using `localStorage` first (MVP) and later move to something else

```txt
src/lib/server/db.ts
```

---

### Rules

- single source of truth
- never duplicated
- accessed via remote functions

---

# 8. Hooks

```txt
src/hooks.server.ts
```

---

### Used for:

- auth/session
- request lifecycle

---

### NOT used for:

- feature logic
- CRUD

📖 Source:
[https://svelte.dev/docs/kit/hooks](https://svelte.dev/docs/kit/hooks)

---

# 9. UI Rules

- UI components come from external UI package
- must be reusable and context-agnostic
- avoid route-specific components unless necessary

---

# 10. Data System Direction

The system is moving toward:

```txt
Sheet (config)
  → JSON (Sheetari)
  → dynamic editor panel generator
  → structured data
  → preview pages driven by `pages`
```

---

### Rule

Prefer:

- declarative config
- generated UI
- `inputs` for field ownership and output mapping
- `panels` for editor structure
- `pages` for output structure
- `instructions` for contract clarity

Avoid:

- hardcoded field duplication
- deriving editor panels from output pages
- renaming output pages to match panel titles
- long-term reliance on title-only fallback mappings when explicit sheet data can replace them

---

# 11. What NOT to Do

Do NOT:

- ❌ Move feature logic into lib unnecessarily
- ❌ Over-fragment files
- ❌ Create files "just because"
- ❌ Rebuild Google Sheet parsing
- ❌ Ignore naming convention
- ❌ Perform large refactors without instruction

---

# 12. What TO Do

✅ Keep logic colocated
✅ Use remote functions first
✅ Keep files minimal
✅ Follow naming strictly
✅ Use Sheetari for JSON
✅ Prefer the local mirrored JSON in `apps/app/src/lib/data` as the first reference during app work
✅ Use `pnpm sheetari` to refresh the local mirror after upstream sheet changes
✅ Keep the app's existing Sheetari-backed remote functions unless the user explicitly asks for an architectural change
✅ Ask before major changes
✅ Always check and see if components or utils exist in `@layerd/ui` (`packages/ui/**`) before creating new ones.

---

# 13. Final Principle

Build the smallest correct structure first.
Let complexity earn its folders.

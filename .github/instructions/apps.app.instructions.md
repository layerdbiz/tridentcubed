---
name: Report Generator Rules
description: 'Use when editing the report generator app in apps/app. Covers route-first architecture, remote functions, Sheetari-driven field definitions, file naming, and minimal SvelteKit structure.'
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
→ Edit (Form / Panels)  
→ Preview  
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

# 1.4 Planning Source of Truth (Google Sheets + Sheetari)

This app is planned using **Google Sheets as a field registry / blueprint**.
A `.csv` will eventually be provided to you and we will work on it together and I will import it back into the google sheets to help create the final JSON that will be used to create the form fields.

The sheet defines:

- field identifiers (`id`)
- section grouping (`section`)
- labels (`label`)
- field paths (`path`)
- value types (`type`)
- input controls (`input`)
- data source (`source`)
- validation rules (`validation`)
- visibility (`visibility`)
- output usage (`usedBy`)
- options (`options`)
- defaults, placeholders, etc.

These sheets are a work in progress but still incomplete. We need to make minimal changes to these files so we can have a solid plan to go by as this is the CORE of our app. I've included both instruction files and data files to reference. We will need to edit these `.csv` files accordingly and I will upload them back into the Google Sheet in order for us to consume the JSON via Sheetari.

csv's:

- `apps/app/src/lib/data/page.instructions.csv`
- `apps/app/src/lib/data/pages.csv`
- `apps/app/src/lib/data/section.instructions.csv`
- `apps/app/src/lib/data/sections.csv`

sheetari (json)

- https://sheetari.deno.dev/1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k/sections?range=b1:z
- https://sheetari.deno.dev/1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k/pages

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
  → App consumes JSON
  → Generates panels (form inputs)
  → User fills data
  → Structured report object
  → Preview pages
  → Export
```

---

## Implementation Rules

- Treat the sheet as the **source of truth for field definitions**
- DO NOT recreate schema manually if it exists in sheet
- DO NOT attempt to parse Google Sheets manually
- ALWAYS assume Sheetari provides clean JSON
- Prefer config-driven UI over hardcoded inputs

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
  → dynamic panel generator
  → structured data
  → preview pages
```

---

### Rule

Prefer:

- declarative config
- generated UI

Avoid:

- hardcoded field duplication

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
✅ Ask before major changes
✅ Always check and see if components or utils exist in `@layerd/ui` (`packages/ui/**`) before creating new ones.

---

# 13. Final Principle

Build the smallest correct structure first.
Let complexity earn its folders.

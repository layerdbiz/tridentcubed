---
name: App Rules
description: 'Use when editing any of the apps.'
applyTo: 'apps/**/*.{svelte,ts,js,css}'
---

# Apps

## Route Component Naming

- For route-colocated support components, use the same base name as the parent route folder.
- Prefer `projects/projects.svelte` with `<Projects />` over `projects/projects.builder.svelte` with `<ProjectsBuilder />`.
- Apply the same pattern consistently across app route folders unless a file is a real SvelteKit route file such as `+page.svelte` or `+layout.svelte`.
- When a route needs a colocated primary component, its filename should match the folder name first; only introduce suffixes like `.form`, `.preview`, or `.dialog` when there is a clear second component and the role needs to be distinguished.
- For secondary colocated components, prefer the plain component role name, for example `preview-page.svelte` with `<PreviewPage />`, rather than prefixing the route name into the component filename.
- Component prop interfaces should match the component name, for example `PreviewPageProps` for `<PreviewPage />`.
- Place route support components in the most specific route folder they belong to.
- Example: a preview-only support component belongs in `projects/preview/`, not directly in `projects/`.
- Apply the same rule to sibling routes such as `edit/`, `preview/`, and future child route folders: components should live with the route that owns them.
- Do not keep child-route-specific components in a parent route folder unless they are genuinely shared by multiple sibling routes.

## Svelte Imports

- Prefer namespace imports for route-local support modules when a component consumes many exports from the same file.
- Example: `import * as state from './projects.state'` and then use `state.createDefaultState()`.
- Use dot notation from the namespace rather than long destructured import lists when it improves readability.
- Keep imports grouped by module responsibility so the top of the file stays easy to scan.

## Markup Hooks

- Do not use `data-*` attributes for component state, styling hooks, or DOM querying in app code unless the user explicitly asks for them or there is no practical alternative.
- Prefer semantic classes, ARIA attributes, Svelte class directives, refs, or component props instead.

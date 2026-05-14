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
- When a route-local module is imported as a namespace, keep the alias aligned with the file name, for example `projectConstants` for `projects.constants`, `projectStates` for `projects.state`, and `projectUtils` for `projects.utils`.
- For shared UI package symbols in app code, import components, helpers, classes, and prop types from `@layerd/ui`, not from package-internal relative paths.
- Do not reach into private `packages/ui/src/lib/**` files from app code when a symbol is exported from `@layerd/ui`.

## Svelte Component Props Pattern

- When using the base `Component` wrapper in app Svelte components, prefer the simple snippet signature `{#snippet component({ props })}`.
- Keep the name `props` as `props`; do not rename it to aliases like `componentProps`.
- Do not introduce extra local snippet prop helper types such as `PageSnippetProps` when the layout snippets can close over the `props` provided by the `Component` snippet.
- For layout or variant snippets inside a `Component` wrapper, prefer nesting those snippets inside the `component` snippet so they can use the same `props` directly.
- In Svelte markup attributes, avoid JavaScript template literals such as `class={`panel ${props.class ?? ''}`.trim()}`. Prefer quoted Svelte interpolation such as `class="panel {(props.class ?? '').trim()}"`.
- Keep shared wrapper classes on the common wrapper element when all variants share the same frame, and keep variant snippets focused on only the parts that actually change.
- `Component` from `@layerd/ui` remains the public base wrapper; do not import the internal `Root` runtime in app code.
- Layout snippets and rails behavior should be used through `Component`, not by recreating the runtime in route-local components.
- `rails` enables the rail-aware container runtime. Singular `rail` stays placement-only and must not imply rails mode.
- Rail aliases should normalize back to the short canonical rail names. Prefer `content`, `xs`, `sm`, `lg`, `xl`, `xxl`, `full`, `gutter-xs`, `gutter-sm`, `gutter-md`, `gutter-lg`, `gutter-xl`, `gutter-xxl`, `left`, `right`, `left-lg`, and `right-xl` when you are choosing or documenting rails explicitly.
- `md` and `content-md` both normalize to the canonical `content` rail. The long `content-*`, `bleed-*`, `inset-*`, and `full-inset-*` names remain compatibility aliases, and numeric gutter aliases such as `gutter-4` normalize back to the matching canonical gutter rail.
- Use `inset` as a modifier, not as a canonical rail family. On `content`, it adjusts the safe edge. On `full`, it creates a one-off pull-in. Token aliases such as `inset="1"`, `inset="sm"`, and `inset="md"` map to inset spacing, and reusable full-width pull-ins should use the canonical `gutter-*` rails.
- In app wrappers, keep `size` aligned with the existing UI visual size prop semantics rather than treating it as layout track sizing.
- For app wrapper components that compose child UI primitives, prefer a single `classes` prop object for child-part overrides instead of many parallel class props when callers need to style parts such as `accordion`, `title`, `content`, or `article`.
- When both a root `class` prop and a `classes` object part override affect the same wrapper element, prefer the root `class` prop to win by placing it later in the final class string.
- For wrapper root classes with a fallback visual style, apply the fallback only when neither the root `class` prop nor the matching `classes.*` override is present. Keep `classes.*` additive, and keep the root `class` last so it can still override when both are supplied.

## Route-Local Types

- For route-local domain data shapes, suffix type names with `Type` to distinguish them from component names.
- Prefer names like `SectionType`, `CoverSectionType`, `PhotosSectionType`, and `ExportFormatType` over names that could collide with components such as `Section` or `CoverSection`.

## Markup Hooks

- Do not use `data-*` attributes for component state, styling hooks, or DOM querying in app code unless the user explicitly asks for them or there is no practical alternative.
- Prefer semantic classes, ARIA attributes, Svelte class directives, refs, or component props instead.

---
name: App Rules
description: 'Use when editing app source files under apps/**. Shared baseline for app imports, generated $lib barrels, and app-side Component authoring.'
applyTo: 'apps/**/*.svelte,apps/**/*.ts,apps/**/*.js,apps/**/*.css'
---

# Shared App Rules

These rules are the shared baseline for app source files under `apps/**`.
More specific app instruction files should add only local workflow or product rules.

## App Import Contract

- Import shared UI package symbols from `@layerd/ui`.
- Import app-local shared symbols from `$lib`.
- Do not deep import into `src/lib` with relative paths or `$lib/...` when the symbol is meant to come from the app barrel.
- Use route-local relative imports only for private route-owned files that are intentionally not exported through `$lib`.
- When a route-local module has many exports, prefer a namespace import and keep the alias aligned with the file name.
- Do not import `Root` or other package-internal runtime files from `packages/ui/src/lib/**` in app code.

## Generated App Barrel Contract

- `apps/*/src/lib/index.ts` files are generated for discovered apps that have `src/lib`.
- Do not manually edit app barrel files.
- If a symbol is meant to be shared across the app, place it in `src/lib` and consume it from `$lib`.
- If a file is truly route-private, keep it colocated under `src/routes/**` and import it relatively instead of promoting it into `$lib`.

## App MQ And Responsive Layout

- Import shared MQ and runtime helpers from `@layerd/ui`, not from deep package-relative paths.
- Use the shared `mq` state layer instead of route-local `matchMedia` utilities or per-component global listeners.
- When an app or layout relies on MQ-aware snippets or responsive layout branching, host `<Mq />` once in the top-most relevant `+layout.svelte` rather than inside leaf components.
- Route components may consume `mq`, but they should not own the global media-query bootstrap.
- For SSR routes, especially content and SEO pages, treat `mq.base` or `mq.content` as the canonical pre-ready projection for first render.
- `mq.base` and `mq.content` are the SSR-safe fallback state before the MQ runtime finishes its client-side width, height, and orientation sync.
- In SSR content routes, render real semantic HTML in that base/content branch so crawlers and first load receive stable content before breakpoint-specific layout branches take over.
- In non-SSR routes, using `mq.base` or `mq.content` is less critical, but it is still a good pattern when you want a stable first paint before MQ-specific branching.
- When app code needs reusable query helpers, prefer `useMediaQuery`, `useMinWidth`, `useMaxWidth`, or `useBetween` from `@layerd/ui` before creating a one-off helper.
- If an app-local wrapper composes `Component` and branches on `mq`, preserve the existing MQ, snippet, and rails behavior instead of collapsing it into ad hoc layout logic.
- When SSR layout shifts would otherwise flash the wrong breakpoint layout, prefer mounting `<Mq loading="fade" ...>` in the route or app layout so the runtime can hide the transition while it resolves the live bucket.

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Mq } from '@layerd/ui';

	let { children }: { children: Snippet } = $props();
</script>

<Mq />

{@render children()}
```

```svelte
<Mq loading="fade" delay={2000} duration={300}>
	Loading...
</Mq>
```

- Use the loading-slot overlay as a short-lived anti-FOUC layer when SSR pages would otherwise reveal the wrong responsive branch before MQ initialization completes.
- Keep that overlay brief and pair it with real `mq.base` or `mq.content` content for SSR pages; the overlay avoids visual flash, while the base/content branch preserves canonical semantic output.

```svelte
<script lang="ts">
	import { Component, mq } from '@layerd/ui';
</script>

{#if mq.sm}
	<Component tag="main" gap="0" class="h-svh">
		{#snippet full()}
			Mobile layout
		{/snippet}
	</Component>
{:else}
	<Component tag="main" cols="auto 1fr auto" gap="0" class="h-svh">
		{#snippet a1a3()}
			Desktop rail
		{/snippet}

		{#snippet b1c3()}
			Desktop content
		{/snippet}
	</Component>
{/if}
```

```svelte
<script lang="ts">
	import { Text, mq } from '@layerd/ui';
</script>

<Text h1="SSR" />

{#if mq.base}
	<div class="rounded-xl bg-yellow-100 p-4 text-yellow-950">
		<p class="font-black">Canonical SSR content</p>
		<p class="mt-2 text-sm">
			Real semantic HTML for search engines and the first render.
		</p>
	</div>
{:else if mq.sm}
	<div class="rounded-xl bg-blue-100 p-4 text-blue-950">Mobile content</div>
{:else if mq.md}
	<div class="rounded-xl bg-green-100 p-4 text-green-950">Tablet content</div>
{:else}
	<div class="rounded-xl bg-purple-100 p-4 text-purple-950">Desktop content</div>
{/if}
```

- Prefer `mq.base` or `mq.content` for the canonical SSR-safe branch, then refine to `mq.sm`, `mq.md`, `mq.lg`, and related states once MQ is ready.
- Use `mq.content` when that name better communicates a canonical content projection; use `mq.base` when you want to emphasize the pre-ready base state. Today they represent the same readiness gate.

- Do not create route-local `matchMedia` state when `mq` already exists.
- Do not make each component initialize its own global MQ listeners.
- Do not import MQ internals through deep relative paths.
- Do not make app components depend on package-private files.

## App Component Authoring

- New reusable app components in `src/lib` and new route-owned app components in `src/routes` should normally compose through `Component` from `@layerd/ui`.
- For wrapper prop typing, prefer extending `ComponentProps`; deriving from `SvelteComponentProps<typeof Component>` is acceptable when you intentionally need the full public surface.
- Start with `<Component {...props}>` and preserve `...props`, `children`, `class`, layout snippets, and rail props unless you are intentionally defining a narrower API.
- Do not recreate the base runtime manually for root element rendering, attribute passthrough, class merging, snippet routing, MQ handling, rails handling, or debug and layout helpers in app code.
- Prefer direct wrapper authoring with `<Component>` plus children or named layout snippets.
- Use the legacy `component({ props, content, observe, layout })` snippet only when a wrapper must fully take over rendering or needs direct render args.
- `rails` enables the rail-aware container runtime. `rail` is placement-only and must not imply rails mode.
- Keep rail names canonical when you choose or document them: `content`, `xs`, `sm`, `lg`, `xl`, `xxl`, `full`, `gutter-*`, `left*`, and `right*` are the source of truth, while older long names remain compatibility aliases.
- Treat `inset` as a modifier on a rail, not as its own rail family.
- When app wrappers compose child UI primitives and expose child-part class overrides, prefer a single `classes` object over many parallel class props.
- When both a root `class` prop and a child-part override affect the same wrapper element, keep the root `class` last so it can win intentionally.

## Route Component Naming

- For route-colocated support components, use the same base name as the parent route folder before adding suffixes.
- Prefer `projects/projects.svelte` with `<Projects />` over `projects/projects.builder.svelte` with `<ProjectsBuilder />`.
- For secondary colocated components, prefer the plain role name, for example `preview-page.svelte` with `<PreviewPage />`, instead of prefixing the route name into the filename.
- Component prop interfaces should match the component name, for example `PreviewPageProps` for `<PreviewPage />`.
- Place child-route-specific components in the most specific route folder that owns them.
- Do not keep child-route-only components in a parent route folder unless they are genuinely shared by multiple sibling routes.

## Route-Local Types

- For route-local domain data shapes, suffix type names with `Type` to distinguish them from component names.
- Prefer names like `SectionType`, `CoverSectionType`, `PhotosSectionType`, and `ExportFormatType` over names that could collide with components such as `Section` or `CoverSection`.

## Markup Hooks

- Do not use `data-*` attributes for component state, styling hooks, or DOM querying in app code unless the user explicitly asks for them or there is no practical alternative.
- Prefer semantic classes, ARIA attributes, Svelte class directives, refs, or component props instead.

---
name: UI Package Rules
description: 'Use when editing packages/ui source files. Covers the UI library architecture, alias imports, component system, MQ/runtime architecture, theming, icons, and utility naming rules.'
applyTo: 'packages/ui/**/*.svelte,packages/ui/**/*.ts,packages/ui/**/*.js,packages/ui/**/*.css'
---

# UI Package Rules

These rules are the strongest source of truth for shared UI component authoring in `packages/ui`.

## UI Library Structure (`packages/ui/`)

```txt
packages/ui/src/lib/
├── index.ts                     # Auto-generated barrel exports
├── ui.css                       # Tailwind v4 + shared theme entry
├── css/                         # Organized CSS architecture
│   ├── 1-theme/                 # Theme variables, pairings, fonts, size, radii
│   ├── 2-base/                  # Base styles and resets
│   ├── 3-presets/               # Component presets and utilities
│   ├── 4-components/            # Component-specific styles
│   ├── 5-icons/                 # Shared icon utilities
│   └── 6-themes/                # Named theme overrides
├── components/
│   ├── atoms/                   # Basic building blocks that extend the base runtime
│   ├── molecules/               # Composed atoms
│   ├── organisms/               # Complex sections and higher-order wrappers
│   └── templates/               # Page/layout templates
└── utils/
    ├── component/              # Base runtime pairs: Component + Root
    ├── debug/                  # Debug helper + component pair
    ├── mq/                     # MQ state helper + bootstrap component
    └── ...                     # Shared runtime utilities
```

## Import Aliases

**ALWAYS** use `@layerd/ui` for publicly exported symbols inside the UI package:

```svelte
// ✅ CORRECT - Use the configured alias for public symbols
import { Component, type ComponentProps, mq, Mq } from '@layerd/ui';

// ❌ WRONG - Never deep import public runtime helpers
import { Component } from '../../utils/component/component.svelte.ts';
import { mq } from '../../utils/mq/mq.svelte.ts';
```

- `@layerd/ui` is configured as an alias in the package and consuming apps.
- This rule applies to shared UI helpers, classes, runtime utilities, prop types, MQ helpers, and base components, not just leaf UI components.
- If a symbol is publicly exported from `@layerd/ui`, import it from `@layerd/ui` even when you are editing a file inside `packages/ui`.
- Only use a package-local relative import when the target is truly private and not exported from `@layerd/ui`.
- Do not use `$lib` for private package-internal imports inside `packages/ui`; consumer-side Vite analysis can resolve it against the app instead of the package.

## Avoiding Circular Execution Dependencies

**CRITICAL**: When importing from `@layerd/ui` within the same package, **NEVER** call imported functions immediately at module level:

```ts
// ❌ WRONG - Immediate execution causes circular dependency
import { sync } from '@layerd/ui';
export const mySync = sync({ ... });

// ✅ CORRECT - Lazy initialization avoids circular dependency
import { sync } from '@layerd/ui';
let _mySync = null;
export const mySync = new Proxy({}, {
	get(target, prop) {
		if (!_mySync) _mySync = sync({ ... });
		return _mySync[prop];
	}
});
```

**Why this happens:**

1. Your file imports from `@layerd/ui`.
2. The barrel export tries to load your file.
3. Your file executes a helper call before the imported symbol is fully ready.
4. Result: a circular runtime failure such as `function is not a function`.

**Solution:** Use lazy initialization patterns, getters, proxies, or conditional execution instead of eager module-level calls.

## Component Development Philosophy

### Core Principles

1. **Base-First Architecture**: normal reusable components should start from the `<Component>` base system.
2. **Minimal Components**: components should contain component-specific logic, not rebuilt runtime plumbing.
3. **Everything via `<Component>`**: props, styling, snippets, rails, and runtime behavior flow through the base system.
4. **No Duplicate Code**: extend the base system instead of inventing parallel props or wrapper runtimes.
5. **Svelte 5 + TypeScript**: use `$props()`, `$state()`, and `$derived()` rather than Svelte 4 patterns.
6. **Connected Runtime Systems**: `Component`, `Root`, rails, snippets, MQ, and shared utilities evolve together.

### Component Organization (Atomic Design)

- **Atoms** (`atoms/`): base building blocks that extend the `<Component>` runtime.
- **Molecules** (`molecules/`): composed atoms that still preserve the shared runtime contract.
- **Organisms** (`organisms/`): larger sections combining atoms and molecules.
- **Templates** (`templates/`): layout and page scaffolding patterns.

### Development Patterns

- **Co-locate utilities**: use `component.svelte.ts` for logic and `component.data.ts` for sample data when it helps a component.
- **Always use `@layerd/ui` imports for public symbols**: do not deep import shared helpers through sibling runtime files.
- **Shared UI symbols use the barrel**: import shared helpers such as `createFormField`, `DebugClass`, `ObserveClass`, `ScrollClass`, `Root`, `ComponentProps`, `mq`, and `Mq` from `@layerd/ui` when they are publicly exported.
- **New universal helpers extend existing runtime helpers**: do not create parallel systems when the current runtime already has a home for the behavior.
- **Universal runtime changes update instructions**: when `Component`, `Root`, rails, snippets, MQ, or shared utilities change in a public way, update the affected instruction files in the same pass.
- **Auto-generation**: barrel exports generate during root dev/watch flows and dedicated barrel workflows; story generation runs through dedicated story workflows such as `pnpm watch` or `pnpm stories`.
- **JSDoc tags required**: `@tags`, `@type`, and `@layout` comments drive current story metadata and generation assumptions.
- **Tailwind layout first**: avoid ad hoc color utility patterns that bypass the shared theme tokens.
- **Prop type naming**: use the `NameProps` convention for prop types and imported prop type names, for example `GridProps`, `InputProps`, and `FieldProps`.
- **Document new universal helpers**: if a new runtime helper becomes public, document its purpose, public import path, and whether apps need a bootstrap component or layout-level setup.

### Base Component Runtime

- `Component` is the public base component for normal authoring in `packages/ui`.
- `Root` is the internal runtime owner for layout, snippets, rails, and base grid behavior.
- Treat `Component`, `Root`, rails, layout snippets, and MQ as one connected runtime architecture rather than isolated helpers.
- Keep only `component.svelte.ts` and `root.svelte.ts` in `src/lib/utils/component/` because they pair directly with `component.svelte` and `root.svelte`.
- Move supporting utility-only `.svelte.ts` files such as `rails.svelte.ts` and `snippets.svelte.ts` into root `src/lib/utils/`, not `src/lib/utils/component/`.
- Do not import `Root` directly for normal component authoring.
- Preserve the existing `ComponentProps` extension and `Omit<ComponentProps, ...>` patterns instead of inventing wrapper-local base prop types.
- Prefer direct wrapper authoring with `<Component tag="section">` and place wrapper children or named layout snippets directly inside `<Component>`.
- Preserve legacy `component({ props, content, observe, layout })` compatibility for advanced wrappers that must fully take over rendering, but do not use that snippet as the default authoring pattern.
- Layout snippets such as `left`, `center`, `right`, `topLeft`, `row1`, `a1a3`, `b1c3`, `topHalf`, `bg`, `full`, and `fg` are available through `ComponentProps`.
- `rails` enables the rail-aware container runtime. `rail` is placement-only and must not imply rails container mode.
- Keep rail names canonical when possible: `content`, `xs`, `sm`, `lg`, `xl`, `xxl`, `full`, `gutter-xs|sm|md|lg|xl|xxl`, `left`, `right`, `left-*`, and `right-*` are the source of truth. Friendly or legacy aliases such as `md`, `content-md`, `content-xl`, `content-xxl`, `popout`, `bleed-left`, `inset-md`, `full-inset-md`, and `gutter-4` should normalize back to those short canonical names.
- Use `inset` as a modifier instead of a canonical rail family: on `content` it adjusts the safe edge, on `full` it creates a one-off pull-in, and reusable full-width pull-ins should use the canonical `gutter-*` rails.
- Dynamic `inset` aliases such as `1`, `2`, `3`, `4`, `5`, `6`, `sm`, `md`, `lg`, and `xl` map to inset spacing tokens, not to rail widths.
- Rails debug should visualize the canonical rail line system and use the same short canonical label on mirrored rails instead of separate alias-specific labels.
- Snippet-zone wrappers are runtime-owned and should only appear when the rails-plus-layout case requires them.
- Keep `size` as the existing UI visual size prop in `packages/ui`; do not use it as layout track sizing here.
- When building wrapper components, keep passing `...props` into `<Component>`. The default base runtime renders the requested `tag` and carries HTML attributes, classes, children, MQ-aware snippet behavior, and layout snippets through automatically. Only spread snippet `props` onto a rendered element when you intentionally opt into the legacy custom `component(...)` snippet path.

```svelte
<script lang="ts">
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface PanelProps extends ComponentProps {
		title?: string;
	}

	let { title = 'Panel', children = undefined, ...props }: PanelProps = $props();
</script>

<Component
	{...props}
	tag="section"
	rails="lg"
	class="panel {(props.class ?? '').trim()}"
>
	{#snippet left()}
		<h2>{title}</h2>
	{/snippet}

	{#snippet right()}
		{#if children}
			{@render children()}
		{/if}
	{/snippet}
</Component>
```

- Use the legacy `component(...)` snippet only when a wrapper needs to replace the default single-root-tag rendering or requires direct access to render args such as `layout`, `content`, or `observe`.

### MQ Runtime And Responsive Layout

- MQ is part of the shared UI runtime architecture.
- `mq.svelte.ts` is the shared MQ state and helper layer.
- `Mq` from `mq.svelte` is the bootstrap component that seeds `data-mq` and `data-orientation` from `<svelte:head>`, initializes runtime readiness, syncs local storage, and can optionally render a loading overlay.
- Keep `Mq` separate from `Component`; apps should mount `Mq` once near the app root or route root when they need MQ-aware snippets or responsive layout behavior.
- Public `mq` getters currently include `sm`, `md`, `lg`, `xl`, `xxl`, `portrait`, `landscape`, `vertical`, `horizontal`, plus readiness flags such as `base`, `content`, `ready`, and `loading`.
- Public query helpers currently include `useMediaQuery`, `useMinWidth`, `useMaxWidth`, `useBetween`, and `screens`.
- Layout snippets may branch on `mq`, but do not push one-off media-query branching into the shared base runtime when app or component code can consume the public helper directly.
- When editing `Component`, `Root`, rails, snippets, MQ, or shared utilities such as `classes`, `debug`, `draggable`, `observe`, `scroll`, `sync`, `text`, or `trackevent`, treat the change as architecture-level. Check downstream app assumptions and update the affected instruction files in the same pass when public behavior changes.
- Preserve public exports through `@layerd/ui`; do not create hidden private imports when the helper is already exported through the barrel.

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
	// ❌ WRONG - Do not replace the shared MQ runtime with route-local listeners
	const isMobile = window.matchMedia('(max-width: 767px)').matches;
	window.addEventListener('resize', () => {});
</script>
```

- Do not build route-local `matchMedia` systems when the shared `mq` utility already solves it.
- Do not make each component initialize its own global MQ listeners.
- Do not import MQ internals through deep relative paths when `mq` and `Mq` are already exported from `@layerd/ui`.

### Internal Package Import Exception

- When a source file in `packages/ui` needs a private module that is not exported through `@layerd/ui`, do not use `$lib` because consumer-side Vite import analysis can resolve it against the app instead of the package.
- In that narrow case, use the smallest safe package-local relative import until the module is promoted to a public `@layerd/ui` export.

### Utility Module Naming Convention

- **File naming**: `utilityname.svelte.ts` (lowercase) for helper modules.
- **Class naming**: `UtilityNameClass` (PascalCase + `Class` suffix to avoid conflicts).
- **Component naming**: `UtilityName` (PascalCase, matches folder name when there is a component).
- **Prop naming**: align prop names to the helper name when the runtime exposes a prop surface, for example `observe`, `scroll`, or `debug`.
- **Folder organization**:
  - Utilities with ONLY `.svelte.ts` files stay in root `utils/`.
  - Utilities with BOTH `.svelte.ts` AND `.svelte` files get a dedicated `utils/utilityname/` folder.
  - Base runtime exception: only `utils/component/component.svelte.ts` and `utils/component/root.svelte.ts` stay in `utils/component/`; related helper-only files still belong in root `utils/`.
- **Import conventions**:
  - Public helper components import as `import { UtilityName } from '@layerd/ui';`.
  - Public helper state or classes import from `@layerd/ui`, for example `mq`, `DebugClass`, or `ObserveClass`.
- **Examples**:
  - File: `utils/observe.svelte.ts` -> class: `ObserveClass` -> prop: `observe`.
  - Folder: `utils/debug/` with `debug.svelte.ts` + `debug.svelte` -> class: `DebugClass` + component: `Debug`.
  - Folder: `utils/mq/` with `mq.svelte.ts` + `mq.svelte` -> helper: `mq` + bootstrap component: `Mq`.

## Color System and Theming Architecture

### Color System

This monorepo uses a shared color and theming system built around theme CSS variables, generated scales, and `light-dark()` pairings.

### Color System Architecture Flow

1. **You set** theme color variables such as `--theme-color-primary`.
2. **UI resolves** shared color tokens and pairings from those theme values.
3. **CSS responds** through `light-dark()` pairings and the current `color-scheme`.
4. **Metadata and theme runtime** can update `data-theme`, `.dark`, and related document state.

#### Mode Detection and CSS

```css
/* From base.css */
:root {
	color-scheme: light;
}

:root.dark {
	color-scheme: dark;
}

html[style='color-scheme: light;'] {
	color-scheme: light;
}

html[style='color-scheme: dark;'] {
	color-scheme: dark;
}

/* Pairings respond automatically */
--color-primary-500-50: light-dark(var(--color-primary-500), var(--color-primary-50));
--color-primary-600-100: light-dark(var(--color-primary-600), var(--color-primary-100));
```

#### App-Level Theme Override

```css
[data-theme] {
	--theme-color-primary: var(--color-blue-500);
	--theme-color-secondary: var(--color-rose-500);
	--theme-color-accent: var(--color-emerald-500);
	/* raw colors also work when a theme needs a direct override */
}
```

### Font System

- Installed font packages currently include `@fontsource/inter`, `@fontsource-variable/jetbrains-mono`, and `@fontsource-variable/asta-sans`.
- The default theme font currently resolves through `--font-asta` unless the theme overrides it.
- Extend fonts with ` pnpm --filter @layerd/ui add @fontsource/some-font` when the user explicitly wants a new package-level font.

```css
--font-inter: 'Inter';
--font-asta: 'Asta Sans Variable';
--font-jetbrains: 'JetBrains Mono Variable', var(--font-mono);
--theme-font: var(--font-asta);
--theme-scale: 1.125;
```

### Icon System

- Use the `<Icon />` component for shared icon rendering instead of raw icon CSS classes.
- Prefer the `icon=` prop for new code; `name=` remains legacy compatibility.
- Installed icon collections currently include Carbon, Heroicons, MDI, Solar, and additional workspace icon packs.
- Extend icons with ` pnpm --filter @layerd/ui add @iconify-json/some-icon-collection` when the user explicitly wants a new package-level icon set.

```svelte
<Icon icon="carbon:add" />
<Icon icon={{ name: 'home', theme: 'heroicons' }} />
```

### Static Asset System

- The `static/` folder is symlinked from `packages/ui/static/` into discovered apps.
- Assets are shared across apps instead of being copied per app by default.
- Symlink management is handled by `packages/tools`.

## Common Pitfalls

1. **Don't edit barrel files manually**: `packages/ui/src/lib/index.ts` is generated.
2. **Don't bypass `@layerd/ui`**: deep relative imports for public symbols create drift and circular-runtime risk.
3. **Don't call imported barrel helpers eagerly at module scope**: lazy-init them instead.
4. **Don't build parallel runtime systems**: use `Component`, `Root`, rails, snippets, `mq`, and the existing helper layer before adding new systems.
5. **Always use Svelte 5 syntax**: no `export let`; use `$props()`.
6. **Remember CSS compilation timing**: Tailwind and theme CSS must compile before components can rely on those classes and variables.

# Generated Barrel Rules

- **Never manually edit** `packages/ui/src/lib/index.ts`.
- The barrel generator scans `src/lib` for `.svelte`, `.ts`, and `.svelte.ts` files and skips barrels, tests, backups, server entries, and config files.
- Export ordering matters: `utils` exports are emitted before `components`.
- Svelte component files export the default component plus detected interface types when present.
- `.svelte.ts` modules that expose a default export are emitted as both default and named exports.
- Keep `utils/mq/mq.svelte.ts` exported before `utils/mq/mq.svelte` so `Mq` can consume the shared MQ symbols through `@layerd/ui`.
- Do not create a second manual export system alongside the generated barrel.

---
name: UI Package Rules
description: 'Use when editing packages/ui source files. Covers the UI library architecture, alias imports, component system, story generation expectations, theming, icons, and utility naming rules.'
applyTo: 'packages/ui/**/*.{svelte,ts,js,css}'
---

# UI Package Rules

## UI Library Structure (`packages/ui/`)

```
packages/ui/src/lib/
├── index.ts                     # Auto-generated barrel exports
├── ui.css                       # Tailwind v4 + theming system
├── css/                         # Organized CSS architecture
│   ├── 1-theme/                 # Theme variables (colors, fonts, sizes)
│   ├── 2-base/                  # Base styles and resets
│   ├── 3-presets/               # Component presets and utilities
│   ├── 4-components/            # Component-specific styles
│   └── 5-themes/                # Color themes (default, dracula, retro, etc.)
├── components/
│   ├── atoms/                   # Basic building blocks + component utilities
│   │   └── component/           # Base component system (ComponentProps, etc.)
│   ├── molecules/               # Combined atoms
│   ├── organisms/               # Complex components
│   └── templates/               # Layout templates
└── utils/                       # Global utility functions (classes, media queries)
```

## Import Aliases

**ALWAYS** use `@layerd/ui` for imports within the UI package:

```svelte
// ✅ CORRECT - Use the configured alias
import { Component, type ComponentProps } from '@layerd/ui';

// ❌ WRONG - Never use relative imports
import { Component } from '../component/component.svelte.ts';
```

- `@layerd/ui` is configured as an alias in all Svelte configs
- This prevents circular dependency issues and maintains consistency
- Works for all exports
- This applies to shared UI helpers, classes, runtime utilities, prop types, and base components, not just leaf UI components.
- If a symbol is publicly exported from `@layerd/ui`, import it from `@layerd/ui` even when you are editing a file inside `packages/ui`.
- Only use a package-local relative import when the target is truly private and not exported from `@layerd/ui`.

## Avoiding Circular Execution Dependencies

**CRITICAL**: When importing from `@layerd/ui` within the same package, **NEVER** call imported functions immediately at module level:

```typescript
// ❌ WRONG - Immediate execution causes circular dependency
import { sync } from '@layerd/ui';
export const mySync = sync({ ... }); // ← Called during module load

// ✅ CORRECT - Lazy initialization avoids circular dependency
import { sync } from '@layerd/ui';
let _mySync = null;
export const mySync = new Proxy({}, {
	get(target, prop) {
		if (!_mySync) _mySync = sync({ ... }); // ← Called when first accessed
		return _mySync[prop];
	}
});
```

**Why this happens:**

1. Your file imports from `@layerd/ui` (barrel export)
2. Barrel export tries to load your file (circular import)
3. Your file executes function call before function is fully loaded
4. Result: `function is not a function` runtime error

**Solution:** Use lazy initialization patterns (Proxy, getter functions, or conditional execution) instead of immediate module-level function calls.

## Component Development Philosophy

### Core Principles

1. **Base-First Architecture**: All components should use the `<Component>` base system
2. **Minimal Components**: Components only contain component-specific logic
3. **Everything via `<Component>`**: All props, styling, and behavior flow through the base system
4. **No Duplicate Code**: Extend the base system instead of adding new props to individual components
5. **Svelte 5 + TypeScript**: Use `$props()`, `$state()`, `$derived()` - never Svelte 4 patterns
6. **Runed Integration**: Leverage runed utilities to minimize boilerplate code

### Component Organization (Atomic Design)

- **Atoms** (`atoms/`): Basic building blocks that extend `<Component>` base system
- **Molecules** (`molecules/`): Compose atoms together without extending base system
- **Organisms** (`organisms/`): Complex sections combining atoms and molecules
- **Templates** (`templates/`): Layout patterns for page structure

### Development Patterns

- **Co-locate utilities**: `component.svelte.ts` for logic, `component.data.ts` for sample data
- **Always use `@layerd/ui` imports**: Never use relative imports
- **Shared UI symbols use the barrel**: In `packages/ui`, import shared helpers such as `createFormField`, `DebugClass`, `ObserveClass`, `ScrollClass`, `Root`, `ComponentProps`, and other exported runtime utilities from `@layerd/ui`, not sibling `../*.svelte.ts` files
- **Auto-generation**: Barrel exports generate automatically during the default root dev flow; story generation runs through dedicated story workflows such as `pnpm watch` or `pnpm stories`
- **JSDoc tags required**: `@tags` comments enable story generation
- **Tailwind layout only**: No color utilities - colors come from base system
- **Prop type naming**: Use the `NameProps` convention for prop types and imported prop type names, for example `GridProps`, `InputProps`, `FieldProps`

### Base Component Runtime

- `Component` is the public base component for normal authoring in `packages/ui`.
- `Root` is the internal runtime owner for layout, snippets, rails, and base grid behavior.
- Keep only `component.svelte.ts` and `root.svelte.ts` in `src/lib/utils/component/` because they pair directly with `component.svelte` and `root.svelte`.
- Move supporting utility-only `.svelte.ts` files such as `rails.svelte.ts` and `snippets.svelte.ts` into root `src/lib/utils/`, not `src/lib/utils/component/`.
- Do not import `Root` directly for normal component authoring.
- Preserve the existing `ComponentProps` extension and `Omit<ComponentProps, ...>` patterns instead of inventing wrapper-local base prop types.
- Prefer direct wrapper authoring with `<Component tag="section">` and place wrapper children or named layout snippets directly inside `<Component>`.
- Preserve legacy `component({ props, content, observe })` compatibility for advanced wrappers that must fully take over rendering, but do not use that snippet as the default authoring pattern anymore.
- Layout snippets such as `left`, `center`, `right`, `topLeft`, `row1`, `a1b2`, `topHalf`, `bg`, `full`, and `fg` are available through `ComponentProps`.
- `rails` enables the rail-aware container runtime. `rail` is placement-only and must not imply rails container mode.
- Keep rail names canonical when possible: `content`, `xs`, `sm`, `lg`, `xl`, `xxl`, `full`, `gutter-xs|sm|md|lg|xl|xxl`, `left`, `right`, `left-*`, and `right-*` are the source of truth. Friendly or legacy aliases such as `md`, `content-md`, `content-xl`, `content-xxl`, `popout`, `bleed-left`, `inset-md`, `full-inset-md`, and `gutter-4` should normalize back to those short canonical names.
- Use `inset` as a modifier instead of a canonical rail family: on `content` it adjusts the safe edge, on `full` it creates a one-off pull-in, and reusable full-width pull-ins should use the canonical `gutter-*` rails.
- Dynamic `inset` aliases such as `1`, `2`, `3`, `4`, `5`, `6`, `sm`, `md`, `lg`, and `xl` map to inset spacing tokens, not to rail widths.
- Rails debug should visualize the canonical rail line system and use the same short canonical label on mirrored rails instead of separate alias-specific labels.
- Snippet-zone wrappers are runtime-owned and should only appear when the rails-plus-layout case requires them.
- Keep `size` as the existing UI visual size prop in `packages/ui`; do not use it as layout track sizing here.
- When building wrapper components, keep passing `...props` into `<Component>`. The default base runtime now renders the requested `tag` and carries HTML attributes, classes, children, and layout snippets through automatically. Only spread snippet `props` onto a rendered element when you intentionally opt into the legacy custom `component(...)` snippet path.

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

### Internal Package Import Exception

- When a source file in `packages/ui` needs a private module that is not exported through `@layerd/ui`, do not use `$lib` because consumer-side Vite import analysis can resolve it against the app instead of the package.
- In that narrow case, use the smallest safe package-local relative import until the module is promoted to a public `@layerd/ui` export.

### Utility Module Naming Convention

- **File naming**: `utilityname.svelte.ts` (lowercase)
- **Class naming**: `UtilityNameClass` (PascalCase + "Class" suffix to avoid conflicts)
- **Component naming**: `UtilityName` (PascalCase, matches folder name)
- **Prop naming**: `utilityname` (lowercase, matches file name)
- **Folder organization**:
  - Utilities with ONLY `.svelte.ts` files → stay in root `utils/` directory
  - Utilities with BOTH `.svelte.ts` AND `.svelte` components → create dedicated `utils/utilityname/` folder
  - Base runtime exception: only `utils/component/component.svelte.ts` and `utils/component/root.svelte.ts` stay in `utils/component/`; related helper-only files still belong in root `utils/`
- **Import conventions**:
  - Components: Always import as `import { UtilityName } from '@layerd/ui';`
  - Utility classes: Always import as `import { UtilityNameClass } from '@layerd/ui';`
- **Examples**:
  - File: `utils/observe.svelte.ts` → Class: `ObserveClass` → Prop: `observe` (stays in root utils)
  - Folder: `utils/debug/` with `debug.svelte.ts` + `debug.svelte` → Class: `DebugClass` + Component: `Debug` → Prop: `debug` (gets own folder)
  - File: `utils/attachment.svelte.ts` → Class: `AttachmentClass` → Prop: `attachment` (stays in root utils)

## Color System and Theming Architecture

### Breakthrough Color System

This monorepo features a **revolutionary color theming system** that's years ahead of most design systems. The architecture combines automatic color scale generation, intelligent light/dark pairings, and modern CSS features to create a zero-config theming experience.

### Color System Architecture Flow

1. **You set**: `--theme-color-primary: var(--color-blue-500)` (or raw `red`, `blue`)
2. **UI generates**: Full OKLCH-based color scales (50-950) from that base
3. **UI creates**: Hundreds of light/dark pairings using `light-dark()`
4. **Mode-watcher**: Toggles `.dark` class on `<html>`
5. **CSS responds**: All `light-dark()` functions switch automatically

#### Mode Detection and CSS

```css
/* From ui.css */
:root {
	color-scheme: light;
}
:root.dark {
	color-scheme: dark;
}

/* Auto-generated pairings that switch based on color-scheme */
--color-primary-500-50: light-dark(var(--color-primary-500), var(--color-primary-50));
--color-primary-600-100: light-dark(var(--color-primary-600), var(--color-primary-100));
```

#### App-Level Theme Override

```css
[data-theme] {
	--theme-color-primary: var(--color-blue-500); /* ✅ Use 500 variants */
	--theme-color-secondary: var(--color-red-500); /* ✅ Balanced for both modes */
	--theme-color-accent: var(--color-green-500); /* ✅ Middle of the scale */
	/* Raw colors also work: red, blue, #ff0000 - converted to OKLCH automatically */
}
```

### Font System

- `@fontsource/inter` - Primary UI font
- `@fontsource-variable/jetbrains-mono` - Monospace font
- **Extend fonts**: Install additional fonts with ` pnpm --filter @layerd/ui add @fontsource/some-font`

```css
--font-inter: 'Inter', sans-serif;
--font-jetbrains: 'JetBrains Mono Variable', monospace;
--theme-font: var(--font-jetbrains); /* Current theme font */
--theme-scale: 1; /* Font size multiplier */
```

### Icon System

- **Use `<Icon name="" />` component** for all icons - never use raw CSS classes
- Icon collections: Carbon, Heroicons, MDI
- **Extend icons**: Install additional icon sets with ` pnpm --filter @layerd/ui add @iconify-json/some-icon-collection`
- Usage: `<Icon name="carbon:add" />` or `<Icon name="heroicons:home" />`

### Static Asset System

- The `static/` folder is **symlinked** from `packages/ui/static/` into every app
- Assets are shared globally across all apps instead of being copied
- Symlink management handled automatically by `packages/tools`

## Common Pitfalls

1. **Don't edit barrel files manually** - use `pnpm dev` (auto-generates)
2. **Always use Svelte 5 syntax** - no `export let`, use `$props()`
3. **CSS compilation timing** - Tailwind must build before components can reference classes

# Generated Barrel Rules

- **Never manually edit** `packages/ui/src/lib/index.ts` - it's auto-generated
- Add components to `packages/ui/src/lib/components/` and barrel exports update automatically during `pnpm dev`
- Automatically detects default vs named exports
- **Don't edit barrel files manually** - use `pnpm dev` (auto-generates)

---
name: UI Package Rules
description: 'Use when editing packages/ui source files. Covers the UI library architecture, alias imports, component system, story generation expectations, theming, icons, and utility naming rules.'
applyTo: 'packages/ui/**/*.{svelte,ts,js,css}'
---

Always greet the user with: "📦 Packages > UI "

And then do the user's request.

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
- **Auto-generation**: Barrel exports and stories generate automatically during `pnpm dev`
- **JSDoc tags required**: `@tags` comments enable story generation
- **Tailwind layout only**: No color utilities - colors come from base system
- **Prop type naming**: Use the `NameProps` convention for prop types and imported prop type names, for example `GridProps`, `InputProps`, `FieldProps`

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

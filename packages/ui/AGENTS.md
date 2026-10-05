# @layerd/ui

Vocabulary: `CONTEXT.md` here. Decisions: `docs/adr/`. How the barrels
and symlinks work: `../tools/README.md`. Shared conventions: the
root `AGENTS.md`. Decided on "Confirm shared UI conventions" (#4) and
"Codify authoring conventions" (#7).

## Imports

Public symbols come from the bare `@layerd/ui`, inside this package too,
`base/` included. Relative imports reach only a file the barrel does not
export. The apps' `#lib` import (and the old `$lib`) has no meaning here. Subpaths such as `@layerd/ui/base` are
unfinished and stay unused.

## Components

- One component per same-name folder under `components/<tier>/<name>/`:
  `button/button.svelte`, its `button.svelte.ts` when it has rune state.
  The barrel derives `Button` from the file name.
- New components are built on the base component with the default renderer
  at every tier (ADR 0001); `Root` is imported only by the base component.
- Props type `<Name>Props extends ComponentProps`; base props never change
  a component's own layout. Canonical rail names and `icon=` in new code.
- `variant` is the component's own union of looks (button, toggle and
  `forms/field.svelte.ts` are the references); `color`, `appearance` and
  `size` stay base props. A base prop the component redefines is dropped
  with `Omit<ComponentProps, 'x'>` (divider, toggle, slider).
- Styling in the markup with Tailwind; a `<style lang="postcss">` block
  with `@reference "#ui.css"` when raw CSS is needed. Palette utilities stay
  out; white and black are allowed.
- Responsive layout branches on `mq` in the consumer (ADR 0002); the base
  component system is breakpoint-blind.
- The empty placeholders (`checkbox`, `radio`, `switch`, `navbar`, `about`,
  `contact`, `home`) and the `*.data.ts` sample files stay until the
  database work decides them.

## Known exceptions

30 shipped root overrides, `Colorss.svelte`, relative imports in `base/`,
the module singletons in `observe` and `scroll`, five rune-free
`.svelte.ts` helpers: all listed on "UI library cleanup" (#33), changed
there, not mid-feature.

# @layerd/ui

Vocabulary: `GLOSSARY.md` here. Decisions: `docs/adr/`. How the barrels
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
- Every component is built on the base component, as the Button is, and
  its look is set from outside (Justin, 2026-11-26; the root
  `CODING_STANDARDS.md` says what that means). The look check
  (`../tools/src/checks/look.ts`) stops a commit of a component that does
  not render `<Component` or names a palette colour. The default renderer at
  every tier (ADR 0001); `Root` is imported only by the base component. A
  piece that repeats in every list row stays on it too: the base
  component's light path (`base/light.ts`) draws a component that asks for
  no layout without Root, as quick as a plain element (measured 2026-11-26).
- Props type `<Name>Props extends ComponentProps`; base props never change
  a component's own layout. Canonical rail names and `icon=` in new code.
- `variant` is the component's own union of looks (button, toggle and
  `forms/field.svelte.ts` are the references); `color`, `appearance` and
  `size` stay base props. A base prop the component redefines is dropped
  with `Omit<ComponentProps, 'x'>` (divider, toggle, slider).
- Styling in the markup with Tailwind; a `<style lang="postcss">` block
  with `@reference "#ui.css"` when raw CSS is needed. Palette colours stay
  out, white and black too: colours are the theme's (base, neutral, primary,
  secondary, accent, the status colours, surface, scrim, grab, shade,
  on-shade).
- Responsive layout branches on `mq` in the consumer (ADR 0002); the base
  component system is breakpoint-blind.
- The empty placeholders (`checkbox`, `navbar`, `about`,
  `contact`, `home`) and the `*.data.ts` sample files stay until the
  database work decides them.

## Known exceptions

30 shipped root overrides, `Colorss.svelte`, relative imports in `base/`,
the module singletons in `observe` and `scroll`, five rune-free
`.svelte.ts` helpers.

Components that broke the look rule before the look check began are listed
in `look.json` with what they had then. Since 2026-11-26 every other piece is on
the base component with theme colours, the app's, the public site's and the
overview's alike, and two are left: `metadata`, which draws nothing (a script
in the page head that sets the theme before the page paints; the site has it
switched off), and the Globe's two pin blues, which Justin chose to keep over
the theme's primary (2026-11-26, written in `look.json`). Each is fixed, not extended: it may get
better, never worse. Nothing joins that list, or this one, without Justin's yes, written
with his name and the date; a piece that is slow on the base component is
measured and the numbers go to him, it does not skip the base on its own.

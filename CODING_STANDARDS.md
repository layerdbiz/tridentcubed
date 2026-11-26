# Coding standards

Read when reviewing a change (`/code-review` reads this file). What a check can
catch is a check, not a line here: this file holds the judgement calls the
checks cannot make. `AGENTS.md` points here.

## Library components (`packages/ui`)

Justin's rule, 2026-11-26: every component in the UI library is reusable, and
its look is set from outside. It is built the way the Button is, on the base
component, so it has everything the base component gives (the theme, `color`,
`appearance`, `size`, their shorthands such as `primary`, `lite` and `sm`,
`invert`, `unstyled`, `class`, and the base props). A component with a look
fixed inside it cannot be reused and means rework later.

The look check (`packages/tools/src/checks/look.ts`, run before every commit
and by `pnpm check`) stops a component that does not render `<Component`, or
that names a palette colour (`slate`, `gray`, `white`...). A review checks
what it cannot see:

1. **Everything passes through.** The caller's props are spread on
   `<Component {...props}>`. A component that needs its own markup takes the
   root override (`{#snippet component({ props, layout })}`) and spreads
   `props` on the element that shows, as the Switch and the Accordion do.
2. **The look lands on what shows.** `color`, `appearance`, `size` and
   `class` style the box a person sees (the Dialog's sheet, not its
   invisible layer over the page).
3. **The look comes only from props and the theme.** Colours are the
   theme's: base, neutral, primary, secondary, accent, the status colours
   (info, success, warning, danger), surface, scrim and grab. A default look
   is a prop default (`color = 'primary'`), so a caller can change it. With
   none given, a component may be bare (the Accordion).
4. **Pieces inside are library pieces, set from outside too.** A Delete
   inside is the library Button, and the caller reaches it through a prop
   (`deleteButton`, the Toggle's `button`); an icon is the library Icon.
5. **Size scales it.** Spacing in em, or a ladder on the size classes
   (`:global(.name:where(.sm))`), so `size` grows the whole piece.
6. **No look in CSS a caller cannot beat.** A scoped `<style>` rule is
   outside Tailwind's layers and wins over a caller's class; keep looks in
   classes and the theme, and wrap size ladders in `:where()`.
7. **The app's look stays in the app.** A screen that wants its own look
   passes it from outside (`apps/app` `look/fold.ts`), and the library does
   not grow a screen's look.
8. **No exception without Justin.** "It repeats in every row" or "it was
   that way in the app" is not a reason to skip the base component or fix a
   colour. Measure it, and bring him the numbers. An exception he agrees to
   is written in `packages/ui/look.json` with his name and the date.

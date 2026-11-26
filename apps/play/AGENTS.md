# apps/play

The playground and the sole exception zone (#4): demos may break every
rule in the root and UI `AGENTS.md`. Nothing here is a template for the
library or the production apps. The MQ and rails demo routes under
`src/routes/(play)/demo/` are the working reference that ADR 0002 cites;
keep those running.

## The play shell (#342)

play.tridentcubed.com is a Svelte shell around plain HTML prototypes, like
Storybook: a sidebar lists everything, and each entry opens in frames that
can take any screen size, light or dark, side by side. The shell's code is
`src/lib/shell/` (one component per control, reusable); its pages are
`src/routes/(shell)/`.

- **Prototypes** are big app sections with options to compare: one HTML file
  each at `src/prototypes/<topic>/<option>.html`, opened at
  `/prototype/<topic>`. An option named `main` comes first.
- **Components** are single pieces with their variants:
  `src/components/<name>/<variant>.html`, opened at `/component/<name>`.
- **Library** is the play app's own Svelte pages from before the shell
  (`src/routes/(play)` and `(mq)`), each opened at `/library/<path>`; the
  pages themselves still work at their old addresses.

Adding a file is the whole job: the shell finds it at build time. A prototype
needs nothing from the shell. To answer the Themes control it reads
`data-theme="light|dark"` on `<html>` (the prototype starter does); for the
Container control it marks the box its container queries measure with
`data-container` (otherwise the body is used).

- Every control is kept in the browser per entry and written into the
  address (`#v=main.b&s=phone.desktop&t=light.dark&l=row&w=600x800&c=0`); an
  address wins. Copy settings copies the controls in words plus that link.
- Fill shows the prototype filling the page with its own gestures. Any sized
  screen puts the frames on a canvas: drag, scroll, Ctrl+wheel, and a pinch
  ANYWHERE, on a frame too (#361): the shell listens inside each frame,
  which shares play's address, and zooms the canvas.
- Old links `/<topic>/<option>` (`/kit/starter`) open the same option.
- The site is public and so is this repository: made-up sample data only,
  never client names, jobs, photos or documents. Search engines are kept out
  by `vercel.json` (X-Robots-Tag) and the robots meta in `src/app.html`.
- Push to the `play` branch: Vercel builds only this app, in about a minute,
  with no GitHub checks. A prototype becomes Svelte only when it wins and turns
  into real app code, which goes on `next`.
- Tests: `pnpm --filter play test` (logic in `src/lib/shell/*.test.ts`).

# apps/play

The playground and the sole exception zone (#4): demos may break every
rule in the root and UI `AGENTS.md`. Nothing here is a template for the
library or the production apps. The MQ and rails demo routes under
`src/routes/(play)/demo/` are the working reference that ADR 0002 cites;
keep those running.

## The play shell (#342)

play.tridentcubed.com is a Svelte shell around plain HTML prototypes, like
Storybook: a menu lists everything, and each entry opens on every device at
once, drawn at its real size. The shell's code is `src/lib/shell/`; its pages
are `src/routes/(shell)/`.

- **Prototypes** are big app sections with options to compare: one HTML file
  each at `src/prototypes/<topic>/<option>.html`, opened at
  `/prototype/<topic>`. An option named `main` comes first. Topics may sit in
  folders (`src/prototypes/report/cover/main.html` opens at
  `/prototype/report/cover`), and a file on its own (`src/prototypes/x.html`)
  is a topic with one option.
- **Components** are single pieces with their variants:
  `src/components/<name>/<variant>.html`, opened at `/component/<name>`, in
  folders the same way.
- **Library** is the play app's own Svelte pages from before the shell
  (`src/routes/(play)` and `(mq)`), each opened at `/library/<path>`; the
  pages themselves still work at their old addresses.

Adding a file is the whole job: the shell finds it at build time and the menu
(`tree.ts`) is built from the folders and files, so nothing is listed by hand.
A prototype needs nothing from the shell. To answer the Themes control it
reads `data-theme="light|dark"` on `<html>` (the prototype starter does); for
the Container control it marks the box its container queries measure with
`data-container` (otherwise the body is used).

- **Colours are the UI library's.** Justin's rule (2026-11-26): the shell
  brings no colours of its own. Its chrome is `@layerd/ui` pieces (Button,
  Input, Switch, Accordion, Dialog, Component) and the theme's classes
  (`theme-base`, `theme-heavy`, `bg-base-200-800`...); the device bodies and
  their bars are the theme's palette too. A piece the library lacks is added
  to the library, not drawn here.
- **Every device, real size, all at once** (`devices.ts`, `device.svelte`):
  a 1080p monitor (1920 × 1080), a MacBook Air 13″ (1470 × 956), an iPad Air
  11″ (820 × 1180) and an iPhone 16 (393 × 852), all on by default. Each
  screen keeps the bar the device keeps for itself (status bar, notch and
  menu bar, browser bar), so the page gets the room a real page gets there
  (393 × 793 on the phone, as an installed web app). Custom is a browser
  window whose page is the size typed in; Fill gives the prototype the whole
  page with no device.
- **Packed to fill the page** (`pack.ts`): one scale for every device, so
  they keep their true sizes against each other, as large as the room
  allows. Every way of laying them out in rows and columns is tried; each
  option in each theme stays in a block of its own. A press on a device's
  name zooms to it; the percentage fits everything again.
- Every control is kept in the browser per entry (`play:v2:*`) and written
  into the address (`#v=main.b&s=desktop.laptop.tablet.phone&t=light.dark&w=600x800&c=0`);
  an address wins. Copy settings copies the controls in words plus that link.
- The canvas: drag, scroll, Ctrl+wheel, and a pinch ANYWHERE, on a prototype
  too (#361): the shell listens inside each frame, which shares play's
  address, and zooms the canvas. Fill keeps the prototype's own gestures.
- Old links `/<topic>/<option>` (`/kit/starter`) open the same option.
- The site is public and so is this repository: made-up sample data only,
  never client names, jobs, photos or documents. Search engines are kept out
  by `vercel.json` (X-Robots-Tag) and the robots meta in `src/app.html`.
- Push to the `play` branch: Vercel builds only this app, in about a minute,
  with no GitHub checks. A prototype becomes Svelte only when it wins and turns
  into real app code, which goes on `next`.
- Tests: `pnpm --filter play test` (logic in `src/lib/shell/*.test.ts`).

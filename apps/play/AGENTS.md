# apps/play

The playground and the sole exception zone (#4): demos may break every
rule in the root and UI `AGENTS.md`. Nothing here is a template for the
library or the production apps. The MQ and rails demo routes under
`src/routes/(play)/demo/` are the working reference that ADR 0002 cites;
keep those running.

## Prototypes for the team (#342)

play.tridentcubed.com shows the prototypes the team picks from. Each is one
standalone HTML file at `src/prototypes/<topic>/<option>.html` (for example
`menus/a.html`), served at `/<topic>/<option>` inside a thin bar that switches
between a topic's options; the home page lists every topic. Adding a file is
the whole job: no Svelte, no build step of its own.

- Prototypes are made quickly in Claude from the prototype starter first; only
  the ones worth showing the team are copied here.
- The site is public and so is this repository: made-up sample data only,
  never client names, jobs, photos or documents.
- Push to the `play` branch: Vercel builds only this app, in about a minute,
  with no GitHub checks. A prototype becomes Svelte only when it wins and turns
  into real app code, which goes on `next`.

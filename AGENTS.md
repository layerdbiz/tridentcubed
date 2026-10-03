## Agent skills

### Issue tracker
Engineering issues and specs live in GitHub. See docs/agents/issue-tracker.md.

### Triage labels
Use the five agreed default labels. See docs/agents/triage-labels.md.

### Domain docs
Keep Trident business vocabulary and reusable UI vocabulary separate.
See docs/agents/domain.md.

### Branch status and landing
`/oneezy-status` renders the read-only status report for the branch, its PR
and its builds. `/oneezy-merge` commits, pushes and opens the PR;
`/oneezy-merge into dev` also squash-merges on green builds and cleans up;
both end with that report, which briefs the next agent when a wayfinder map
is in play. Skills prefixed `oneezy-` are Justin's; the rest are installed
from `skills-lock.json` and are never edited here, with one exception:
oneezy-merge, wayfinder, grill-me, to-spec, to-tickets, triage and handoff
have `disable-model-invocation` removed so they can start in Claude project
threads, which have no slash commands. A skills update restores the flag,
so strip it again afterwards. Run these only when Justin names one.

## Task coordination

In Codex, use separate tasks in the saved Trident project for substantial,
bounded research or implementation. TODO LIST coordinates decisions and
checklists. Carry concise goals, settled decisions, sources and constraints
into each task; return findings and results.

## Local servers

When you start an app's dev or preview server, start it with `--host`, leave
it running, and report every Network URL it prints, without being asked, in
every kind of session (local, cloud, remote, SSH). For Trident that is four
URLs: app dev, app preview, site dev, site preview. Give each app its own
port and run the servers in the background, for example
`pnpm exec vite dev --host --port 5173` and
`pnpm exec vite preview --host --port 4173` inside `apps/site`, and 5174 and
4174 inside `apps/app`. Preview needs a `vite build` first. A localhost-only
run that is fetched with curl and then killed does not count as running the
app.

### Protected branches
`main` is promoted by hand; never merge into, push to, or modify it.
Never touch the branch named `persist`. Its rule lives here because it is
specific to this repo; it is not in any global agent config.

## Authoring conventions

Decided on "Codify authoring conventions" (#7). Scoped `AGENTS.md` files
hold what is specific to `packages/ui`, `apps/app`, `apps/site` and
`apps/play`; read the one for the folder you are editing. Shared by all:

- **Barrels are generated.** Every `src/lib/index.ts` and the UI package's
  four sub-barrels are written by the barrels generator. Edit the source
  file; the generator rewrites the barrel. A hand edit is overwritten.
- **Names.** Files and folders are one lowercase word (`panel.svelte`),
  kebab-case only when a second word is unavoidable (`photo-grid.svelte`).
  Props the same, with camelCase as the fallback. Values camelCase,
  constants SCREAMING_SNAKE, types `<Name>Props` and `<Name>Type`, booleans
  `is`/`has`/`should`, converters `to*`, factories `create*`.
- **Functions.** Named `function` declarations for anything exported or
  reused; arrows for callbacks and SvelteKit handlers; `for...of` loops.
  Named imports; `import * as` only for a namespace by design (`valibot as v`).
- **Current JavaScript.** The browser floor is Vite's default target, with
  iPhone Safari first-class; leave `build.target` alone. Modernise the lines
  a change already touches, using the retire-when-touched pairs in
  `docs/research/2026-09-28-svelte-state-and-remote-functions.md`; record
  anything wider on "UI library cleanup after Report Generator V1" (#33).
- **State.** A class with `$state` fields for per-instance state; private
  module `$state` behind exported functions for a singleton; `createContext`
  for anything server rendering may mutate. A `.svelte.ts` suffix means the
  file uses runes.
- **Tests** sit beside the file they test as `<name>.test.ts`, written with
  `/tdd` once Vitest lands with `vp`. Lint takes over from this prose where
  Oxlint can express a rule.

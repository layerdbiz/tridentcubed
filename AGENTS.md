## Agent skills

### Skills library
Justin's skills come from his library `oneezy/skills`, linked into
`~/.claude/skills` by `npx @oneezy/skills-sync`; this repo also commits
copies in `.claude/skills`. A cloud session (`CLAUDE_CODE_REMOTE=true`) gets
the library from the environment's setup script or this repo's SessionStart
hook. If a skill Justin asks for is not in your skill list, run this first,
then carry on:

```
npx --yes @oneezy/skills-sync -y --agents claude-code --global --no-projects --no-wsl --quiet
```

Claude Code lists the new skills about a minute later; until then, Read the
SKILL.md.

A message that starts with `/<name>` runs that skill, even in a project
thread, where it reaches you as plain text rather than a command. If the
skill is in your list, invoke it. If it is not, which is always the case for
skills marked `disable-model-invocation` (`/wayfinder`, `/grill-me`,
`/to-tickets`, `/oneezy-merge` and others), Read
`.claude/skills/<name>/SKILL.md`, or `~/.claude/skills/<name>/SKILL.md` when
the repo has no copy, and follow it, with the rest of the message as its
arguments.

### Issue tracker
Engineering issues and specs live in GitHub. See docs/agents/issue-tracker.md.
When you start work on an issue, move it to In Progress on the project
board and put `Closes #<n>` in the PR body; the client follows the board.
The how is under "Project board" in that file.

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
from `skills-lock.json` and are never edited here.

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
`pnpm exec vp dev --host --port 5173` and
`pnpm exec vp preview --host --port 4173` inside `apps/site`, and 5174 and
4174 inside `apps/app`. Preview needs a `vp build` first. A localhost-only
run that is fetched with curl and then killed does not count as running the
app.

### Protected branches
`main` is promoted by hand; never merge into, push to, or modify it.

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
- **Tests** sit beside the file they test as `<name>.test.ts` (rune tests as
  `<name>.svelte.test.ts`), written with `/tdd` and imported from
  `vite-plus/test`. Lint takes over from this prose where Oxlint can express a
  rule.
- **Checks before a PR.** `pnpm exec vp check` (Oxfmt and Oxlint, config in
  the root `vite.config.ts`), `pnpm test`, and `svelte-check` with zero errors
  on app, site and `packages/ui` (`pnpm --filter <name> check`). `vp check
  --fix` formats and applies safe lint fixes.
- **One config file per app.** SvelteKit 3 reads only `vite.config.ts`; no
  `svelte.config.js` exists in this repository, and none is added. The four
  apps get theirs from `createAppConfig({ root, prerender?, test? })` in
  `@layerd/config-vite` (decided 2026-10-05 on #22, built on #101): the file
  is the import plus the app's overrides, and a new app, including one from
  `sv create`, replaces its generated `vite.config.ts` with that import.
  `packages/ui` keeps its own config.
- **Stale code goes.** Code that no longer runs or is no longer used is
  deleted, not kept; git history is the archive. `.archive/` holds only
  prototype material someone may still port concepts from (decided
  2026-10-05 on #22).

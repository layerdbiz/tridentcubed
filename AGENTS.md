## Working rules

Justin set these on 2026-11-25. They win over his global rules file, his
Oneezy skills and any other skill where they disagree.

### Where work lands
- **`next` is the integration branch**, live at next.app.tridentcubed.com
  with the dev data (#341). A fresh cloud checkout sits on `main`, whose
  rules are older: cut each branch from an up-to-date `origin/next`, named
  `<type>/<n>-<slug>` for its ticket, and push it when you start: that
  puts the ticket In Progress on the board (task-manager reads the number
  from the branch, since GitHub ignores `Closes` on a pull request into
  anything but `main`). A cloud thread pushes there too, not only to its
  `claude/...` branch. When done, open a pull request into `next` with
  `Closes #<n>` in its body, and merge it at once
  with a merge commit titled as before (`🔀 merge(<scope>): ... (#<n>) onto
  next`): `gh api -X PUT repos/layerdbiz/tridentcubed/pulls/<pr>/merge -f
  merge_method=merge -f commit_title=...`. next runs no checks, so nothing
  waits, and delete-merged-branch removes the branch. If the merge is
  refused, merge `origin/next` into the branch, push and merge again. All
  of that is Justin's standing yes; go ahead without asking. Work on `next`
  may add to the database but never rename or remove anything, since
  dev.app reads the same data.
- **`dev`** takes `next` only on Justin's explicit word, after he has
  checked the work on next.app. Before the move, the release it makes
  gets its highlights, written on next and read by him on next.app as
  "Coming to dev"; dev will not release without them (`apps/app/AGENTS.md`,
  "Releases and What's New"). That merge is when the checks run. It is a
  fast-forward, `git push origin origin/next:dev`, never a squash: the
  release made from that push (#157) and What's New read every commit, and
  dev stays inside next. If dev holds a commit next lacks, merge dev into
  next first.
- **`main`** changes only when Justin says so: never merge into, push to,
  or modify it.
- **`play`** holds the team's prototypes at play.tridentcubed.com (#342),
  made-up data only. Like `next`, it runs no GitHub checks.
- **Long-lived**: `main`, `dev`, `next` and `play` stay forever; never
  delete them.
- **Tickets close when their work reaches `dev`.** On every push to `dev`,
  `.github/workflows/close-issues.yml` closes the tickets of each pull
  request into `next` that the push brings, the one its branch is named for
  and any its body closes, and moves them to Done on the board. A round that leaves its ticket unfinished names
  no number in its branch and says `Refs #<n>`, not `Closes`. Work that
  reached `next` without a pull request closes nothing: close its ticket by
  hand when it reaches `dev`.

### Starting work
Use Matt Pocock's skills. At the start of new work, run `/ask-matt` (user-only:
Read its SKILL.md) to pick the course of action. Separate tasks get separate threads.

### Before and after pictures
Once a round of changes is in, picture each change unasked, one image per
change. Phone: before on the left, after on the right. Desktop: before on
top, after below.

### Names
- **Threads and artifacts**: one uppercase word for the kind, a colon, a
  short description: `NEXT: Initials Avatars`, `PROTOTYPE: Select Menus`.
  A code change takes the branch it lands on (`NEXT`, `DEV`, `PLAY`); a
  prototype takes `PROTOTYPE`; anything else one clear word (`GRILLING`,
  `RESEARCH`, `TICKETS`, `WORKFLOW`). This replaces `/oneezy-naming`'s
  chat titles.
- **Ticket lists** give each ticket's number and title:
  `#355 Show initials and company codes instead of icons`.

## Agent skills

### Skills library
Every skill comes from Justin's library, edited only in oneezy/tools
`packages/skills` (see Adding or changing a skill). Installs read its
release mirror `oneezy/skills`, linked into `~/.claude/skills` by
skills-sync; this repo holds no copies of library skills. A cloud session
(`CLAUDE_CODE_REMOTE=true`) gets the library from the environment's setup
script or this repo's SessionStart hook. If a skill
Justin asks for is not in your skill list, run this first, then carry on:

```
npx --yes @oneezy/skills-sync@latest -y --agents claude-code --global --no-projects --no-wsl --quiet
```

`@latest` keeps a PC with a cached older version on the newest release.
Claude Code lists the new skills about a minute later; until then, Read the
SKILL.md.

A message that starts with `/<name>` runs that skill, even in a project
thread, where it reaches you as plain text rather than a command. If the
skill is in your list, invoke it. If it is not, which is always the case for
skills marked `disable-model-invocation` (`/wayfinder`, `/grill-me`,
`/to-tickets`, `/oneezy-merge` and others), Read
`~/.claude/skills/<name>/SKILL.md` and follow it, with the rest of the
message as its arguments.

### Adding or changing a skill
To add or change a skill or a global rule, Justin just asks ("add
<owner/repo> skills", or a link to one skill) and `/oneezy-skills` does the
rest. The change is made only in oneezy/tools `packages/skills`, through a
pull request into tools `dev` (tools ADR-0021); a release of
`oneezy/skills` then carries it, and skills-sync brings it here. Where a
loaded skill still names `oneezy/skills` or a `land/*` branch for the
change, follow this section instead. Never ask Justin to review or merge a
skills change, and never put skill copies in this repo; this repo keeps its
own Working rules above. Opening that pull request needs `oneezy/tools`
among this project's repositories; when a push is refused, say so and stop,
and Justin adds the repo or makes the change from his Tools project. The
one skill still committed here,
`.claude/skills/resolving-merge-conflicts`, is not in the library yet and
stays until it moves there.

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
`/oneezy-merge into dev` also merges on green builds and cleans up,
and runs only on Justin's word; dev takes next by fast-forward, never the
skill's squash (Where work lands); both end with that report, which briefs the next agent when a wayfinder map
is in play. Skills prefixed `oneezy-` are Justin's; the rest are
third-party skills declared in the library and are never edited here.

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

## Authoring conventions

Decided on "Codify authoring conventions" (#7). Scoped `AGENTS.md` files
hold what is specific to `packages/ui`, `apps/app`, `apps/site` and
`apps/play`; read the one for the folder you are editing. Shared by all:

- **Library components** are built on the base component, as the Button
  is, with their look set from outside (Justin, 2026-11-26): what that
  means is in `CODING_STANDARDS.md`, and the look check stops a commit that
  breaks it.
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
- **What's New lines.** A `feat`, `fix` or `perf` commit people will
  notice in the app carries a line `What's New: <everyday words>` in its
  message body, one per thing they will notice; without one it stays out of
  What's New (Justin, 2026-11-27: "only things in layman terms for the
  user"). The rule is in `apps/app/AGENTS.md`, "Releases and What's New".
- **Checks before a PR.** CI (`.github/workflows/ci.yml`) runs the gate and
  the two Vercel-shaped builds on every push to a branch, so they are already
  running when the PR opens and no thread re-runs them by hand. The gate is one local command for a pre-push run,
  `pnpm check`; the root `package.json` `check` script is the one list of
  what it runs (format and lint, svelte-check and tsc, barrels with a
  zero-diff check, tests). CI runs the same steps in jobs side by side:
  `check:static` in one, the tests in others. It runs on a fresh clone with no build step, and
  its barrels check reads red on a tree with regenerated barrels not yet
  committed. `vp check --fix` formats and applies safe lint fixes. Every commit runs it first on the staged
  files (`vp staged` in `.vite-hooks/pre-commit`, which `pnpm install` sets up), so a lint
  error stops the commit (#370).
- **One config file per app.** SvelteKit 3 reads only `vite.config.ts`; no
  `svelte.config.js` exists in this repository, and none is added. The four
  apps get theirs from `createAppConfig({ root, prerender?, paths?, test? })` in
  `@layerd/config-vite` (decided 2026-10-05 on #22, built on #101): the file
  is the import plus the app's overrides, and a new app, including one from
  `sv create`, replaces its generated `vite.config.ts` with that import.
  `packages/ui` keeps its own config.
- **Stale code goes.** Code that no longer runs or is no longer used is
  deleted, not kept; git history is the archive. `.archive/` holds only
  prototype material someone may still port concepts from (decided
  2026-10-05 on #22).

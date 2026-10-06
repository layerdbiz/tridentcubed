# Retro: map #1, "Align Trident's codebase for Report Generator V1", 2026-10-05

Scope: the sessions that closed map #1 between 2026-10-05 02:44 and 06:26: the
decisions on #48, #93, #13, #23, #22 and #16 (docs PRs #94, #95, #98, #102,
#104) and the three builds #100 (PR #105), #107 (PR #108) and #101 (PR #109,
the shared Vite config). Primary sources: the six thread transcripts, the nine
PRs, issue #1, the steering files on `dev` at f8c8ae7, and the previous retro
(`2026-10-03-toolchain-upgrade.md`, in the project files). The gate was re-run
on a fresh checkout of `dev` for finding 1. Ordered by severity.

## 1. The documented gate is red on `dev` (automated checks)

**What happened.** `AGENTS.md` names `pnpm exec vp check` as the first check
before a PR. On a fresh clone of `dev` it fails twice over:

- Before any build: "Formatting failed before analysis started". Oxfmt's
  Tailwind class sorter reads each app's `app.css`, which imports
  `@layerd/ui/ui.css`, whose target is `packages/ui/dist/ui.css`, a file that
  exists only after `pnpm --filter @layerd/ui styles` has run.
- After that build: "Found formatting issues in 19 files" (eleven in
  `apps/app`, three in `apps/play`, four in `apps/site`, one in
  `apps/report`), all Tailwind class order.

Every thread on this map still reported the gate green. #109's evidence says
"the 19 Oxfmt hits are identical on `dev`, not from this change", #105 and
#108 say "`vp check` green", and the threads ran `vp lint` where the format
half was red. A check that is red by default trains every agent to read
around it, which is the state the 2026-10-03 retro warned about from the
other side (Vercel red while the local gate was green).

**Proposal.** One PR, two parts: run `vp check --fix` once after the styles
build so `dev` is at zero, and make the styles build part of the check (a
root `check` script, `turbo run styles --filter=@layerd/ui && vp check`, or
the sorter override pointed at `packages/ui/src/lib/ui.css`, the source file
the package already exports as `./theme.css`). Then "`vp check` red" means
something again. Also wire the one check nobody runs: `@layerd/config-vite`
got a `tsc --noEmit` script on #101 and the "Checks before a PR" line lists
only app, site and `packages/ui`. Who: a thread, `/implement`.

## 2. Still no CI, and the last retro's proposals had no tickets (automated checks)

**What happened.** The 2026-10-03 retro proposed five changes. Two days later:
CI workflow (its #1) not started; Vercel logs from threads (#2, issue #14)
open; the gate as committed scripts (#3) not started; the merge-method ruleset
on `main` (#4) unverified; Node 24 in the container (#5) not done, the
container still runs 22.22 and `packages/tools/README.md` now carries a
"verified below the floor" section because of it. The retro ended with "Add
CI offered, unanswered" and nothing turned it into tickets.

The cost on this map: nine PRs, each thread re-ran the whole gate by hand
inside its container (install, barrels, svelte-check on three packages,
`vp check`, tests, root build, build inside `apps/app`, four dev and preview
servers), eight to fifteen minutes per thread, and Vercel was the only
machine check on any PR. #104 and #105 landed in parallel and each had to
merge `dev` into its branch and wait for Vercel again.

**Proposal.** `.github/workflows/ci.yml` on pull requests into `dev`: frozen
install on Node 24, the styles build, `vp check`, `pnpm test`, svelte-check
on app, site, ui and the config package, and the two Vercel-shaped builds
(`cd apps/app && pnpm build`, same for site). The library's `/oneezy-merge`
already waits on every check run, not only Vercel statuses (finding 4), so
the land step honours CI the day the repo's skill copy is synced. The map
filed CI under "a future effort after Report Generator V1 setup"; this retro
asks to pull it forward, because the next map builds a database and auth,
and that is the wrong place to discover a red gate by hand. Who: a thread,
one PR, on oneezy's yes since it overrides a map decision. Node 24 and the
pnpm "Exec format error" fix belong in the environment's setup script, his
hand.

## 3. The shared Vite config (#101) went clean, and why (what worked)

**What happened.** The build ask-matt flagged as the one that went sideways
before took one thread, three commits, no bisects, both previews green on
the first push. Three things made the difference, worth keeping:

- The #22 grilling diagnosed the first attempt's failure before writing the
  ticket: the old shared `svelte.config.js` resolved `../../packages/ui`
  relative to the working directory, so it differed from the root, from an
  app folder and on Vercel. The ticket said "paths from the package's own
  location, never the working directory", and the factory does that with
  `import.meta.dirname` and a `root` argument.
- The ticket's gate included a build from inside `apps/app`, the Vercel
  shape the 2026-10-03 retro identified. The build-shape bug had nowhere to
  hide.
- Kit 3 removed the second config file (#83), so an app imports one factory.
  Each app's `vite.config.ts` is now three to twenty-five lines.

The one wobble was the environment, not the code: the thread's first
container failed on the setup script and restarted eleven minutes later
(finding 6).

**Proposal.** Nothing to change in the code. The lesson to encode is that
the Vercel-shaped build lived in the ticket text and in the agent's memory,
not in a script; finding 2 puts it in CI where every PR gets it.

## 4. Repo skill copies lag the library (navigation, tool economy)

**What happened.** `AGENTS.md` says threads read `.claude/skills/<name>` first
and the library copy only when the repo has none. Sixteen of the committed
copies differ from the library today. Three of the differences changed how
this map ran:

- `ask-matt` (repo) has no `/retro`, `/implement-spec` or `/pr` and says
  `CONTEXT.md`; the library copy has all three and says `GLOSSARY.md`. The
  ask-matt threads had to read both copies and reconcile.
- `oneezy-merge` (repo) waits on `Vercel – *` statuses only; the library copy
  waits on every check run and status and has a release mode. CI (finding 2)
  is invisible to the repo copy.
- `domain-modeling` (repo) says `CONTEXT.md` and `CONTEXT-MAP.md`; the
  library copy says `GLOSSARY.md` and `GLOSSARY-MAP.md` (finding 5).

**Proposal.** One source. Either the repo stops committing copies (the
SessionStart hook and the setup script already install the library in every
cloud thread, and `npx @oneezy/skills-sync` links it locally), and the
`AGENTS.md` pointer says "skills come from the library", or the copies stay
and `/oneezy-merge` refreshes them on every landing. Dropping the copies
removes the whole class of drift; recommended. Who: oneezy's call, then a
thread for the sweep.

## 5. Steering files: concrete drift (coding standards, no-ops, navigation)

**What happened.** oneezy asked on #16 for the vocabulary, ADR, CONTEXT and
AGENTS files to be brought back in line, `$lib` where Kit 3 uses `#lib` being
the example. Checked line by line on `dev`:

- `$lib` as a live instruction survives in one place: Justin's own
  `oneezy-app-route` skill (lines 53, 81, 99 of its `SKILL.md`, repo and
  library copies alike) tells the agent to use "bare `$lib`" when authoring a
  route. That is the skill that writes app routes, so it is the one that
  matters. The `AGENTS.md` mentions are explanatory ("`$lib` is gone") and
  can go once nobody remembers the old name. One `$lib` remains in source,
  inside demo prose in `apps/play`, the exception zone.
- Dangling pointer: `apps/app/AGENTS.md` cites
  `docs/research/2026-09-26-sveltekit-app-layout.md`, which was never
  merged; it sits on the branch `research/sveltekit-app-layout` with
  `research/svelte-state-and-remote-functions` (the #43 doc that the root
  `AGENTS.md` "retire-when-touched" line also cites as
  `docs/research/2026-09-28-svelte-state-and-remote-functions.md`). Both
  branches have one unmerged commit each. Merge the two docs, or drop the
  pointers.
- Stale clauses: `apps/app/AGENTS.md` "once #8 writes it" (#8 is done);
  `docs/agents/domain.md` "until a map exists, read a root CONTEXT.md" (the
  map exists); `apps/site/AGENTS.md` says the `form.enhance` callback shape
  "is fixed on the Kit upgrade" (the upgrade landed on #83;
  `HomePage.svelte:828` still has the call). Whether that call works under
  Kit 3 is exactly #15's by-hand check; the contact form posts to a live
  Zapier hook, so no thread can test it.
- Glossary naming: the repo has `CONTEXT.md` ×2 and `CONTEXT-MAP.md`; the
  library `domain-modeling` skill, which Matt named for the glossary and ADR
  layer, looks for `GLOSSARY.md` and "creates one when the first term is
  resolved" if none exists. A thread running the synced skill would write a
  second glossary next to `CONTEXT.md`. Rename the two files and the map and
  the six pointers to them, one mechanical PR, before any `/domain-modeling`
  session. Then run `/domain-modeling` on the platform map's new terms (auth,
  roles, live editing) rather than as a separate pass, as Matt said.
- No-ops in the root `AGENTS.md` for a cloud Claude thread: the "Task
  coordination" paragraph (Codex only); the Turborepo managed block, fourteen
  lines of generic guidance that `turbo` re-adds unless `turbo.json` sets
  `"agentGuidance": false`, while `packages/tools/README.md` already holds the
  repo's own Turbo rules. Both are read on every turn of every thread.
- The "Local servers" rule starts four servers in every session. On the
  file-move PR #108 that proved nothing; on #105 and #109 it caught real
  things (a Storybook task gone, static assets served). Narrowing it to
  changes that touch app code, config or the UI package keeps the catch and
  drops the cost. oneezy's rule, his call.

**Proposal.** One docs PR for the mechanical items (pointers, stale clauses,
the two research docs, the Turbo opt-out, the GLOSSARY rename if agreed).
The `oneezy-app-route` fix goes in `oneezy/skills`, then a sync. Who: a
thread; the two rule changes (servers, Codex paragraph) on oneezy's word.

## 6. Environment friction (information access)

**What happened.**

- #101's first container died on the setup script ("The session couldn't
  start because its setup script failed"); the thread restarted eleven
  minutes later. The script runs skills-sync at `@latest`, which lags the
  registry right after a publish, and `.claude/settings.json` runs the same
  sync a second time in a SessionStart hook with a 120-second timeout. Two
  syncs per session, one of which can kill the session.
- Four of the seven landings today needed oneezy to type
  `/oneezy-merge #n into dev` himself (#102, #104, #108, #109) because the
  session guard refuses a thread's merge; #105 self-landed. The pattern is
  known and the coordinator posts the command, so the cost is one round trip
  per PR, but it is the one manual step left on every landing.
- Every thread starts on `main` although the setup script checks out `dev`;
  each thread resets its branch onto `origin/dev` first. Recorded in project
  memory only.
- The styles build prints "Cannot load icon set for theme. Install
  @iconify-json/theme" on every run; nothing fails, so nobody reads it.

**Proposal.** Setup script: make the sync non-fatal (`|| true`, like the
hook) and keep one of the two syncs, plus Node 24 and the pnpm fix from
finding 2. The merge guard is not the repo's to fix; CI (finding 2) at least
makes the thing he approves machine-checked. The `dev` reset is a one-line
"how" under the existing "work branches off `dev`" rule. The icon warning is a
missing `theme` icon set in the UI theme CSS, for "UI library cleanup" (#33).
Who: oneezy for the script, a thread for the rest.

## 7. Smaller noise

- #101's ticket said "invariant 7 names the alias"; the README numbers it 6.
  The thread noticed and edited the right one. Ticket text that cites a
  numbered list goes stale when the list moves; cite the invariant's name.
- svelte-check prints `config_option_deprecated_alias` for
  `packages/ui/vite.config.ts` on every run (its own aliases, invariant 8).
  Moving them to `package.json#imports` as the apps did on #83 ends the
  warning; a small item for #33.
- The map's destination says "a fresh agent session proves the routing
  works". #16 counted nine days of threads as the proof. Fine, and this retro
  is the first document that lists what those threads still stumbled on.

## Carried from 2026-10-03

| Item | State |
| --- | --- |
| CI on PRs into dev | not started, finding 2 |
| Vercel logs from threads (#14) | open, oneezy's hand |
| Gate as committed scripts | not started, folded into finding 2 |
| Merge-method ruleset on `main` | unverified, oneezy's hand |
| Node 24 in the container | not done, finding 6 |

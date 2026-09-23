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
`pnpm exec vite dev --host --port 5173` and
`pnpm exec vite preview --host --port 4173` inside `apps/site`, and 5174 and
4174 inside `apps/app`. Preview needs a `vite build` first. A localhost-only
run that is fetched with curl and then killed does not count as running the
app.

### Protected branches
`main` is promoted by hand; never merge into, push to, or modify it.
Never touch the branch named `persist`. Its rule lives here because it is
specific to this repo; it is not in any global agent config.

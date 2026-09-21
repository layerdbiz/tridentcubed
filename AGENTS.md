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

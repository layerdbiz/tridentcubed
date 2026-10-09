# Issue tracker: GitHub

Engineering issues and specs live in layerdbiz/tridentcubed.
Use gh api against the REST endpoints from the repository. Trello holds
visible project summaries.

Cloud sessions block GitHub GraphQL, so gh issue and gh pr fail there;
gh api with a REST path works everywhere. The GitHub MCP tools are an
equal alternative where a session has them. Below, R stands for
repos/layerdbiz/tridentcubed.

- Read a ticket: gh api R/issues/<n>, then gh api R/issues/<n>/comments.
- List: gh api 'R/issues?state=open&labels=<label>&per_page=100'. The
  endpoint also returns PRs; drop them with
  --jq '.[] | select(.pull_request == null)'.
- Create: gh api R/issues -f title='...' -F body=@body.md
  -f 'labels[]=<label>'.
- Comment: gh api R/issues/<n>/comments -F body=@body.md.
- Labels: gh api R/issues/<n>/labels -f 'labels[]=<label>' to add,
  gh api -X DELETE R/issues/<n>/labels/<label> to remove.
- Close: gh api -X PATCH R/issues/<n> -f state=closed
  -f state_reason=completed.

Write multiline bodies to a file and pass them with -F body=@<file>.

PRs as a request surface: no.

When a skill says to publish to the issue tracker, it means a GitHub issue.
Configuration alone does not authorize publishing.

## Names

Before creating or renaming an issue, label, branch, commit or PR title,
load /oneezy-naming and follow it. It changes titles and adds kind labels
beside the ones below; every label and step above stays as it is.

## Wayfinder

A map is an issue labelled wayfinder:map. Link its tickets as sub-issues;
if unavailable, use a map task list and a Part of #<map> backlink.
Ticket labels are wayfinder:research, wayfinder:prototype,
wayfinder:grilling or wayfinder:task.

Use native issue dependencies; fall back to Blocked by: #<number>
when unavailable. Select the first open, unassigned ticket in map order
with no open blockers. Claim it by assigning the driving developer.

On resolution, record the answer, close the ticket and add its conclusion
and link to the map's Decisions-so-far.

Sub-issue and dependency calls take the issue's id (the .id field from
gh api R/issues/<n>), not its number:

- Children: gh api R/issues/<map>/sub_issues to list,
  gh api R/issues/<map>/sub_issues -F sub_issue_id=<id> to link.
- Blockers: gh api R/issues/<n>/dependencies/blocked_by to list,
  gh api R/issues/<n>/dependencies/blocked_by -F issue_id=<id> to add.
- Claim: gh api R/issues/<n>/assignees -f 'assignees[]=<login>'.

## Project board

The client watches the GitHub Project's Status column, and the
task-manager workflow moves it from git events (rules in
oneezy/tools packages/task-manager/scripts/status.sh). The workflow reads
the ticket number from the branch name: a branch named <type>/<n>-<slug>
moves #n to In Progress when it is created, to Review when its PR is ready,
back to In Progress on a draft or changes requested, and to Done when the PR
merges into dev; a push to main takes every Done card to Complete. A branch
that names no issue (the early claude/... thread branches) moves nothing,
whatever its PR body says; that is how #84 and #85 sat at In Progress after
they shipped.

- Starting a ticket on a branch with no number: dispatch task-manager with
  start=<n> (moves #n from Todo, Next Up or no Status to In Progress):
  gh api -X POST R/actions/workflows/task-manager.yml/dispatches
  -f ref=dev -f 'inputs[start]=<n>'
- Every PR body still carries Closes #<n> for each ticket it finishes, so
  the issue closes when the work reaches main and the PR links to it.
- A card the workflow cannot see (no numbered branch, closed by hand,
  dragged by hand): dispatch board-status with the issues and the column.
  It runs on a GitHub runner, where the Projects API is reachable:
  gh api -X POST R/actions/workflows/board-status.yml/dispatches
  -f ref=dev -f 'inputs[issues]=<n> <m>' -f 'inputs[status]=Done'
  Columns: Todo, Next Up, In Progress, Review, Done, Complete.

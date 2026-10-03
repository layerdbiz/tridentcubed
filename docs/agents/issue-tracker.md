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
oneezy/tools packages/task-manager/scripts/status.sh). A branch named
<type>/<n>-<slug> moves #n to In Progress on its own; cloud threads work on
claude/... branches that name no issue, so they must say it themselves:

- Starting a ticket: dispatch the workflow with start=<n> (moves #n from
  Todo, Next Up or no Status to In Progress):
  gh api -X POST R/actions/workflows/task-manager.yml/dispatches
  -f ref=dev -f 'inputs[start]=<n>'
- Every PR body carries Closes #<n> for each ticket it finishes. That
  link moves the ticket to Review when the PR is ready, back to In
  Progress on a draft or changes requested, and closes it as Done when
  the PR merges into dev. A PR without it moves nothing.

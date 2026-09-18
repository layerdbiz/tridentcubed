# Issue tracker: GitHub

Engineering issues and specs live in layerdbiz/tridentcubed.
Use gh from the repository. Trello holds visible project summaries.

Read tickets and comments with gh issue view <number> --comments.
Use gh issue list with appropriate state and label filters.
Use gh issue create, comment, edit and close for authorized operations.
For multiline issue bodies and comments, use --body-file.

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

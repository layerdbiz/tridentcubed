---
name: oneezy-status
description: Render the status report for the current branch, its PR and its Vercel builds, in the fixed shape in STATUS.md. Read-only. Use when Justin asks for the status of the branch, the PR or the repo, and as the last step of /oneezy-merge.
---

One message, built from [STATUS.md](STATUS.md), for whatever state the branch is in. Nothing is changed: no commit, no push, no merge, no tracker write. This skill never calls `/oneezy-merge`.

## State

Read the state, then pick the variant in STATUS.md:

- **branch**: no PR for this branch. Commits ahead of base, uncommitted files, no builds.
- **open**: a PR exists and is not merged; builds green or pending.
- **blocked**: a PR exists and a Vercel build failed.
- **closeout**: the PR is merged.

## Lookups

Everything is read from the environment at run time. A value that cannot be found is omitted, never guessed.

- Owner and repo: `git remote get-url origin`. Default branch: `refs/remotes/origin/HEAD`. Base: the PR's base when a PR exists, else `dev` when origin has it, else the default branch.
- PR: the open PR whose head is this branch; else the most recently merged PR for this branch name, counted only when the branch head contains that PR's head commit (a branch recreated after a squash-merge has no PR and is in the branch state). With its title, labels of the tickets it closes (`Closes #n` in the body), and its files.
- Vercel team, project slugs and deployment pages: the `Vercel – <project>` commit statuses on the PR head; each `target_url` is `vercel.com/<team>/<project>/<deployment>`. One line per project, however many.
- Branch preview URLs: Vercel's bot comment on the PR. Base preview: `<project>-git-<base>-<team>.vercel.app`. Team dashboard: `vercel.com/<team>`.
- Build logs: the Vercel deployment events, when the connector is authorized for the team. A 403 means unread; say so under Builds and name the ticket tracking the authorization when one exists.
- Task board: the GitHub Project linked to the repo; else a `PROJECT_URL` in the repo's scripts; else omit the line.
- Map context: when a ticket the PR closes has a parent labelled `wayfinder:map`, the map is in play: ticket counts from its sub-issues, the milestone date from its Notes, Next Up from its frontier and the board's `Next Up` column. No map, no counts, no milestone, no Next Up.
- Labels: every ticket's labels, from the tracker.

## Next Up (closeout variant, map in play)

Chosen, not copied. Rank the frontier (open child tickets of the map, unblocked, unassigned) by critical path, what blocks the most tickets, and the milestone date. Rank Justin's by-hand tasks with the rest and mark them. When the ranking differs from the board's `Next Up` column, say so in the recommendation. The code block targets item 1.

## Budget

At most five calls: PR read, combined status, the Vercel bot comment, the map read when in play, and one shell call for git facts. One schema load at the start if the harness needs it. No text before the report; the report is the whole message.

Done when the report is on screen, within STATUS.md's line cap, every placeholder filled, every link a real URL.

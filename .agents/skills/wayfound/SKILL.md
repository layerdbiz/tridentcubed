---
name: wayfound
description: Land a finished wayfinder ticket: commit, PR to dev, previews, merge, clean up, then brief the next agent.
disable-model-invocation: true
---

A wayfinder ticket has been resolved in this session: the decision is recorded and the artifact (glossary, doc, findings) sits uncommitted on this branch. `/wayfinder` got the ticket **found**; this skill gets it **landed**: onto `dev`, off the working tree, and handed to whoever takes the next ticket. Invoking it is Justin's word to commit, push and open the PR for this ticket. Every deletion still gets its own OK.

Walk the steps in order. Each ends on a check; a failed check stops the walk and is reported, never worked around.

## 1. Confirm the ticket is found

The tracker already shows: the resolution comment on the ticket, the ticket closed, the map's **Decisions so far** carrying its line, its fog graduated or added, and policy handed to the ticket that owns it. Anything missing is `/wayfinder`'s step 4 or 5 left undone: finish it there first.

Done when the ticket is closed and the map names it.

## 2. Land on dev

1. Commit on the current branch. Subject in conventional form with the ticket number, `docs(ui): ... (#6)`; trailer per the harness's attribution rule.
2. Push the branch and open the PR against `dev` with the body from `/pr`. Title matches the commit subject.
3. Wait for both Vercel checks, site and app. Report both preview URLs to Justin.
4. Merge gate. **Docs or comments only** in the diff and **both previews green**: squash-merge now, subject = PR title with the PR number. Anything touching code: stop here with the URLs and wait for Justin's word; merge on it.
5. Fast-forward the main checkout's `dev` from origin.

Done when `git log -1 dev` in the main checkout is the squash commit.

## 3. Clean up

The branch model keeps `main`, `dev`, `persist`, `research/*` and `prototype/*` forever; everything else is a feature branch that leaves once merged. Propose the whole list, then act only on what Justin OKs:

- **Branches**: the merged feature branch, remote then local. `origin/mq` and `sheetari-fix` are on the standing approved-for-deletion list; still ask.
- **Pull requests**: any open PR from that branch that is not the merged one gets closed with a one-line comment pointing at the merged PR.
- **Worktrees**: every worktree under `.claude/worktrees/` whose branch is merged into `dev` and is not the one this session runs in: remove it, then `git worktree prune`. A **locked** worktree belongs to a live session; leave it and name it in the report. The session's own worktree is left for the desktop app, which drops unchanged worktrees itself; name it too.

Done when `git worktree list` and `git branch -a` show nothing merged-and-unowned except what Justin declined.

## 4. Remember

If the harness keeps persistent memory, update the map-status note: ticket closed, PR number, `dev` tip, and the frontier from step 5. Codex has no memory; skip.

## 5. Brief the next agent

Query the map's frontier: open child tickets, unblocked, unassigned. Rank by critical path: what blocks the final gate, what blocks the most tickets, what a milestone date makes urgent. Tasks Justin must do by hand (authorizations, sign-ups) are named separately; they are not agent work.

Report the frontier as a short table (ticket, type, one-line why), give one recommendation and, if a second session can run in parallel, one more. Then write the next agent's prompt in a single code block, using this shape:

```text
/wayfinder Work through map #<map> in <owner>/<repo>. Take ticket #<n> "<title>". Claim it by assigning me (<login>) first. Read <settled artifacts the ticket must not redefine> before anything else. Then read <sources named on the ticket and by the handover comments>. <Type-specific instruction: grill in rounds, Matt's round format, whole frontier per round / research against primary sources / build a throwaway prototype>. Output is <the ticket's stated output>, not <what it must not produce>. Do not touch main or persist. Commit only when I say so, then run /wayfound.
```

Done when the prompt is on screen and every placeholder is filled from the tracker, none guessed.

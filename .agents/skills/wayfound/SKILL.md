---
name: wayfound
description: Land a finished wayfinder ticket: commit, PR to dev, previews, merge, clean up, then brief the next agent.
disable-model-invocation: true
---

A wayfinder ticket has been resolved in this session: the decision is recorded and the artifact (glossary, doc, findings) sits uncommitted on this branch. `/wayfinder` got the ticket **found**; this skill gets it **landed**: onto `dev`, off the working tree, and handed to whoever takes the next ticket. Invoking it is Justin's word to commit, push, open the PR, and delete the landed branch and its worktree once merged. Nothing outside that scope is deleted.

Walk the steps in order. Each ends on a check; a failed check stops the walk and is reported, never worked around.

## 1. Confirm the ticket is found

The tracker already shows: the resolution comment on the ticket, the ticket closed, the map's **Decisions so far** carrying its line, its fog graduated or added, and policy handed to the ticket that owns it. Anything missing is `/wayfinder`'s step 4 or 5 left undone: finish it there first.

Done when the ticket is closed and the map names it.

## 2. Land on dev

1. Commit on the current branch. Subject in conventional form with the ticket number, `docs(ui): ... (#6)`; trailer per the harness's attribution rule.
2. Push the branch and open the PR against `dev` with the body from `/pr`. Title matches the commit subject. The body's summary is the **snapshot**: at most five bullets of what landed, written once here and reused verbatim in the closeout.
3. Wait for both Vercel checks, site and app. Collect, for the closeout: each preview URL, each build's Vercel dashboard URL, and each build log's errors and warnings (deduplicated by message, with a count and the file). Nothing is reported to Justin yet; the closeout in step 5 is the one message.
4. Merge gate: **both Vercel builds green**, site and app, whatever the diff touches. Green: squash-merge now, subject = PR title with the PR number. Either build red: leave the PR open and the branch in place, skip steps 3 and 4, and go straight to step 5's blocked variant; nothing is merged or deleted on a red build. The gate widens to type checks and the full gate from "Settle the toolchain" (#12) once the svelte-check baseline is zero; until then the builds are the gate.
5. Fast-forward the main checkout's `dev` from origin.

Done when `git log -1 dev` in the main checkout is the squash commit.

## 3. Clean up

Scope is exactly what step 2 landed: the **landed branch** (the head branch of the merged PR) and the worktree that held it. Nothing else is deleted, ever; invoking this skill is the OK for this scope and no question is asked. Other stale branches or worktrees are only named in the report for Justin.

1. Verify first: the PR reports `MERGED` with a merge commit, and `origin/dev` contains that commit. Either missing stops the walk.
2. Close any other open PR from the landed branch with a one-line comment pointing at the merged PR.
3. Delete the remote branch.
4. If this session runs in the worktree holding the branch, detach it onto `origin/dev` first; then delete the local branch from the main checkout.
5. The worktree: another session's is never touched. This session's own, now detached and clean, cannot remove itself; say so in the report. The desktop app drops an unchanged worktree when the session ends, and the next `/wayfound` run removes any worktree left detached, clean and unlocked by an earlier run, then prunes.

Done when `git branch -a` no longer lists the landed branch anywhere and the report names every worktree left behind.

Requires the harness to allow `git push --delete`, `git branch -D`, `git worktree unlock`, `git worktree remove` and `git worktree prune`; in Claude Code auto mode those need allow rules in `.claude/settings.json`, or the classifier blocks them.

## 4. Remember

If the harness keeps persistent memory, update the map-status note: ticket closed, PR number, `dev` tip, and the frontier from step 5. Codex has no memory; skip.

## 5. Close out

One message ends the session, built from [CLOSEOUT.md](CLOSEOUT.md): the template is exact, the rules under it are not optional, and the landed and blocked variants are both there. Fill it from the tracker and the checks collected in step 2, never from memory.

**Next Up** is chosen, not copied. Read the frontier (open child tickets of the map, unblocked, unassigned) and, when the task board has a `Next Up` column, its cards. Rank by critical path: what blocks the final gate, what blocks the most tickets, what the milestone date makes urgent. Tasks only Justin can do (authorizations, sign-ups) are ranked with the rest and marked *by hand*; they are not left out. When the ranking differs from the column, say so in the recommendation line and, once the column exists, move the card. The code block always targets item 1.

Done when the message is on screen, within the line cap, with every placeholder filled from the tracker and every link a real URL.

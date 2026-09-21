# Status

The one message `/oneezy-status` produces. Copy the template, apply the variant for the state, fill every placeholder, apply the rules. Nothing above the H1, nothing below the code block.

## Template (closeout: PR merged)

````markdown
# PR #<n> closeout

**<type(scope)>:** <PR title without the prefix> ([open](<pr url>)) `<labels of the tickets the PR closes>`

<One line: what landed, in plain words.> Milestone <name> in <days> days.

### Quick Links

- PR #<n> ([open](<pr url>))
- Task Board ([open](<board url>))
- Dev Branch ([open](<github url of the base branch>))
- Vercel ([open](https://vercel.com/<team>))
- Apps
  - <project> ([branch](<branch preview url>)) ([dev](<base preview url>))
  - <project> ([branch](<branch preview url>)) ([dev](<base preview url>))

### Tickets (<open>/<total>)

- ✅ ~~[#<n>](<url>) <ticket title>~~ `<labels>`
  - <snapshot bullet from the PR body, up to five; or the ticket's subtasks as linked lines when it has them>

### Git

`<feature branch>` → `<base>`, squash <short sha>, branch deleted

### Builds (<count>)

- ✅ <project>
- ✅ <project>

### Warnings (<total>)

- ⚠️ <source>: <count> `<rule or message>` in `<file>`

### Next Up (3)

1. [#<n>](<url>) <ticket title> `<labels>`
2. [#<n>](<url>) <ticket title> `<labels>`, by hand
3. [#<n>](<url>) <ticket title> `<labels>`

<Two or three sentences: take item 1 because <why>; what 2 and 3 unblock; what can run in parallel; whether this differs from the board's Next Up column.>

```text
/wayfinder Work through map #<map> in <owner>/<repo>. Take ticket #<n> "<title>". Claim it by assigning me (<login>) first. Read <settled artifacts the ticket must not redefine> before anything else. Then read <sources named on the ticket and by the handover comments>. <Type-specific instruction: grill in rounds, Matt's round format, whole frontier per round / research against primary sources / build a throwaway prototype>. Output is <the ticket's stated output>, not <what it must not produce>. Do not touch main or persist. Commit only when I say so, then run /oneezy-merge into <base>.
```
````

## Variant: open (PR exists, not merged)

- H1 is `# PR #<n> open`.
- Summary line says the branch is up for review.
- Quick Links: `Branch ([open](<github url of the feature branch>))` replaces Dev Branch; each app shows `([branch](…))` only.
- Tickets: the tickets the PR will close, no ✅ and no strikethrough, with the snapshot under each.
- Git line: `` `<feature branch>` → PR #<n> open, <n> commits ahead of `<base>` ``.
- Builds show ✅ or a pending line `- ⏳ <project>`.
- Next Up, its recommendation and the code block are omitted.

## Variant: blocked (a Vercel build failed)

The open variant with these changes:

- H1 is `# PR #<n> blocked`.
- Summary line names the failing build and says the PR is open.
- Git line: `` `<feature branch>`, PR open, branch kept ``.
- The failing project reads `- ❌ <project>`.
- `### Errors (<total>)` sits above Warnings, ❌ bullets, one line each, at most five. Under the list, one line: the read of the failure and the smallest fix.

## Variant: branch (no PR yet)

- H1 is `` # `<feature branch>` status ``.
- No PR line. Summary line: commits ahead of base and the count of uncommitted files.
- Quick Links: Task Board, `Branch (open)` when the branch is pushed, Vercel. No Apps.
- Tickets: tickets named in the branch's commit subjects, if any, with no ✅.
- Git line: `` `<feature branch>` off `<base>`, <n> ahead, <n> files uncommitted ``.
- Builds, Warnings, Errors and Next Up are omitted.

## Rules

- **Links** are one-word markdown links in parentheses after the thing they open: `(open)`, `(branch)`, `(dev)`. Ticket numbers are the link wherever a ticket is named: `[#30](url) Title`. No bare URLs. Link words and two-word headings are Title Case.
- **Labels**: every ticket reference ends with its labels in inline code. The PR line carries the labels of the tickets it closes.
- **Counts** in headings: Tickets is open over total among the map's child tickets (map in play only; otherwise no count). Builds is the number of Vercel projects. Warnings and Errors are the deduplicated totals across all build logs; at most five bullets shown under each. Next Up is the number listed. Quick Links and Git carry no count.
- **Tickets** lists every issue the PR closes, one line each. Under each: its subtasks as linked lines when it has them, else the snapshot from the PR body.
- **Sections** appear only with content: no Warnings on a clean build, no Errors unless blocked, no Next Up outside the closeout with a map. When build logs could not be read, one line under Builds says so and names the tracking ticket if one exists.
- **Length**: at most 35 lines excluding the code block. Trim the snapshot first, then the recommendation.
- **Headings**: the H1 and H3s only; no emoji in headings; status emoji start bullets (✅ ❌ ⚠️ ⏳).

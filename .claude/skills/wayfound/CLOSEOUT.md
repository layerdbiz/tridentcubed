# Closeout

The one message that ends a `/wayfound` run. Copy the template, fill every placeholder, apply the rules. Nothing is added above the H1 or below the code block.

## Template (landed)

````markdown
# PR #<n> closeout

**<type(scope)>:** <PR title without the prefix> ([open](<pr url>)) `<label of each ticket the PR closes>`

<One line: what landed, in plain words.> Milestone 1 in <days> days.

### Quick Links

- PR #<n> ([open](<pr url>))
- `<feature branch>` → `dev` ([open](<dev branch url>))
- site ([preview](<site preview url>)) ([build](<site vercel dashboard url>))
- app ([preview](<app preview url>)) ([build](<app vercel dashboard url>))
- Task Board ([open](https://github.com/users/layerdbiz/projects/1))

### Tickets (<open>/<total>)

- ✅ ~~[#<n>](<url>) <ticket title>~~ `<label>`
  - <snapshot bullet 1>
  - <snapshot bullet 2>
  - <up to five>

### Git

`<feature branch>` → `dev`, squash <short sha>, branch deleted

### Builds (2)

- ✅ site
- ✅ app

### Warnings (<total>)

- ⚠️ <source>: <count> `<rule or message>` in `<file>`

### Next Up (3)

1. [#<n>](<url>) <ticket title> `<label>`
2. [#<n>](<url>) <ticket title> `<label>`, by hand
3. [#<n>](<url>) <ticket title> `<label>`

<Two or three sentences: take item 1 because <why>; what items 2 and 3 unblock; what can run in parallel.>

```text
/wayfinder Work through map #<map> in <owner>/<repo>. Take ticket #<n> "<title>". Claim it by assigning me (<login>) first. Read <settled artifacts the ticket must not redefine> before anything else. Then read <sources named on the ticket and by the handover comments>. <Type-specific instruction: grill in rounds, Matt's round format, whole frontier per round / research against primary sources / build a throwaway prototype>. Output is <the ticket's stated output>, not <what it must not produce>. Do not touch main or persist. Commit only when I say so, then run /wayfound.
```
````

## Blocked variant

Same template with these changes and nothing else:

- H1 is `# PR #<n> blocked`.
- Summary line says which build failed and that the PR is open.
- Quick Links: the second bullet is the feature branch alone, linked, no arrow.
- Git line: `` `<feature branch>`, PR open, branch kept ``.
- Builds: the failing app reads `- ❌ <app>`.
- `### Errors (<total>)` sits above Warnings, bullets start with ❌, one line each, at most five. Under the list, one line: your read of the failure and the smallest fix.
- Next Up, its recommendation and the code block are omitted.

## Rules

- **Links** are one-word markdown links in parentheses after the thing they open: `(open)`, `(preview)`, `(build)`. Ticket numbers are the link everywhere a ticket is named: `[#30](url) Title`. No bare URLs anywhere. Link words and two-word headings are Title Case.
- **Labels**: every ticket reference ends with its labels in inline code, `wayfinder:grilling`, `ready-for-agent`. The PR line carries the labels of the tickets it closes.
- **Counts** in headings: Tickets is open over total among the map's child tickets, read after the close. Builds is the number of Vercel checks. Warnings and Errors are the deduplicated totals across both build logs; at most five bullets are shown under each. Next Up is the number listed. Quick Links and Git carry no count.
- **Tickets** lists every issue the session closed, one ✅ strikethrough line each. Under each, the ticket's subtasks as linked lines when it has them; otherwise the snapshot from the PR body, at most five bullets.
- **Sections** appear only with content: no Warnings heading on a clean build, no Errors heading when landed.
- **Length**: at most 35 lines excluding the code block. Trim the snapshot first, then the recommendation.
- **Headings**: the H1 and H3s only, no H2, no emoji in headings; status emoji start bullets (✅ ❌ ⚠️).

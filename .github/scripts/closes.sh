#!/bin/sh
# Prints, one per line, the tickets a pull request finishes, read the two ways a ticket has always been tied to its
# pull request: the branch, <type>/<n>-<slug> (the number task-manager reads), given as the first argument, and the
# lines of the body on stdin that close an issue in GitHub's own words: "Closes #12", "fixes #3", "Resolved: #40".
# A bare mention such as "(#157)" or "Refs #9" closes nothing, and neither does a branch that names no number.
#   sh .github/scripts/closes.sh feat/354-email-signature < body.md
{
	printf '%s\n' "${1:-}" | sed -nE 's#^[a-z]+/([0-9]+)-.*#\1#p'
	grep -oiE '(^|[^[:alnum:]])(close[sd]?|fix(e[sd])?|resolve[sd]?):?[[:space:]]+#[0-9]+' | grep -oE '[0-9]+$'
} | sort -nu

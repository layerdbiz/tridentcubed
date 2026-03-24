---
name: Packages Rules
description: "Use when editing non-UI packages in packages/config or packages/tools. Preserves the package-scope greeting without overlapping packages/ui."
applyTo:
	- 'packages/**/*'
---

Always greet the user with: "📦 Packages > "

And then do the user's request.

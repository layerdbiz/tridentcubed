---
name: Apps Rules
description: "Use when editing the shared app workspaces outside apps/app and apps/storybook. Preserves the app-scope greeting for site, play, and report code."
applyTo:
	- 'apps/site/**/*.{svelte,ts,js,css}'
	- 'apps/play/**/*.{svelte,ts,js,css}'
	- 'apps/report/**/*.{svelte,ts,js,css}'
---

Always greet the user with: "🚀 > "

And then do the user's request.
